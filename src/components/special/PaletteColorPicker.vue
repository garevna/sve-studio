<script lang="ts" setup>
  import { ref, watch } from 'vue'

  const props = defineProps<{ modelValue: string }>()
  const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

  const menuOpen = ref(false)
  const draft = ref(props.modelValue)

  watch(menuOpen, isOpen => {
    if (isOpen) draft.value = props.modelValue
  })

  function apply () {
    emit('update:modelValue', draft.value)
    menuOpen.value = false
  }
</script>

<template>
  <v-menu v-model="menuOpen" :close-on-content-click="false" location="bottom start">
    <template #activator="{ props: menuProps }">
      <button class="palette-color-tile" v-bind="menuProps">
        <span class="palette-color-swatch" :style="{ background: modelValue }" />
        <span v-if="$slots.default" class="palette-color-label"><slot /></span>
      </button>
    </template>

    <v-card class="pa-3" min-width="260">
      <v-color-picker v-model="draft" hide-inputs :modes="['hex']" />

      <v-text-field
        v-model="draft"
        class="mt-3"
        density="compact"
        hide-details
        label="HEX-код кольору"
        placeholder="#RRGGBB"
        prepend-inner-icon="mdi-pound"
        variant="outlined"
      />

      <v-btn block class="mt-3" color="primary" @click="apply">
        Застосувати
      </v-btn>
    </v-card>
  </v-menu>
</template>

<style scoped>
  .palette-color-tile {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border: solid 1px rgba(0, 0, 0, 0.12);
    border-radius: 8px;
    background: rgb(var(--v-theme-surface));
    cursor: pointer;
    text-align: left;
    width: 100%;
  }
  .palette-color-swatch {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: solid 1px rgba(0, 0, 0, 0.15);
    flex-shrink: 0;
  }
  .palette-color-label {
    font-size: 0.85rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
