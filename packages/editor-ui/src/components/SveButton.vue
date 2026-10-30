<script setup lang="ts">
  import type { RouteLocationRaw } from 'vue-router'
  import { computed } from 'vue'
  import { RouterLink } from 'vue-router'

  // A labelled button. `to` makes it a link to another screen.
  const props = withDefaults(defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    icon?: string
    iconEnd?: string
    loading?: boolean
    disabled?: boolean
    block?: boolean
    to?: RouteLocationRaw
    // On the top bar of a narrow screen only the icon stays.
    collapsible?: boolean
    type?: 'button' | 'submit'
  }>(), {
    variant: 'secondary',
    size: 'md',
    type: 'button',
  })

  defineEmits<{ click: [event: MouseEvent] }>()

  const classes = computed(() => [
    'sve-btn',
    `sve-btn--${props.variant}`,
    props.size === 'md' ? '' : `sve-btn--${props.size}`,
    { 'sve-btn--block': props.block },
  ])
</script>

<template>
  <RouterLink
    v-if="props.to && !props.disabled"
    :class="classes"
    :to="props.to"
  >
    <i v-if="props.icon" :class="['sve-icon mdi', props.icon]" />
    <span :class="{ 'sve-btn__label--collapsible': props.collapsible }"><slot /></span>
    <i v-if="props.iconEnd" :class="['sve-icon mdi', props.iconEnd]" />
  </RouterLink>
  <button
    v-else
    :aria-busy="props.loading || undefined"
    :class="classes"
    :disabled="props.disabled || props.loading"
    :type="props.type"
    @click="$emit('click', $event)"
  >
    <span v-if="props.loading" class="sve-btn__spinner" />
    <i v-else-if="props.icon" :class="['sve-icon mdi', props.icon]" />
    <span :class="{ 'sve-btn__label--collapsible': props.collapsible }"><slot /></span>
    <i v-if="props.iconEnd" :class="['sve-icon mdi', props.iconEnd]" />
  </button>
</template>
