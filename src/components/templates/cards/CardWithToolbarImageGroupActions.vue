<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import ColumnGapMenu from '@/components/editors/ColumnGapMenu.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { cardWithToolbarImageTemplate } from '@/configs/components/cards/card-with-toolbar-image'
  import { snapGroupToReference } from '@/utils/card-with-toolbar-image-format-sync'

  // Container-level actions for a "float" block whose children are all
  // card-with-toolbar-image cards (see DynamicPageTemplate.vue's
  // isCardWithToolbarImageGroup) - matches production's own grouping
  // (TemplateFlexSection.vue renders them in one flex-wrap row) rather than
  // each card sitting alone on its own line. add-card lives in this
  // speed-dial, rendered into EditableBlockWrapper's #actions slot by the
  // caller; deleting the whole group is a separate, generic bare fab the
  // caller renders directly into the wrapper's own #delete slot instead
  // (every block's delete affordance now lives there uniformly). Deleting
  // one individual card is a separate small fab on that card itself (see
  // TemplateFlexSection.vue), not here.
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
    // eslint-disable-next-line unicorn/prefer-at
    const last = children[children.length - 1]
    const card = cardWithToolbarImageTemplate()
    if (last?.width) card.width = last.width
    if (last?.height) card.height = last.height
    children.push(card)
    // Matches the block's existing shared format immediately, instead of
    // showing the hardcoded template defaults until someone happens to edit it.
    if (props.block.uniformCardFormat !== false) snapGroupToReference(props.block)
  }

  // Default true when unset - matches the "shared by default" expectation;
  // opting into independent per-card formatting is an explicit action.
  function toggleUniformFormat () {
    const next = props.block.uniformCardFormat === false
    // eslint-disable-next-line vue/no-mutating-props
    props.block.uniformCardFormat = next
    if (next) snapGroupToReference(props.block)
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
  <ToolbarIconButton
    :active="block.uniformCardFormat !== false"
    icon="mdi-content-duplicate"
    tooltip="Однаковий формат тексту для всіх карток"
    @click="toggleUniformFormat"
  />
</template>
