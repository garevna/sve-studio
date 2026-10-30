<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue'
  import { useAjaxStore } from '@/stores/ajax'
  import { isHexColor } from '@/utils/build-color-scheme'
  import { isColorDarkEnoughForWhiteText } from '@/utils/color-luminance'

  // A dedicated literal value, not a palette key - present in the swatch
  // grid itself (not just something a caller can happen to already hold),
  // since there was previously no way to explicitly pick "transparent"
  // through this picker at all, only to inherit whatever "unset" happened
  // to render as.
  const TRANSPARENT = 'transparent'

  // Color-fill picker restricted to the app's own configured palette (palette.json)
  // rather than an arbitrary RGB picker - the v-model is a palette KEY (e.g.
  // "primary"), applied by callers as `var(--{key})`, matching the convention
  // already used throughout (TemplateCard.vue, EditableCard.vue etc.).
  const props = defineProps<{
    modelValue: string
    // Restricts the grid to swatches dark enough for white text to stay
    // readable on top of them (see DarkFoneSectionActions.vue) - and drops
    // the "transparent" tile too, since this mode is specifically for
    // callers whose whole point is a solid, readable-with-white-text
    // background, not an optional fill.
    darkOnly?: boolean
    // No "transparent" choice (a text colour, for one, has to be a colour).
    noTransparent?: boolean
  }>()
  const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

  const ajaxStore = useAjaxStore()
  const palette = ref<Record<string, string>>({})
  const menuOpen = ref(false)

  onMounted(async () => {
    palette.value = await ajaxStore.getPalette()
  })

  // The theme's palette.json has plenty of exact-duplicate hex values -
  // purpose-specific aliases (main-background/homefone for white,
  // available-date-fone-color/selected-dates-fone-color for accent,
  // and so on) that all resolve to the same
  // swatch. Showing every one of them as a separate tile makes the picker
  // look like it has many more distinct colors than it actually does.
  // Group by hex and keep only the shortest key per group - in every real
  // duplicate group here that's reliably the base design-token name
  // (white/primary/accent/grey/...), while the longer compound names
  // describe a specific feature's use of that same color, not a distinct
  // shade - PaletteView.vue's full editor still lists every key
  // individually, this dedup is display-only for the swatch picker.
  const swatches = computed(() => {
    const byHex = new Map<string, [string, string]>()
    for (const [key, value] of Object.entries(palette.value)) {
      if (!isHexColor(value)) continue
      if (props.darkOnly && !isColorDarkEnoughForWhiteText(value)) continue
      const hex = value.toLowerCase()
      const existing = byHex.get(hex)
      if (!existing || key.length < existing[0].length) byHex.set(hex, [key, value])
    }
    return [...byHex.values()]
  })

  function select (key: string) {
    emit('update:modelValue', key)
    menuOpen.value = false
  }
</script>

<template>
  <v-menu v-model="menuOpen" :close-on-content-click="false" location="bottom start">
    <template #activator="{ props: menuProps }">
      <slot name="activator" v-bind="{ menuProps }">
        <!-- One square, not a square inside a round tile. The outer tile was
          only ever a frame, and theme_2's buttons.css rounds every bare
          <button> to --default-border-radius (with 12px padding), so at
          32px that frame rendered as a circle around the swatch. -->
        <button
          class="palette-swatch-tile"
          :style="{ background: palette[props.modelValue] || 'transparent' }"
          v-bind="menuProps"
        >
          <v-icon v-if="!palette[props.modelValue]" icon="mdi-checkbox-blank-off-outline" size="16" />
        </button>
      </slot>
    </template>

    <v-card class="pa-3" min-width="216">
      <div class="palette-swatch-grid">
        <button
          v-if="!darkOnly && !noTransparent"
          :class="['palette-swatch-cell', 'palette-swatch-cell--transparent', { 'palette-swatch-cell--active': props.modelValue === TRANSPARENT }]"
          title="transparent"
          @click="select(TRANSPARENT)"
        >
          <v-icon icon="mdi-checkbox-blank-off-outline" size="28" />
        </button>
        <button
          v-for="[key, hex] of swatches"
          :key="key"
          :class="['palette-swatch-cell', { 'palette-swatch-cell--active': key === props.modelValue }]"
          :style="{ background: hex }"
          :title="key"
          @click="select(key)"
        />
      </div>
    </v-card>
  </v-menu>
</template>

<style scoped>
/* Size/border/cursor here; the radius and padding that theme_2's own
   buttons.css forces onto every <button> are overridden in editor-ui.css's
   app-content layer instead - an !important in a layer can only be beaten
   from inside that same layer, never from an unlayered scoped style. */
.palette-swatch-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: solid 1px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  color: #999;
}
.palette-swatch-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}
.palette-swatch-cell {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: solid 1px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  padding: 0;
}
.palette-swatch-cell--active {
  outline: solid 2px #333;
  outline-offset: 1px;
}
/* mdi-checkbox-blank-off-outline is this app's own convention for
   "transparent"/no fill - a plain empty/white cell would be
   indistinguishable from "not set" or from an actual white swatch. */
.palette-swatch-cell--transparent {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #999;
}
</style>
