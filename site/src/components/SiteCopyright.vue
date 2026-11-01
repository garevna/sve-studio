<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import { useCommonStore } from '@/stores/common'

  // The last line of every page: the site owner's copyright, and - smaller -
  // that the site is made with Pagewright, whose author keeps the
  // rights to it (see the repository's LICENSE).
  const { company, locale } = storeToRefs(useCommonStore())

  const year = new Date().getFullYear()

  const MADE_WITH: Record<string, string> = {
    uk: 'Зроблено в Pagewright',
    en: 'Made with Pagewright',
    de: 'Erstellt mit Pagewright',
  }
  const madeWith = computed(() => MADE_WITH[locale.value] ?? MADE_WITH.en)
</script>

<template>
  <div class="site-copyright">
    <span>© {{ year }} {{ company?.name }}</span>
    <span class="site-copyright__editor">{{ madeWith }} · © Irina Fylyppova</span>
  </div>
</template>

<style scoped>
.site-copyright {
  display: flex;
  flex: 1 0 100%;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 24px;
  max-width: 1368px;
  margin: 24px auto 0;
  padding: 16px 16px 0;
  border-top: solid 1px color-mix(in srgb, var(--white) 20%, transparent);
  font-size: 13px;
  opacity: 0.85;
}
.site-copyright__editor {
  font-size: 12px;
  opacity: 0.8;
}
@media (max-width: 600px) {
  .site-copyright { justify-content: center; text-align: center; }
}
</style>
