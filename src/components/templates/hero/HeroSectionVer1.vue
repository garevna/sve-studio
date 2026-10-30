<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed, ref, watch } from 'vue'
  import { useAjaxStore } from '@/stores/ajax'
  import { useCommonStore } from '@/stores/common'
  import { resolveThemeAssetPath } from '@/utils/theme-asset-path'
  import SearchPanelVer1 from './SearchPanelVer1.vue'

  // The page's hero: the banner carousel with the trip-search panel under it -
  // ported from production's own hero-section/theme_2 with the markup and
  // classes kept verbatim, so what the editor shows is what the site renders.
  //
  // The banners are REAL, fetched from the same public endpoint production
  // uses (/finance/banners - no token, confirmed live). That is a deliberate
  // exception to this app's "no live requests in a preview" habit: production
  // rotates a carousel of the client's own banners, and a single static
  // picture in its place would misrepresent the top of the page badly enough
  // to mislead the person editing it.
  //
  // The SEARCH PANEL below is the opposite: no city lookup, no available-date
  // request, no search. It is a likeness that can be clicked through and
  // leads nowhere, because that is a control, not content - see
  // SearchPanelVer1.
  //
  // "Ver1" because the hero is a variant, and today there is one.
  const commonStore = useCommonStore()
  const ajaxStore = useAjaxStore()
  const { baner, banerHeight, locale, mobileMode } = storeToRefs(commonStore)

  const banners = ref<string[]>([])

  // Refetched when either input changes: the endpoint answers per locale AND
  // per screen size (production asks for mobile banners separately, and they
  // are different images, not the same ones scaled).
  watch([locale, mobileMode], async () => {
    banners.value = await ajaxStore.getHeroBanners(locale.value, mobileMode.value)
  }, { immediate: true })

  // What to show when the client has no banners on the API: their own image
  // from global.json if they set one, otherwise the theme's bundled
  // per-locale picture - the same fallback chain production walks, so an
  // unconfigured site looks identical in both places.
  const fallbackSrc = computed(() => (baner.value
    ? resolveThemeAssetPath(baner.value, commonStore.activeTheme)
    : '/images/baner-placeholder.png'))

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
    <SearchPanelVer1 />
  </div>
</template>

<style scoped>
/* Verbatim from production's own hero-section/theme_2/HeroSection.vue - the
   rules that still apply once the "opacity-card" overlay it no longer
   renders is left out. */
.hero-section {
  margin-top: 64px;
  max-width: 1440px;
  margin-inline: auto;
}
</style>
