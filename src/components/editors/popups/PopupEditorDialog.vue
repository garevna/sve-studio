<script setup lang="ts">
  import type { EditorMode } from '@/composables/useEditorMode'
  import type { PopupModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import SectionWithFreeContent from '@/components/editors/sections/SectionWithFreeContent.vue'
  import LocaleSwitcher from '@/components/editors/small/LocaleSwitcher.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { provideEditorMode } from '@/composables/useEditorMode'
  import { useSitePopups } from '@/composables/useSitePopups'
  import { POPUP_PLACEMENTS } from '@/configs/popup-placements'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { emptyTranslatedModel, isTranslatedModel } from '@/utils/locale-text'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'
  import '@/styles/popup-frame.css'

  // One of the site's popups, edited where and as the site shows it (site
  // PopupHost.vue): from its edge, at its width, with its title and close
  // button - and above that a strip of its settings (the client's name for
  // it, where it appears, how wide). Its content is a column of blocks,
  // edited exactly like one half of a "Довільний контент" section
  // (SectionWithFreeContent.vue), tabs included.
  const sitePopups = useSitePopups()
  const commonStore = useCommonStore()
  const popup = sitePopups.editing

  // Everything inside is being edited.
  provideEditorMode(computed<EditorMode>(() => 'edit'))

  const placement = computed(() => popup.value?.placement ?? 'right')
  const sized = computed(() => placement.value !== 'bottom')
  const width = computed(() => sized.value ? `${popup.value?.width || 420}px` : undefined)

  function setPlacement (value: PopupModel['placement']) {
    if (!popup.value) return
    popup.value.placement = value
    if (value === 'center' && !popup.value.width) popup.value.width = 640
    if ((value === 'left' || value === 'right') && !popup.value.width) popup.value.width = 420
  }

  // The title in the language being edited (the switch beside it).
  const title = computed({
    get: () => {
      const value = popup.value?.title
      const text = isTranslatedModel(value) ? value[commonStore.locale] : ''
      return typeof text === 'string' ? text : ''
    },
    set: (value: string) => {
      if (!popup.value) return
      if (!isTranslatedModel(popup.value.title)) popup.value.title = emptyTranslatedModel()
      ;(popup.value.title as Record<string, string>)[commonStore.locale] = value
    },
  })
</script>

<template>
  <v-dialog
    :content-class="`pw-popup-overlay pw-popup-overlay--${placement}`"
    :model-value="!!popup"
    persistent
    scrollable
    :transition="`pw-popup-${placement}`"
    :width="width"
    @update:model-value="(open: boolean) => !open && sitePopups.edit(null)"
  >
    <div v-if="popup" :class="['pw-popup', `pw-popup--${placement}`]">
      <!-- The editor's own strip: never on the site. -->
      <v-card class="popup-editor-bar editor-panel" flat theme="editorTheme">
        <div class="popup-editor-row">
          <v-text-field
            v-model="popup.name"
            class="popup-editor-name"
            density="compact"
            hide-details
            :label="t('pagePopups.name')"
            variant="outlined"
          />
          <div class="popup-editor-placements">
            <ToolbarIconButton
              v-for="option of POPUP_PLACEMENTS"
              :key="option.value"
              :active="placement === option.value"
              :icon="option.icon"
              :tooltip="t(option.label)"
              @click="setPlacement(option.value)"
            />
          </div>
          <!-- Every change is a draft at once; publishing is here as well as
            in the "Попапи" section, so a popup started from a button on a
            page can be finished without leaving it. -->
          <ToolbarIconButton
            v-if="sitePopups.dirty.value"
            icon="mdi-content-save-outline"
            :tooltip="t('common.save')"
            @click="sitePopups.save()"
          />
          <ToolbarIconButton icon="mdi-check" :tooltip="t('pagePopups.done')" @click="sitePopups.edit(null)" />
        </div>
        <div class="popup-editor-row">
          <v-text-field
            v-model="title"
            class="popup-editor-title"
            density="compact"
            hide-details
            :label="t('pagePopups.title')"
            variant="outlined"
          />
          <LocaleSwitcher />
        </div>
        <v-slider
          v-if="sized"
          v-model="popup.width"
          class="popup-editor-width"
          color="primary"
          density="compact"
          hide-details
          :label="t('pagePopups.width', { width: popup.width })"
          :max="960"
          :min="280"
          :step="20"
        />
      </v-card>

      <div :class="['popup-editor-content', EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME)]">
        <div class="pw-popup__head">
          <h3 v-if="title" class="pw-popup__title">{{ title }}</h3>
          <span aria-hidden="true" class="pw-popup__close"><i class="mdi mdi-close" /></span>
        </div>
        <!-- The site's own theme for the blocks (the strip above keeps the
          editor's). -->
        <v-theme-provider :theme="APP_THEME_NAME">
          <div class="pw-popup__body">
            <SectionWithFreeContent :section="popup.content" />
          </div>
        </v-theme-provider>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.popup-editor-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 0;
}
.popup-editor-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
.popup-editor-name,
.popup-editor-title {
  flex: 1 1 200px;
  min-width: 0;
}
.popup-editor-placements {
  display: flex;
  gap: 2px;
}
.popup-editor-width {
  margin: 0;
}
.popup-editor-content {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}
</style>
