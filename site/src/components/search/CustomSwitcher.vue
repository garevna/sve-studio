<script setup lang="ts">
  import { computed } from 'vue'
  const model = defineModel({ default: false })

  type PropsModel = {
    label: string
    color?: string
  }
  const props = defineProps<PropsModel>()

  const thumbColor = computed(() => model.value ? 'var(--white)' : props.color || 'var(--primary)')
  const trackColor = computed(() => model.value ? props.color || 'var(--primary)' : 'transparent')
  const labelColor = computed(() => model.value ? props.color || 'var(--primary)' : 'var(--grey)')
</script>

<template>
  <v-switch
    v-model="model"
    class="custom-switch"
    hide-details
    inset
    :label="props.label"
  />
</template>

<style>
  .custom-switch .v-switch__thumb {
    background: v-bind(thumbColor);
  }
  .custom-switch .v-switch__track {
    background: v-bind(trackColor);
    border: solid 2px var(--primary);
    opacity: 1;
  }
  .custom-switch .v-label {
    color: v-bind(labelColor);
  }
</style>
