<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'

  const props = defineProps<{ block: TemplateBlockModel }>()

  const dragActive = defineModel<boolean>('dragActive', { default: false })
  // Shows the drag handles on every section border and on the gap between
  // them. A mode rather than always-on for the same reason drag-to-reorder
  // is: resizing is an occasional, deliberate act, and permanent handles
  // sitting on every border would be in the way of everyday editing.

  function toggleDrag () {
    dragActive.value = !dragActive.value
  }

  // Column count, widths and the gap are the designer's settings, edited in
  // UI Kit -> Футер and stored in global.json. They used to be adjusted from
  // this toolbar; dragging borders in a live footer proved unreadable, and a
  // count toggle here competed with the same setting in two places.

  function setBackground (value: string) {
    // eslint-disable-next-line vue/no-mutating-props
    props.block.background = value
  }

  function toggleVisible () {
    // eslint-disable-next-line vue/no-mutating-props
    props.block.visible = props.block.visible === false
  }

</script>

<template>
  <PaletteSwatchPicker dark-only :model-value="block.background || 'primary'" @update:model-value="setBackground">
    <template #activator="{ menuProps }">
      <v-tooltip location="top" text="Фон футера" theme="editorTheme">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="{ ...tooltipProps, ...menuProps }" icon="mdi-format-color-fill" variant="text" />
        </template>
      </v-tooltip>
    </template>
  </PaletteSwatchPicker>
  <v-tooltip location="top" text="Показувати футер" theme="editorTheme">
    <template #activator="{ props: tooltipProps }">
      <v-btn
        v-bind="tooltipProps"
        :color="block.visible === false ? undefined : 'primary'"
        :icon="block.visible === false ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
        variant="text"
        @click="toggleVisible"
      />
    </template>
  </v-tooltip>
  <!-- Reordering is disabled until the footer renders its sections from a
    v-for over block.children. Right now each column is a hardcoded slot
    with a fixed role (feedback card / links / contacts+icons+visa) bound to
    its INDEX, so moving an entry in the array doesn't move its content: the
    section that lands in slot 0 gets rendered as the feedback card whatever
    it actually holds. Confirmed live - a single swap scrambled the whole
    footer. Re-enable together with the section v-for, not before. -->
  <ToolbarIconButton
    :active="dragActive"
    disabled
    icon="mdi-cursor-move"
    tooltip="Перетягування колонок (буде доступне після переходу на конструктор)"
    @click="toggleDrag"
  />

</template>
