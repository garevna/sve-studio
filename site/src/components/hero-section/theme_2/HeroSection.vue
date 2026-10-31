<script setup lang="ts">
  import { storeToRefs } from 'pinia'

  import { computed } from 'vue'
  import { useCommonStore } from '../../../stores/common'
  import { sveRoot } from '../../../utils/sve-root'
  import BannerTexts from '../BannerTexts.vue'

  // Layout 1 of the top of the site: the menu bar on top (App.vue), the
  // banner under it - one picture, or a carousel when the site has more
  // than one (global.json baner + banerSlides). Each banner can have its own
  // picture for phones; without one the desktop picture is used.
  //
  // The trip-search panel that used to sit under the banner
  // (SearchPanel.vue) is left out for now: it only fits a carrier. It comes
  // back once the editor has settings for the kind of business a site is for.
  const { baners, banerSlides, banerHeight, mobileMode } = storeToRefs(useCommonStore())

  // Each banner with its picture for this screen and the texts laid over it.
  const slides = computed(() => [baners.value, ...banerSlides.value]
    .map(banner => ({
      src: (mobileMode.value ? banner?.mobile || banner?.desktop : banner?.desktop || banner?.mobile) || '',
      texts: banner?.texts ?? [],
    }))
    .filter(slide => slide.src))

  const placeholder = computed(() => `${sveRoot()}images/baner-placeholder.png`)
  const banerStyle = computed(() => ({ height: `${banerHeight.value}px` }))
</script>

<template>
  <div id="hero-section-wrapper" class="hero-section">
    <v-carousel
      v-if="slides.length > 1"
      cycle
      :show-arrows="false"
      :style="banerStyle"
    >
      <v-carousel-item v-for="(slide, index) of slides" :key="index" cover :src="slide.src">
        <BannerTexts :texts="slide.texts" />
      </v-carousel-item>
    </v-carousel>
    <v-img v-else cover :src="slides[0]?.src || placeholder" :style="banerStyle">
      <BannerTexts :texts="slides[0]?.texts" />
    </v-img>
  </div>
</template>

<style scoped>
.hero-section {
  margin-top: 64px;
  max-width: 1440px;
  margin-inline: auto;
}
</style>
