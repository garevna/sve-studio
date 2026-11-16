<script setup lang="ts">
  import { computed } from 'vue'
  import DockFormView from '@/components/dock/DockFormView.vue'
  import { editorDock } from '@/composables/useClientApi'
  import { provideEditorDockFormHost } from '@/composables/useEditorDockFormHost'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { t } from '@/i18n'

  // A form popup's middle in the editor: the site's form it names
  // ("Форми"), as the site's PopupAnswer.vue draws it - the same
  // DockFormView. Tried in a preview, it sends nobody anything.
  const props = defineProps<{ form?: string }>()
  const mode = useEditorMode()
  provideEditorDockFormHost({ editing: () => mode.value === 'edit' })
  const shown = computed(() => editorDock.form(props.form) ?? null)
</script>

<template>
  <div class="pw-dock-block pw-popup__form">
    <DockFormView v-if="shown" :form="shown" />
    <!-- Empty blocks stay reachable: a place that says what to do. -->
    <p v-else class="popup-form-empty">
      <v-icon icon="mdi-form-select" />
      <span>{{ t('pagePopups.formNone') }}</span>
    </p>
  </div>
</template>

<style scoped>
.popup-form-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 0;
  padding: 16px;
  border: 1px dashed #B0B8C4;
  border-radius: 8px;
  color: #7A8699;
}
</style>
