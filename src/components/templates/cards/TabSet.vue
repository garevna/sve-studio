<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, ref, watch } from 'vue'
  import { useCommonStore } from '@/stores/common'
  import { resolveLocaleText } from '@/utils/locale-text'
  import TabStrip from './TabStrip.vue'
  import TemplateCard from './TemplateCard.vue'

  // A tabs block: a set of cards (the same cards CardSet.vue lays out side
  // by side) showing one at a time. A card's title is its tab's name; the
  // card itself is the panel, as wide as the block.
  //
  // Every panel sits in the same place and only the chosen one is shown, so
  // the block is as tall as its tallest panel and nothing under it jumps
  // when a tab is switched. A panel comes in from the side of the tab it was
  // switched to. The site's copy is site/src/templates/components/TabSet.vue; editing is
  // EditableTabsBlock.vue.
  const props = defineProps<{ item: TemplateBlockModel }>()
  const commonStore = useCommonStore()

  const cards = computed(() => props.item.children || [])
  const active = ref(0)
  watch(() => cards.value.length, count => {
    if (active.value >= count) active.value = Math.max(0, count - 1)
  })

  const labels = computed(() => cards.value.map((card, index) => resolveLocaleText(card.title, commonStore.locale) || String(index + 1)))

  const look = computed(() => props.item.tabLook || 'pill')
  const DEFAULT_PLATE: Record<string, string> = { pill: 'light-grey-2', underline: 'light-grey-1', folder: 'light-grey-2' }
  const accent = computed(() => `var(--${props.item.tabAccent || 'primary'})`)
  const plate = computed(() => `var(--${props.item.tabPlate || DEFAULT_PLATE[look.value] || 'light-grey-2'})`)
  // folder: square corner of the panel under a tab at the row's end
  // (TabStrip.vue tells which end the chosen tab touches).
  const edges = ref({ start: true, end: false })
  const folderCorners = computed(() => ({
    '--folder-start': edges.value.start ? '0' : 'var(--large-border-radius)',
    '--folder-end': edges.value.end ? '0' : 'var(--large-border-radius)',
  }))

  // The card's own look comes from the block, as in a card set - only the
  // width is the block's whole width rather than a card's.
  function panelCard (card: TemplateBlockModel): TemplateBlockModel {
    return {
      ...card,
      width: 0,
      height: props.item.height,
      size: props.item.size || 24,
      mobileSize: props.item.mobileSize,
      ver: props.item.ver || 2,
      background: props.item.background,
      color: props.item.color,
      cardBackground: props.item.cardBackground,
      cardStyle: props.item.cardStyle,
      titleClass: props.item.titleClass,
      contentClass: props.item.contentClass,
    }
  }
</script>

<template>
  <div :id="props.item.id" :class="['tab-set', `tab-set--${look}`, props.item.class]" :style="{ '--tab-plate': plate, ...folderCorners }">
    <TabStrip
      v-model="active"
      :accent="accent"
      :labels="labels"
      :look="look"
      :plate="plate"
      @edges="edges = $event"
    />
    <div class="tab-set__panels">
      <div
        v-for="(card, index) of cards"
        :key="index"
        :aria-hidden="index !== active"
        :class="['tab-set__panel', {
          'tab-set__panel--active': index === active,
          'tab-set__panel--before': index < active,
          'tab-set__panel--after': index > active,
        }]"
        :inert="index !== active || undefined"
        role="tabpanel"
      >
        <TemplateCard :item="panelCard(card)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-set {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}
.tab-set__panels {
  display: grid;
  /* The panels waiting at the side (translated 24px for the slide) stay
     inside: on a phone they made the whole page 12px wider. A little room
     is kept for a card's shadow. */
  overflow-x: clip;
  overflow-clip-margin: 8px;
}
.tab-set__panel {
  grid-area: 1 / 1;
  display: flex;
  min-width: 0;
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.35s ease, transform 0.35s ease, visibility 0s linear 0.35s;
}
.tab-set__panel--before {
  transform: translateX(-24px);
}
.tab-set__panel--after {
  transform: translateX(24px);
}
.tab-set__panel--active {
  visibility: visible;
  opacity: 1;
  transform: none;
  transition: opacity 0.35s ease, transform 0.35s ease, visibility 0s;
}
.tab-set__panel > * {
  flex: 1 1 auto;
}
/* folder: the chosen tab and the panel are one piece - the panel's corner
   under a tab at the row's end is square, and the card in it wears no fill
   or corners of its own (the panel is its fill). */
.tab-set--folder {
  gap: 0;
}
.tab-set--folder .tab-set__panels {
  border-radius: var(--folder-start) var(--folder-end) var(--large-border-radius) var(--large-border-radius);
  background: var(--tab-plate);
  overflow: hidden;
}
.tab-set--folder .tab-set__panels :deep(.tab-set__panel > *),
.tab-set--folder .tab-set__panels :deep(.v-card) {
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .tab-set__panel,
  .tab-set__panel--active {
    transform: none;
    transition: none;
  }
}
</style>
