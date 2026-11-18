<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'

  import { footerIcons } from '../../assets/footer-icons'

  import { SOCIAL_NETWORK_LABELS, SOCIAL_NETWORKS, socialAddress, type SocialNetwork } from '../../configs/social-networks'
  import { useCommonStore } from '../../stores/common'

  type LinkNameModel = SocialNetwork

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

  // Only the networks the site has an address for (Загальні налаштування ->
  // Соціальні мережі): an empty field means the site has no such account,
  // and an icon leading nowhere is not shown.
  const linkNames = computed(() => SOCIAL_NETWORKS.filter(name => href(name)))

  function iconSrc (name: LinkNameModel): string {
    return company.value?.socialIcons?.[name] || footerIcons[name]
  }

  // Real links: a web address opens in a new tab, an app's (viber:, tg:,
  // whatsapp:...) is handed to the app in place - opened in a new tab it
  // left a tab saying the page is unavailable.
  function href (link: LinkNameModel): string | undefined {
    return socialAddress(link, links.value as Record<string, string>) || undefined
  }
  function isWeb (link: LinkNameModel): boolean {
    return /^https?:/i.test(href(link) ?? '')
  }
</script>

<template>
  <div>
    <div v-if="linkNames.length > 0" class="footer-mobile-icons mb-4 text-center">
      {{ mobileIconsLabel[locale as keyof typeof mobileIconsLabel] }}
    </div>
    <div class="grid-icons">
      <a
        v-for="(linkName, index) in linkNames"
        :key="index"
        :aria-label="SOCIAL_NETWORK_LABELS[linkName]"
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
  /* as many as there are addresses, wrapping on a narrow column */
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

@media screen and (max-width: 640px) {
  .footer-mobile-icons {
    display: block;
    margin-top: 40px;
  }
}
</style>
