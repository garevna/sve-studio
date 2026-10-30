<script setup lang="ts">
  // A v-btn-toggle option shown as a plain bold digit instead of an
  // mdi-numeric-*-box icon (variant pickers - CardContainerActions.vue's
  // "1/2/3" layout switch, and anywhere else picking between a small
  // number of numbered variants). Still a real <v-btn> with a real
  // tooltip (ToolbarIconButton's own pattern, not the native title
  // attribute) - v-tooltip's activator binds straight onto it with no
  // extra wrapping element, so it stays a direct DOM child of the
  // enclosing v-btn-toggle and keeps that component's own
  // .v-btn-toggle > .v-btn.v-btn--active active-state styling
  // (editor-ui.css) working exactly as it does for every other toggle
  // button in the app.
  // inheritAttrs:false + explicit $attrs spread below - same reason as
  // ToolbarIconButton.vue: this component's template root is <v-tooltip>,
  // not <v-btn>, so Vue's automatic attribute/listener fallthrough (which
  // targets the root element) would otherwise attach a caller's @click
  // to the wrong place and silently never reach the actual button.
  defineOptions({ inheritAttrs: false })

  defineProps<{
    value: number
    tooltip: string
  }>()
</script>

<template>
  <v-tooltip location="top" :text="tooltip" theme="editorTheme">
    <template #activator="{ props: tooltipProps }">
      <v-btn v-bind="{ ...tooltipProps, ...$attrs }" class="number-toggle-btn" :value="value">
        {{ value }}
      </v-btn>
    </template>
  </v-tooltip>
</template>

<style scoped>
.number-toggle-btn .v-btn__content {
  font-size: 20px !important;
  font-weight: 700 !important;
}
</style>
