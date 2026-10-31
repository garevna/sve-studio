<script setup lang="ts">
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'

  // Block-level actions for "Кроки в кружках": add a step, reorder them, and
  // the two colours every circle shares. Rendered into the block's own
  // EditableBlockWrapper toolbar (TransferServicesSteps.vue Teleports it
  // there), the same shape PopularDestinationsActions and FaqBlockActions
  // use.
  //
  // The colours are block-level because they are one design decision about
  // the whole diagram, not five - the same rule the card block's icon
  // appearance follows. They are palette KEYS, so retuning the palette
  // retunes these with it.
  defineProps<{ colors: { circleColor: string, numberColor: string } }>()

  const emit = defineEmits<{
    add: []
    update: [changes: { circleColor?: string, numberColor?: string }]
  }>()

  const dragActive = defineModel<boolean>('dragActive', { default: false })
</script>

<template>
  <ToolbarIconButton icon="mdi-plus" tooltip="Додати крок" @click="emit('add')" />
  <ToolbarIconButton
    :active="dragActive"
    icon="mdi-cursor-move"
    tooltip="Порядок кроків"
    @click="dragActive = !dragActive"
  />

  <PaletteSwatchPicker
    :model-value="colors.circleColor"
    @update:model-value="value => emit('update', { circleColor: value })"
  >
    <template #activator="{ menuProps }">
      <ToolbarIconButton
        v-bind="menuProps"
        icon="mdi-circle"
        tooltip="Колір кружків"
      />
    </template>
  </PaletteSwatchPicker>

  <PaletteSwatchPicker
    :model-value="colors.numberColor"
    @update:model-value="value => emit('update', { numberColor: value })"
  >
    <template #activator="{ menuProps }">
      <ToolbarIconButton
        v-bind="menuProps"
        icon="mdi-numeric"
        tooltip="Колір кружків з номерами"
      />
    </template>
  </PaletteSwatchPicker>
</template>
