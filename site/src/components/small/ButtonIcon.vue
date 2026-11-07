<script setup lang="ts">
  import { computed } from 'vue'
  import { socialIconOf } from '../../configs/social-icons'

  // The icon inside a button, whichever way it was chosen in the icon window
  // (IconPicker): a library name, a social network's icon, or an uploaded
  // SVG (kept inline as a data: URI). Library icons, one-colour social icons
  // and uploads all take the button's text colour, so they change with it on
  // hover; a social icon in its own colours stays as it is. The class
  // `button-icon` is what buttons.css places by (button-with-icon-right).
  // The editor's copy is src/components/editors/icon/ButtonIcon.vue.
  const props = defineProps<{ icon?: string }>()

  const SIZE = 20
  const isMdi = computed(() => (props.icon || '').startsWith('mdi-'))
  const picture = computed(() => {
    const value = props.icon || ''
    if (!value || isMdi.value) {
      return null
    }
    const social = socialIconOf(value)
    const src = social?.src ?? (/^(data:|https?:|blob:|\/)/.test(value) ? value : '')
    if (!src) {
      return null
    }
    const url = `url("${src}")`
    return social && !social.tinted
      ? { backgroundImage: url }
      : { maskImage: url, WebkitMaskImage: url, backgroundColor: 'currentColor' }
  })
</script>

<template>
  <v-icon v-if="isMdi" class="button-icon mr-2" :icon="props.icon" :size="SIZE" />
  <span v-else-if="picture" class="button-icon button-icon--picture mr-2" :style="picture" />
</template>

<style scoped>
.button-icon--picture {
  display: inline-block;
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
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
