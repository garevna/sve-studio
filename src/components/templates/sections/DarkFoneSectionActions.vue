<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import { darkFoneSectionCard } from '@/configs/components/sections/dark-fone-section'

  // Container-level actions for a dark-fone-section block, rendered into
  // EditableBlockWrapper's #actions slot by DynamicPageTemplate.vue - same
  // convention as CardWithHoverGroupActions.vue (background/add-card here
  // instead of floating inside the block's own body, drag-to-reorder off by
  // default and toggled here, deletion of the whole block stays a separate
  // bare fab in the wrapper's own #delete slot).
  //
  // `block` is deliberately a live reference into the page's own reactive
  // content tree, same pattern as CardWithHoverGroupActions.vue.
  const props = defineProps<{ block: TemplateBlockModel }>()

  const dragActive = defineModel<boolean>('dragActive', { default: false })

  function setBackground (value: string) {
    // eslint-disable-next-line vue/no-mutating-props
    props.block.background = value
  }

  function addCard () {
    // eslint-disable-next-line vue/no-mutating-props
    const children = props.block.children ??= []
    children.push(darkFoneSectionCard())
  }
</script>

<template>
  <PaletteSwatchPicker dark-only gradients :model-value="block.background || 'primary'" @update:model-value="setBackground">
    <template #activator="{ menuProps }">
      <v-tooltip location="top" text="Фон секції" theme="editorTheme">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="{ ...tooltipProps, ...menuProps }" icon="mdi-format-color-fill" variant="text" />
        </template>
      </v-tooltip>
    </template>
  </PaletteSwatchPicker>
  <ToolbarIconButton icon="mdi-plus" tooltip="Додати картку" @click="addCard" />
  <ToolbarIconButton
    :active="dragActive"
    icon="mdi-cursor-move"
    tooltip="Перетягування карток"
    @click="dragActive = !dragActive"
  />
</template>
