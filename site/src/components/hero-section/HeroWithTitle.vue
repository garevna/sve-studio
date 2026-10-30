<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import { useCommonStore } from '../../stores/common'

  // Layout 2 of the top of the site: the page's top parallax (the
  // full-window one, block type "parallax" - see App.vue) raised above the
  // menu bar, with the company name written large in one of its corners.
  // A page without its own parallax shows the site's banner (global.json
  // baner) in the same place. Same markup as the top parallax in App.vue,
  // so parallax.css sizes both alike.
  //
  // The name is global.json provider, the corner header.titlePosition - see
  // configs/header-layout.ts.
  const {
    baners,
    company,
    headerSettings,
    mobileMode,
    parallaxImage,
    parallaxHeader,
    parallaxTitle,
    parallaxText,
    parallaxTheme,
  } = storeToRefs(useCommonStore())

  const src = computed(() => parallaxImage.value
    || (mobileMode.value ? baners.value?.mobile : '')
    || baners.value?.desktop
    || '')
</script>

<template>
  <section class="hero-with-title">
    <!-- eager: the top of the page is always on screen, and Vuetify's
      wait-until-visible never fires inside the editor's preview frame
      ("Верхня частина сторінки") - the picture then never loads. -->
    <v-parallax eager :src="src" width="100vw">
      <div v-if="parallaxImage && (parallaxHeader || parallaxTitle)" :class="parallaxTheme">
        <h2 v-if="parallaxHeader" class="parallax-header">{{ parallaxHeader }}</h2>
        <h4 class="parallax-title text-bold text-left">{{ parallaxTitle }}</h4>
        <p v-if="parallaxText" class="parallax-text text-left">{{ parallaxText }}</p>
      </div>
      <div class="hero-with-title-frame" :class="`hero-with-title-frame--${headerSettings.titlePosition}`">
        <h1 class="h1 text-white hero-with-title-name">{{ company?.name }}</h1>
      </div>
    </v-parallax>
  </section>
</template>

<style scoped>
/* Lines up with the menu bar's own content (max 1440px, 36px side padding),
   so the name and the logo under it share one left edge. */
.hero-with-title-frame {
  position: absolute;
  inset: 0;
  max-width: 1440px;
  margin-inline: auto;
  padding: 48px 36px;
  display: flex;
  pointer-events: none;
}
.hero-with-title-frame--top-left { align-items: flex-start; justify-content: flex-start; }
.hero-with-title-frame--top-right { align-items: flex-start; justify-content: flex-end; text-align: right; }
.hero-with-title-frame--bottom-left { align-items: flex-end; justify-content: flex-start; }
.hero-with-title-frame--bottom-right { align-items: flex-end; justify-content: flex-end; text-align: right; }

.hero-with-title-name {
  margin: 0;
  max-width: 100%;
  line-height: 1.05;
  overflow-wrap: anywhere;
  /* Keeps white letters readable over a light part of the picture. */
  text-shadow: 0 2px 16px rgb(0 0 0 / 0.45);
}

@media screen and (max-width: 600px) {
  .hero-with-title-frame {
    padding: 24px 16px;
  }
}
</style>
