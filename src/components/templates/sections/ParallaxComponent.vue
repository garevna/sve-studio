<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useParallax } from '@/composables/useParallax'

  const props = defineProps<{
    imageHeight?: number
    imageSrc: string
  }>()

  const height = computed(() => props.imageHeight ? props.imageHeight + 'px' : '400px')

  const { el } = useParallax()

  // Photoshop-style checkerboard for an empty/not-found image - see
  // .image-placeholder-bg in common.css. Applied to the wrapper, not the
  // <img> itself: the image is absolutely positioned to cover the wrapper,
  // so an empty/broken <img> paints nothing and the wrapper's own
  // background is what actually shows through.
  const imageFailed = ref(false)
  watch(() => props.imageSrc, () => {
    imageFailed.value = false
  })
</script>

<template>
  <div ref="el" class="parallax-wrapper" :class="{ 'image-placeholder-bg': !imageSrc || imageFailed }">
    <img :src="props.imageSrc" @error="imageFailed = true">
    <div class="parallax-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
  .parallax-wrapper {
    position: relative;
    height: v-bind(height);
    overflow: hidden;
  }

  .parallax-wrapper img {
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 160%;
    object-fit: cover;
    transform: translateY(calc(-50% + var(--v-parallax-y, 0))) scale(1.05);
    will-change: transform;
  }
  .parallax-content {
    position: absolute;
    background: #FFF7;
    border-radius: var(--v-default-border-radius);
    top: 40px;
    left: 50%;
    right: 40px;
    bottom: 40px;
    padding: 12px 24px;
    color: var(--white);
    text-shadow: 0 0 2px #0009;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .parallax-content * {
    color: var(--white) !important;
    background: transparent;
    text-shadow: 0 0 5px #0009;
  }

  @media screen and (max-width: 960px) {
    .parallax-content {
      width: calc(100% - 80px);
      margin: 40px;
    }
  }
  @media screen and (max-width: 480px) {
    .parallax-content {
      width: calc(100% - 40px);
      margin: 20px;
    }
  }
</style>
