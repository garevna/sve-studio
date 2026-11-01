<script setup lang="ts">
  // Editor-side preview of client-side's own FooterIcons.vue - a faithful
  // visual clone (same grid, real click-through to whichever URL is
  // configured). Links AND icon glyphs both live in global.json
  // (GlobalSettingsModel.links/socialIcons), a site-wide setting - not this
  // component's own concern, so both come in as props from whoever calls it
  // (FooterEditor.vue, which fetches global settings directly). `icons`
  // falls back to the bundled default SVGs when a network has no custom
  // glyph set.
  import { footerIcons } from '@/assets/footer-icons'
  import { SOCIAL_NETWORKS } from '@/configs/social-networks'

  type PropsModel = { links?: Record<string, string>, icons?: Record<string, string> }

  const props = defineProps<PropsModel>()

  function iconSrc (name: string): string {
    return props.icons?.[name] || footerIcons[name as keyof typeof footerIcons]
  }

  // Real links, as on the site: a web address in a new tab, an app's
  // (viber:, tg:...) handed to the app in place.
  function href (name: string): string | undefined {
    return props.links?.[name] || undefined
  }
  function isWeb (name: string): boolean {
    return /^https?:/i.test(href(name) ?? '')
  }
</script>

<template>
  <div class="grid-icons">
    <a
      v-for="name in SOCIAL_NETWORKS"
      :key="name"
      :aria-label="name"
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
  display: grid;
  grid-template-columns: repeat(6, 36px);
  grid-column-gap: 16px;
}
</style>
