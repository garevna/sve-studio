<script setup lang="ts">
  // Editor-side preview of client-side's own FooterVisaLogo.vue - static
  // there (no props/data), so this stays a direct copy apart from the one
  // thing the editor lets a user decide: how big it is shown. The width
  // comes from the block itself and defaults to the artwork's natural size,
  // so a logo nobody has resized renders exactly as production does today.
  import { computed } from 'vue'
  import visaLogo from '@/assets/footer-icons/visa-logo.svg'
  import { VISA_LOGO_NATURAL_WIDTH, visaLogoHeight } from '@/configs/footer-blocks'

  const props = defineProps<{ width?: number }>()

  // Height is always derived, never stored or set independently - the logo
  // cannot end up stretched.
  const size = computed(() => {
    const width = props.width || VISA_LOGO_NATURAL_WIDTH
    return { width, height: visaLogoHeight(width) }
  })
</script>

<template>
  <img :height="size.height" :src="visaLogo" :width="size.width">
</template>
