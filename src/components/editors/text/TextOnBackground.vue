<script setup lang="ts">
  import { computed } from 'vue'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // Texts edited away from where they are shown (in a dialog) sit here on
  // the background they will have on the page, in the site's own styles -
  // a light text meant for a dark fill is invisible on the dialog's white.
  // background: a palette key; image: a background picture, over the colour.
  const props = defineProps<{ background?: string, image?: string }>()

  const style = computed(() => {
    const fill = props.background && props.background !== 'transparent' ? `var(--${props.background})` : undefined
    if (props.image) return { background: `center / cover no-repeat url("${props.image}")`, backgroundColor: fill }
    return fill ? { background: fill } : undefined
  })
</script>

<template>
  <div :class="[EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME), 'text-on-background']" :style="style">
    <slot />
  </div>
</template>

<style scoped>
.text-on-background {
  min-width: 0;
  padding: 8px 12px;
  border-radius: 10px;
}
/* The format button sits on that colour, light or dark: a light chip of
   its own keeps it visible on either. */
.text-on-background :deep(.v-btn--icon) {
  background: rgb(255 255 255 / 0.85);
  color: #3a4a58;
}
</style>
