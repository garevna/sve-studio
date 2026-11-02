<script setup lang="ts">
  // The editor's control icon: a clickable icon, not a Vuetify button. A
  // v-btn brings its own 48px round box, padding and overlay, which made
  // every panel bulky - on a phone especially. This is the icon itself with
  // a small hit area around it, a soft tint on hover and a tooltip.
  //
  // A <span role="button">, not a <button>: the site's theme (buttons.css)
  // styles every bare <button> with !important padding, radius and shadow.
  // Keyboard: focusable, Enter/Space click it.
  //
  // Works as a menu's or a tooltip's activator: whatever the caller binds
  // (v-bind="menuProps", @click...) lands on the span via $attrs.
  //
  // No icon: the default slot is a text label ("Питання"), with an
  // optional prependIcon before it.
  //
  // active: a mode toggle that is on (drag mode, uniform format...) - shown
  // pressed in. On a page colour (TextOnBackground) the icon gets a light
  // halo instead of a white disc under it (see TextOnBackground.vue).
  defineOptions({ inheritAttrs: false })

  const props = defineProps<{
    icon?: string
    prependIcon?: string
    tooltip: string
    color?: string
    disabled?: boolean
    loading?: boolean
    size?: string
    active?: boolean
    // A raw CSS colour for the icon, outside the palette.
    iconColor?: string
  }>()

  function onKey (event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      ;(event.currentTarget as HTMLElement).click()
    }
  }

  const small = () => props.size === 'small' || props.size === 'x-small'
</script>

<template>
  <v-tooltip location="top" :text="tooltip" theme="editorTheme">
    <template #activator="{ props: tooltipProps }">
      <span
        v-bind="{ ...tooltipProps, ...$attrs }"
        :aria-disabled="disabled || undefined"
        :aria-label="tooltip"
        :class="['toolbar-icon-button', {
          'toolbar-icon-button--active': active,
          'toolbar-icon-button--disabled': disabled || loading,
          'toolbar-icon-button--small': small(),
          'toolbar-icon-button--label': !icon && !!$slots.default,
        }]"
        role="button"
        :style="iconColor ? { '--toolbar-icon-color': iconColor } : undefined"
        :tabindex="disabled ? -1 : 0"
        @keydown="onKey"
      >
        <v-progress-circular v-if="loading" indeterminate :size="small() ? 16 : 20" width="2" />
        <v-icon v-else-if="icon" :color="active ? 'primary' : color" :icon="icon" :size="small() ? 18 : 22" />
        <template v-else>
          <v-icon v-if="prependIcon" :color="color" :icon="prependIcon" size="18" />
          <span class="toolbar-icon-button__text"><slot /></span>
        </template>
      </span>
    </template>
  </v-tooltip>
</template>

<style scoped>
.toolbar-icon-button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 32px;
  height: 32px;
  padding: 0 5px;
  border-radius: 6px;
  /* The editor's own colour, never the page's (a dark section's white). */
  color: var(--toolbar-icon-color, #3A4A58);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s;
}
.toolbar-icon-button:hover {
  background-color: rgb(58 74 88 / 0.08);
}
.toolbar-icon-button:focus-visible {
  outline: 2px solid rgb(58 74 88 / 0.4);
  outline-offset: 1px;
}
.toolbar-icon-button--small {
  min-width: 26px;
  height: 26px;
  padding: 0 4px;
}
.toolbar-icon-button--label {
  padding: 0 8px;
  font-size: 0.85rem;
}
.toolbar-icon-button--active {
  background-color: rgb(58 74 88 / 0.12);
  box-shadow: inset 1px 1px 3px rgb(0 0 0 / 0.35);
}
.toolbar-icon-button--disabled {
  opacity: 0.4;
  pointer-events: none;
}
</style>
