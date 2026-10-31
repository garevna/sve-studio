<script setup lang="ts">
  import type { BannerText } from '../../types/common/GlobalSettingsModel'
  import { storeToRefs } from 'pinia'
  import { useCommonStore } from '../../stores/common'
  import { bannerTextBox } from '../../utils/banner-text'

  // The texts laid over one banner (global.json baner.texts / banerSlides[].texts),
  // in the visitor's language. Place and width are % of the banner box, size
  // % of its width - the box is a size container, so the text scales with
  // the picture. Phones have each text's own place (utils/banner-text.ts).
  const props = defineProps<{ texts?: BannerText[] }>()
  const { locale, mobileMode } = storeToRefs(useCommonStore())

  function words (text: BannerText): string {
    return text.text[locale.value as keyof BannerText['text']] || text.text.uk || ''
  }
  function place (text: BannerText) {
    const box = bannerTextBox(text, mobileMode.value)
    return { left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, fontSize: `${box.size}cqw` }
  }
</script>

<template>
  <div v-if="props.texts?.length" class="banner-texts">
    <div
      v-for="text of props.texts"
      :key="text.id"
      class="banner-text"
      :class="text.class"
      :style="place(text)"
    >{{ words(text) }}</div>
  </div>
</template>

<style scoped>
.banner-texts {
  position: absolute;
  inset: 0;
  container-type: size;
  pointer-events: none;
  z-index: 1;
}
.banner-text {
  position: absolute;
  line-height: 1.15;
  white-space: pre-line;
  overflow-wrap: break-word;
}
</style>
