<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/common'
  import { storeToRefs } from 'pinia'

  import { computed } from 'vue'

  import IconVariant from '../../components/small/IconVariant.vue'
  import { contactHref, contactOf, contactText } from '../../configs/site-contacts'
  import { resolveLink } from '../../configs/social-networks'
  import { getImageURL } from '../../services/get-image-url'
  import { useCommonStore } from '../../stores/common'

  const { locale, company, contacts } = storeToRefs(useCommonStore())

  const lang = computed(() => locale.value as 'uk' | 'en' | 'de')

  const props = defineProps<{ item: TemplateBlockModel }>()

  const iconSize = computed(() => (props.item.size || 24) + 'px')

  // A line with a link (a social network, tel:, mailto:) is a real link;
  // web addresses open in a new tab. "social:<network>" is the network's
  // address from global.json (configs/social-networks.ts).
  // A contact line (item.contact) shows the contact from global.json and
  // leads to a call / a letter / the map, unless it has a link of its own.
  const contact = computed(() => contactOf(props.item.contact, contacts.value))
  const shownText = computed(() => contact.value ? contactText(contact.value, lang.value) : props.item.content[lang.value])
  const href = computed(() => resolveLink(props.item.link, company.value?.links as Record<string, string> | undefined) || (contact.value ? contactHref(contact.value) : ''))
  const external = computed(() => /^https?:/i.test(href.value))
</script>

<template>
  <component
    :is="href ? 'a' : 'div'"
    :class="['text-with-icon', props.item.class, { 'text-with-icon--link': href }]"
    :href="href || undefined"
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
      {{ shownText }}
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
  align-items: center;
}
.text-with-icon--link:hover p {
  text-decoration: underline;
}

.text-with-icon img {
  vertical-align: middle;
}
</style>
