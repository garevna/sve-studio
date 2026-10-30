<script setup lang="ts">
  import AppFeedback from '@/components/special/AppFeedback.vue'

  // Every view wraps itself in its own <v-app>; AppFeedback (popups,
  // confirmations) sits above all of them, whichever route is active.
</script>

<template>
  <AppFeedback />
  <NuxtPage />
</template>
