<script setup lang="ts">
  import { computed } from 'vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { t } from '@/i18n'
  import { COLUMN_GAP_OPTIONS, readColumnGapPx, writeColumnGapPx } from '@/utils/column-gap-class'

  // The gap between columns of any block that has columns, as a toolbar
  // button with a short list of allowed values - the project owner's own
  // design, and a better fit than the draggable strip that came before it:
  // a strip whose width IS the gap reads as nothing happening, while a pick
  // from a finite list says exactly what will be set.
  //
  // The list is finite because Vuetify's own scale is: gc-0..gc-16 in 4px
  // steps. Storing the choice AS that class (rather than a px number) is
  // what makes "always a multiple of 4" true by construction - there is no
  // invalid value to reject, and the saved JSON stays readable.
  //
  // v-model:class, not a px model, so the whole thing plugs into any block
  // that already carries a class string - the same shape MarginBottomHandle
  // uses for mb-N.
  const classString = defineModel<string | undefined>('class', { default: '' })

  const current = computed(() => readColumnGapPx(classString.value))

  function select (px: number) {
    classString.value = writeColumnGapPx(classString.value, px)
  }
</script>

<template>
  <v-menu location="bottom center">
    <template #activator="{ props: menuProps }">
      <ToolbarIconButton
        v-bind="menuProps"
        icon="mdi-arrow-expand-horizontal"
        :tooltip="t('block.columnGap', { current })"
      />
    </template>
    <v-card theme="editorTheme">
      <v-list density="compact">
        <v-list-item
          v-for="px of COLUMN_GAP_OPTIONS"
          :key="px"
          :active="px === current"
          link
          :title="`${px} px`"
          @click="select(px)"
        />
      </v-list>
    </v-card>
  </v-menu>
</template>
