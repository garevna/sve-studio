<script setup lang="ts">
  import type { TranslatedModel } from '../../types/common'
  import FeedbackCard from './FeedbackCard.vue'

  // The feedback form in a window over the page - opened by a button set
  // to "Відкриває форму" (templates/TemplateItem.vue) and by the mobile
  // menu's contact button (main-menu/MobileMenuRow.vue).
  const open = defineModel<boolean>({ default: false })
  defineProps<{
    type?: string
    title?: Record<string, string> | string
    text?: Record<string, string> | string
  }>()
  const emit = defineEmits<{ sent: [] }>()
</script>

<template>
  <v-dialog v-model="open" content-class="feedback-popup-dialog">
    <div class="feedback-popup">
      <v-btn
        aria-label="Close"
        class="feedback-popup-close"
        icon="mdi-close"
        size="small"
        variant="text"
        @click="open = false"
      />
      <FeedbackCard
        :text="(text as TranslatedModel) || ''"
        :title="(title as TranslatedModel) || ''"
        :type="type || 'message'"
        @sent="emit('sent')"
      />
    </div>
  </v-dialog>
</template>

<style>
/* Not scoped: the window is drawn by Vuetify outside this component.
   The theme stretches every dialog to the full width
   (vuetify-overlay-content.css); the form keeps the width of a form. */
.v-dialog:not(.v-bottom-sheet) > .v-overlay__content.feedback-popup-dialog {
  min-width: 0;
  width: min(440px, calc(100% - 32px));
}
.feedback-popup {
  position: relative;
}
.feedback-popup .footer-feedback-card {
  min-width: 0;
  max-width: none;
  width: 100%;
}
/* Room for the close button beside the heading. */
.feedback-popup .footer-feedback-card > p:first-child {
  padding-right: 32px;
}
.feedback-popup-close {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  /* Quiet, not black: it is there when needed, not an accent. */
  color: var(--grey);
  transition: color 0.2s;
}
.feedback-popup-close:hover {
  color: var(--dark-grey);
}
</style>
