<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import { t } from '@/i18n'

  // How a tabs block's row of tabs looks (TabStrip.vue): the look itself,
  // its accent and its plate. Sits in the block's toolbar after the card
  // set's own actions - everything about the cards is the same as in a card
  // set; this is the part only tabs have.
  //
  // `block` is a live reference into the page's content, edited in place.
  const props = defineProps<{ block: TemplateBlockModel }>()

  const LOOKS = [
    { value: 'pill', icon: 'mdi-pill', label: 'tabs.lookPill' },
    { value: 'underline', icon: 'mdi-format-underline', label: 'tabs.lookUnderline' },
    { value: 'folder', icon: 'mdi-folder-outline', label: 'tabs.lookFolder' },
  ] as const

  /* eslint-disable vue/no-mutating-props -- the block is edited in place, see above */
  const look = computed(() => props.block.tabLook || 'pill')
  function setLook (value: string) {
    props.block.tabLook = value
  }
  const accent = computed({
    get: () => props.block.tabAccent || 'primary',
    set: (value: string) => {
      props.block.tabAccent = value
    },
  })
  // Unset = the look's own plate (TabSet.vue's DEFAULT_PLATE).
  const plate = computed({
    get: () => props.block.tabPlate || '',
    set: (value: string) => {
      props.block.tabPlate = value || undefined
    },
  })
  /* eslint-enable vue/no-mutating-props */
</script>

<template>
  <ToolbarIconButton
    v-for="option of LOOKS"
    :key="option.value"
    :active="look === option.value"
    :icon="option.icon"
    :tooltip="t(option.label)"
    @click="setLook(option.value)"
  />
  <PaletteSwatchPicker v-model="accent">
    <template #activator="{ menuProps }">
      <ToolbarIconButton v-bind="menuProps" icon="mdi-format-color-highlight" :tooltip="t('tabs.accent')" />
    </template>
  </PaletteSwatchPicker>
  <PaletteSwatchPicker v-model="plate">
    <template #activator="{ menuProps }">
      <ToolbarIconButton v-bind="menuProps" icon="mdi-rectangle-outline" :tooltip="t('tabs.plate')" />
    </template>
  </PaletteSwatchPicker>
</template>
