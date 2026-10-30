<script setup lang="ts">
  // Shared icon/text button for every editable-block control panel - plain
  // v-btn (not v-fab, which is meant for genuinely floating controls; this
  // one sits inside a normal-flow toolbar) with a real Vuetify tooltip
  // (same convention as IconEditor.vue's own activator: v-tooltip +
  // theme="editorTheme", not the native title attribute) instead of just a
  // native title tooltip. Works both as a plain toolbar button and as a
  // v-speed-dial's own activator (v-bind="activatorProps" forwards
  // straight through to the real v-btn via $attrs, alongside the
  // tooltip's own activator props).
  //
  // `icon` is optional: omit it and pass a default-slot label instead for
  // a plain text button - e.g. font-weight's "B+"/"B-" (TextFormatMenu.vue),
  // where mdi-plus/mdi-minus would collide with this project's own
  // established meaning for those icons ("add an item") and read as
  // "add/remove something" rather than "bolder/thinner".
  //
  // `active`: for mode-toggle buttons (drag mode, margin mode, uniform
  // card format...) - a bare color tint read as unconvincing/easy to miss
  // as an on/off state. An inset shadow reads as physically pushed in,
  // which a flat color tint alone doesn't. The .toolbar-icon-button--active
  // rule itself lives in editor-ui.css's own @layer app-content block, not
  // here - a scoped style here is unlayered, and theme_2's own buttons.css
  // matches the underlying <button> with an !important box-shadow:none that
  // always wins over any unlayered rule regardless of specificity (see that
  // file's own comment on the identical fight for border-radius/height).
  defineOptions({ inheritAttrs: false })

  defineProps<{
    icon?: string
    tooltip: string
    color?: string
    disabled?: boolean
    size?: string
    active?: boolean
    // A raw CSS colour for the icon, for the rare caller that wants one
    // outside the theme palette. `color` above stays the normal route (a
    // Vuetify theme colour name); this simply feeds the scoped rule below.
    iconColor?: string
  }>()
</script>

<template>
  <v-tooltip location="top" :text="tooltip" theme="editorTheme">
    <template #activator="{ props: tooltipProps }">
      <!-- Vuetify's own VBtn only auto-renders the icon prop when it has NO
        default slot at all (`!slots.default`) - an unconditional <slot />
        here would make every icon-only caller (nothing passed for the
        slot) silently render blank, since Vue still generates a (content-
        less) slot function for v-btn regardless of whether the CALLER of
        ToolbarIconButton itself passed anything. Only forward the slot
        when this instance actually received one. -->
      <v-btn
        v-if="$slots.default"
        v-bind="{ ...tooltipProps, ...$attrs }"
        :class="['toolbar-icon-button', { 'toolbar-icon-button--active': active }]"
        :color="active ? 'primary' : color"
        :disabled="disabled"
        :icon="icon"
        :size="size"
        :style="iconColor ? { '--toolbar-icon-color': iconColor } : undefined"
        variant="text"
      >
        <slot />
      </v-btn>
      <v-btn
        v-else
        v-bind="{ ...tooltipProps, ...$attrs }"
        :class="['toolbar-icon-button', { 'toolbar-icon-button--active': active }]"
        :color="active ? 'primary' : color"
        :disabled="disabled"
        :icon="icon"
        :size="size"
        :style="iconColor ? { '--toolbar-icon-color': iconColor } : undefined"
        variant="text"
      />
    </template>
  </v-tooltip>
</template>

<style scoped>
/*
 * Editor chrome must not take its colour from the app being edited.
 * Vuetify's `.v-btn--variant-text { color: inherit }` makes these buttons
 * pick up whatever colour the surrounding CONTENT sets - a v-card's own
 * `color` prop, a dark section - so the editor's icons changed colour with
 * the page (confirmed live: white format icons on the light banner card).
 *
 * This has to live HERE, in the component's own scoped block, rather than in
 * editor-ui.css: that file writes into `@layer app-content`, which
 * index.html declares BEFORE vuetify-components, so it loses to Vuetify's
 * rule. A scoped <style> is unlayered, and unlayered normal declarations
 * outrank every layered one - which is exactly what's needed, without the
 * !important that would also outrank the callers who legitimately set a
 * colour.
 *
 * Those callers still win: `color` renders Vuetify's own .text-{name}
 * utility, which is !important, and !important beats any normal
 * declaration whatever its layer.
 */
.toolbar-icon-button.v-btn {
  color: var(--toolbar-icon-color, #3A4A58);
}
</style>
