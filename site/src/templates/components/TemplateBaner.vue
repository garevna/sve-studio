<script setup lang="ts">
  import type { TemplateBlockModel } from '../../types/common'
  import { storeToRefs } from 'pinia'

  import { computed } from 'vue'
  import { getImageURL } from '../../services/get-image-url'
  import { useCommonStore } from '../../stores/common'
  import { CHECKER_STYLE, imageMissing } from '../../utils/image-fallback'
  import TemplateParallax from './TemplateParallax.vue'

  const { winSize, locale } = storeToRefs(useCommonStore())

  const props = defineProps<{ item: TemplateBlockModel }>()

  const picture = computed(() => `url(${getImageURL(props.item.image)})`)
  // No picture, or not found: the checkerboard (utils/image-fallback.ts).
  const pictureMissing = imageMissing(() => getImageURL(props.item.image))

  // The headline: its own format, else the look it always had (the same
  // default as the editor's TemplateBaner.vue); the plate under it in the
  // colour set in the editor.
  const titleClass = computed(() => props.item.titleClass || 'h2 text-bold text-white text-center')
  const titlePlate = computed(() => `var(--${props.item.titleBackground || 'primary'})`)

  const title = computed(() => props.item.title?.[locale.value as 'uk' | 'en' | 'de'] || '')

  const parallaxImage = computed(() => {
    const hasTranslatedContent = props.item.content?.[locale.value as 'uk' | 'en' | 'de']
    return hasTranslatedContent
      ? props.item.content
      : { uk: props.item.image, en: props.item.image, de: props.item.image }
  })

  const parallaxSection = computed(() => ({
    type: 'parallax-inside',
    content: parallaxImage.value,
    children: [
      {
        type: 'header',
        // class: 'h3 text-bold',
        content: props.item.title,
      },
      ...(props.item.children || []),
    ],
  } as unknown as TemplateBlockModel))
</script>
<template>
  <template v-if="winSize.width > 994">
    <!-- The fill set in the editor (a palette key or gradient), else the
      light blue it always had. -->
    <v-card
      :class="['baner-card', props.item.class]"
      :color="props.item.background ? undefined : 'light-blue'"
      :style="props.item.background ? { background: `var(--${props.item.background})` } : undefined"
    >
      <div class="baner-picture" :style="pictureMissing ? CHECKER_STYLE : undefined" />
      <div class="baner-body">
        <div class="baner-title-plate" :style="{ background: titlePlate }">
          <p :class="titleClass">{{ title }}</p>
        </div>
        <div class="baner-lines">
          <template v-for="(text, index) of props.item.children" :key="index">
            <p :class="text.class">{{ text.content[locale as 'uk' | 'en' | 'de'] }}</p>
          </template>
        </div>
      </div>
    </v-card>
  </template>
  <template v-else>
    <template-parallax :class="props.item.class" :item="parallaxSection" />
  </template>
</template>

<style scoped>
  /* The same shape as the editor's TemplateBaner.vue: the picture takes the
     left 45%, its right edge an arc; the headline's plate runs on under the
     arc to the right edge, the text below it. */
  .baner-card {
    --baner-height: 420px;
    --baner-split: 45%;
    --baner-radius: calc(var(--baner-height) * 0.95);
    position: relative;
    display: flex;
    width: 100%;
    height: var(--baner-height);
    overflow: hidden;
  }
  .baner-picture {
    position: absolute;
    z-index: 2;
    top: 0;
    bottom: 0;
    left: 0;
    width: var(--baner-split);
    background: v-bind(picture) center / cover no-repeat;
    clip-path: circle(var(--baner-radius) at calc(100% - var(--baner-radius)) 50%);
  }
  .baner-body {
    position: relative;
    z-index: 1;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
    margin-left: calc(var(--baner-split) - 90px);
    padding: 10px 10px 24px 0;
  }
  .baner-title-plate {
    padding: 18px 24px 18px 110px;
    border-radius: var(--default-border-radius);
  }
  .baner-title-plate p {
    margin: 0;
  }
  .baner-lines {
    padding: 32px 48px 0 140px;
  }
</style>
