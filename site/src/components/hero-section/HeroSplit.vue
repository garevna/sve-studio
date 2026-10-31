<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import { useCommonStore } from '../../stores/common'

  // Layout 3 of the top of the site: under the menu bar, the company name
  // and a tagline beside the site's banner picture, on a palette colour
  // (configs/header-layout.ts: header.background, header.tagline). The
  // colour is a dark one, so the text is white. `background:` rather than
  // `background-color:`, so a palette gradient works as the fill too.
  const { baners, company, headerSettings, locale, mobileMode } = storeToRefs(useCommonStore())

  const src = computed(() => (mobileMode.value ? baners.value?.mobile : '') || baners.value?.desktop || '')
  const fill = computed(() => `var(--${headerSettings.value.background})`)
  const tagline = computed(() => {
    const texts = headerSettings.value.tagline
    return texts[locale.value as keyof typeof texts] || texts.uk || ''
  })
</script>

<template>
  <section class="hero-split" :style="{ background: fill }">
    <div class="hero-split-inner">
      <div class="hero-split-text">
        <h1 class="h1 text-white hero-split-name">{{ company?.name }}</h1>
        <p v-if="tagline" class="hero-split-tagline">{{ tagline }}</p>
      </div>
      <div v-if="src" class="hero-split-picture">
        <img alt="" :src="src">
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-split {
  width: 100%;
  color: var(--white);
}
/* Lines up with the menu bar's own content (max 1440px, 36px side padding). */
.hero-split-inner {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  align-items: center;
  gap: 48px;
  max-width: 1440px;
  margin-inline: auto;
  padding: 64px 36px;
}
.hero-split-text {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}
.hero-split-name {
  margin: 0;
  /* Scales with the screen, so a long name keeps whole words. */
  font-size: clamp(2.5rem, 5.5vw, 5.5rem);
  line-height: 1.05;
  overflow-wrap: break-word;
}
.hero-split-tagline {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.5;
  opacity: 0.9;
  white-space: pre-line;
}
.hero-split-picture {
  min-width: 0;
  aspect-ratio: 16 / 10;
  border-radius: var(--large-border-radius, 36px);
  overflow: hidden;
  box-shadow: 0 24px 48px rgb(0 0 0 / 0.25);
}
.hero-split-picture img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media screen and (max-width: 960px) {
  .hero-split-inner {
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
    padding: 40px 16px;
  }
  .hero-split-picture {
    border-radius: var(--default-border-radius, 32px);
  }
}
</style>
