<script setup lang="ts">
  import SveField from './SveField.vue'

  // A one-line text field (or several lines with `rows`).
  const model = defineModel<string>({ default: '' })
  defineProps<{ label?: string, hint?: string, placeholder?: string, rows?: number, mono?: boolean }>()
</script>

<template>
  <SveField :hint="hint" :label="label">
    <textarea
      v-if="rows"
      v-model="model"
      :class="['sve-input sve-input--area', { 'sve-input--mono': mono }]"
      :placeholder="placeholder"
      :rows="rows"
    />
    <input
      v-else
      v-model="model"
      :class="['sve-input', { 'sve-input--mono': mono }]"
      :placeholder="placeholder"
      type="text"
    >
  </SveField>
</template>
