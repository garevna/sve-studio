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
  /* Verbatim from production's own CustomSwitcher - only the colours. The
     track's size and the gap before the label come from Vuetify's own inset
     switch, exactly as they do on the site: both apps run the same pinned
     Vuetify, so stating either here would only invite them to drift apart.
     Measured identical in the editor and in the preview window: 52x32 track,
     10px label inset. */
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
