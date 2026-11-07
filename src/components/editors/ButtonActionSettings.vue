<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, ref } from 'vue'
  import LinkTargetSettings from '@/components/special/LinkTargetSettings.vue'
  import FeedbackCardDialog from '@/components/templates/sections/FeedbackCardDialog.vue'
  import { feedbackFormTexts } from '@/configs/components/feedback-form'
  import { t } from '@/i18n'

  // What a click on a button does: go to a page (or a block on it - the
  // form on the contacts page, say), or open the feedback form in a popup.
  // The popup's form has its own texts, set in the same window the footer's
  // card uses. Shared by every kind of button (ButtonEditor,
  // IconButtonEditor) - they differ in what they show, not in what they do.
  //
  // `block` is a live reference into the page's content, edited in place.
  const props = defineProps<{
    block: TemplateBlockModel
    // The settings window is open: the link fields re-read the block.
    active: boolean
  }>()

  const formOpen = ref(false)
  const action = computed({
    get: () => (props.block.action === 'form' ? 'form' : 'link'),
    set: (value: 'link' | 'form') => {
      /* eslint-disable vue/no-mutating-props -- the block is edited in place, see above */
      if (value === 'form') {
        props.block.action = 'form'
        props.block.form ??= feedbackFormTexts()
      } else {
        delete props.block.action
      }
      /* eslint-enable vue/no-mutating-props */
    },
  })
</script>

<template>
  <p class="button-action-label mb-2">{{ t('buttonEditor.action') }}</p>
  <v-btn-toggle
    v-model="action"
    class="mb-6 button-action-toggle"
    color="primary"
    density="compact"
    mandatory
    variant="outlined"
  >
    <v-btn prepend-icon="mdi-link-variant" value="link">{{ t('buttonEditor.toPage') }}</v-btn>
    <v-btn prepend-icon="mdi-message-text-outline" value="form">{{ t('buttonEditor.opensForm') }}</v-btn>
  </v-btn-toggle>

  <!-- The same three fields the menu and the footer's links use - a page,
    and optionally one block on it to scroll to. -->
  <LinkTargetSettings v-if="action === 'link'" :active="props.active" auto :item="props.block" />
  <template v-else-if="props.block.form">
    <p class="text-body-2 mb-3">{{ t('buttonEditor.formHint') }}</p>
    <v-btn prepend-icon="mdi-playlist-edit" variant="tonal" @click="formOpen = true">{{ t('buttonEditor.formTexts') }}</v-btn>
    <FeedbackCardDialog v-model="formOpen" :card="props.block.form" />
  </template>
</template>

<style scoped>
.button-action-label {
  font-size: 0.85rem;
  color: #7A8699;
}
.button-action-toggle {
  flex-wrap: wrap;
  height: auto;
}
</style>
