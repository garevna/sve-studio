<script setup lang="ts">
  import type { StepBadgeShape } from './StepBadge.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import { t } from '@/i18n'

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
  type StepsHover = 'lift' | 'waves'
  const props = defineProps<{ colors: { circleColor: string, numberColor: string }, badge?: StepBadgeShape, hover?: StepsHover }>()

  const emit = defineEmits<{
    add: []
    update: [changes: { circleColor?: string, numberColor?: string, badge?: StepBadgeShape, hover?: StepsHover }]
  }>()

  // The number's shape and the hover effect: one look for the whole diagram,
  // like the colours. Labels are read when shown, so they follow the
  // editor's language.
  const BADGES: { value: StepBadgeShape, icon: string, label: () => string }[] = [
    { value: 'circle', icon: 'mdi-numeric-1-circle', label: () => t('transferSteps.badgeCircle') },
    { value: 'gear', icon: 'mdi-cog', label: () => t('transferSteps.badgeGear') },
    { value: 'hexagon', icon: 'mdi-hexagon', label: () => t('transferSteps.badgeHexagon') },
    { value: 'burst', icon: 'mdi-decagram', label: () => t('transferSteps.badgeBurst') },
  ]
  const HOVERS: { value: StepsHover, icon: string, label: () => string }[] = [
    { value: 'lift', icon: 'mdi-arrow-up-bold-outline', label: () => t('transferSteps.hoverLift') },
    { value: 'waves', icon: 'mdi-waves', label: () => t('transferSteps.hoverWaves') },
  ]
  const badgeIcon = () => BADGES.find(item => item.value === (props.badge || 'circle'))!.icon
  const hoverIcon = () => HOVERS.find(item => item.value === (props.hover || 'lift'))!.icon

  const dragActive = defineModel<boolean>('dragActive', { default: false })
</script>

<template>
  <ToolbarIconButton icon="mdi-plus" :tooltip="t('transferSteps.add')" @click="emit('add')" />
  <ToolbarIconButton
    :active="dragActive"
    icon="mdi-cursor-move"
    :tooltip="t('transferSteps.order')"
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
        :tooltip="t('transferSteps.circleColor')"
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
        :tooltip="t('transferSteps.numberedCircleColor')"
      />
    </template>
  </PaletteSwatchPicker>

  <v-menu location="bottom start">
    <template #activator="{ props: menuProps }">
      <ToolbarIconButton v-bind="menuProps" :icon="badgeIcon()" :tooltip="t('transferSteps.badge')" />
    </template>
    <v-card theme="editorTheme">
      <v-list density="compact">
        <v-list-item
          v-for="item of BADGES"
          :key="item.value"
          :active="(badge || 'circle') === item.value"
          :prepend-icon="item.icon"
          :title="item.label()"
          @click="emit('update', { badge: item.value })"
        />
      </v-list>
    </v-card>
  </v-menu>

  <v-menu location="bottom start">
    <template #activator="{ props: menuProps }">
      <ToolbarIconButton v-bind="menuProps" :icon="hoverIcon()" :tooltip="t('transferSteps.hover')" />
    </template>
    <v-card theme="editorTheme">
      <v-list density="compact">
        <v-list-item
          v-for="item of HOVERS"
          :key="item.value"
          :active="(hover || 'lift') === item.value"
          :prepend-icon="item.icon"
          :title="item.label()"
          @click="emit('update', { hover: item.value })"
        />
      </v-list>
    </v-card>
  </v-menu>
</template>
