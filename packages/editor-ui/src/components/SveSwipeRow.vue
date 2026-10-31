<script setup lang="ts" generic="T">
  import type { Swiper as SwiperInstance } from 'swiper'
  import { FreeMode, Mousewheel } from 'swiper/modules'
  import { Swiper, SwiperSlide } from 'swiper/vue'
  import { ref } from 'vue'
  import 'swiper/css'
  import 'swiper/css/free-mode'

  // A row of tabs or chips that may not fit its container: the Swiper, so it
  // is swiped left and right the same way on a phone and on a desktop - with
  // a finger, by dragging with the mouse, with the wheel or a touchpad. No
  // arrows (they take room); the edge that hides more tabs fades out.
  //
  // items: one slide each, drawn by the default slot ({ item, index }).
  // active: the index of the selected tab - brought into view on start.
  //
  // In development Vue warns about "_freeModeStaticRelease": swiper/vue
  // re-emits that internal free-mode event without declaring it. Harmless,
  // and absent from a production build.
  const props = defineProps<{ items: T[], active?: number }>()

  const canBack = ref(false)
  const canForward = ref(false)

  function update (swiper: SwiperInstance) {
    canBack.value = !swiper.isLocked && !swiper.isBeginning
    canForward.value = !swiper.isLocked && !swiper.isEnd
  }

  function onSwiper (swiper: SwiperInstance) {
    if (props.active && props.active > 0) {
      swiper.slideTo(props.active, 0)
    }
    update(swiper)
  }
</script>

<template>
  <div
    :class="['sve-ui sve-swipe-row', {
      'sve-swipe-row--back': canBack,
      'sve-swipe-row--forward': canForward,
    }]"
  >
    <Swiper
      class="sve-swipe-row__track"
      :free-mode="{ enabled: true, momentumBounce: false }"
      grab-cursor
      :modules="[FreeMode, Mousewheel]"
      :mousewheel="{ releaseOnEdges: true }"
      :resistance-ratio="0.6"
      slides-per-view="auto"
      :space-between="6"
      :threshold="4"
      watch-overflow
      @lock="update"
      @progress="update"
      @resize="update"
      @swiper="onSwiper"
      @unlock="update"
    >
      <SwiperSlide v-for="(item, index) of items" :key="index" class="sve-swipe-row__slide">
        <slot :index="index" :item="item" />
      </SwiperSlide>
    </Swiper>
  </div>
</template>

<style scoped>
.sve-swipe-row {
  min-width: 0;
}
.sve-swipe-row__track {
  margin: 0;
  padding-bottom: 2px;
}
.sve-swipe-row__slide {
  width: auto;
}
/* The edge that hides more tabs fades out. */
.sve-swipe-row--forward .sve-swipe-row__track {
  mask-image: linear-gradient(to right, #000 calc(100% - 40px), transparent);
}
.sve-swipe-row--back .sve-swipe-row__track {
  mask-image: linear-gradient(to left, #000 calc(100% - 40px), transparent);
}
.sve-swipe-row--back.sve-swipe-row--forward .sve-swipe-row__track {
  mask-image: linear-gradient(to right, transparent, #000 40px, #000 calc(100% - 40px), transparent);
}
</style>
