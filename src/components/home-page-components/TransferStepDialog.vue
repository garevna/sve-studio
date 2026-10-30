<script setup lang="ts">
  import type { TranslatedModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import LocaleSwitcher from '@/components/editors/small/LocaleSwitcher.vue'
  import { useCommonStore } from '@/stores/common'
  import { emptyTranslatedModel, isTranslatedModel, resolveLocaleText } from '@/utils/locale-text'

  // One step of "Шукайте маршрут": its ordinary text and the part of it set
  // in bold. Two fields and a delete, in the project's own dialog shape -
  // a toolbar that stays put, the body below it, the confirm at the bottom.
  //
  // Only the CURRENT locale is edited, the same rule EditableCard.vue
  // follows: the locale switcher at the bottom of the editor is how you get
  // to the other two, rather than three stacked copies of every field.
  //
  // `step` is a live reference into the block's own reactive props, mutated
  // in place - the convention every editor in this project uses.
  const props = defineProps<{
    step: { text: TranslatedModel, bold: TranslatedModel } | null
    index: number
  }>()

  const emit = defineEmits<{ close: [], delete: [] }>()

  const commonStore = useCommonStore()

  function field (key: 'text' | 'bold') {
    return computed({
      get: () => resolveLocaleText(props.step?.[key], commonStore.locale),
      set: (value: string) => {
        if (!props.step) return
        if (!isTranslatedModel(props.step[key])) {
          // eslint-disable-next-line vue/no-mutating-props
          props.step[key] = emptyTranslatedModel()
        }
        ;(props.step[key] as TranslatedModel)[commonStore.locale] = value
      },
    })
  }

  const text = field('text')
  const bold = field('bold')
</script>

<template>
  <v-dialog
    :model-value="!!step"
    @update:model-value="(value: boolean) => { if (!value) emit('close') }"
  >
    <v-card
      v-if="step"
      class="editor-dialog"
      style="width: 520px; max-width: calc(100vw - 48px);"
      theme="editorTheme"
    >
      <v-toolbar class="editor-panel" color="transparent" density="compact">
        <v-toolbar-title class="transfer-step-dialog-title">Крок {{ index + 1 }}</v-toolbar-title>
        <v-spacer />
        <ToolbarIconButton icon="mdi-delete" tooltip="Видалити цей крок" @click="emit('delete')" />
        <ToolbarIconButton icon="mdi-close" tooltip="Закрити" @click="emit('close')" />
      </v-toolbar>

      <v-card-text>
        <v-textarea
          v-model="text"
          auto-grow
          hide-details
          label="Текст"
          rows="3"
          variant="outlined"
        />
        <!-- Production renders this immediately after the text, inside the
          same circle, wrapped in <b> - so it is the tail of the sentence
          made prominent, not a heading above it. -->
        <v-textarea
          v-model="bold"
          auto-grow
          class="mt-6"
          hide-details
          label="Виділена частина"
          rows="1"
          variant="outlined"
        />
      </v-card-text>

      <v-card-actions>
        <LocaleSwitcher :scope="step" />
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="emit('close')">ОК</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.transfer-step-dialog-title {
  font-size: 1rem;
  font-weight: 600;
}
</style>
