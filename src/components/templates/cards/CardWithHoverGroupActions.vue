<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import ColumnGapMenu from '@/components/editors/ColumnGapMenu.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { cardWithHoverTemplate } from '@/configs/components/cards/card-with-hover'

  // Container-level actions for a "float" block whose children are all
  // card-with-hover cards (see DynamicPageTemplate.vue's isCardWithHoverGroup) -
  // mirrors CardWithToolbarImageGroupActions.vue exactly (same reasoning:
  // production only ever lays these out via a "float" block's flex-wrap
  // row, and card-with-hover can't live inside the plain "cards" block type
  // since production's own CardSet.vue there expects flat card objects, not
  // type:'component' children). add-card lives in this speed-dial, rendered
  // into EditableBlockWrapper's #actions slot by the caller; deleting the
  // whole group is a separate, generic bare fab the caller renders directly
  // into the wrapper's own #delete slot instead (every block's delete
  // affordance now lives there uniformly). Deleting one individual card is
  // a separate small fab on that card itself (see TemplateFlexSection.vue),
  // not here.
  //
  // `block` is deliberately a live reference into the page's own reactive
  // content tree, same pattern as CardContainerActions.vue.
  const props = defineProps<{ block: TemplateBlockModel }>()

  // Drag-to-reorder is off by default and toggled on here, rather than
  // always-on - TemplateFlexSection.vue owns the actual sorting via this
  // same v-model, matching CardContainerActions.vue's own convention. See The same button turns it back off.
  const dragActive = defineModel<boolean>('dragActive', { default: false })

  function addCard () {
    // eslint-disable-next-line vue/no-mutating-props
    const children = props.block.children ??= []
    children.push(cardWithHoverTemplate())
  }
</script>

<template>
  <ToolbarIconButton icon="mdi-plus" tooltip="Додати картку" @click="addCard" />
  <!-- The gap between this group's columns, picked from Vuetify's own 4px
    scale and stored as a gc-N class on the block - see
    utils/column-gap-class.ts. Writing straight into block.class is the same
    live-reference convention every action in this file already uses. -->
  <!-- eslint-disable-next-line vue/no-mutating-props -->
  <ColumnGapMenu v-model:class="block.class" />
  <ToolbarIconButton
    :active="dragActive"
    icon="mdi-cursor-move"
    tooltip="Перетягування карток"
    @click="dragActive = !dragActive"
  />
</template>
