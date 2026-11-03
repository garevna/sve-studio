<script lang="ts" setup>
  import type { BorderPaletteEntry, ColorPaletteEntry, GradientPaletteEntry, PaletteEntry, RadiusPaletteEntry, RawPaletteEntry } from '@/utils/palette-entry'
  import { computed, onMounted, ref, watch } from 'vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import PaletteColorPicker from '@/components/special/PaletteColorPicker.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { BORDER_STYLES, borderEntryCss, gradientCss, parsePaletteEntry, serializePaletteEntry } from '@/utils/palette-entry'

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

  const gradientEntries = computed(() => entries.value.filter(entry => entry.kind === 'gradient') as GradientPaletteEntry[])

  // The colours as they are being edited, as CSS variables - so a gradient
  // preview follows a colour changed above before anything is saved.
  const paletteVars = computed(() => Object.fromEntries(colorEntries.value.map(entry => [`--${entry.key}`, entry.color])))

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
  // Gradients: palette colours at positions, linear (with an angle) or radial.
  const addGradientOpen = ref(false)
  const newGradientKey = ref('')
  const addGradientError = ref('')
  function openAddGradient () {
    newGradientKey.value = ''
    addGradientError.value = ''
    addGradientOpen.value = true
  }
  function confirmAddGradient () {
    const key = newGradientKey.value.trim()
    if (!BORDER_KEY_RE.test(key)) {
      addGradientError.value = t('palette.nameInvalid')
      return
    }
    if (entries.value.some(entry => entry.key === key)) {
      addGradientError.value = t('palette.nameTaken')
      return
    }
    entries.value.push({ kind: 'gradient', key, type: 'linear', angle: 135, stops: [{ color: 'primary', at: 0 }, { color: 'secondary', at: 100 }] })
    addGradientOpen.value = false
  }
  async function removeGradient (key: string) {
    if (!await feedback.confirmDelete('paletteGradient', { name: key })) return
    entries.value = entries.value.filter(entry => entry.key !== key)
  }
  function addStop (entry: GradientPaletteEntry) {
    const last = entry.stops.at(-1)
    entry.stops.push({ color: last?.color ?? 'primary', at: 100 })
    if (last && last.at === 100) {
      last.at = 50
    }
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
      const palette = serializeEntries()
      ajaxStore.savePalette(palette, { publish: false })
      // The editor's own CSS variables (set once at startup, editor-app.ts)
      // follow, so a new gradient can be picked as a fill right away.
      for (const [name, value] of Object.entries(palette)) {
        document.documentElement.style.setProperty(`--${name}`, value)
      }
    }, 800)
  }, { deep: true })
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" detail="palette.json" :title="t('common.palette')" />

      <v-progress-linear v-if="loading" color="primary" indeterminate />

      <template v-else>
        <h2 class="text-h6 mb-3">{{ t('common.colours') }}</h2>
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

        <h2 class="text-h6 mb-3">{{ t('common.gradients') }}</h2>
        <p class="palette-hint">{{ t('palette.gradientsHint') }}</p>
        <div class="gradient-list mb-4">
          <div v-for="entry in gradientEntries" :key="entry.key" class="gradient-card">
            <div class="gradient-head">
              <span class="border-label">{{ entry.key }}</span>
              <v-btn-toggle
                v-model="entry.type"
                color="primary"
                density="compact"
                mandatory
                variant="outlined"
              >
                <v-btn size="small" value="linear">{{ t('palette.linear') }}</v-btn>
                <v-btn size="small" value="radial">{{ t('palette.radial') }}</v-btn>
              </v-btn-toggle>
              <v-spacer />
              <v-btn
                density="comfortable"
                icon="mdi-delete"
                :title="t('palette.deleteGradient')"
                variant="text"
                @click="removeGradient(entry.key)"
              />
            </div>
            <div class="gradient-preview" :style="[paletteVars, { background: gradientCss(entry) }]" />
            <div v-if="entry.type === 'linear'" class="gradient-angle">
              <span class="gradient-angle-label">{{ t('palette.angle') }}</span>
              <v-slider
                v-model="entry.angle"
                color="primary"
                hide-details
                :max="360"
                :min="0"
                :step="5"
                thumb-label
              />
              <span class="gradient-angle-value">{{ entry.angle }}°</span>
            </div>
            <div class="gradient-stops">
              <div v-for="(stop, index) in entry.stops" :key="index" class="gradient-stop">
                <PaletteSwatchPicker v-model="stop.color" no-transparent />
                <v-slider
                  v-model="stop.at"
                  color="primary"
                  hide-details
                  :max="100"
                  :min="0"
                  :step="1"
                />
                <span class="gradient-angle-value">{{ stop.at }}%</span>
                <v-btn
                  density="comfortable"
                  :disabled="entry.stops.length <= 2"
                  icon="mdi-close"
                  size="small"
                  :title="t('palette.removeStop')"
                  variant="text"
                  @click="entry.stops.splice(index, 1)"
                />
              </div>
              <v-btn
                class="align-self-start"
                prepend-icon="mdi-plus"
                size="small"
                variant="text"
                @click="addStop(entry)"
              >
                {{ t('palette.addStop') }}
              </v-btn>
            </div>
          </div>
        </div>
        <v-btn
          class="mb-8"
          color="secondary"
          prepend-icon="mdi-plus"
          variant="outlined"
          @click="openAddGradient"
        >
          {{ t('palette.addGradient') }}
        </v-btn>

        <template v-if="rawEntries.length > 0">
          <h2 class="text-h6 mb-3">{{ t('palette.other') }}</h2>
          <div class="raw-list mb-4">
            <v-text-field
              v-for="entry in rawEntries"
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
      <v-dialog v-model="addGradientOpen" max-width="420">
        <v-card theme="editorTheme">
          <v-card-title>{{ t('palette.newGradient') }}</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="newGradientKey"
              autofocus
              :error-messages="addGradientError ? [addGradientError] : []"
              :label="t('palette.borderName')"
              placeholder="sunset-gradient"
              variant="outlined"
              @keyup.enter="confirmAddGradient"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="addGradientOpen = false">{{ t('common.cancel') }}</v-btn>
            <v-btn color="primary" variant="flat" @click="confirmAddGradient">{{ t('common.add') }}</v-btn>
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
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr));
    gap: 16px;
  }
  .gradient-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border: solid 1px rgba(58, 74, 88, 0.15);
    border-radius: 12px;
  }
  .gradient-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }
  .gradient-head .border-label {
    min-width: 0;
    font-weight: 600;
  }
  .gradient-preview {
    height: 72px;
    border-radius: 8px;
    border: solid 1px rgba(0, 0, 0, 0.15);
  }
  .gradient-angle,
  .gradient-stop {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .gradient-angle-label {
    font-size: 0.85rem;
    min-width: 40px;
  }
  .gradient-angle-value {
    min-width: 44px;
    text-align: end;
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
  }
  .gradient-stops {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
</style>
