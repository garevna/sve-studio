<script lang="ts" setup>
  const props = withDefaults(defineProps<{
    loading?: boolean
    dirty?: boolean
    undoing?: boolean
    // "Undo" here really means "re-fetch from the public/ baseline into
    // IndexedDB" (see every db/worker.ts 'undo' handler) - genuinely useful
    // any time IndexedDB might be stale relative to the public file, not
    // only when THIS record is flagged dirty (a file can be stale without
    // ever having been locally edited - confirmed live: an already-seeded
    // style whose public file changed afterward stays stale indefinitely,
    // with no dirty flag to trigger showing this button). Defaults to
    // `dirty` for every other caller's existing behavior; StyleFileView.vue
    // passes true unconditionally so a force-refresh is always reachable.
    undoable?: boolean
  }>(), {
    // An explicit undefined default: without one Vue turns an absent boolean
    // prop into false, so `undoable ?? dirty` below never fell back to
    // dirty and "Скасувати" never showed on any settings page.
    undoable: undefined,
  })
  defineEmits<{ click: [], undo: [] }>()
</script>

<template>
  <div class="editor-save-bar">
    <!-- For a page's other primary actions ("Додати X" etc) that belong in
      the same row as Save/Cancel, styled to match, rather than living
      elsewhere on the page with a different look - see ButtonPaletteView.vue. -->
    <slot name="prepend" />
    <v-btn
      v-if="props.undoable ?? dirty"
      color="secondary"
      :loading="undoing"
      prepend-icon="mdi-undo"
      size="large"
      variant="outlined"
      @click="$emit('undo')"
    >
      Скасувати
    </v-btn>
    <v-btn
      color="primary"
      :loading="loading"
      prepend-icon="mdi-content-save"
      size="large"
      variant="elevated"
      @click="$emit('click')"
    >
      Зберегти
    </v-btn>
  </div>
</template>

<style scoped>
  .editor-save-bar {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 32px;
    padding-top: 24px;
    border-top: solid 1px rgba(58, 74, 88, 0.12);
  }
</style>
