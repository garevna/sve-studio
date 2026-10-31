<script setup lang="ts">
  import { computed } from 'vue'
  import { useCommonStore } from '@/stores/common'
  import { resolveThemeAssetPath } from '@/utils/theme-asset-path'

  const commonStore = useCommonStore()

  type PropsModel = {
    icon?: string
    image?: string
    size?: number
    color?: string
    textClass: string
    text: string
  }
  const props = defineProps<PropsModel>()
  const iconSize = computed(() => props.size + 'px' || '24px')
</script>

<template>
  <div class="text-with-icon">
    <!-- v-icon only knows mdi-* names; an uploaded SVG goes through <img>. -->
    <v-icon v-if="props.icon?.startsWith('mdi-')" :color="props.color ? `var(--${props.color})` : 'var(--grey)'" :size="props.size">{{ props.icon }}</v-icon>
    <img v-else-if="props.icon" :height="props.size" :src="resolveThemeAssetPath(props.icon, commonStore.activeTheme)">
    <img v-else :height="props.size" :src="props.image">

    <p :class="props.textClass || 'default-text text-medium text-black text-left'">
      {{ props.text }}
    </p>
  </div>
</template>

<style scoped>
.text-with-icon {
  display: grid;
  grid-template-columns: v-bind(iconSize) 1fr;
  column-gap: 8px;
  align-content: center;
}

.text-with-icon img {
  vertical-align: middle;
}
</style>
