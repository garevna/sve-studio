<script setup lang="ts">
  import { onMounted } from 'vue'
  import AppFeedback from '@/components/special/AppFeedback.vue'
  import { useSiteStyle } from '@/composables/useSiteStyle'

  // Every view wraps itself in its own <v-app>; AppFeedback (popups,
  // confirmations) sits above all of them, whichever route is active.

  // The site's style, worn by the editor as the site wears it.
  onMounted(() => void useSiteStyle().load())
</script>

<template>
  <AppFeedback />
  <NuxtPage />
</template>
