<script setup lang="ts">
  // import Swiper core and required modules
  import SwiperCore from 'swiper'
  import { Navigation, Thumbs } from 'swiper/modules'
  // Import Swiper Vue.js components
  import { Swiper, SwiperSlide } from 'swiper/vue'

  import { computed, ref } from 'vue'

  import { useAjaxStore } from '@/stores/ajax'
  import 'swiper/css'
  import 'swiper/css/navigation'
  import 'swiper/css/thumbs'

  const ajaxStore = useAjaxStore()

  // install Swiper modules
  SwiperCore.use([Navigation, Thumbs])

  const props = defineProps<{ images: (string | { src: string, width?: number })[] }>()

  const images = computed(() => {
    return typeof props.images[0] === 'string' ? (props.images as string[]).map(src => ({ src })) : props.images as { src: string, width?: number }[]
  })

  const thumbsSwiper = ref(null)

  function setThumbsSwiper (swiper: any) {
    thumbsSwiper.value = swiper
  }
</script>

<template>
  <div>
    <swiper
      centered-slides
      class="mySwiper2"
      :navigation="true"
      :slides-per-group="1"
      slides-per-view="auto"
      :space-between="16"
      :style="{
        '--swiper-navigation-color': '#fff',
        '--swiper-pagination-color': '#fff',
      }"
      :thumbs="{ swiper: thumbsSwiper }"
    >
      <template v-for="(image, index) of images" :key="index">
        <swiper-slide>
          <img :src="ajaxStore.getImageURL(image.src)">
        </swiper-slide>
      </template>
    </swiper>
    <swiper
      class="mySwiper"
      :free-mode="true"
      :slides-per-view="4"
      :space-between="16"
      :watch-slides-progress="true"
      :watch-slides-visibility="true"
      @swiper="setThumbsSwiper"
    >
      <template v-for="(image, num) of images" :key="num">
        <swiper-slide>
          <img :src="ajaxStore.getImageURL(image.src)">
        </swiper-slide>
      </template>
    </swiper>
  </div>
</template>

<style scoped>
.swiper {
  width: 100%;
  height: 100%;
}

.swiper-slide {
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: grab;
  background-size: cover;
  background-position: center;
  border-radius: var(--v-default-border-radius);
  height: auto;
  max-width: calc(100% - 20px);
}

.swiper-slide img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--v-default-border-radius);
}

.swiper {
  width: 100%;
  height: 300px;
  margin-left: auto;
  margin-right: auto;
}

.mySwiper2 {
  height: 480px;
  width: 100%;
}

.mySwiper {
  height: 80px !important;
  box-sizing: border-box;
  padding: 10px 0;
}

.mySwiper .swiper-slide {
  width: 25%;
  height: 100%;
  opacity: 0.4;
}

.mySwiper .swiper-slide-thumb-active {
  opacity: 1;
}
</style>
