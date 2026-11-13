<script setup lang="ts">
  import type { EditorMode } from '@/composables/useEditorMode'
  import { computed } from 'vue'
  import { provideEditorMode } from '@/composables/useEditorMode'

  // Its content in edit mode - for settings (IconEditor and the like) on a
  // page that is in preview mode as a whole, so that its sample shows no
  // editing controls (UI Kit "Календарі").
  provideEditorMode(computed<EditorMode>(() => 'edit'))
</script>

<template>
  <slot />
</template>
