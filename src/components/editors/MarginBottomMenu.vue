<script setup lang="ts">
  import { computed } from 'vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { t } from '@/i18n'
  import { readMarginBottomPx, writeMarginBottomPx } from '@/utils/margin-bottom-class'

  // The gap below a text, as a pick from a short list - the same shape
  // ColumnGapMenu.vue uses for the gap between columns, and for the same
  // reason: Vuetify's scale is finite (mb-0..mb-16 in 4px steps), so
  // storing the choice AS that class makes "always a multiple of 4" true by
  // construction, with no invalid value to reject and readable JSON.
  //
  // A menu rather than the draggable handle (MarginBottomHandle.vue) for the
  // places where there is nothing to drag: a heading inside a component, not
  // a page block with an edge of its own.
  const classString = defineModel<string | undefined>('class', { default: '' })

  const props = defineProps<{ tooltip?: string }>()

  // Vuetify's spacer scale, in the steps a designer actually reaches for.
  const OPTIONS = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64]

  const current = computed(() => readMarginBottomPx(classString.value))

  function select (px: number) {
    classString.value = writeMarginBottomPx(classString.value, px)
  }
</script>

<template>
  <v-menu location="bottom center">
    <template #activator="{ props: menuProps }">
      <ToolbarIconButton
        v-bind="menuProps"
        icon="mdi-arrow-expand-vertical"
        :tooltip="`${props.tooltip ?? t('common.marginBottom')}: ${current}px`"
      />
    </template>
    <v-card theme="editorTheme">
      <v-list density="compact">
        <v-list-item
          v-for="px of OPTIONS"
          :key="px"
          :active="px === current"
          :title="`${px}px`"
          @click="select(px)"
        />
      </v-list>
    </v-card>
  </v-menu>
</template>
