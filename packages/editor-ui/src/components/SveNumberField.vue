<script setup lang="ts">
  import SveField from './SveField.vue'

  // A number with its unit after it (px by default).
  const model = defineModel<number>({ default: 0 })
  withDefaults(defineProps<{ label?: string, hint?: string, min?: number, max?: number, step?: number, unit?: string }>(), {
    label: undefined,
    hint: undefined,
    min: 0,
    max: 999,
    step: 1,
    unit: 'px',
  })

  function update (event: Event) {
    const value = Number((event.target as HTMLInputElement).value)
    if (!Number.isNaN(value)) {
      model.value = value
    }
  }
</script>

<template>
  <SveField :hint="hint" :label="label">
    <span class="sve-input sve-input--affix">
      <input
        :max="max"
        :min="min"
        :step="step"
        type="number"
        :value="model"
        @input="update"
      >
      <span class="sve-input__unit">{{ unit }}</span>
    </span>
  </SveField>
</template>
