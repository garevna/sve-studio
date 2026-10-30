<script setup lang="ts">
  import type { TemplateBlockModel } from '../../types/common'
  import { storeToRefs } from 'pinia'

  import { computed } from 'vue'
  import { getImageURL } from '../../services/get-image-url'
  import { useCommonStore } from '../../stores/common'
  import TemplateParallax from './TemplateParallax.vue'

  const { winSize, locale } = storeToRefs(useCommonStore())

  const props = defineProps<{ item: TemplateBlockModel }>()

  const containerBackground = computed(() => props.item.class)
  const picture = computed(() => `url(${getImageURL(props.item.image)})`)

  const margin = computed(() => {
    if (winSize.value.width >= 1264) {
      return '-240px'
    } else if (winSize.value.width > 1180) {
      return '-280px'
    } else if (winSize.value.width > 1136) {
      return '-300px'
    } else if (winSize.value.width > 1094) {
      return '-340px'
    } else {
      return '-400px'
    }
  })

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
    <v-card :class="['w-100 overflow-hidden', props.item.class]" color="light-blue" height="480" style="position: relative">
      <div class="picture-fone-circle" />
      <div class="pa-5" style="max-width: 800px; width: 50%; margin-left: auto">
        <p class="title-of-card text-center">{{ title }}</p>
        <template v-for="(text, index) of props.item.children" :key="index">
          <p :class="text.class">{{ text.content[locale as 'uk' | 'en' | 'de'] }}</p>
        </template>
      </div>
    </v-card>
  </template>
  <template v-else>
    <template-parallax :class="props.item.class" :item="parallaxSection" />
  </template>
</template>

<style scoped>
  .container {
    border-radius: var(--default-border-radius);
    background: v-bind(containerBackground);
    height: 480px;
  }
  .picture-fone-circle {
    position: absolute;
    left: v-bind(margin);
    top: -180px;
    border-radius: 50%;
    width: 840px;
    height: 840px;
    display:flex;
    justify-items: center;
    align-items: center;
    background: v-bind(picture);
    background-size: 100%;
    background-repeat: no-repeat;
    background-position: center right;
  }

  .title-of-card {
    border-radius: var(--default-border-radius);
    background: var(--primary);
    padding: 8px 12px;
    font-size: 44px;
    font-weight: 700;
    color: var(--white);
    /* -webkit-text-stroke: var(--primary) 2px; */
  }
</style>
