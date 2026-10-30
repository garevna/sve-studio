<script setup lang="ts" generic="T extends string | number">
  // A row of mutually exclusive options - modes, languages, variants.
  const model = defineModel<T>()

  defineProps<{
    options: { value: T, label?: string, icon?: string, title?: string }[]
  }>()
</script>

<template>
  <div class="sve-ui sve-segmented" role="radiogroup">
    <div
      v-for="option of options"
      :key="String(option.value)"
      :aria-checked="model === option.value"
      :class="['sve-segmented__option', { 'sve-segmented__option--active': model === option.value }]"
      role="radio"
      tabindex="0"
      :title="option.title || option.label"
      @click="model = option.value"
      @keydown.enter.prevent="model = option.value"
      @keydown.space.prevent="model = option.value"
    >
      <i v-if="option.icon" :class="['sve-icon mdi', option.icon]" />
      <span v-if="option.label">{{ option.label }}</span>
    </div>
  </div>
</template>
