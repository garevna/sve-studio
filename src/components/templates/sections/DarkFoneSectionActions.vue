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

  // The cards' width (block.cardWidth, px) - a pick from a short list, the
  // same shape as the gap between columns (ColumnGapMenu.vue).
  const CARD_WIDTHS = [200, 240, 280, 320, 360, 400]
  function setCardWidth (value: number) {
    // eslint-disable-next-line vue/no-mutating-props
    props.block.cardWidth = value
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
      <ToolbarIconButton v-bind="menuProps" icon="mdi-format-color-fill" tooltip="Фон секції" />
    </template>
  </PaletteSwatchPicker>
  <ToolbarIconButton icon="mdi-plus" tooltip="Додати картку" @click="addCard" />
  <v-menu location="bottom center">
    <template #activator="{ props: menuProps }">
      <ToolbarIconButton v-bind="menuProps" icon="mdi-arrow-expand-horizontal" :tooltip="`Ширина карток: ${block.cardWidth || 240}px`" />
    </template>
    <v-card theme="editorTheme">
      <v-list density="compact">
        <v-list-item
          v-for="px of CARD_WIDTHS"
          :key="px"
          :active="px === (block.cardWidth || 240)"
          link
          :title="`${px} px`"
          @click="setCardWidth(px)"
        />
      </v-list>
    </v-card>
  </v-menu>
  <ToolbarIconButton
    :active="dragActive"
    icon="mdi-cursor-move"
    tooltip="Перетягування карток"
    @click="dragActive = !dragActive"
  />
</template>
