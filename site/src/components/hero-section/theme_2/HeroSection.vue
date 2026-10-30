<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed, ref, watch } from 'vue'

  import { getHeroBanners } from '../../../services/get-hero-banners'
  import { useCommonStore } from '../../../stores/common'
  import { sveRoot } from '../../../utils/sve-root'

  import SearchPanel from './SearchPanel.vue'

  // The page's hero: the client's real banner carousel with the trip-search
  // panel under it. Markup and classes verbatim from production's own
  // hero-section/theme_2.
  //
  // The banners are fetched (see get-hero-banners) because they are the
  // client's own content and a stand-in would misrepresent the page. The
  // search panel is not: it makes no requests, and leads nowhere. That is
  // the line this preview draws - content is shown as it is, controls are
  // imitated.
  const { baners, banerHeight, locale, mobileMode } = storeToRefs(useCommonStore())

  const banners = ref<string[]>([])

  watch([locale, mobileMode], async () => {
    banners.value = await getHeroBanners(locale.value as string, mobileMode.value)
  }, { immediate: true })

  // Same fallback chain production walks when a client has no banners on the
  // API: their own image from global settings, then the theme's bundled one.
  const fallbackSrc = computed(() => (mobileMode.value ? baners.value.mobile : baners.value.desktop)
    || `${sveRoot()}images/baner-placeholder.png`)

  const banerStyle = computed(() => ({ height: `${banerHeight.value}px` }))
</script>

<template>
  <div>
    <div id="hero-section-wrapper" class="hero-section">
      <v-carousel
        v-if="banners.length > 0"
        cycle
        hide-delimiters
        :show-arrows="false"
        :style="banerStyle"
      >
        <v-carousel-item v-for="(image, index) of banners" :key="index" :src="image" />
      </v-carousel>
      <v-img v-else cover :src="fallbackSrc" :style="banerStyle" />
    </div>
    <SearchPanel />
  </div>
</template>

<style scoped>
.hero-section {
  margin-top: 64px;
  max-width: 1440px;
  margin-inline: auto;
}

.opacity-card {
  width: 86%;
  background: #ffffff48;
  padding: 24px;
  border-radius: var(--small-border-radius);
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translate(-50%, -32px);
}

.opacity-card-item {
  width: 240px !important;
}

.opacity-card-labels {
  text-shadow: 0 0 4px #000;
}

.opacity-card-item:not(:last-child) {
  border-right: 1px solid var(--light-grey-1);
}

@media screen and (max-width: 1279px) {
  .opacity-card-item {
    width: 40% !important;
    border-bottom: 1px solid var(--light-grey-1);
  }
  .opacity-card-item:not(:last-child) {
    border-right: none;
  }
}

@media screen and (max-width: 880px) {
  h1 {
    font-size: 80px;
  }
}

@media screen and (max-width: 600px) {
  .opacity-card-item {
    width: 80% !important;
    border-right: none;
    border-bottom: 1px solid var(--light-grey-1);
  }
}
</style>
