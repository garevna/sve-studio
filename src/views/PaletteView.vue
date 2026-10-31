<script lang="ts" setup>
  import type { BorderPaletteEntry, ColorPaletteEntry, PaletteEntry, RadiusPaletteEntry, RawPaletteEntry } from '@/utils/palette-entry'
  import { computed, onMounted, ref, watch } from 'vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import PaletteColorPicker from '@/components/special/PaletteColorPicker.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { BORDER_STYLES, borderEntryCss, extractPaletteVarReferences, parsePaletteEntry, serializePaletteEntry } from '@/utils/palette-entry'

  const ajaxStore = useAjaxStore()
  const feedback = useUiFeedbackStore()

  const entries = ref<PaletteEntry[]>([])
  const loading = ref(true)
  const saving = ref(false)
  const undoing = ref(false)
  const dirty = ref(false)

  function serializeEntries (): Record<string, string> {
    const result: Record<string, string> = {}
    for (const entry of entries.value) result[entry.key] = serializePaletteEntry(entry)
    return result
  }

  const colorEntries = computed(() => entries.value.filter(entry => entry.kind === 'color') as ColorPaletteEntry[])
  const borderEntries = computed(() => entries.value.filter(entry => entry.kind === 'border') as BorderPaletteEntry[])
  const radiusEntries = computed(() => entries.value.filter(entry => entry.kind === 'radius') as RadiusPaletteEntry[])
  const rawEntries = computed(() => entries.value.filter(entry => entry.kind === 'raw') as RawPaletteEntry[])

  function findColorEntry (key: string) {
    return colorEntries.value.find(entry => entry.key === key)
  }

  // Raw values (gradients etc.) that reference exactly one existing color entry via var(--key) -
  // the designer edits the color right there, the preview shows the real computed gradient.
  const gradientEntries = computed(() => {
    const result: { entry: RawPaletteEntry, colorEntry: ColorPaletteEntry }[] = []
    for (const entry of rawEntries.value) {
      const [colorKey] = extractPaletteVarReferences(entry.value, colorEntries.value.map(item => item.key))
      const colorEntry = colorKey ? findColorEntry(colorKey) : undefined
      if (colorEntry) result.push({ entry, colorEntry })
    }
    return result
  })

  const unresolvedRawEntries = computed(() => {
    const gradientKeys = new Set(gradientEntries.value.map(item => item.entry.key))
    return rawEntries.value.filter(entry => !gradientKeys.has(entry.key))
  })

  onMounted(async () => {
    const palette = await ajaxStore.getPalette()
    skipNextAutoSave = true
    entries.value = Object.entries(palette || {}).map(([key, value]) => parsePaletteEntry(key, value))
    dirty.value = await ajaxStore.isPaletteUpdated()
    loading.value = false
  })

  // Borders: a palette colour + width + line style, under a name.
  const BORDER_KEY_RE = /^[a-z][\w-]*$/i
  const addBorderOpen = ref(false)
  const newBorderKey = ref('')
  const addBorderError = ref('')
  function openAddBorder () {
    newBorderKey.value = ''
    addBorderError.value = ''
    addBorderOpen.value = true
  }
  function confirmAddBorder () {
    const key = newBorderKey.value.trim()
    if (!BORDER_KEY_RE.test(key)) {
      addBorderError.value = t('palette.nameInvalid')
      return
    }
    if (entries.value.some(entry => entry.key === key)) {
      addBorderError.value = t('palette.nameTaken')
      return
    }
    entries.value.push({ kind: 'border', key, borderStyle: 'solid', width: 1, color: 'primary' })
    addBorderOpen.value = false
  }
  async function removeBorder (key: string) {
    if (!await feedback.confirmDelete('paletteBorder', { name: key })) return
    entries.value = entries.value.filter(entry => entry.key !== key)
  }

  async function save () {
    saving.value = true
    try {
      // Reported centrally by the store - see ajax.ts's reportSaved /
      // reportSaveFailed. Nothing local to say here.
      await ajaxStore.savePalette(serializeEntries(), { publish: true })
      dirty.value = false
    } finally {
      saving.value = false
    }
  }

  async function undo () {
    undoing.value = true
    try {
      skipNextAutoSave = true
      const palette = await ajaxStore.undoPalette()
      entries.value = Object.entries(palette || {}).map(([key, value]) => parsePaletteEntry(key, value))
      dirty.value = false
      feedback.notifySuccess(t('popups.undoDone'))
    } catch {
      feedback.notifyError(t('popups.undoFailed'))
    } finally {
      undoing.value = false
    }
  }

  // Every edit lands in IndexedDB automatically (debounced) - see
  // EditorView.vue for the same pattern applied to page content.
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  let skipNextAutoSave = false
  watch(entries, () => {
    if (skipNextAutoSave) {
      skipNextAutoSave = false
      return
    }
    dirty.value = true
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null
      ajaxStore.savePalette(serializeEntries(), { publish: false })
    }, 800)
  }, { deep: true })
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" detail="palette.json" :title="t('palette.title')" />

      <v-progress-linear v-if="loading" color="primary" indeterminate />

      <template v-else>
        <h2 class="text-h6 mb-3">{{ t('palette.colors') }}</h2>
        <div class="color-grid mb-8">
          <PaletteColorPicker v-for="entry in colorEntries" :key="entry.key" v-model="entry.color">
            {{ entry.key }}
          </PaletteColorPicker>
        </div>

        <h2 class="text-h6 mb-3">{{ t('palette.borders') }}</h2>
        <p class="palette-hint">{{ t('palette.bordersHint') }}</p>
        <div class="border-list mb-4">
          <div v-for="entry in borderEntries" :key="entry.key" class="border-row">
            <span class="border-label">{{ entry.key }}</span>

            <v-select
              v-model="entry.borderStyle"
              density="compact"
              hide-details
              :items="BORDER_STYLES"
              style="min-width: 240px;"
              variant="outlined"
            />
            <v-text-field
              v-model.number="entry.width"
              density="compact"
              hide-details
              min="0"
              style="min-width: 100px;"
              suffix="px"
              type="number"
              variant="outlined"
            />

            <!-- A palette swatch, not a free colour picker: the line takes
              its colour FROM the palette, so recolouring that swatch
              recolours every border built on it. -->
            <PaletteSwatchPicker v-model="entry.color" />

            <div class="border-preview" :style="{ borderBottom: borderEntryCss(entry) }" />

            <v-btn
              density="comfortable"
              icon="mdi-delete"
              :title="t('palette.deleteBorder')"
              variant="text"
              @click="removeBorder(entry.key)"
            />
          </div>
        </div>
        <v-btn
          class="mb-8"
          color="secondary"
          prepend-icon="mdi-plus"
          variant="outlined"
          @click="openAddBorder"
        >
          {{ t('palette.addBorder') }}
        </v-btn>

        <h2 class="text-h6 mb-3">{{ t('palette.radii') }}</h2>
        <div class="radius-list mb-8">
          <div v-for="entry in radiusEntries" :key="entry.key" class="border-row">
            <span class="border-label">{{ entry.key }}</span>

            <v-text-field
              v-model.number="entry.value"
              density="compact"
              hide-details
              min="0"
              style="min-width: 100px;"
              suffix="px"
              type="number"
              variant="outlined"
            />

            <div class="radius-preview" :style="{ borderRadius: `${entry.value}px` }" />
          </div>
        </div>

        <template v-if="gradientEntries.length > 0">
          <h2 class="text-h6 mb-3">{{ t('palette.gradients') }}</h2>
          <div class="gradient-list mb-8">
            <div v-for="{ entry, colorEntry } in gradientEntries" :key="entry.key" class="gradient-row">
              <span class="border-label">{{ entry.key }}</span>
              <div
                class="gradient-preview"
                :style="{ [`--${colorEntry.key}`]: colorEntry.color, background: entry.value }"
              />
              <PaletteColorPicker v-model="colorEntry.color" />
            </div>
          </div>
        </template>

        <template v-if="unresolvedRawEntries.length > 0">
          <h2 class="text-h6 mb-3">{{ t('palette.other') }}</h2>
          <div class="raw-list mb-4">
            <v-text-field
              v-for="entry in unresolvedRawEntries"
              :key="entry.key"
              density="compact"
              hide-details
              :label="entry.key"
              :model-value="entry.value"
              readonly
              variant="outlined"
            />
          </div>
        </template>
      </template>

      <EditorSaveBar
        v-if="!loading"
        :dirty="dirty"
        :loading="saving"
        :undoing="undoing"
        @click="save"
        @undo="undo"
      />

      <v-dialog v-model="addBorderOpen" max-width="420">
        <v-card theme="editorTheme">
          <v-card-title>{{ t('palette.newBorder') }}</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="newBorderKey"
              autofocus
              :error-messages="addBorderError ? [addBorderError] : []"
              :label="t('palette.borderName')"
              placeholder="primary-thin-border"
              variant="outlined"
              @keyup.enter="confirmAddBorder"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="addBorderOpen = false">{{ t('common.cancel') }}</v-btn>
            <v-btn color="primary" variant="flat" @click="confirmAddBorder">{{ t('common.add') }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-main>

  </v-app>
</template>

<style scoped>
  .color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }
  .palette-hint {
    font-size: 0.85rem;
    color: #7A8699;
    margin-bottom: 12px;
    max-width: 900px;
  }
  .border-row {
    flex-wrap: wrap;
  }
  .border-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .border-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .border-label {
    min-width: 220px;
    font-size: 0.9rem;
  }
  .border-preview {
    flex: 1;
    min-width: 80px;
  }
  .radius-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .radius-preview {
    width: 80px;
    height: 40px;
    background: #A9B4BF;
    border: solid 1px rgba(0, 0, 0, 0.15);
  }
  .raw-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
  }
  .gradient-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .gradient-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .gradient-preview {
    flex: 1;
    min-width: 80px;
    height: 40px;
    border-radius: 6px;
    border: solid 1px rgba(0, 0, 0, 0.15);
  }
</style>
