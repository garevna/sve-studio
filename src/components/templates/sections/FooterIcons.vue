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

  const SOCIAL_NETWORKS = ['facebook', 'instagram', 'tiktok', 'whatsApp', 'viber', 'telegram'] as const

  type PropsModel = { links?: Record<string, string>, icons?: Record<string, string> }

  const props = defineProps<PropsModel>()

  function iconSrc (name: string): string {
    return props.icons?.[name] || footerIcons[name as keyof typeof footerIcons]
  }

  function goto (name: string) {
    const url = props.links?.[name]
    if (url) window.open(url, '_blank')
  }
</script>

<template>
  <div class="grid-icons">
    <img
      v-for="name in SOCIAL_NETWORKS"
      :key="name"
      class="footer-icon cursor-pointer"
      height="36"
      :src="iconSrc(name)"
      width="36"
      @click="goto(name)"
    >
  </div>
</template>

<style scoped>
.grid-icons {
  display: grid;
  grid-template-columns: repeat(6, 36px);
  grid-column-gap: 16px;
}
</style>
