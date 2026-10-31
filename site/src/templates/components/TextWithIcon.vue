<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/common'
  import { storeToRefs } from 'pinia'

  import { computed } from 'vue'

  import IconVariant from '../../components/small/IconVariant.vue'
  import { getImageURL } from '../../services/get-image-url'
  import { useCommonStore } from '../../stores/common'

  const { locale } = storeToRefs(useCommonStore())

  const lang = computed(() => locale.value as 'uk' | 'en' | 'de')

  const props = defineProps<{ item: TemplateBlockModel }>()

  const iconSize = computed(() => (props.item.size || 24) + 'px')

  // A line with a link (a social network, tel:, mailto:) is a real link;
  // web addresses open in a new tab.
  const external = computed(() => /^https?:/i.test(props.item.link || ''))
</script>

<template>
  <component
    :is="props.item.link ? 'a' : 'div'"
    :class="['text-with-icon', props.item.class, { 'text-with-icon--link': props.item.link }]"
    :href="props.item.link || undefined"
    :rel="external ? 'noopener' : undefined"
    :target="external ? '_blank' : undefined"
  >
    <icon-variant
      v-if="props.item.icon"
      :background="props.item.background ? `var(--${props.item.background})` : null"
      :color="props.item.color || 'primary'"
      :icon="props.item.icon || ''"
      :size="props.item.size || 48"
      :variant="2"
    />

    <img v-else-if="props.item.image" :height="props.item.size || 48" :src="getImageURL(props.item.image)">

    <span v-else />

    <p :class="props.item.text || 'default-text text-medium text-black text-left'">
      {{ props.item.content[lang] }}
    </p>
  </component>
</template>

<style scoped>
.text-with-icon {
  display: grid;
  grid-template-columns: v-bind(iconSize) 1fr;
  column-gap: 16px;
  align-content: center;
  margin-top: 12px;
}

.text-with-icon--link {
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}
.text-with-icon--link:hover p {
  text-decoration: underline;
}

.text-with-icon img {
  vertical-align: middle;
}
</style>
