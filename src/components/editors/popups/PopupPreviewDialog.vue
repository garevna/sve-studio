<script setup lang="ts">
  import type { EditorMode } from '@/composables/useEditorMode'
  import type { PopupModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import PopupFrame from '@/components/templates/popups/PopupFrame.vue'
  import { provideEditorMode } from '@/composables/useEditorMode'
  import { useSitePopups } from '@/composables/useSitePopups'
  import { calendarOf, frameFor, lookOf } from '@/configs/popup-looks'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // A popup as a visitor sees it (site PopupHost.vue): its window, where it
  // appears, its blocks working - tabs switch, a field is checked, a choice
  // is made - and its own close button. Nothing of the editor in it, and
  // nothing is sent anywhere. Opened from the "Попапи" section.
  const props = defineProps<{ popup: PopupModel | null }>()
  const emit = defineEmits<{ close: [] }>()

  // Shown, not edited.
  provideEditorMode(computed<EditorMode>(() => 'preview'))

  const placement = computed(() => props.popup?.placement ?? 'center')
  const width = computed(() => placement.value === 'bottom' ? undefined : `${props.popup?.width || (placement.value === 'center' ? 480 : 420)}px`)
  const error = computed(() => props.popup?.kind === 'message' && props.popup.tone === 'error')
  const sitePopups = useSitePopups()
  const frame = computed(() => frameFor(lookOf(sitePopups.looks.value, props.popup), props.popup, calendarOf(sitePopups.calendars.value, props.popup)))
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
      :class="['pw-popup', `pw-popup--${placement}`, frame.class, { 'pw-popup--error': error }, EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME)]"
      :style="frame.style"
    >
      <!-- A fresh frame each time, so a preview starts empty. -->
      <PopupFrame :key="props.popup.id" :popup="props.popup" @close="emit('close')" />
    </div>
  </v-dialog>
</template>
