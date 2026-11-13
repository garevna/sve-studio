<script setup lang="ts">
  import type { TranslatedModel } from '@/types/TemplateBlockModel'
  import { computed, onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import DockFormView from '@/components/dock/DockFormView.vue'
  import EditableBlockHeading from '@/components/editors/EditableBlockHeading.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { editorDock, useClientApi } from '@/composables/useClientApi'
  import { useBlockActionsTarget } from '@/composables/useEditableBlockActions'
  import { provideEditorDockFormHost } from '@/composables/useEditorDockFormHost'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { useSiteForms } from '@/composables/useSiteForms'
  import { t } from '@/i18n'

  // "Форма стикування" in the editor: the site's own block (the site's
  // DockForm.vue, the same DockFormView) working against the same docking
  // block - the lists, free days and cards are the client's, right here.
  // The form itself (fields, look, connection) is set up in "Форми
  // стикування"; the block has its heading and names its form. While it is
  // being edited, cards show at once, for sample values.
  defineOptions({ inheritAttrs: false })

  interface PropsModel {
    title?: TranslatedModel
    subtitle?: TranslatedModel
    titleClass?: string
    subtitleClass?: string
    form?: string
  }

  const model = defineModel<PropsModel>({ default: () => ({}) })
  const mode = useEditorMode()
  const blockActionsTarget = useBlockActionsTarget()
  const router = useRouter()
  const route = useRoute()
  const clientApi = useClientApi()
  const siteForms = useSiteForms()
  onMounted(() => clientApi.load())
  provideEditorDockFormHost({ editing: () => mode.value === 'edit' })

  function patch (changes: Partial<PropsModel>) {
    model.value = { ...model.value, ...changes }
  }

  const form = computed(() => editorDock.form(model.value.form) ?? null)
  const forms = computed(() => siteForms.document.value.forms.map(item => ({ title: item.name || item.id, value: item.id })))

  const settingsOpen = ref(false)
  function setUp () {
    void router.push({ path: '/forms', query: { edit: model.value.form, from: route.fullPath } })
  }
</script>

<template>
  <section class="pw-dock-block">
    <EditableBlockHeading
      :subtitle="model.subtitle"
      :subtitle-class="model.subtitleClass || 'h3 text-center mb-5'"
      :title="model.title"
      :title-class="model.titleClass || 'h2 text-center mb-4'"
      @update="patch"
    />

    <template v-if="mode === 'edit'">
      <Teleport :disabled="!blockActionsTarget" :to="blockActionsTarget || 'body'">
        <ToolbarIconButton :active="settingsOpen" icon="mdi-tune-variant" :tooltip="t('dockForms.block.settings')" @click="settingsOpen = !settingsOpen" />
      </Teleport>
    </template>

    <DockFormView v-if="form" :form="form" />
    <div v-else class="dock-block-empty">
      <v-icon icon="mdi-form-select" />
      <span>{{ t('dockForms.block.noForm') }}</span>
    </div>

    <!-- The block's settings, under the form (edit mode only). -->
    <v-expand-transition>
      <div v-if="mode === 'edit' && settingsOpen" class="dock-block-settings v-theme--editorTheme">
        <v-select
          density="compact"
          hide-details
          :items="forms"
          :label="t('dockForms.block.form')"
          :model-value="model.form ?? null"
          variant="outlined"
          @update:model-value="value => patch({ form: value ?? undefined })"
        />
        <v-btn
          prepend-icon="mdi-form-select"
          size="small"
          variant="text"
          @click="setUp"
        >{{ t('dockForms.block.setUp') }}</v-btn>
      </div>
    </v-expand-transition>
  </section>
</template>

<style scoped>
.pw-dock-block {
  padding-block: 32px;
}

/* the editor's own */
.dock-block-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 120px;
  border: dashed 1px rgba(58, 74, 88, 0.3);
  border-radius: 8px;
  color: #6B7785;
}
.dock-block-settings {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  max-width: 1080px;
  margin: 16px auto 0;
  padding: 12px 16px;
  border: dashed 1px rgba(58, 74, 88, 0.3);
  border-radius: 8px;
  background: #FFFFFF;
}
.dock-block-settings .v-select {
  flex: 1 1 240px;
  max-width: 360px;
}
</style>
