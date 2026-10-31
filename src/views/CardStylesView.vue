<script lang="ts" setup>
  import type { CardStyleEntry } from '@/utils/card-style-entry'
  import type { CssNode } from '@/utils/css-rules'
  import { computed, onMounted, ref, watch } from 'vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import { CARD_STYLE_BY_VARIANT } from '@/configs/card-style'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { getActiveTheme } from '@/utils/active-theme'
  import { CARD_SHADOWS, cardStyleInline, extractCardStyles, serializeCardStyles } from '@/utils/card-style-entry'
  import { loadThemeStyles } from '@/utils/load-theme-styles'
  import { parsePaletteEntry } from '@/utils/palette-entry'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // The UI Kit's card styles (content/styles/cards.css). Each style is set
  // here once; cards blocks on the pages refer to it by name, so a change
  // here changes every card that uses it. Same edit-in-place pattern as the
  // buttons tab (ButtonPaletteView.vue).
  const FILE_NAME = 'cards.css'
  const ajaxStore = useAjaxStore()
  const feedback = useUiFeedbackStore()

  const entries = ref<CardStyleEntry[]>([])
  const otherNodes = ref<CssNode[]>([])
  const paletteBorders = ref<string[]>([])
  const paletteRadii = ref<string[]>([])
  const expanded = ref<string | null>(null)
  const loading = ref(true)
  const saving = ref(false)
  const undoing = ref(false)
  const dirty = ref(false)

  function loadFrom (cssText: string) {
    const parsed = extractCardStyles(cssText)
    entries.value = parsed.entries
    otherNodes.value = parsed.otherNodes
  }

  onMounted(async () => {
    try {
      const [content, palette] = await Promise.all([ajaxStore.getStyleFile(FILE_NAME), ajaxStore.getPalette()])
      const paletteEntries = Object.entries(palette || {}).map(([key, value]) => parsePaletteEntry(key, value))
      paletteBorders.value = paletteEntries.filter(entry => entry.kind === 'border').map(entry => entry.key)
      paletteRadii.value = paletteEntries.filter(entry => entry.kind === 'radius').map(entry => entry.key)
      skipNextAutoSave = true
      loadFrom(content ?? '')
      dirty.value = await ajaxStore.isStyleFileUpdated(FILE_NAME)
    } finally {
      loading.value = false
    }
  })

  // The page canvas reads the same stylesheet - swap it in place so a card
  // already on screen in the editor follows the change without a reload.
  function applyToEditor () {
    void loadThemeStyles(getActiveTheme(), ['cards'])
  }

  const serialize = () => serializeCardStyles(entries.value, otherNodes.value)

  async function save () {
    saving.value = true
    try {
      await ajaxStore.saveStyleFile(FILE_NAME, serialize(), { publish: true })
      dirty.value = false
      applyToEditor()
    } finally {
      saving.value = false
    }
  }

  async function undo () {
    undoing.value = true
    try {
      skipNextAutoSave = true
      loadFrom(await ajaxStore.undoStyleFile(FILE_NAME))
      dirty.value = false
      applyToEditor()
    } finally {
      undoing.value = false
    }
  }

  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  let skipNextAutoSave = false
  watch(entries, () => {
    if (skipNextAutoSave) {
      skipNextAutoSave = false
      return
    }
    if (loading.value) return
    dirty.value = true
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(async () => {
      autoSaveTimer = null
      await ajaxStore.saveStyleFile(FILE_NAME, serialize(), { publish: false })
      applyToEditor()
    }, 800)
  }, { deep: true })

  // Which layout variant falls back to a style - shown on the row, so it is
  // clear that deleting it changes those blocks.
  const variantsByStyle = computed(() => {
    const result: Record<string, number[]> = {}
    for (const [ver, className] of Object.entries(CARD_STYLE_BY_VARIANT)) {
      (result[className] ??= []).push(Number(ver))
    }
    return result
  })

  const borderItems = computed(() => [
    { title: t('cardStyles.noBorder'), value: 'none' },
    ...paletteBorders.value.map(key => ({ title: key, value: key })),
  ])
  const radiusItems = computed(() => [
    { title: t('cardStyles.noRadius'), value: '0' },
    ...paletteRadii.value.map(key => ({ title: key, value: key })),
  ])
  const shadowItems = computed(() => Object.keys(CARD_SHADOWS).map(key => ({
    title: t(`cardStyles.shadows.${key as 'none' | 'soft' | 'medium' | 'strong'}`),
    value: key,
  })))

  async function removeEntry (entry: CardStyleEntry) {
    if (!await feedback.confirmDelete('cardStyle', { name: entry.label })) return
    entries.value = entries.value.filter(item => item.className !== entry.className)
  }

  // New styles get a generated class name - the designer names the style,
  // not a CSS class.
  const addOpen = ref(false)
  const newLabel = ref('')
  function openAdd () {
    newLabel.value = ''
    addOpen.value = true
  }
  function confirmAdd () {
    const label = newLabel.value.trim()
    if (!label) return
    let index = entries.value.length + 1
    while (entries.value.some(entry => entry.className === `card-style-${index}`)) index++
    const className = `card-style-${index}`
    entries.value.push({ className, label, background: '', border: 'light-border', radius: 'default-border-radius', shadow: 'none', raw: [] })
    expanded.value = className
    addOpen.value = false
  }
</script>

<template>
  <div class="card-styles">
    <v-progress-linear v-if="loading" color="primary" indeterminate />

    <template v-else>
      <p class="card-styles-hint">{{ t('cardStyles.hint') }}</p>

      <div class="card-styles-list">
        <div v-for="entry of entries" :key="entry.className" class="card-styles-row">
          <div class="card-styles-row-head" @click="expanded = expanded === entry.className ? null : entry.className">
            <!-- The sample stands on the site's own theme, like the button
              previews, so radius and colours resolve as on the site. -->
            <v-theme-provider :theme="APP_THEME_NAME">
              <div :class="['card-styles-sample', themeClass(APP_THEME_NAME)]" :style="cardStyleInline(entry)">
                <v-icon color="primary" icon="mdi-star-outline" size="28" />
                <div>
                  <div class="card-styles-sample-title">{{ t('cardStyles.sampleTitle') }}</div>
                  <div class="card-styles-sample-text">{{ t('cardStyles.sampleText') }}</div>
                </div>
              </div>
            </v-theme-provider>
            <div class="card-styles-name">
              <span class="card-styles-label">{{ entry.label }}</span>
              <span v-for="ver of variantsByStyle[entry.className] || []" :key="ver" class="card-styles-chip">
                {{ t('cardStyles.usedBy', { ver }) }}
              </span>
            </div>
            <v-spacer />
            <v-btn density="comfortable" icon="mdi-delete" variant="text" @click.stop="removeEntry(entry)" />
            <v-btn density="comfortable" :icon="expanded === entry.className ? 'mdi-chevron-up' : 'mdi-chevron-down'" variant="text" />
          </div>

          <v-expand-transition>
            <div v-if="expanded === entry.className" class="card-styles-row-body">
              <v-text-field
                v-model="entry.label"
                density="compact"
                hide-details
                :label="t('cardStyles.name')"
                variant="outlined"
              />
              <div class="card-styles-field">
                <span>{{ t('cardStyles.background') }}</span>
                <PaletteSwatchPicker v-model="entry.background" gradients />
              </div>
              <v-select
                v-model="entry.border"
                density="compact"
                hide-details
                :items="borderItems"
                :label="t('cardStyles.border')"
                variant="outlined"
              />
              <v-select
                v-model="entry.radius"
                density="compact"
                hide-details
                :items="radiusItems"
                :label="t('cardStyles.radius')"
                variant="outlined"
              />
              <v-select
                v-model="entry.shadow"
                density="compact"
                hide-details
                :items="shadowItems"
                :label="t('cardStyles.shadow')"
                variant="outlined"
              />
            </div>
          </v-expand-transition>
        </div>
      </div>
    </template>

    <EditorSaveBar
      v-if="!loading"
      :dirty="dirty"
      :loading="saving"
      :undoing="undoing"
      @click="save"
      @undo="undo"
    >
      <template #prepend>
        <v-btn
          color="secondary"
          prepend-icon="mdi-plus"
          size="large"
          variant="outlined"
          @click="openAdd"
        >
          {{ t('cardStyles.add') }}
        </v-btn>
      </template>
    </EditorSaveBar>

    <v-dialog v-model="addOpen" max-width="420">
      <v-card theme="editorTheme">
        <v-card-title>{{ t('cardStyles.newStyle') }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newLabel"
            autofocus
            :label="t('cardStyles.name')"
            variant="outlined"
            @keyup.enter="confirmAdd"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="addOpen = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" :disabled="!newLabel.trim()" variant="flat" @click="confirmAdd">{{ t('common.add') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.card-styles-hint {
  font-size: 0.85rem;
  color: #7A8699;
  margin-bottom: 24px;
  max-width: 900px;
}
.card-styles-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.card-styles-row {
  border: solid 1px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}
.card-styles-row-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 16px;
  cursor: pointer;
}
.card-styles-sample {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 300px;
  max-width: 100%;
  padding: 16px 20px;
}
.card-styles-sample-title {
  font-weight: 600;
  font-size: 0.95rem;
}
.card-styles-sample-text {
  font-size: 0.8rem;
  opacity: 0.8;
}
.card-styles-name {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.card-styles-label {
  font-weight: 600;
}
.card-styles-chip {
  font-size: 0.75rem;
  color: #7A8699;
}
.card-styles-row-body {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  align-items: center;
  padding: 16px;
  border-top: solid 1px rgba(0, 0, 0, 0.08);
}
.card-styles-field {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
