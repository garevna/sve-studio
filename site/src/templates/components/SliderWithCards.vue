<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/common'
  import { storeToRefs } from 'pinia'
  import SwiperCore from 'swiper'
  import { Autoplay, Navigation, Pagination } from 'swiper/modules'
  import { Swiper, SwiperSlide } from 'swiper/vue'
  import { computed, ref } from 'vue'
  import { useCommonStore } from '@/stores/common'
  import TemplateCard from './TemplateCard.vue'
  import 'swiper/css/autoplay'

  import 'swiper/css'

  import 'swiper/css/navigation'

  import 'swiper/css/pagination'

  SwiperCore.use([Navigation, Autoplay, Pagination])

  const { winSize } = storeToRefs(useCommonStore())
  const space = 16

  const props = defineProps<{ item: TemplateBlockModel }>()

  const id = computed(() => props.item.id)
  const background = computed(() => props.item.background)
  const cards = computed(() => props.item.children || [])
  const color = computed(() => props.item.color)
  const width = computed(() => props.item.width || 320)
  const size = computed(() => props.item.size || 24)
  const ver = computed(() => props.item.ver || 1)

  const modules = [Autoplay, Pagination, Navigation]

  const progressCircle = ref(null)
  const progressContent = ref(null)

  function onAutoplayTimeLeft (s: unknown, time: number, progress: number) {
    if (progressCircle.value) {
      (progressCircle.value as HTMLElement).style.setProperty('--progress', (1 - progress).toString())
    }
    if (progressContent.value) {
      (progressContent.value as HTMLElement).textContent = `${Math.ceil(time / 1000)}s`
    }
  }

  const slideWidth = computed(() => (cards.value[0]?.width || 320) + 'px')

  const slidesPerShow = computed(() => {
    const containerWidth = Math.min(1440, winSize.value.width)
    const cardWidth = width.value || cards.value[0]?.width || 320
    const cardsNumber = Math.max(2, Math.floor((containerWidth + space) / (cardWidth + space)))
    return cardsNumber
    // return props.cards.length - 3
  })
</script>

<template>
  <swiper
    :id="id"
    :autoplay="{ delay: 3000, disableOnInteraction: true }"
    :centered-slides="true"
    :class="['mx-auto', props.item.class]"
    :loop="true"
    :modules="modules"
    :slides-per-view="slidesPerShow"
    :space-between="space"
    :style="{
      '--swiper-navigation-color': 'var(--grey)',
      '--swiper-pagination-color': 'var(--blue)',
    }"
    @autoplay-time-left="onAutoplayTimeLeft"
  >
    <template v-for="(card, index) of cards" :key="index">
      <swiper-slide>
        <!-- The carousel's own settings are every card's defaults (a card's
          own value wins) - the card reads them from its item, as in the
          editor; passed as separate attributes they never reached it. -->
        <template-card
          :item="{
            ...card,
            background: card.background || background,
            color: card.color || color,
            size: card.size ?? size,
            ver: card.ver || ver,
            width: card.width || width,
            cardStyle: card.cardStyle || props.item.cardStyle,
            cardBackground: card.cardBackground || props.item.cardBackground,
            titleClass: card.titleClass || props.item.titleClass,
            contentClass: card.contentClass || props.item.contentClass,
          }"
          style="height: 100%"
        />
      </swiper-slide>
    </template>
    <template #container-end>
      <div class="autoplay-progress">
        <svg ref="progressCircle" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" />
        </svg>
        <span ref="progressContent" />
      </div>
    </template>
  </swiper>
</template>

<style scoped>
.swiper {
  width: 100%;
  height: 100%;
  align-items: stretch !important;
  justify-items: stretch !important;
}

.swiper {
  height: auto;
  padding-bottom: 42px;
}
/* As tall as the tallest card: every slide stretches to the row's height
   (no stored height - the editor used to write a far too tall one). */
.swiper :deep(.swiper-wrapper) {
  align-items: stretch;
}
.swiper-slide {
  height: auto !important;
  margin-top: 8px;
  margin-bottom: 8px;
  width: v-bind(slideWidth) !important;
  cursor: grab;
}

.autoplay-progress {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 10;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: var(--grey);
}

.autoplay-progress svg {
  --progress: 0;
  position: absolute;
  left: 0;
  top: 0px;
  z-index: 10;
  width: 100%;
  height: 100%;
  stroke-width: 4px;
  stroke: var(--grey);
  fill: none;
  stroke-dashoffset: calc(125.6px * (1 - var(--progress)));
  stroke-dasharray: 125.6;
  transform: rotate(-90deg);
}
</style>
