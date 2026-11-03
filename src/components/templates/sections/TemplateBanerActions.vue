<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import { t } from '@/i18n'
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

  // The banner card's fill (a palette key or gradient); unset is the light
  // blue it always had.
  function setBackground (value: string) {
    /* eslint-disable-next-line vue/no-mutating-props */
    props.block.background = value
  }

  // The plate under the headline; unset is primary.
  function setTitleBackground (value: string) {
    /* eslint-disable-next-line vue/no-mutating-props */
    props.block.titleBackground = value
  }

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
    :tooltip="t('banner.imageWide')"
    @click="emit('pick-image', 'desktop')"
  />
  <ToolbarIconButton
    icon="mdi-cellphone"
    :tooltip="t('banner.imageNarrow')"
    @click="emit('pick-image', 'mobile')"
  />
  <PaletteSwatchPicker gradients :model-value="block.background || ''" no-transparent @update:model-value="setBackground">
    <template #activator="{ menuProps }">
      <ToolbarIconButton v-bind="menuProps" icon="mdi-format-color-fill" :tooltip="t('banner.background')" />
    </template>
  </PaletteSwatchPicker>
  <PaletteSwatchPicker gradients :model-value="block.titleBackground || 'primary'" no-transparent @update:model-value="setTitleBackground">
    <template #activator="{ menuProps }">
      <ToolbarIconButton v-bind="menuProps" icon="mdi-format-color-highlight" :tooltip="t('banner.titlePlate')" />
    </template>
  </PaletteSwatchPicker>
  <ToolbarIconButton icon="mdi-playlist-plus" :tooltip="t('banner.addTextRow')" @click="addLine" />
  <ToolbarIconButton
    :active="dragActive"
    icon="mdi-cursor-move"
    :tooltip="t('banner.dragTextRows')"
    @click="dragActive = !dragActive"
  />
</template>
