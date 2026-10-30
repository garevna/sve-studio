<script lang="ts" setup>
  import type { GlobalSettingsModel } from '@/types/GlobalSettingsModel'
  import { computed, onMounted, ref, watch } from 'vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import { useAjaxStore } from '@/stores/ajax'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { t } from '@/i18n'

  // Page spacing - the gap above a page's content and between its blocks -
  // moved here from "Загальні налаштування". It sits with the footer layout
  // for the same reason: these are the designer's decisions about the site's
  // rhythm, not the client's own data (company name, logo, social links),
  // and mixing the two put technical numbers in front of someone who has no
  // way to judge them.
  //
  // Stored in global.json exactly as before - only the place it's edited
  // from has changed.
  const ajaxStore = useAjaxStore()
  const feedback = useUiFeedbackStore()

  const settings = ref<GlobalSettingsModel | null>(null)
  const loading = ref(true)
  const saving = ref(false)
  const dirty = ref(false)

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

  // Stored as a Vuetify spacer STEP, shown as px - the same 4px scale
  // everything else in this editor uses. Kept exactly as it was in the old
  // location, so the saved value's meaning doesn't change.
  const pageContentMarginTopPx = computed({
    get: () => (settings.value?.pageContentMarginTop || 0) * 4,
    set: (px: number) => {
      if (settings.value) settings.value.pageContentMarginTop = Math.round((px || 0) / 4)
      dirty.value = true
    },
  })

  function setBlockSpacing (key: 'desktop' | 'mobile', value: number) {
    if (!settings.value) return
    settings.value.blockSpacing[key] = Math.max(0, Math.round(value) || 0)
    dirty.value = true
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
</script>

<template>
  <div>
    <v-progress-linear v-if="loading" color="primary" indeterminate />

    <template v-else-if="settings">
      <p class="text-body-2 text-medium-emphasis mb-6">
        Вертикальний ритм сторінок: відступ контенту від верхнього краю та
        проміжок між блоками. Значення в пікселях.
      </p>

      <v-row>
        <v-col cols="12" md="4">
          <v-text-field
            v-model.number="pageContentMarginTopPx"
            hint="px, відступ контенту сторінки від її верхнього краю"
            label="Відступ контенту зверху"
            persistent-hint
            type="number"
            variant="outlined"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            hint="px, між блоками на сторінці (десктоп)"
            label="Відступ між блоками (десктоп)"
            :model-value="settings.blockSpacing.desktop"
            persistent-hint
            type="number"
            variant="outlined"
            @update:model-value="setBlockSpacing('desktop', Number($event))"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            hint="px, між блоками на сторінці (мобільна версія)"
            label="Відступ між блоками (мобільна)"
            :model-value="settings.blockSpacing.mobile"
            persistent-hint
            type="number"
            variant="outlined"
            @update:model-value="setBlockSpacing('mobile', Number($event))"
          />
        </v-col>
      </v-row>

      <EditorSaveBar :dirty="dirty" :loading="saving" @click="save" @undo="undo" />
    </template>
  </div>
</template>
