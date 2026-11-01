<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/common'
  import { storeToRefs } from 'pinia'

  import { computed } from 'vue'

  import { contactHref, contactOf, contactText } from '@/configs/site-contacts'
  import { useCommonStore } from '@/stores/common'

  const { locale, contacts } = storeToRefs(useCommonStore())

  const props = defineProps<{ item: TemplateBlockModel }>()

  const type = computed(() => props.item.type as 'header' | 'title' | 'text')
  const id = computed(() => props.item.id || '')
  const className = computed(() => props.item.class)
  // A contact line (item.contact): the contact from global.json, a link to
  // call or write for a phone or an email.
  const contact = computed(() => contactOf(props.item.contact, contacts.value))
  const text = computed(() => contact.value ? contactText(contact.value, locale.value) : props.item.content[locale.value as keyof typeof props.item.content])
  const href = computed(() => contact.value ? contactHref(contact.value) : '')
</script>

<template>
  <template v-if="type === 'header'">
    <h2 :id="id" :class="[className || 'text-center text-md-left my-12']">
      {{ text }}
    </h2>
  </template>
  <template v-else-if="type === 'title'">
    <h3 :id="id" :class="[className || 'text-center text-md-left my-6']">
      {{ text }}
    </h3>
  </template>
  <template v-else-if="type === 'text'">
    <template v-if="Array.isArray(text)">
      <template v-for="(line, index) of text" :key="index">
        <p :class="className || 'default-text text-thin text-grey py-5 py-md-3'">
          {{ line }}
        </p>
      </template>
    </template>
    <template v-else>
      <p :class="className || 'default-text text-thin text-grey py-5 py-md-3'">
        <a
          v-if="href"
          class="contact-link"
          :href="href"
          :rel="href.startsWith('http') ? 'noopener' : undefined"
          :target="href.startsWith('http') ? '_blank' : undefined"
        >{{ text }}</a>
        <template v-else>{{ text }}</template>
      </p>
    </template>
  </template>
</template>

<style scoped>
/* A contact keeps the look of the text it is. */
.contact-link {
  color: inherit;
  font: inherit;
  text-decoration: none;
}
.contact-link:hover {
  text-decoration: underline;
}
</style>
