<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { emptyTranslatedModel } from '@/utils/locale-text'

  // Container-level actions for a "baner" block: add another line to its
  // text column, and reorder the ones already there. Everything that belongs
  // to an individual line - editing it, formatting it, deleting it - lives
  // on that line's own TextEditor inside TemplateBaner.vue, the same split
  // TemplateNestedSectionActions follows.
  //
  // `block` is a live reference into the page's own content tree.
  const props = defineProps<{ block: TemplateBlockModel }>()

  const emit = defineEmits<{ 'pick-image': [variant: 'desktop' | 'mobile'] }>()

  const dragActive = defineModel<boolean>('dragActive', { default: false })

  function addLine () {
    /* eslint-disable-next-line vue/no-mutating-props */
    const children = props.block.children ??= []
    // Matches the class the banner's existing secondary lines carry, so a
    // new line arrives looking like the ones around it rather than as an
    // unstyled paragraph the user has to format from scratch.
    children.push({ type: 'text', class: 'h6 text-medium text-black', content: emptyTranslatedModel() })
  }
</script>

<template>
  <!-- The banner's own picture. On the block toolbar with every other
    block-level action, rather than floating over the image - the file
    input itself stays in TemplateBaner, which owns the block. -->
  <ToolbarIconButton
    icon="mdi-monitor"
    tooltip="Зображення для широкого екрана"
    @click="emit('pick-image', 'desktop')"
  />
  <ToolbarIconButton
    icon="mdi-cellphone"
    tooltip="Зображення для вузького екрана (паралакс)"
    @click="emit('pick-image', 'mobile')"
  />
  <ToolbarIconButton icon="mdi-playlist-plus" tooltip="Додати текстовий рядок" @click="addLine" />
  <ToolbarIconButton
    :active="dragActive"
    icon="mdi-cursor-move"
    tooltip="Перетягування текстових рядків"
    @click="dragActive = !dragActive"
  />
</template>
