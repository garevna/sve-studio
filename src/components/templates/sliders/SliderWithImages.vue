<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, ref } from 'vue'
  import { useAjaxStore } from '@/stores/ajax'

  // Plain image carousel, no thumbnail strip - was a Swiper.js instance
  // (matching production's own real component) but its per-slide width
  // repeatedly landed on 0 in this context despite several rounds of
  // targeted fixes (container-width gating, removing a conflicting inline
  // style, forcing a post-mount recalculation, finally a CSS-computed
  // !important width) - confirmed via live DevTools inspection each time,
  // never resolved. Vuetify's own v-carousel needs none of Swiper's
  // module/CSS/loop-mode machinery at all, so this deliberately trades
  // production fidelity for something that actually works reliably in the
  // editor - a real, known divergence from client-side's own component,
  // not an oversight.
  const props = defineProps<{ item: TemplateBlockModel }>()

  const ajaxStore = useAjaxStore()

  const images = computed(() => {
    const list = props.item.images || []
    return list.map(image => typeof image === 'string' ? { src: image } : image)
  })
  const height = computed(() => props.item.height || 360)

  // v-carousel's own built-in prev/next arrows overlay the image itself
  // (Vuetify's .v-window__controls is position:absolute over the content,
  // white circular buttons with a shadow) - production instead places
  // these controls OUTSIDE the scrolled images entirely, so :show-arrows
  // is off here and these two plain buttons (real flex siblings, not
  // overlaid) replace them, driving navigation through v-carousel's own
  // v-model instead.
  const activeIndex = ref(0)
  function prev () {
    activeIndex.value = (activeIndex.value - 1 + images.value.length) % images.value.length
  }
  function next () {
    activeIndex.value = (activeIndex.value + 1) % images.value.length
  }
</script>

<template>
  <div class="slider-with-images-wrap">
    <v-btn
      v-if="images.length > 1"
      class="slider-with-images-arrow"
      icon="mdi-chevron-left"
      variant="text"
      @click="prev"
    />
    <v-carousel
      v-model="activeIndex"
      :class="props.item.class"
      :continuous="true"
      :cycle="images.length > 1"
      :height="height"
      hide-delimiter-background
      :interval="3000"
      :show-arrows="false"
    >
      <v-carousel-item
        v-for="(image, index) of images"
        :key="index"
        cover
        :src="ajaxStore.getImageURL(image.src)"
      />
    </v-carousel>
    <v-btn
      v-if="images.length > 1"
      class="slider-with-images-arrow"
      icon="mdi-chevron-right"
      variant="text"
      @click="next"
    />
  </div>
</template>

<style scoped>
.slider-with-images-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}
.v-carousel {
  flex: 1 1 auto;
  min-width: 0;
  border-radius: var(--v-default-border-radius);
}
.slider-with-images-arrow {
  flex: 0 0 auto;
  color: #B7C2CC;
}
.v-carousel-item :deep(.v-img) {
  border-radius: var(--v-default-border-radius) !important;
}
</style>
