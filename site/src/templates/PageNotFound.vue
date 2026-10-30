<script setup lang="ts">
  import { computed } from 'vue'
  import { useSiteNavigation } from '../composables/site-navigation'
  import { HOME_PAGE_ID } from '../services/site-links'
  import { useCommonStore } from '../stores/common'

  // An address with no page behind it: a mistyped link, or a page that was
  // deleted. Written in the site's own look.
  const TEXTS: Record<string, { title: string, text: string, home: string }> = {
    uk: { title: 'Сторінку не знайдено', text: 'Можливо, її видалили або посилання містить помилку.', home: 'На головну' },
    en: { title: 'Page not found', text: 'It may have been removed, or the link has a typo.', home: 'Go to the home page' },
    de: { title: 'Seite nicht gefunden', text: 'Sie wurde möglicherweise entfernt, oder der Link enthält einen Fehler.', home: 'Zur Startseite' },
  }

  const commonStore = useCommonStore()
  const { pagePath } = useSiteNavigation()
  const texts = computed(() => TEXTS[commonStore.locale] ?? TEXTS.en!)
</script>

<template>
  <div class="page-not-found text-center">
    <h1 class="h1 mb-4">{{ texts.title }}</h1>
    <p class="default-text text-grey mb-8">{{ texts.text }}</p>
    <RouterLink class="primary-button d-inline-flex align-center px-8" :to="pagePath(HOME_PAGE_ID)">
      {{ texts.home }}
    </RouterLink>
  </div>
</template>

<style scoped>
.page-not-found {
  padding: 160px 16px 120px;
  max-width: 640px;
  margin-inline: auto;
}

.primary-button {
  text-decoration: none;
  min-height: 48px;
}
</style>
