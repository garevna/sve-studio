<script setup lang="ts">
import { computed } from 'vue'

  // Mirrors the production site's src\components\small\IconVariant.vue
  // structure/markup exactly, with one deliberate fix: `background` is
  // treated as an already-resolved CSS value (same convention as `color`
  // below - the caller wraps the palette key, this component uses it as-is)
  // rather than re-wrapping it with var(--...) a second time. Production's
  // own version does the double wrap, which - given every caller already
  // pre-wraps `background` the same way it pre-wraps `color` - means the
  // background circle never actually renders there either; not something
  // worth reproducing here.
  const props = defineProps<{
    icon: string
    size?: number
    color: string
    background: string | null
    variant?: number
  }>()

  const iconSize = computed(() => (props.size || 48) + 'px')
  const iconBackSize = computed(() => (props.size || 48) + 32 + 'px')
  const iconColor = computed(() => props.color || (props.background ? 'var(--white)' : 'var(--primary)'))
  const backColor = computed(() => props.background || null)
  const alignment = computed(() => props.variant === 1 ? 'text-center' : 'text-left')
</script>

<template>
  <template v-if="props.icon">
    <template v-if="props.icon.startsWith('mdi-')">
      <div v-if="props.background" class="icon-fone">
        <v-icon :class="['icon', alignment]" :color="iconColor" :size="iconSize">
          {{ props.icon }}
        </v-icon>
      </div>
      <template v-else>
        <v-icon :class="['icon', alignment]" :color="iconColor" :size="iconSize">
          {{ props.icon }}
        </v-icon>
      </template>
    </template>
    <template v-else>
      <div v-if="props.background" class="icon-fone">
        <v-img class="icon" :src="props.icon" />
      </div>
      <template v-else>
        <v-img class="icon" cover :src="props.icon" />
      </template>
    </template>
  </template>
</template>

<style scoped>
.icon-fone {
  width: v-bind(iconBackSize);
  height: v-bind(iconBackSize);
  border-radius: 50%;
  background: v-bind(backColor);
  display: flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
}

.icon {
  width: v-bind(iconSize);
  height: v-bind(iconSize);
  color: v-bind(iconColor);
}
</style>
