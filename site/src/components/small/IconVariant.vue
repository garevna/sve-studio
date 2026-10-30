<script setup lang="ts">
  import { computed } from 'vue'
  import { getImageURL } from '../../services/get-image-url'

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
  // `background` arrives already resolved - the caller wraps the palette key,
  // exactly as it does for `color` just above. It used to be wrapped a
  // SECOND time here, which produced `var(--var(--soft-green))`: invalid, so
  // the disc behind the icon rendered fully transparent and a card's icon
  // background has in fact never shown on this site at all (confirmed in a
  // real browser - computed background-color rgba(0, 0, 0, 0) on a card whose
  // block had one set). The editor's own copy of this component was fixed
  // long ago and carries the same comment; this is that fix, ported.
  const backColor = computed(() => props.background || null)
  const alignment = computed(() => props.variant === 1 ? 'text-center' : 'text-left')
</script>

<template>
  <template v-if="props.icon">
    <template v-if="props.icon.startsWith('mdi-')">
      <div v-if="props.background" class="icon-fone">
        <v-icon :class="['icon', alignment]" :color="iconColor" :icon="props.icon" :size="iconSize" />
      </div>
      <template v-else>
        <v-icon :class="['icon', alignment]" :color="iconColor" :icon="props.icon" :size="iconSize" />
      </template>
    </template>
    <template v-else>
      <div v-if="props.background" class="icon-fone">
        <v-img class="icon" :src="getImageURL(props.icon)" />
      </div>
      <template v-else>
        <v-img class="icon" cover :src="getImageURL(props.icon)" />
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
