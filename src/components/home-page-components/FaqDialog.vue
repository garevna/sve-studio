<script setup lang="ts">
  import type { TranslatedModel } from '@/types/TemplateBlockModel'
  import { storeToRefs } from 'pinia'
  import LocaleSwitcher from '@/components/editors/small/LocaleSwitcher.vue'
  import TextEditor from '@/components/editors/text/TextEditor.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'
  import { emptyTranslatedModel, isTranslatedModel, resolveLocaleText } from '@/utils/locale-text'

  // Editor for ONE question/answer pair, opened from that question's own cog
  // in the accordion (FAQ.vue). It used to be one dialog holding the whole
  // list - unusable with the 44 seeded pairs, where finding the row you
  // meant to edit was its own scrolling exercise, and where block-wide
  // settings (add/reorder/format/icon) sat mixed in among per-pair fields
  // with nothing marking which was which. Those block-wide controls now live
  // on the block's own toolbar instead (FaqBlockActions.vue).
  //
  // `item` is a live reference into the block's own reactive props array
  // (FAQ.vue passes model.questions[editingIndex]) - mutated in place, same
  // convention as every other block editor in this project. Deletion can't
  // be done here for the same reason: removing the item is a change to the
  // ARRAY, which only the owner can make, so it goes back as an emit.
  const props = defineProps<{
    item: { question: TranslatedModel, answer: TranslatedModel } | null
  }>()
  const emit = defineEmits<{ delete: [] }>()

  const open = defineModel<boolean>({ default: false })

  const { locale } = storeToRefs(useCommonStore())

  function getText (field: 'question' | 'answer'): string {
    return props.item ? resolveLocaleText(props.item[field], locale.value) : ''
  }
  // Same wrap-then-set shape as locale-text.ts's own setLocalizedContent,
  // just targeting `question`/`answer` directly instead of the generic
  // `.content` field that helper assumes.
  function setText (field: 'question' | 'answer', value: string | undefined) {
    const item = props.item
    if (!item) return
    if (!isTranslatedModel(item[field])) {
      item[field] = emptyTranslatedModel()
    }
    item[field][locale.value] = value || ''
  }

  function requestDelete () {
    open.value = false
    emit('delete')
  }
</script>

<template>
  <v-dialog v-model="open" max-width="640">
    <v-card theme="editorTheme" :title="t('faq.dialogTitle')">
      <v-card-text v-if="item">
        <!-- :formattable="false" on both: question/answer styling is
          block-level (one format for all questions, one for all answers -
          see FaqBlockActions.vue), so a per-pair format menu here would
          offer a setting that doesn't exist. -->
        <p class="faq-dialog-label">{{ t('faq.question') }}</p>
        <TextEditor
          :content="getText('question')"
          :formattable="false"
          parent-type="usual"
          type="title"
          @update:content="value => setText('question', value)"
        />
        <p class="faq-dialog-label mt-6">{{ t('faq.answer') }}</p>
        <TextEditor
          :content="getText('answer')"
          :formattable="false"
          parent-type="usual"
          type="text"
          @update:content="value => setText('answer', value)"
        />
      </v-card-text>
      <v-card-actions>
        <ToolbarIconButton icon="mdi-delete" :tooltip="t('faq.delete')" @click="requestDelete" />
        <LocaleSwitcher :scope="item" />
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="open = false">{{ t('common.ok') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.faq-dialog-label {
  font-size: 0.85rem;
  color: #7A8699;
  margin-bottom: 4px;
}
</style>
