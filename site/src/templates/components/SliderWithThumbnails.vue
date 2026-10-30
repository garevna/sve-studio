<script setup lang="ts">
  import type { Swiper as SwiperClass } from 'swiper'
  import type { TemplateBlockModel } from '@/types/common'
  import SwiperCore from 'swiper'
  import { Navigation, Thumbs } from 'swiper/modules'
  import { Swiper, SwiperSlide } from 'swiper/vue'

  import { computed, ref } from 'vue'
  import { getImageURL } from '../../services/get-image-url'
  import 'swiper/css'

  import 'swiper/css/navigation'
  import 'swiper/css/thumbs'

  SwiperCore.use([Navigation, Thumbs])

  const props = defineProps<{ item: TemplateBlockModel }>()

  const images = computed(() => {
    const source = props.item.images || []
    if (source.length > 0) {
      return typeof source[0] === 'string'
        ? (source as unknown as string[]).map(src => ({ src }))
        : source as { src: string, width?: number }[]
    }
    return []
  })

  const thumbsSwiper = ref<SwiperClass | null>(null)
  const thumbs = computed(() => ({ swiper: thumbsSwiper.value as string | SwiperClass | HTMLElement | null | undefined }))

  function setThumbsSwiper (swiper: SwiperClass) {
    thumbsSwiper.value = swiper
  }

</script>

<template>
  <div :class="props.item.class">
    <swiper
      class="mySwiper2"
      :navigation="true"
      :observe-parents="true"
      :observer="true"
      :space-between="16"
      :style="{
        '--swiper-navigation-color': '#fff',
        '--swiper-pagination-color': '#fff',
      }"
      :thumbs="thumbs"
    >
      <template v-for="(image, index) of images" :key="index">
        <swiper-slide>
          <img :src="getImageURL(image.src)">
        </swiper-slide>
      </template>
    </swiper>
    <swiper
      class="mySwiper"
      :free-mode="true"
      :observe-parents="true"
      :observer="true"
      :slides-per-view="4"
      :space-between="16"
      :watch-slides-progress="true"
      :watch-slides-visibility="true"
      @swiper="setThumbsSwiper"
    >
      <template v-for="(image, num) of images" :key="num">
        <swiper-slide>
          <img :src="getImageURL(image.src)">
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
}

.swiper-slide img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--default-border-radius);
}

.swiper {
  width: 100%;
  height: 300px;
  margin-left: auto;
  margin-right: auto;
}

.swiper-slide {
  background-size: cover;
  background-position: center;
  border-radius: var(--default-border-radius);
  height: auto;
}

.mySwiper2 {
  height: 480px;
  width: 100%;
}

.mySwiper {
  /* height: 20%; */
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

.swiper-slide img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
