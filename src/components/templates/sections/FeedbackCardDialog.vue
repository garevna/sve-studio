<script setup lang="ts">
  import type { TranslatedModel } from '@/types/TemplateBlockModel'
  import { storeToRefs } from 'pinia'
  import LocaleSwitcher from '@/components/editors/small/LocaleSwitcher.vue'
  import TextEditor from '@/components/editors/text/TextEditor.vue'
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
    type?: 'call-request' | 'message'
    title?: TranslatedModel
    text?: TranslatedModel
  }

  // A live reference into the card block's own reactive props - mutated in
  // place, this editor's convention everywhere.
  const props = defineProps<{ card: FeedbackCardProps }>()

  const open = defineModel<boolean>({ default: false })

  const commonStore = useCommonStore()
  const { locale } = storeToRefs(commonStore)

  function text (field: 'title' | 'text'): string {
    return resolveLocaleText(props.card[field], locale.value)
  }
  /* eslint-disable vue/no-mutating-props -- see this component's own top comment */
  function setText (field: 'title' | 'text', value: string | undefined) {
    const bag = (props.card[field] ??= {} as TranslatedModel)
    bag[locale.value] = value || ''
  }
  function setType (value: 'call-request' | 'message') {
    props.card.type = value
  }
  /* eslint-enable vue/no-mutating-props */
</script>

<template>
  <v-dialog v-model="open" max-width="560">
    <v-card theme="editorTheme" title="Картка зворотного зв'язку">
      <v-card-text>
        <p class="feedback-card-dialog-label">Тип картки</p>
        <v-btn-toggle
          class="mb-6"
          density="compact"
          mandatory
          :model-value="card.type || 'call-request'"
          variant="outlined"
        >
          <v-btn value="call-request" @click="setType('call-request')">Дзвінок</v-btn>
          <v-btn value="message" @click="setType('message')">Повідомлення</v-btn>
        </v-btn-toggle>

        <!-- The card's own heading and lead paragraph, edited with the same
          controls every other text in this editor uses (so the format menu
          works here too, not just the words). -->
        <p class="feedback-card-dialog-label">Заголовок</p>
        <TextEditor
          :content="text('title')"
          parent-type="usual"
          type="title"
          @update:content="value => setText('title', value)"
        />

        <p class="feedback-card-dialog-label mt-6">Текст</p>
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
        <v-btn color="primary" variant="elevated" @click="open = false">ОК</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.feedback-card-dialog-label {
  font-size: 0.85rem;
  color: #7A8699;
  margin-bottom: 4px;
}
</style>
