<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'

  import visaLogo from '../../assets/footer-icons/visa-logo.svg'

  import { useCommonStore } from '../../stores/common'

  // Width comes from the block's own props (the visual editor offers a few
  // named sizes) and defaults to the artwork's natural size, so a logo
  // nobody has resized renders exactly as it always did. Height is always
  // derived from the 160x41 proportions - the logo can't end up stretched.
  const props = defineProps<{ width?: number }>()

  const { winSize } = storeToRefs(useCommonStore())

  const size = computed(() => {
    const width = props.width || 160
    return { width, height: Math.round(width * 41 / 160) }
  })
</script>

<template>
  <div :class="['mt-6', winSize.width > 600 ? 'text-left' : 'text-center']">
    <v-divider class="my-5" />
    <img class="footer-icon" :height="size.height" :src="visaLogo" :width="size.width">
  </div>
</template>
