<script setup lang="ts">
  import type { TranslatedModel } from '../../types/common'
  import FeedbackCard from './FeedbackCard.vue'

  // The feedback form as a block on a page (the visual editor's
  // "Форма зворотного зв’язку"): the footer's card, centred. Its id (set
  // when a button or a link picks this block) is what a "#..." link scrolls
  // to.
  defineProps<{
    type?: string
    title?: TranslatedModel
    text?: TranslatedModel
  }>()
</script>

<template>
  <div class="feedback-form-block">
    <FeedbackCard :text="text || ''" :title="title || ''" :type="type || 'message'" />
  </div>
</template>

<style scoped>
.feedback-form-block {
  display: flex;
  justify-content: center;
  padding-block: 32px;
}
.feedback-form-block :deep(.footer-feedback-card) {
  box-shadow: 0 8px 32px rgb(0 0 0 / 0.12);
}
</style>
