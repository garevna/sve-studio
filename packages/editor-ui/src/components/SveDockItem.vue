<script setup lang="ts">
  // One tool on the dock: an icon with a short label under it. A div with
  // the button role, not a <button> - the edited site's stylesheets restyle
  // every <button> on the page.
  const props = defineProps<{ icon: string, label: string, active?: boolean, disabled?: boolean }>()
  const emit = defineEmits<{ click: [event: MouseEvent | KeyboardEvent] }>()

  function activate (event: MouseEvent | KeyboardEvent) {
    if (!props.disabled) {
      emit('click', event)
    }
  }
</script>

<template>
  <div
    :aria-disabled="props.disabled || undefined"
    :aria-pressed="props.active || undefined"
    :class="['sve-dock__item', { 'sve-dock__item--active': props.active, 'sve-dock__item--disabled': props.disabled }]"
    role="button"
    tabindex="0"
    @click="activate"
    @keydown.enter.prevent="activate"
    @keydown.space.prevent="activate"
  >
    <i :class="['sve-icon mdi', props.icon]" />
    <span class="sve-dock__label">{{ props.label }}</span>
    <slot />
  </div>
</template>
