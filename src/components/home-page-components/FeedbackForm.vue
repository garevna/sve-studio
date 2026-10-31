<script setup lang="ts">
  import type { FeedbackFormModel } from '@/types/TemplateBlockModel'
  import { ref } from 'vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import FeedbackCard from '@/components/templates/sections/FeedbackCard.vue'
  import FeedbackCardDialog from '@/components/templates/sections/FeedbackCardDialog.vue'
  import { useBlockActionsTarget } from '@/composables/useEditableBlockActions'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { useCommonStore } from '@/stores/common'
  import { resolveLocaleText } from '@/utils/locale-text'

  // The feedback form as a block on a page - the "Контакти" page, say, so a
  // button anywhere (the footer's included) can lead to it. The same card
  // the footer shows, centred; its texts and call/message switch are set in
  // the card's own settings window.
  defineOptions({ inheritAttrs: false })

  const model = defineModel<FeedbackFormModel>({ default: () => ({}) })

  const mode = useEditorMode()
  const blockActionsTarget = useBlockActionsTarget()
  const commonStore = useCommonStore()
  const dialogOpen = ref(false)

  function text (field: 'title' | 'text') {
    return resolveLocaleText(model.value?.[field], commonStore.locale)
  }
</script>

<template>
  <div class="feedback-form-block">
    <template v-if="mode === 'edit'">
      <Teleport :disabled="!blockActionsTarget" :to="blockActionsTarget || 'body'">
        <ToolbarIconButton icon="mdi-playlist-edit" tooltip="Редагувати форму" @click="dialogOpen = true" />
      </Teleport>
      <FeedbackCardDialog v-model="dialogOpen" :card="model" />
    </template>
    <FeedbackCard :text="text('text')" :title="text('title')" :type="model?.type || 'message'" />
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
