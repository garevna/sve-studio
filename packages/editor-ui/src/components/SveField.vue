<script setup lang="ts">
  // A label above a control (and an optional hint under it).
  defineProps<{ label?: string, hint?: string }>()
</script>

<template>
  <label class="sve-ui sve-field">
    <span v-if="label" class="sve-field__label">{{ label }}</span>
    <slot />
    <span v-if="hint" class="sve-field__hint">{{ hint }}</span>
  </label>
</template>
