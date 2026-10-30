<script setup lang="ts">
  // One row of a SveMenu. A div with the menu-item role, not a <button>: the
  // edited site's stylesheets restyle every <button> on the page.
  const props = defineProps<{
    icon?: string
    hint?: string
    danger?: boolean
    disabled?: boolean
  }>()

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
    :class="['sve-menu-item', { 'sve-menu-item--danger': props.danger, 'sve-menu-item--disabled': props.disabled }]"
    role="menuitem"
    tabindex="0"
    @click="activate"
    @keydown.enter.prevent="activate"
    @keydown.space.prevent="activate"
  >
    <i v-if="props.icon" :class="['sve-icon mdi', props.icon]" />
    <span class="sve-menu-item__label"><slot /></span>
    <span v-if="props.hint" class="sve-menu-item__hint">{{ props.hint }}</span>
  </div>
</template>
