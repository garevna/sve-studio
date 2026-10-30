<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/common'
  import SwiperCore from 'swiper'
  import { Autoplay, Navigation, Pagination } from 'swiper/modules'
  import { Swiper, SwiperSlide } from 'swiper/vue'
  import { computed, ref } from 'vue'
  import { getImageURL } from '../../services/get-image-url'
  import 'swiper/css/autoplay'
  import 'swiper/css'

  import 'swiper/css/navigation'
  import 'swiper/css/pagination'

  SwiperCore.use([Navigation, Autoplay, Pagination])

  const space = 16

  const props = defineProps<{ item: TemplateBlockModel }>()

  const images = computed(() => props.item.images || [])
  const height = computed(() => props.item.height || 360)

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

  const slidesPerShow = computed(() => images.value.length - 3)
</script>

<template>
  <swiper
    :autoplay="{ delay: 3000, disableOnInteraction: true }"
    :centered-slides="true"
    :class="['mx-auto', props.item.class]"
    :loop="true"
    :modules="modules"
    :slides-per-view="slidesPerShow"
    :space-between="space"
    :style="{
      '--swiper-navigation-color': 'var(--secondary)',
      '--swiper-pagination-color': 'var(--secondary)',
      height: `${height}px`,
    }"
    @autoplay-time-left="onAutoplayTimeLeft"
  >
    <template v-for="(image, index) of images" :key="index">
      <swiper-slide :style="{ height: '100%', width: image.width ? image.width + 'px' : '100%' }">
        <!-- <template-card :item="image" style="height: 100%" /> -->
        <v-img cover :src="getImageURL(image.src)" style="height: 100%; width: 100%" />
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

.swiper-slide {
  height: 100% !important;
  /* width: v-bind(slideWidth) !important; */
  cursor: grab;
}

.swiper-slide .v-img {
  border-radius: var(--default-border-radius) !important;
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
