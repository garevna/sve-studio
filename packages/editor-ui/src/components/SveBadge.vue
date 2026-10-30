<script setup lang="ts">
  // A small count or label next to a control's text.
  defineProps<{ tone?: 'primary' | 'warning' }>()
</script>

<template>
  <span :class="['sve-badge', { 'sve-badge--warning': tone === 'warning' }]"><slot /></span>
</template>
