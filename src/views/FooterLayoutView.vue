<script lang="ts" setup>
  import type { GlobalSettingsModel } from '@/types/GlobalSettingsModel'
  import { computed, onMounted, ref, watch } from 'vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import {
    FOOTER_MIN_COLUMN_WIDTH,
    FOOTER_RESPONSIVE_GAP_BASE,
    FOOTER_STEP,
    resolveFooterLayout,
    snapFooterValue,
  } from '@/configs/footer-layout'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'

  // The footer's column layout, as the DESIGNER sets it: how many columns,
  // how wide each one is, and the gap between them. It lives in the UI Kit
  // rather than in the footer editor because it's a design decision about
  // the site's shape, not content - and because dragging borders in the
  // middle of a live footer turned out to be unreadable: a strip whose width
  // IS the value looks like nothing is happening, and the numbers ran away.
  // Typed numbers, snapped to the project's own 4px scale, show exactly what
  // is being set.
  //
  // Stored in global.json, so client-side reads the same values and stops
  // hardcoding its own arrangement.
  const ajaxStore = useAjaxStore()
  const feedback = useUiFeedbackStore()

  const settings = ref<GlobalSettingsModel | null>(null)
  const loading = ref(true)
  const saving = ref(false)
  const dirty = ref(false)

  const layout = computed(() => resolveFooterLayout(settings.value))

  // Every edit lands in IndexedDB automatically (debounced, publish:false)
  // so nothing is lost before "Зберегти" - the same pattern
  // GeneralSettingsView.vue uses, and the reason the preview window can show
  // an unpublished change at all.
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  let skipNextAutoSave = false
  watch(settings, () => {
    if (skipNextAutoSave) {
      skipNextAutoSave = false
      return
    }
    if (!settings.value) return
    dirty.value = true
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null
      if (settings.value) ajaxStore.saveGlobalSettings(settings.value, { publish: false })
    }, 800)
  }, { deep: true })

  onMounted(async () => {
    const loaded = await ajaxStore.getGlobalSettings()
    skipNextAutoSave = true
    settings.value = loaded
    dirty.value = await ajaxStore.isGlobalSettingsUpdated()
    loading.value = false
  })

  function footerBag () {
    const bag = settings.value!
    bag.footer ??= {}
    return bag.footer
  }

  function setColumns (value: number) {
    const bag = footerBag()
    bag.columns = value
    // Widths are per column and positional, so a shorter footer must not
    // keep carrying the widths of columns that no longer exist - they would
    // silently come back when the count is raised again.
    if (bag.widths) bag.widths = bag.widths.slice(0, value)
    dirty.value = true
  }

  // Auto-correction rather than validation: the designer types whatever, and
  // the value settles onto the 4px grid (and above the minimum) when the
  // field loses focus. Rejecting input would mean explaining a rule; this
  // just shows the nearest valid number.
  // Cleared out means "no setting" - the footer then uses its own
  // responsive gap (32 / 48 / 64px by viewport), which one stored number
  // cannot express. Deleting the key rather than storing 0 is what makes
  // that distinguishable at all: 0 is a real, valid gap.
  function setGap (raw: number | string) {
    const bag = footerBag()
    const text = String(raw ?? '').trim()
    if (text) {
      bag.gap = Math.max(0, snapFooterValue(Number(text) || 0))
    } else {
      delete bag.gap
    }
    dirty.value = true
  }

  function gapField (): number | null {
    return layout.value.gapSet ? layout.value.gap : null
  }

  function setWidth (index: number, raw: number | string) {
    const bag = footerBag()
    bag.widths ??= []
    const value = Number(raw) || 0
    // 0 (or anything cleared out) means "no explicit width" - that column
    // shares the row equally with the other unset ones.
    bag.widths[index] = value > 0 ? Math.max(FOOTER_MIN_COLUMN_WIDTH, snapFooterValue(value)) : 0
    dirty.value = true
  }

  function widthField (index: number): number | null {
    const raw = settings.value?.footer?.widths?.[index]
    return typeof raw === 'number' && raw > 0 ? raw : null
  }

  async function save () {
    if (!settings.value) return
    saving.value = true
    try {
      await ajaxStore.saveGlobalSettings(settings.value, { publish: true })
      dirty.value = false
    } finally {
      saving.value = false
    }
  }

  async function undo () {
    skipNextAutoSave = true
    settings.value = await ajaxStore.undoGlobalSettings()
    dirty.value = false
    feedback.notifySuccess(t('popups.undoDone'))
  }

  // The preview is deliberately content-free: plain blocks and the real gap
  // between them, at the real proportions. What is being edited here is the
  // arrangement, and filling the columns with actual footer content would
  // hide the very thing the designer is looking at.
  // The preview has one fixed width, so it can only draw one of the three
  // responsive gaps - it shows the base.
  const previewGap = computed(() => (layout.value.gapSet ? layout.value.gap : FOOTER_RESPONSIVE_GAP_BASE))

  const previewColumns = computed(() => {
    const { widths } = layout.value
    // "авто" is content-width, not an equal share of the row - see
    // FooterEditor.vue's own columnStyle for why that changed. The preview
    // has no real content to size itself to, so an auto column is drawn at
    // a fixed sample width; what it is demonstrating here is the gap and
    // the proportions of the columns that DO have a width.
    return widths.map(w => (w === null
      ? { flex: '0 0 auto', width: '160px', label: t('footer.layout.byContent') }
      : { flex: '0 0 auto', width: `${w}px`, label: `${w}px` }))
  })

</script>

<template>
  <div>
    <v-progress-linear v-if="loading" color="primary" indeterminate />

    <template v-else-if="settings">
      <p class="text-body-2 text-medium-emphasis mb-6">
        {{ t('footer.layout.intro', { FOOTER_STEP }) }}
      </p>

      <div class="footer-layout-preview" :style="{ gap: previewGap + 'px' }">
        <div
          v-for="(column, index) of previewColumns"
          :key="index"
          class="footer-layout-preview-column"
          :style="{ flex: column.flex, width: column.width }"
        >
          <span class="footer-layout-preview-label">{{ column.label }}</span>
        </div>
      </div>
      <p class="footer-layout-gap-caption">
        {{ layout.gapSet ? t('footer.layout.gapValue', { gap: layout.gap }) : t('footer.layout.gapAdaptive') }}
      </p>

      <v-row class="mt-6">
        <v-col cols="12" md="4">
          <p class="footer-layout-label">{{ t('footer.layout.columns') }}</p>
          <v-btn-toggle
            density="compact"
            mandatory
            :model-value="layout.columns"
            variant="outlined"
          >
            <v-btn :value="2" @click="setColumns(2)">2</v-btn>
            <v-btn :value="3" @click="setColumns(3)">3</v-btn>
          </v-btn-toggle>
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            :hint="t('footer.layout.gapHint')"
            :label="t('footer.layout.gap')"
            :model-value="gapField()"
            persistent-hint
            :placeholder="t('footer.layout.adaptive')"
            type="number"
            variant="outlined"
            @update:model-value="setGap($event)"
          />
        </v-col>
      </v-row>

      <h2 class="editor-section-title">{{ t('footer.layout.widths') }}</h2>
      <v-row>
        <v-col v-for="index of layout.columns" :key="index" cols="12" md="4">
          <v-text-field
            hide-details
            :hint="t('footer.layout.widthHint', { FOOTER_MIN_COLUMN_WIDTH })"
            :label="t('footer.layout.column', { index })"
            :model-value="widthField(index - 1)"
            persistent-hint
            :placeholder="t('footer.layout.byContent')"
            type="number"
            variant="outlined"
            @update:model-value="setWidth(index - 1, $event)"
          />
        </v-col>
      </v-row>

      <EditorSaveBar :dirty="dirty" :loading="saving" @click="save" @undo="undo" />
    </template>
  </div>
</template>

<style scoped>
.footer-layout-preview {
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 16px;
  border-radius: 8px;
  background: #152A68;
  min-height: 180px;
}
.footer-layout-preview-column {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  border-radius: 4px;
  background: #DDD;
}
.footer-layout-preview-label {
  font-size: 12px;
  color: #5A6679;
}
.footer-layout-gap-caption {
  margin-top: 8px;
  text-align: center;
  font-size: 13px;
  color: #7A8699;
}
.footer-layout-label {
  font-size: 0.85rem;
  color: #7A8699;
  margin-bottom: 8px;
}
</style>
