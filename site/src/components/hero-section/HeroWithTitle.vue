<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import { TITLE_SIZES } from '../../configs/header-layout'
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
    parallaxHeaderClass,
    parallaxTitleClass,
    parallaxTextClass,
    parallaxTitle,
    parallaxText,
    parallaxTheme,
  } = storeToRefs(useCommonStore())

  // Which edge the name takes - on a phone the panel keeps to the other one.
  const nameSide = computed(() => {
    if (!headerSettings.value.showTitle) {
      return 'none'
    }
    return headerSettings.value.titlePosition.startsWith('top') ? 'top' : 'bottom'
  })

  const src = computed(() => parallaxImage.value
    || (mobileMode.value ? baners.value?.mobile : '')
    || baners.value?.desktop
    || '')
</script>

<template>
  <section :class="['hero-with-title', `hero-with-title--name-${nameSide}`]">
    <!-- eager: the top of the page is always on screen, and Vuetify's
      wait-until-visible never fires inside the editor's preview frame
      ("Верхня частина сторінки") - the picture then never loads. -->
    <v-parallax eager :src="src" width="100vw">
      <div v-if="parallaxImage && (parallaxHeader || parallaxTitle)" :class="[parallaxTheme, 'parallax-panel']">
        <h2 v-if="parallaxHeader" :class="parallaxHeaderClass">{{ parallaxHeader }}</h2>
        <h4 :class="parallaxTitleClass">{{ parallaxTitle }}</h4>
        <p v-if="parallaxText" :class="parallaxTextClass">{{ parallaxText }}</p>
      </div>
      <div v-if="headerSettings.showTitle" class="hero-with-title-frame" :class="`hero-with-title-frame--${headerSettings.titlePosition}`">
        <h1 :class="['h1 text-white hero-with-title-name', headerSettings.titleFont, { 'title-font-own-weight': headerSettings.titleFont }]" :style="{ '--title-scale': TITLE_SIZES[headerSettings.titleSize] }">{{ company?.name }}</h1>
      </div>
    </v-parallax>
  </section>
</template>

<style scoped>
/* The panel never runs through the company name: with the name on the
   picture's bottom edge the panel keeps to the top and takes only the room
   its texts need (and the other way round). Without a name it fills the
   picture's height as it always has. */
.hero-with-title--name-bottom .parallax-panel {
  bottom: auto;
  gap: 12px;
}
.hero-with-title--name-top .parallax-panel {
  top: auto;
  gap: 12px;
}
/* A formatted panel text (utils/parallax-text-class.ts) may be set big,
   and the panel is narrow on a phone: long words wrap instead of pushing
   the page wider, and the big sizes shrink with the screen. */
.parallax-panel > * {
  max-width: 100%;
  overflow-wrap: anywhere;
}
@media screen and (max-width: 960px) {
  .parallax-panel > .h1 { font-size: clamp(28px, 10vw, 68px); }
  .parallax-panel > .h2 { font-size: clamp(22px, 7vw, 36px); }
  .parallax-panel > .h3 { font-size: clamp(20px, 6vw, 28px); }
}
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

/* A decorative font (Rubik Dirt and the like) usually has one weight: the
   h1's bold would be faked by the browser, which fills in the very holes
   that make the font. Its own weight, nothing synthesized. */
/* The name's size (header.titleSize): a multiple of the h1's own 96px,
   never wider than the screen allows - a big name wraps, it doesn't spill. */
.hero-with-title-name {
  font-size: min(calc(96px * var(--title-scale, 1)), 14vw);
}
@media screen and (max-width: 600px) {
  .hero-with-title-name {
    font-size: min(calc(68px * var(--title-scale, 1)), 14vw);
  }
}
.hero-with-title-name.title-font-own-weight {
  font-weight: 400;
  font-synthesis: none;
}
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
