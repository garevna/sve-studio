<script setup lang="ts">
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'

  // HOW an icon looks - colour, size, the circle behind it - and nothing
  // about which icon it is. The other half is IconPicker.vue; see its own
  // comment for why the two are separate components rather than one editor.
  //
  // The point of the split is reuse at a different LEVEL: a block of cards
  // puts this one panel in its own toolbar to style every card's icon at
  // once, while each card carries its own picker. Same panel, one host or
  // many, no special "apply to the whole block" mode inside it.
  //
  // A plain panel, not a dialog - the host chooses a dialog (IconEditor) or
  // a toolbar menu (a card block's actions).
  const iconColor = defineModel<string>('iconColor', { default: 'grey' })
  const iconSize = defineModel<number>('iconSize', { default: 52 })
  const iconBackground = defineModel<string>('iconBackground', { default: '' })

  defineProps<{
    // Colour only reaches an mdi icon (it's a font glyph). An uploaded SVG
    // carries its own colours, so offering a colour picker for one would be
    // a control that does nothing - the same "don't show what has no
    // effect" rule the text format menu follows (configs/text-format-support.ts).
    colorable?: boolean
  }>()
</script>

<template>
  <div>
    <div v-if="colorable" class="icon-appearance-row">
      <span class="icon-appearance-label">Колір іконки</span>
      <PaletteSwatchPicker :model-value="iconColor" @update:model-value="(value: string) => iconColor = value" />
    </div>

    <div class="icon-appearance-row">
      <span class="icon-appearance-label">Фон під іконкою</span>
      <div class="d-flex align-center ga-2">
        <PaletteSwatchPicker :model-value="iconBackground" @update:model-value="(value: string) => iconBackground = value" />
        <v-btn
          v-if="iconBackground"
          density="comfortable"
          icon="mdi-close"
          size="x-small"
          variant="text"
          @click="iconBackground = ''"
        />
      </div>
    </div>

    <div class="icon-appearance-row">
      <span class="icon-appearance-label">Розмір: {{ iconSize }}px</span>
      <v-slider
        v-model="iconSize"
        class="icon-appearance-slider"
        hide-details
        max="120"
        min="16"
        step="2"
      />
    </div>
  </div>
</template>

<style scoped>
.icon-appearance-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
}
.icon-appearance-label {
  font-size: 0.9rem;
  color: #7A8699;
}
.icon-appearance-slider {
  max-width: 200px;
}
</style>
