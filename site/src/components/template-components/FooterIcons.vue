<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'

  import { footerIcons } from '../../assets/footer-icons'

  import { useCommonStore } from '../../stores/common'

  const linkNames = ['facebook', 'instagram', 'tiktok', 'whatsApp', 'viber', 'telegram'] as const

  type LinkNameModel = typeof linkNames[number]

  // Both links and icon glyphs live in global.json (GlobalSettingsModel.links/
  // socialIcons) - a site-wide setting, not something specific to one footer
  // variant (reverted from a per-block props.links that was tried and walked
  // back - see the visual editor's own FooterEditor.vue comment on this).
  const { company, locale } = storeToRefs(useCommonStore())

  const mobileIconsLabel = {
    uk: 'Ми у соцмережах',
    en: 'Our social media accounts',
    de: 'Wir sind in den sozialen Medien',
  }

  const links = computed(() => company.value?.links || {})

  function iconSrc (name: LinkNameModel): string {
    return company.value?.socialIcons?.[name] || footerIcons[name]
  }

  // Real links: a web address opens in a new tab, an app's (viber:, tg:,
  // whatsapp:...) is handed to the app in place - opened in a new tab it
  // left a tab saying the page is unavailable.
  function href (link: LinkNameModel): string | undefined {
    return (links.value as Record<string, string>)[link] || undefined
  }
  function isWeb (link: LinkNameModel): boolean {
    return /^https?:/i.test(href(link) ?? '')
  }
</script>

<template>
  <div>
    <div class="footer-mobile-icons mb-4 text-center">
      {{ mobileIconsLabel[locale as keyof typeof mobileIconsLabel] }}
    </div>
    <div class="grid-icons">
      <a
        v-for="(linkName, index) in linkNames"
        :key="index"
        :aria-label="linkName"
        class="footer-icon-link"
        :href="href(linkName)"
        :rel="isWeb(linkName) ? 'noopener' : undefined"
        :target="isWeb(linkName) ? '_blank' : undefined"
      >
        <img
          alt=""
          class="footer-icon cursor-pointer"
          height="36"
          :src="iconSrc(linkName)"
          width="36"
        >
      </a>
    </div>
    <v-divider class="mt-4" />
  </div>
</template>

<style scoped>
.footer-mobile-icons {
  display: none;
}
.footer-icon-link {
  display: block;
  line-height: 0;
}
.grid-icons {
  display: grid;
  grid-template-columns: 36px 36px 36px 36px 36px 36px;
  grid-column-gap: 16px;
}

@media screen and (max-width: 640px) {
  .footer-mobile-icons {
    display: block;
    margin-top: 40px;
  }
}
</style>
