<script setup lang="ts">
  import type { LocaleModel } from '../../types/common'
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import { localeIcons } from '../../assets/langs'
  import { useSiteNavigation } from '../../composables/site-navigation'
  import { useCommonStore } from '../../stores/common'
  import LangSwitcher from './LangSwitcher.vue'

  // The site's own languages (global.json locales); choosing one opens the
  // same page in it.
  type LangModel = {
    id: LocaleModel
    prependAvatar: string
    title: string
  }

  const { locale, siteLocales } = storeToRefs(useCommonStore())
  const { switchLocale } = useSiteNavigation()

  const langs = computed<LangModel[]>(() => siteLocales.value.map(id => ({
    id: id as LocaleModel,
    prependAvatar: (localeIcons as Record<string, string>)[id] ?? '',
    title: id.toUpperCase(),
  })))
  const current = computed(() => langs.value.find(item => item.id === locale.value) ?? langs.value[0]!)
</script>

<template>
  <lang-switcher
    :current="current"
    :langs="langs"
    @switch-locale="switchLocale"
  />
</template>
