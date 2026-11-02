<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
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

  // The cards' size - one for the whole group, so the cards are always
  // equal. Written into every card's own width/height (props of the
  // CardWithHover component), which is what the site already reads. A text
  // too long for the height fades out with an ellipsis (HoverTemplate.vue);
  // the user makes the cards taller until it fits.
  const CARD_WIDTHS = [200, 240, 280, 320, 360, 400, 440]
  const CARD_HEIGHTS = [240, 280, 320, 360, 400, 440, 480, 520, 560, 600]
  const DEFAULT_WIDTH = 240
  const DEFAULT_HEIGHT = 360

  function cardProps (card: TemplateBlockModel): Record<string, unknown> {
    return (card.props ??= {}) as Record<string, unknown>
  }
  const firstCard = computed(() => props.block.children?.[0]?.props as Record<string, unknown> | undefined)
  const cardWidth = computed(() => Number(firstCard.value?.width) || DEFAULT_WIDTH)
  const cardHeight = computed(() => Number(firstCard.value?.height) || DEFAULT_HEIGHT)
  function setSize (key: 'width' | 'height', value: number) {
    for (const card of props.block.children ?? []) cardProps(card)[key] = value
  }

  function addCard () {
    // eslint-disable-next-line vue/no-mutating-props
    const children = props.block.children ??= []
    const card = cardWithHoverTemplate()
    // The group's size, not the default.
    if (children.length > 0) Object.assign(cardProps(card), { width: cardWidth.value, height: cardHeight.value })
    children.push(card)
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
  <v-menu location="bottom center">
    <template #activator="{ props: menuProps }">
      <ToolbarIconButton v-bind="menuProps" icon="mdi-arrow-expand-horizontal" :tooltip="`Ширина карток: ${cardWidth}px`" />
    </template>
    <v-card theme="editorTheme">
      <v-list density="compact">
        <v-list-item
          v-for="px of CARD_WIDTHS"
          :key="px"
          :active="px === cardWidth"
          link
          :title="`${px} px`"
          @click="setSize('width', px)"
        />
      </v-list>
    </v-card>
  </v-menu>
  <v-menu location="bottom center">
    <template #activator="{ props: menuProps }">
      <ToolbarIconButton v-bind="menuProps" icon="mdi-arrow-expand-vertical" :tooltip="`Висота карток: ${cardHeight}px`" />
    </template>
    <v-card theme="editorTheme">
      <v-list density="compact">
        <v-list-item
          v-for="px of CARD_HEIGHTS"
          :key="px"
          :active="px === cardHeight"
          link
          :title="`${px} px`"
          @click="setSize('height', px)"
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
