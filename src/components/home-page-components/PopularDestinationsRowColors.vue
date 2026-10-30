<script setup lang="ts">
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'

  // The two colours variant 1 of "Популярні напрямки" builds its rows from,
  // offered on the block's own toolbar - the same shape DarkFoneSectionActions
  // uses for a section background: a swatch picker restricted to the theme's
  // palette, behind a tooltipped toolbar button.
  //
  // Only variant 1 renders this: variant 2 draws cards, which have neither a
  // rule under the row nor a hover fill, and teleports its own icon settings
  // to the same toolbar instead. Whichever component is mounted brings its
  // own controls with it.
  //
  // The values are palette KEYS ("accent"), not hex - so a client who later
  // retunes the palette retunes these along with everything else.
  defineProps<{ colors: { rowBorder: string, rowHover: string } }>()

  const emit = defineEmits<{ update: [changes: { rowBorder?: string, rowHover?: string }] }>()
</script>

<template>
  <PaletteSwatchPicker
    :model-value="colors.rowBorder"
    @update:model-value="value => emit('update', { rowBorder: value })"
  >
    <template #activator="{ menuProps }">
      <v-tooltip location="top" text="Колір лінії під рядком" theme="editorTheme">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="{ ...tooltipProps, ...menuProps }" icon="mdi-border-bottom-variant" variant="text" />
        </template>
      </v-tooltip>
    </template>
  </PaletteSwatchPicker>

  <PaletteSwatchPicker
    :model-value="colors.rowHover"
    @update:model-value="value => emit('update', { rowHover: value })"
  >
    <template #activator="{ menuProps }">
      <v-tooltip location="top" text="Колір рядка під курсором" theme="editorTheme">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="{ ...tooltipProps, ...menuProps }" icon="mdi-format-color-fill" variant="text" />
        </template>
      </v-tooltip>
    </template>
  </PaletteSwatchPicker>
</template>
