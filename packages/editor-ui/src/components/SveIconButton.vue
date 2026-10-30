<script setup lang="ts">
  import type { RouteLocationRaw } from 'vue-router'
  import { computed } from 'vue'
  import { RouterLink } from 'vue-router'

  // An icon-only button. `label` is what it does - read aloud by screen
  // readers and shown as a tooltip.
  const props = withDefaults(defineProps<{
    icon: string
    label: string
    variant?: 'ghost' | 'soft'
    size?: 'sm' | 'md'
    active?: boolean
    danger?: boolean
    disabled?: boolean
    to?: RouteLocationRaw
  }>(), {
    variant: 'ghost',
    size: 'md',
  })

  defineEmits<{ click: [event: MouseEvent] }>()

  const classes = computed(() => [
    'sve-btn sve-icon-btn',
    `sve-icon-btn--${props.variant}`,
    props.size === 'sm' ? 'sve-icon-btn--sm' : '',
    { 'sve-icon-btn--active': props.active, 'sve-icon-btn--danger': props.danger },
  ])
</script>

<template>
  <RouterLink
    v-if="props.to && !props.disabled"
    :aria-label="props.label"
    :class="classes"
    :title="props.label"
    :to="props.to"
  >
    <i :class="['sve-icon mdi', props.icon]" />
  </RouterLink>
  <button
    v-else
    :aria-label="props.label"
    :aria-pressed="props.active || undefined"
    :class="classes"
    :disabled="props.disabled"
    :title="props.label"
    type="button"
    @click="$emit('click', $event)"
  >
    <i :class="['sve-icon mdi', props.icon]" />
  </button>
</template>
