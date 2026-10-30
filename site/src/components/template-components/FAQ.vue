<script setup lang="ts">
  import type { TranslatedModel } from '@/types/common'
  import { storeToRefs } from 'pinia'
  import { ref } from 'vue'
  import { useCommonStore } from '../../stores/common'

  type PropsModel = {
    title: TranslatedModel
    subtitle: TranslatedModel
    // Set in the visual editor (alignment only); the defaults below are the
    // classes this block has always had.
    titleClass?: string
    subtitleClass?: string
    questionClass?: string
    answerClass?: string
    // Two plain strings, read straight off the block's props - the pairing
    // rules (which collapse icon goes with which expand icon) live only in
    // the editor, which bakes the resolved pair into the JSON on save. So
    // there is nothing to look up here, and client-side won't need to
    // either: bind whatever the two fields say.
    expandIcon?: string
    collapseIcon?: string
    questions: { question: TranslatedModel, answer: TranslatedModel }[]
  }
  const props = defineProps<PropsModel>()

  const { locale } = storeToRefs(useCommonStore())

  function resolveText (value: TranslatedModel | undefined) {
    if (!value) return ''
    return value[locale.value as 'uk' | 'en' | 'de'] || value.uk || ''
  }

  const panel = ref()
</script>

<template>
  <div class="faq">
    <p :class="props.titleClass || 'faq-title h2 my-8'">{{ resolveText(props.title) }}</p>
    <p :class="props.subtitleClass || 'h6 text-thin text-black subtitle my-6'">{{ resolveText(props.subtitle) }}</p>
    <v-expansion-panels v-model="panel" class="faq-expansion-panels transparent">
      <v-expansion-panel
        v-for="(item, index) of props.questions"
        :key="index"
        class="faq-expansion-panels mb-2"
      >
        <v-expansion-panel-title :collapse-icon="props.collapseIcon || undefined" :expand-icon="props.expandIcon || undefined">
          <p :class="['faq-question-text', props.questionClass || 'faq-item-title']">{{ resolveText(item.question) }}</p>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <p :class="['faq-answer-text', props.answerClass || 'faq-item']">
            {{ resolveText(item.answer) }}
          </p>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>
