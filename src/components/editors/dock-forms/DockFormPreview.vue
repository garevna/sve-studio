<script setup lang="ts">
  import type { DockForm } from '@sve/dock'
  import DockFormView from '@/components/dock/DockFormView.vue'
  import { provideEditorDockFormHost } from '@/composables/useEditorDockFormHost'
  import { t } from '@/i18n'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // "Так її бачить відвідувач": the form itself, as the site draws it, under
  // its settings - and working: lists, free days and cards come from the
  // client's API, the button opens the client's request intake in a tab.
  const props = defineProps<{ form: DockForm, lang: string }>()
  provideEditorDockFormHost({ lang: () => props.lang, editing: () => true })
</script>

<template>
  <section class="dock-preview">
    <p class="dock-preview-title">{{ t('dockForms.preview') }}</p>
    <p class="dock-preview-hint">{{ t('dockForms.previewHint') }}</p>
    <v-theme-provider :theme="APP_THEME_NAME">
      <div :class="['dock-preview-stage', EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME)]">
        <DockFormView :key="form.id" :form="form" />
      </div>
    </v-theme-provider>
  </section>
</template>

<style scoped>
.dock-preview {
  margin-top: 28px;
}
.dock-preview-title {
  margin: 0;
  font-weight: 600;
}
.dock-preview-hint {
  margin: 2px 0 12px;
  font-size: 0.85rem;
  color: #7A8699;
}
.dock-preview-stage {
  padding: 28px 16px;
  border: dashed 1px rgba(58, 74, 88, 0.3);
  border-radius: 8px;
  background: var(--white);
}
</style>
