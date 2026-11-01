<script setup lang="ts">
  import { computed } from 'vue'
  import { socialIconOf } from '../../configs/social-icons'

  // A social network's icon (configs/social-icons.ts): its own colours as
  // they are, or a one-colour look drawn by its shape in `color` (a palette
  // key). The editor's copy is src/components/editors/icon/SocialIconImage.vue.
  const props = defineProps<{ icon: string, size: number, color?: string }>()

  const social = computed(() => socialIconOf(props.icon))
  const style = computed(() => {
    const src = `url("${social.value?.src}")`
    const box = { width: `${props.size}px`, height: `${props.size}px` }
    return social.value?.tinted
      ? { ...box, maskImage: src, WebkitMaskImage: src, backgroundColor: `var(--${props.color || 'grey'})` }
      : { ...box, backgroundImage: src }
  })
</script>

<template>
  <span v-if="social" class="social-icon-image" :style="style" />
</template>

<style scoped>
.social-icon-image {
  display: block;
  flex: 0 0 auto;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: contain;
  -webkit-mask-position: center;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: contain;
}
</style>
