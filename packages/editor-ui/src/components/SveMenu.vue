<script setup lang="ts">
  import { VMenu } from 'vuetify/components'

  // A drop-down menu. The #activator slot gets `props` to bind on the
  // element that opens it; the default slot holds SveMenuItem rows (and
  // SveMenuLabel / SveMenuDivider). Positioning comes from Vuetify's menu;
  // everything visible is the kit's own.
  const open = defineModel<boolean>({ default: false })

  withDefaults(defineProps<{
    location?: 'bottom end' | 'bottom start' | 'bottom' | 'top' | 'top end' | 'top start'
    minWidth?: number
  }>(), {
    location: 'bottom end',
    minWidth: 200,
  })
</script>

<template>
  <VMenu
    v-model="open"
    :close-on-content-click="true"
    :location="location"
    offset="6"
  >
    <template #activator="{ props: activatorProps }">
      <slot name="activator" :open="open" :props="activatorProps" />
    </template>
    <div class="sve-ui sve-menu" role="menu" :style="{ minWidth: `${minWidth}px` }">
      <slot />
    </div>
  </VMenu>
</template>
