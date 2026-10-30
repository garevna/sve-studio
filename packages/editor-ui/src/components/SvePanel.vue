<script setup lang="ts">
  // A surface for a group of settings. #actions sits on the title row.
  const props = defineProps<{ title?: string }>()
</script>

<template>
  <section class="sve-ui sve-panel">
    <div v-if="props.title || $slots.actions" class="sve-panel__head">
      <div class="sve-panel__title">{{ props.title }}</div>
      <slot name="actions" />
    </div>
    <div class="sve-panel__body">
      <slot />
    </div>
  </section>
</template>
