<script setup lang="ts">
  import type { TranslatedModel } from '@/types/TemplateBlockModel'
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import MarginBottomMenu from '@/components/editors/MarginBottomMenu.vue'
  import TextEditor from '@/components/editors/text/TextEditor.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'
  import { emptyTranslatedModel, isTranslatedModel, resolveLocaleText, translationHint } from '@/utils/locale-text'

  // A block's own heading and lead line: two editable text rows in edit mode,
  // two plain paragraphs everywhere else.
  //
  // Extracted so that a block with several VARIANTS keeps one heading rather
  // than one per variant - "Популярні напрямки" can be drawn by
  // PopularDestinationsTheme1 or Theme2, and the text the client typed has to
  // survive switching between them. The heading lives in the block's props,
  // which both variants share; this component is what reads and writes it.
  //
  // Only alignment and the gap below are offered: size, weight and colour
  // belong to the theme, and offering them would be offering settings that
  // do not belong to whoever edits page text.
  const props = defineProps<{
    title?: TranslatedModel
    subtitle?: TranslatedModel
    titleClass: string
    subtitleClass: string
  }>()

  const emit = defineEmits<{
    update: [changes: { title?: TranslatedModel, subtitle?: TranslatedModel, titleClass?: string, subtitleClass?: string }]
  }>()

  const { locale } = storeToRefs(useCommonStore())

  const mode = useEditorMode()

  const titleClass = computed({
    get: () => props.titleClass,
    set: (value: string) => emit('update', { titleClass: value }),
  })
  const subtitleClass = computed({
    get: () => props.subtitleClass,
    set: (value: string) => emit('update', { subtitleClass: value }),
  })

  function headingText (field: 'title' | 'subtitle'): string {
    return resolveLocaleText(props[field], locale.value)
  }

  // Writes into the CURRENT locale only, leaving the other two languages
  // alone - the rule every text field in this editor follows.
  function setHeadingText (field: 'title' | 'subtitle', value: string | undefined) {
    const current = props[field]
    const bag = isTranslatedModel(current) ? { ...current } : emptyTranslatedModel()
    bag[locale.value] = value || ''
    emit('update', { [field]: bag })
  }
</script>

<template>
  <template v-if="mode === 'edit'">
    <div class="block-heading-row">
      <TextEditor
        v-model:class="titleClass"
        :content="headingText('title')"
        :format-controls="['align']"
        :missing-translation="translationHint(props.title, locale)"
        parent-type="usual"
        type="text"
        @update:content="value => setHeadingText('title', value)"
      />
      <MarginBottomMenu v-model:class="titleClass" :tooltip="t('block.spaceUnderHeader')" />
    </div>
    <div class="block-heading-row">
      <TextEditor
        v-model:class="subtitleClass"
        :content="headingText('subtitle')"
        :format-controls="['align']"
        :missing-translation="translationHint(props.subtitle, locale)"
        parent-type="usual"
        type="text"
        @update:content="value => setHeadingText('subtitle', value)"
      />
      <MarginBottomMenu v-model:class="subtitleClass" :tooltip="t('block.spaceUnderTitle')" />
    </div>
  </template>
  <template v-else>
    <p v-if="headingText('title')" :class="titleClass">{{ headingText('title') }}</p>
    <p v-if="headingText('subtitle')" :class="subtitleClass">{{ headingText('subtitle') }}</p>
  </template>
</template>

<style scoped>
/* The spacing menu sits beside the text rather than under it, so the row is
   a flex line - the text takes the width it needs and the menu follows. */
.block-heading-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
</style>
