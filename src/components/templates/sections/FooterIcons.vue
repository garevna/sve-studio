<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  // Editor-side preview of the site's FooterIcons.vue - same grid, real
  // click-through to whichever URL is configured. Links AND icon glyphs both
  // live in global.json (GlobalSettingsModel.links/socialIcons), a site-wide
  // setting: read here from the general settings unless a caller hands them
  // in. `icons` falls back to the bundled default SVGs when a network has no
  // custom glyph set.
  import { footerIcons } from '@/assets/footer-icons'
  import { SOCIAL_NETWORK_LABELS, SOCIAL_NETWORKS, socialAddress } from '@/configs/social-networks'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'

  type PropsModel = { links?: Record<string, string>, icons?: Record<string, string> }

  const props = defineProps<PropsModel>()

  const settingsLinks = ref<Record<string, string>>({})
  const settingsIcons = ref<Record<string, string>>({})
  onMounted(async () => {
    const settings = await useAjaxStore().getGlobalSettings()
    settingsLinks.value = settings?.links || {}
    settingsIcons.value = settings?.socialIcons || {}
  })
  const links = computed(() => props.links ?? settingsLinks.value)

  function iconSrc (name: string): string {
    return (props.icons ?? settingsIcons.value)[name] || footerIcons[name as keyof typeof footerIcons]
  }

  // Real links, as on the site: a web address in a new tab, an app's
  // (viber:, tg:...) handed to the app in place.
  function href (name: string): string | undefined {
    return socialAddress(name, links.value) || undefined
  }
  // As on the site: only the networks with an address (Загальні
  // налаштування -> Соціальні мережі). With none at all the place stays
  // visible, saying where they are set.
  const shown = computed(() => SOCIAL_NETWORKS.filter(name => href(name)))

  function isWeb (name: string): boolean {
    return /^https?:/i.test(href(name) ?? '')
  }
</script>

<template>
  <div v-if="shown.length === 0" class="footer-icons-empty">{{ t('generalSettings.socialNone') }}</div>
  <div v-else class="grid-icons">
    <a
      v-for="name in shown"
      :key="name"
      :aria-label="SOCIAL_NETWORK_LABELS[name]"
      class="footer-icon-link"
      :href="href(name)"
      :rel="isWeb(name) ? 'noopener' : undefined"
      :target="isWeb(name) ? '_blank' : undefined"
    >
      <img
        alt=""
        class="footer-icon cursor-pointer"
        height="36"
        :src="iconSrc(name)"
        width="36"
      >
    </a>
  </div>
</template>

<style scoped>
.footer-icon-link {
  display: block;
  line-height: 0;
}
.grid-icons {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.footer-icons-empty {
  min-height: 36px;
  padding: 6px 12px;
  border: 1px dashed currentColor;
  border-radius: 8px;
  font-size: 13px;
  opacity: 0.7;
}
</style>
