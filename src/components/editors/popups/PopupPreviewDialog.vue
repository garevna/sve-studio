<script setup lang="ts">
  import type { EditorMode } from '@/composables/useEditorMode'
  import type { PopupModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import SectionWithFreeContent from '@/components/editors/sections/SectionWithFreeContent.vue'
  import { provideEditorMode } from '@/composables/useEditorMode'
  import { useCommonStore } from '@/stores/common'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { resolveLocaleText } from '@/utils/locale-text'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'
  import '@/styles/popup-frame.css'

  // A popup as a visitor sees it (site PopupHost.vue): its window, where it
  // appears, its blocks working - tabs switch, the form fills in - and its
  // own close button. Nothing of the editor in it. Opened from the
  // "Попапи" section.
  const props = defineProps<{ popup: PopupModel | null }>()
  const emit = defineEmits<{ close: [] }>()
  const commonStore = useCommonStore()

  // Shown, not edited.
  provideEditorMode(computed<EditorMode>(() => 'preview'))

  const placement = computed(() => props.popup?.placement ?? 'right')
  const width = computed(() => placement.value === 'bottom' ? undefined : `${props.popup?.width || (placement.value === 'center' ? 640 : 420)}px`)
  const title = computed(() => resolveLocaleText(props.popup?.title, commonStore.locale))
</script>

<template>
  <v-dialog
    :content-class="`pw-popup-overlay pw-popup-overlay--${placement}`"
    :model-value="!!props.popup"
    scrollable
    :transition="`pw-popup-${placement}`"
    :width="width"
    @update:model-value="(open: boolean) => !open && emit('close')"
  >
    <div
      v-if="props.popup"
      :class="['pw-popup', `pw-popup--${placement}`, EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME)]"
    >
      <div class="pw-popup__head">
        <h3 v-if="title" class="pw-popup__title">{{ title }}</h3>
        <button class="pw-popup__close popup-preview-close" type="button" @click="emit('close')">
          <i aria-hidden="true" class="mdi mdi-close" />
        </button>
      </div>
      <!-- The site's own theme for what is inside: without it the blocks'
        Vuetify parts (buttons, fields) wore the editor's. -->
      <v-theme-provider :theme="APP_THEME_NAME">
        <div class="pw-popup__body popup-preview-body">
          <SectionWithFreeContent :section="props.popup.content" />
        </div>
      </v-theme-provider>
    </div>
  </v-dialog>
</template>

<style scoped>
.popup-preview-close {
  border: none;
  background: transparent;
  cursor: pointer;
  transition: color 0.2s ease;
}
.popup-preview-close:hover {
  color: var(--dark-grey);
}
.popup-preview-body {
  overflow-y: auto;
}
/* An empty column keeps a place in the editor (min-height); a visitor sees
   only what is in it. */
.popup-preview-body :deep(.section-with-free-content) {
  min-height: 0;
}
</style>
