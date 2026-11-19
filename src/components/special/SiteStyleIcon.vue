<script setup lang="ts">
  import { useId } from 'vue'

  // The site's style (SiteStyleMenu): a page of the site with a brush
  // painting it - not the palette, which is the Верф's own look
  // (SveLookMenu, its icon a window of the Верф with a light/dark disc).
  // The window is cut where the brush lies over it (the mask), so the two
  // read apart at 20px.
  const mask = `site-style-icon-${useId()}`
</script>

<template>
  <svg
    aria-hidden="true"
    class="site-style-icon"
    fill="none"
    height="1em"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.7"
    viewBox="0 0 24 24"
    width="1em"
  >
    <mask :id="mask">
      <rect fill="#fff" height="24" width="24" />
      <path d="M21.5 9.5l-6.6 6.6M14.6 15.6c-1.7-.5-3.3.6-3.3 2.4 0 1.1-.7 1.9-1.7 2.3 3 1 5.9-.6 5-4.7z" stroke="#000" stroke-width="5" />
    </mask>
    <g :mask="`url(#${mask})`">
      <rect
        height="11.5"
        rx="2"
        width="15"
        x="2.5"
        y="3"
      />
      <path d="M2.5 6.6h15" />
      <path d="M5.5 10.8c1.3-1.4 2.7-1.4 4 0s2.7 1.4 4 0" />
    </g>
    <circle
      cx="4.7"
      cy="4.8"
      fill="currentColor"
      r=".55"
      stroke="none"
    />
    <circle
      cx="6.6"
      cy="4.8"
      fill="currentColor"
      r=".55"
      stroke="none"
    />
    <path d="M21.5 9.5l-6.6 6.6" stroke-width="2" />
    <path d="M14.6 15.6c-1.7-.5-3.3.6-3.3 2.4 0 1.1-.7 1.9-1.7 2.3 3 1 5.9-.6 5-4.7z" fill="currentColor" />
  </svg>
</template>

<style scoped>
.site-style-icon {
  font-size: 22px;
}
</style>
