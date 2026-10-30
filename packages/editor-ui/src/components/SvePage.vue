<script setup lang="ts">
  import type { RouteLocationRaw } from 'vue-router'
  import SveTopBar from './SveTopBar.vue'

  // An editor screen: the top bar and the screen's content under it. Every
  // screen is built on this, so the bar is the same everywhere.
  const props = defineProps<{
    title?: string
    subtitle?: string
    back?: RouteLocationRaw
    // Content without the screen's own padding (the page editor draws the
    // site edge to edge).
    flush?: boolean
  }>()
</script>

<template>
  <div class="sve-page">
    <SveTopBar :back="props.back" :subtitle="props.subtitle" :title="props.title">
      <template v-if="$slots.start" #start><slot name="start" /></template>
      <template v-if="$slots.center" #center><slot name="center" /></template>
      <template #actions><slot name="actions" /></template>
    </SveTopBar>
    <main :class="props.flush ? '' : 'sve-page__content'">
      <slot />
    </main>
  </div>
</template>
