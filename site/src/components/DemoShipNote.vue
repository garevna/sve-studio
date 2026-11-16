<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import { useCommonStore } from '../stores/common'

  // Under the demo site's footer: this ship was built at Pagewright's Верф
  // (the demo), and Pagewright's own site is elsewhere - never changed by
  // what is done here. Not on the owner's own site (utils/published.ts).
  const OWNER_SITE_URL = 'https://pagewright.pp.ua/'
  const WORDS = {
    uk: { note: 'Це демо: корабель, зібраний на Верфі Pagewright. Ваші зміни бачите лише ви.', link: 'Сайт Pagewright' },
    en: { note: 'This is a demo: a ship built at the Pagewright Pageyard. Only you see your changes.', link: 'Pagewright’s site' },
    de: { note: 'Das ist eine Demo: ein Schiff aus der Pagewright-Werft. Ihre Änderungen sehen nur Sie.', link: 'Pagewright-Website' },
  } as const
  const { locale } = storeToRefs(useCommonStore())
  const words = computed(() => WORDS[locale.value as keyof typeof WORDS] ?? WORDS.uk)
</script>

<template>
  <aside class="demo-ship-note">
    <span>{{ words.note }}</span>
    <a :href="OWNER_SITE_URL" rel="noopener" target="_blank">{{ words.link }} →</a>
  </aside>
</template>

<style scoped>
.demo-ship-note {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 4px 12px;
  padding: 12px 16px;
  background: var(--light-grey-2);
  color: var(--dark-grey);
  font-size: 0.85rem;
  text-align: center;
}
.demo-ship-note a {
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
}
.demo-ship-note a:hover {
  text-decoration: underline;
}
</style>
