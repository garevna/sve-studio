<script setup lang="ts">
  import type { TranslatedModel } from '@/types/TemplateBlockModel'
  import { storeToRefs } from 'pinia'
  import { useI18n } from 'vue-i18n'
  import LocaleSwitcher from '@/components/editors/small/LocaleSwitcher.vue'
  import TextEditor from '@/components/editors/text/TextEditor.vue'
  import { FEEDBACK_FORM_KINDS, feedbackFormKind } from '@/configs/feedback-forms'
  import { useCommonStore } from '@/stores/common'
  import { resolveLocaleText } from '@/utils/locale-text'

  // The callback card's own settings, opened from the pencil in its corner.
  // Its texts used to be edited by two TextEditors sitting UNDER the card in
  // the footer column - which read as two stray fields belonging to nothing,
  // since the card above them already shows the very same words.
  //
  // The call/message switch lives here too, not on the footer's own toolbar:
  // it configures this card, and a footer needn't contain one at all, so a
  // permanent control for it on the footer panel described something that
  // might not be on screen.
  export type FeedbackCardProps = {
    type?: string
    title?: TranslatedModel
    text?: TranslatedModel
  }

  // A live reference into the card block's own reactive props - mutated in
  // place, this editor's convention everywhere.
  const props = defineProps<{ card: FeedbackCardProps }>()

  const open = defineModel<boolean>({ default: false })

  const commonStore = useCommonStore()
  const { t } = useI18n()
  const { locale } = storeToRefs(commonStore)

  function text (field: 'title' | 'text'): string {
    return resolveLocaleText(props.card[field], locale.value)
  }
  /* eslint-disable vue/no-mutating-props -- see this component's own top comment */
  function setText (field: 'title' | 'text', value: string | undefined) {
    const bag = (props.card[field] ??= {} as TranslatedModel)
    bag[locale.value] = value || ''
  }
  function setType (value: string) {
    props.card.type = value
  }
  /* eslint-enable vue/no-mutating-props */
</script>

<template>
  <v-dialog v-model="open" max-width="560">
    <v-card theme="editorTheme" :title="t('common.feedbackForm')">
      <v-card-text>
        <!-- The kind decides which fields the form asks for
          (configs/feedback-forms.ts). -->
        <p class="feedback-card-dialog-label">{{ t('feedbackForms.kind') }}</p>
        <div class="feedback-kinds mb-6">
          <button
            v-for="kind of FEEDBACK_FORM_KINDS"
            :key="kind.id"
            :class="['feedback-kind', { 'feedback-kind--active': feedbackFormKind(card.type).id === kind.id }]"
            type="button"
            @click="setType(kind.id)"
          >
            <v-icon :icon="kind.icon" size="20" />
            <span>
              <span class="feedback-kind-name">{{ t(`feedbackForms.kinds.${kind.id}`) }}</span>
              <span class="feedback-kind-fields">{{ kind.fields.map(field => t(`feedbackForms.fields.${field}`)).join(', ') }}</span>
            </span>
          </button>
        </div>

        <!-- The card's own heading and lead paragraph, edited with the same
          controls every other text in this editor uses (so the format menu
          works here too, not just the words). -->
        <p class="feedback-card-dialog-label">{{ t('common.header') }}</p>
        <TextEditor
          :content="text('title')"
          parent-type="usual"
          type="title"
          @update:content="value => setText('title', value)"
        />

        <p class="feedback-card-dialog-label mt-6">{{ t('common.text') }}</p>
        <TextEditor
          :content="text('text')"
          parent-type="usual"
          type="text"
          @update:content="value => setText('text', value)"
        />
      </v-card-text>
      <v-card-actions>
        <LocaleSwitcher :scope="card" />
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="open = false">{{ t('common.ok') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.feedback-kinds {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr));
  gap: 8px;
}
.feedback-kind {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: solid 1px rgb(58 74 88 / 0.2);
  border-radius: 10px;
  text-align: start;
  background: none;
  cursor: pointer;
}
.feedback-kind--active {
  border-color: #4f8cff;
  box-shadow: inset 0 0 0 1px #4f8cff;
}
.feedback-kind-name {
  display: block;
  font-weight: 600;
  font-size: 0.9rem;
}
.feedback-kind-fields {
  display: block;
  font-size: 0.78rem;
  color: #7a8699;
}
.feedback-card-dialog-label {
  font-size: 0.85rem;
  color: #7A8699;
  margin-bottom: 4px;
}
</style>
