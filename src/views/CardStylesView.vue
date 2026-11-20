<script lang="ts" setup>
  import type { SiteStyle } from '@/configs/site-style'
  import type { CardStyleEntry } from '@/utils/card-style-entry'
  import type { CssNode } from '@/utils/css-rules'
  import { SveSegmented } from '@sve/editor-ui'
  import { computed, onMounted, ref, watch } from 'vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import CardTemplatesPanel from '@/components/ui-kit/CardTemplatesPanel.vue'
  import HoverCardTemplatesPanel from '@/components/ui-kit/HoverCardTemplatesPanel.vue'
  import { useSiteStyle } from '@/composables/useSiteStyle'
  import { CARD_STYLE_BY_SITE_STYLE, CARD_STYLE_BY_VARIANT } from '@/configs/card-style'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { getActiveTheme } from '@/utils/active-theme'
  import { CARD_SHADOWS, CARD_WAVE_EDGES, cardStyleInline, extractCardStyles, NO_CARD_COLORS, serializeCardStyles, STROKE_WIDTHS } from '@/utils/card-style-entry'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
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

  // The styles the site's styles put on a block that names none
  // (CARD_STYLE_BY_SITE_STYLE: card-stroke, card-wave, card-neon) have to
  // exist - without card-neon a «Неон» site's cards are bare. One that is
  // missing (deleted before it was protected) comes back in its starting
  // look; true when any did.
  function siteStyleEntry (style: SiteStyle, className: string): CardStyleEntry {
    return {
      className,
      label: t(`kit.siteStyles.${style}`),
      background: '',
      border: style === 'stroke' ? '' : 'light-border',
      radius: 'default-border-radius',
      shadow: '',
      stroke: style === 'stroke' ? { color: 'primary', width: 2, corners: 'tl-br' } : null,
      wave: style === 'wave' ? { color: 'light-grey-2', edge: 'bottom' } : null,
      glow: style === 'neon' ? { color: 'site' } : null,
      colors: { ...NO_CARD_COLORS },
      raw: [],
    }
  }
  function ensureSiteStyleEntries (): boolean {
    let added = false
    for (const [style, className] of Object.entries(CARD_STYLE_BY_SITE_STYLE)) {
      if (className && !entries.value.some(entry => entry.className === className)) {
        entries.value.push(siteStyleEntry(style as SiteStyle, className))
        added = true
      }
    }
    return added
  }
  const SITE_STYLE_CLASSES = new Set(Object.values(CARD_STYLE_BY_SITE_STYLE))

  function loadFrom (cssText: string): boolean {
    const parsed = extractCardStyles(cssText)
    entries.value = parsed.entries
    otherNodes.value = parsed.otherNodes
    return ensureSiteStyleEntries()
  }

  onMounted(async () => {
    try {
      const [content, palette] = await Promise.all([ajaxStore.getStyleFile(FILE_NAME), ajaxStore.getPalette()])
      const paletteEntries = Object.entries(palette || {}).map(([key, value]) => parsePaletteEntry(key, value))
      paletteBorders.value = paletteEntries.filter(entry => entry.kind === 'border').map(entry => entry.key)
      paletteRadii.value = paletteEntries.filter(entry => entry.kind === 'radius').map(entry => entry.key)
      skipNextAutoSave = true
      const restored = loadFrom(content ?? '')
      dirty.value = restored || await ajaxStore.isStyleFileUpdated(FILE_NAME)
      // a site style's card came back: kept as a draft at once
      if (restored) {
        await ajaxStore.saveStyleFile(FILE_NAME, serialize(), { publish: false })
        applyToEditor()
      }
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
    { title: t('common.squareCorners'), value: '0' },
    ...paletteRadii.value.map(key => ({ title: key, value: key })),
  ])
  const shadowItems = computed(() => Object.keys(CARD_SHADOWS).map(key => ({
    title: t(`cardStyles.shadows.${key as 'none' | 'soft' | 'medium' | 'strong'}`),
    value: key,
  })))

  // The list shows the styles of the site's style (UI Kit > Стиль сайту):
  // «Штрих» the ones with the stroke, «Хвиля» the ones with the wave,
  // «Класика» the plain ones. A style belongs to one of them - which one is
  // what it is, so the stroke's and the wave's settings are simply there
  // in their group, not switched on and off.
  const siteStyle = useSiteStyle()
  function groupOf (entry: CardStyleEntry): SiteStyle {
    if (entry.glow) return 'neon'
    if (entry.stroke) return 'stroke'
    if (entry.wave) return 'wave'
    return 'classic'
  }
  const shown = computed(() => entries.value.filter(entry => groupOf(entry) === siteStyle.of('cards')))
  // The style the site's style gives a block that names none.
  const siteDefault = computed(() => CARD_STYLE_BY_SITE_STYLE[siteStyle.of('cards')])

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
    // made in the group on screen: a stroke in «Штрих» (primary, 2px,
    // top-left and bottom-right), a light wave in «Хвиля» - a light colour
    // keeps the card's text readable over it
    const group = siteStyle.of('cards')
    entries.value.push({
      className,
      label,
      background: '',
      border: group === 'stroke' ? '' : 'light-border',
      radius: 'default-border-radius',
      shadow: 'none',
      stroke: group === 'stroke' ? { color: 'primary', width: 2, corners: 'tl-br' } : null,
      wave: group === 'wave' ? { color: 'light-grey-2', edge: 'bottom' } : null,
      // gold, as on the glass panels it imitates
      glow: group === 'neon' ? { color: 'site' } : null,
      colors: { ...NO_CARD_COLORS },
      raw: [],
    })
    expanded.value = className
    addOpen.value = false
  }

  // The edge of the card's outline that waves under the pointer.
  const waveEdgeOptions = computed(() => CARD_WAVE_EDGES.map(value => ({ value, label: t(`cardStyles.waveEdges.${value}`) })))

  const COLOR_KEYS = ['icon', 'disc', 'title', 'text'] as const
</script>

<template>
  <div class="card-styles">
    <v-progress-linear v-if="loading" color="primary" indeterminate />

    <template v-else>
      <!-- first the templates a client picks; the styles they are built of below -->
      <CardTemplatesPanel />
      <HoverCardTemplatesPanel />
      <p class="card-styles-hint">{{ t('cardStyles.hint') }}</p>
      <p class="card-styles-hint">{{ t('kit.siteStyleCardsShown', { style: t(`kit.siteStyles.${siteStyle.of('cards')}`) }) }}</p>

      <div class="card-styles-list">
        <div v-for="entry of shown" :key="entry.className" class="card-styles-row">
          <div class="card-styles-row-head" @click="expanded = expanded === entry.className ? null : entry.className">
            <!-- The sample stands on the site's own theme, like the button
              previews, so radius and colours resolve as on the site. -->
            <v-theme-provider :theme="APP_THEME_NAME">
              <!-- on the page the site wears: the edited scope, «Неон»'s night
                and colours when the site is «Неон» -->
              <div :class="['card-styles-stage', EDITED_APP_SCOPE_CLASS]">
                <div :class="['card-styles-sample', themeClass(APP_THEME_NAME), { [entry.className]: !!entry.wave || !!entry.glow }]" :style="cardStyleInline(entry)">
                  <!-- the style's colours (custom properties on the sample) -->
                  <span class="card-styles-sample-disc">
                    <v-icon icon="mdi-star-outline" size="28" />
                  </span>
                  <div>
                    <h4 class="card-styles-sample-title">{{ t('cardStyles.sampleTitle') }}</h4>
                    <p class="card-styles-sample-text card-content-text">{{ t('cardStyles.sampleText') }}</p>
                  </div>
                </div>
              </div>
            </v-theme-provider>
            <div class="card-styles-name">
              <span class="card-styles-label">{{ entry.label }}</span>
              <span v-if="entry.className === siteDefault" class="card-styles-chip">{{ t('cardStyles.siteDefault') }}</span>
              <span v-for="ver of siteDefault ? [] : variantsByStyle[entry.className] || []" :key="ver" class="card-styles-chip">
                {{ t('cardStyles.usedBy', { ver }) }}
              </span>
            </div>
            <v-spacer />
            <!-- a site style's own card is not deleted: the style puts it on
              every block that names no card style -->
            <v-btn
              v-if="!SITE_STYLE_CLASSES.has(entry.className)"
              density="comfortable"
              icon="mdi-delete"
              variant="text"
              @click.stop="removeEntry(entry)"
            />
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
                <span>{{ t('common.background') }}</span>
                <PaletteSwatchPicker v-model="entry.background" gradients />
              </div>
              <v-select
                v-model="entry.border"
                density="compact"
                :disabled="!!entry.stroke"
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

              <!-- «Штрих»: two opposite corners instead of a frame. -->
              <div v-if="entry.stroke" class="card-styles-stroke">
                <span class="card-styles-group">{{ t('cardStyles.stroke') }}</span>
                <template v-if="entry.stroke">
                  <div class="card-styles-field">
                    <span>{{ t('cardStyles.strokeColor') }}</span>
                    <PaletteSwatchPicker v-model="entry.stroke.color" />
                  </div>
                  <v-btn-toggle v-model="entry.stroke.width" density="compact" mandatory variant="outlined">
                    <v-btn v-for="width of STROKE_WIDTHS" :key="width" :value="width">{{ width }}</v-btn>
                  </v-btn-toggle>
                  <v-btn-toggle v-model="entry.stroke.corners" density="compact" mandatory variant="outlined">
                    <v-btn :title="t('cardStyles.strokeTlBr')" value="tl-br"><v-icon icon="mdi-arrow-top-left-bottom-right" /></v-btn>
                    <v-btn :title="t('cardStyles.strokeTrBl')" value="tr-bl"><v-icon icon="mdi-arrow-top-right-bottom-left" /></v-btn>
                  </v-btn-toggle>
                </template>
                <p class="card-styles-stroke-hint">{{ t('cardStyles.strokeHint') }}</p>
              </div>

              <!-- What is on the card: the icon, its disc, the title, the text. -->
              <div class="card-styles-stroke">
                <span class="card-styles-group">{{ t('cardStyles.colors') }}</span>
                <div v-for="key of COLOR_KEYS" :key="key" class="card-styles-field">
                  <span>{{ t(`cardStyles.colorOf.${key}`) }}</span>
                  <PaletteSwatchPicker
                    :model-value="entry.colors[key] || 'transparent'"
                    @update:model-value="(value: string) => entry.colors[key] = value === 'transparent' ? '' : value"
                  />
                </div>
                <p class="card-styles-stroke-hint">{{ t('cardStyles.colorsHint') }}</p>
              </div>

              <!-- «Неон»: dark glass with a glowing outline. -->
              <div v-if="entry.glow" class="card-styles-stroke">
                <span class="card-styles-group">{{ t('cardStyles.glow') }}</span>
                <!-- the colour is always at hand: picking one gives the style its
                  own glow; the switch takes the site's back -->
                <div class="card-styles-field">
                  <span>{{ t('cardStyles.glowColor') }}</span>
                  <PaletteSwatchPicker
                    :model-value="entry.glow.color === 'site' ? (siteStyle.neonGlow.value || 'warning') : entry.glow.color"
                    no-transparent
                    @update:model-value="(key: string) => entry.glow!.color = key"
                  />
                </div>
                <v-switch
                  color="primary"
                  density="compact"
                  hide-details
                  inset
                  :label="t('cardStyles.glowSite')"
                  :model-value="entry.glow.color === 'site'"
                  @update:model-value="value => entry.glow!.color = value ? 'site' : (siteStyle.neonGlow.value || 'warning')"
                />
                <p class="card-styles-stroke-hint">{{ t('cardStyles.glowHint') }}</p>
              </div>

              <!-- «Хвиля»: a wave of colour fills the card on hover. -->
              <div v-if="entry.wave" class="card-styles-stroke">
                <span class="card-styles-group">{{ t('cardStyles.wave') }}</span>
                <div class="card-styles-field">
                  <span>{{ t('cardStyles.waveColor') }}</span>
                  <PaletteSwatchPicker v-model="entry.wave.color" />
                </div>
                <div class="card-styles-field card-styles-field--column">
                  <span>{{ t('cardStyles.waveEdge') }}</span>
                  <SveSegmented v-model="entry.wave.edge" :options="waveEdgeOptions" />
                </div>
                <p class="card-styles-stroke-hint">{{ t('cardStyles.waveHint') }}</p>
              </div>
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
.card-styles-stage {
  padding: 14px;
  border-radius: 14px;
}
.card-styles-sample {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 300px;
  max-width: 100%;
  padding: 16px 20px;
}
.card-styles-sample-disc {
  display: grid;
  flex: none;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--card-icon-disc, transparent);
  color: var(--card-icon-color, var(--primary));
}
.card-styles-sample-disc .v-icon {
  color: var(--card-icon-color, var(--primary)) !important;
}
.card-styles-sample-title:not(#_) {
  margin: 0;
  /* !important: over the «Неон» style's white, as the site's rule is */
  color: var(--card-title-color, inherit) !important;
  font-weight: 600;
  font-size: 0.95rem;
}
.card-styles-sample-text:not(#_) {
  margin: 0;
  color: var(--card-text-color, inherit) !important;
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
.card-styles-stroke {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}
.card-styles-group {
  font-weight: 600;
}
.card-styles-stroke-hint {
  flex-basis: 100%;
  margin: 0;
  font-size: 0.8rem;
  color: #7A8699;
}
.card-styles-field {
  display: flex;
  align-items: center;
  gap: 12px;
}
.card-styles-field--column {
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}
</style>
