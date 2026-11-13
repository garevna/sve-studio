<script lang="ts" setup>
  import type { DockForm, DockPreset } from '@sve/dock'
  import { DOCK_PRESETS } from '@sve/dock'
  import { computed, onMounted, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import DockFormConnectTab from '@/components/editors/dock-forms/DockFormConnectTab.vue'
  import DockFormLookTab from '@/components/editors/dock-forms/DockFormLookTab.vue'
  import DockFormPreview from '@/components/editors/dock-forms/DockFormPreview.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import { useClientApi } from '@/composables/useClientApi'
  import { useSiteForms } from '@/composables/useSiteForms'
  import { t } from '@/i18n'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'

  // "Форми": the site's forms (forms.json, packages/dock/src/form.ts) - what
  // a visitor fills in: an enquiry, a booking, an appointment, an order.
  // Each is edited under its own row in two tabs: "Вигляд" (the designer:
  // fields, order, icons, words, layout) and "Дія" (the developer: the
  // site's channel, or the client's API - keys, requests, the button - as
  // steps), with the form itself, working, under them. "Дія" may change the
  // API's requests too (a renamed key): "Зберегти" publishes both files.
  // A page's "Форма" block sends here with ?edit=<id>&from=<page>.
  const clientApi = useClientApi()
  const siteForms = useSiteForms()
  const route = useRoute()
  const backTo = computed(() => (typeof route.query.from === 'string' && route.query.from.startsWith('/') ? route.query.from : '/'))
  const forms = computed(() => siteForms.document.value.forms)

  const expanded = ref<string | null>(typeof route.query.edit === 'string' ? route.query.edit : null)
  const tab = ref<'look' | 'connect'>(route.query.tab === 'connect' ? 'connect' : 'look')
  // the language the form's texts are edited and shown in
  const lang = ref('uk')
  const saving = ref(false)
  const undoing = ref(false)

  onMounted(() => clientApi.load())

  const PRESET_ICONS: Record<DockPreset, string> = {
    booking: 'mdi-bed-outline',
    appointment: 'mdi-calendar-account-outline',
    shop: 'mdi-cart-outline',
    enquiry: 'mdi-email-edit-outline',
  }

  function toggle (id: string) {
    expanded.value = expanded.value === id ? null : id
  }
  function metaOf (form: DockForm): string {
    return [
      form.preset ? t(`dockForms.presets.${form.preset}`) : '',
      t(`dockForms.look.${form.layout ?? 'bar'}`),
      t('dockForms.fieldsCount', { count: form.fields.length }),
    ].filter(Boolean).join(' · ')
  }

  function add (preset: DockPreset) {
    const form = siteForms.create(preset, t(`dockForms.presets.${preset}`))
    expanded.value = form.id
    tab.value = 'look'
  }
  async function remove (form: DockForm) {
    const sure = await useUiFeedbackStore().confirm({
      title: t('dockForms.deleteTitle', { name: form.name }),
      text: t('dockForms.deleteText'),
    })
    if (sure) {
      siteForms.remove(form.id)
    }
  }

  async function save () {
    saving.value = true
    try {
      await Promise.all([siteForms.save(), clientApi.dirty.value ? clientApi.save() : Promise.resolve()])
    } finally {
      saving.value = false
    }
  }
  async function undo () {
    undoing.value = true
    try {
      await Promise.all([siteForms.undo(), clientApi.dirty.value ? clientApi.undo() : Promise.resolve()])
    } finally {
      undoing.value = false
    }
  }
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader :back-to="backTo" detail="forms.json" :title="t('dockForms.title')" />

      <p class="forms-hint">{{ t('dockForms.hint') }}</p>
      <v-progress-linear v-if="!clientApi.loaded.value" color="primary" indeterminate />
      <template v-else>
        <p v-if="forms.length === 0" class="mb-6">{{ t('dockForms.none') }}</p>
        <div class="forms-list">
          <div v-for="(form, index) of forms" :key="form.id" class="forms-row">
            <div class="forms-row-head" @click="toggle(form.id)">
              <v-icon class="forms-icon" :icon="form.preset ? PRESET_ICONS[form.preset] : 'mdi-form-select'" />
              <div class="forms-names">
                <span class="forms-name">{{ form.name || form.id }}</span>
                <span class="forms-meta">{{ metaOf(form) }}</span>
              </div>
              <div class="forms-actions" @click.stop>
                <ToolbarIconButton icon="mdi-delete-outline" :tooltip="t('common.delete')" @click="remove(form)" />
                <ToolbarIconButton
                  :icon="expanded === form.id ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                  :tooltip="t('dockForms.edit')"
                  @click="toggle(form.id)"
                />
              </div>
            </div>
            <v-expand-transition>
              <div v-if="expanded === form.id" class="forms-row-body">
                <v-tabs
                  v-model="tab"
                  centered
                  class="editor-panel editor-tabs forms-tabs mb-2"
                  height="40"
                  hide-slider
                  selected-class="editor-tab--active"
                >
                  <v-tab prepend-icon="mdi-palette-outline" value="look">{{ t('dockForms.tabs.look') }}</v-tab>
                  <v-tab prepend-icon="mdi-connection" value="connect">{{ t('dockForms.tabs.connect') }}</v-tab>
                </v-tabs>
                <p class="forms-tab-hint">{{ t(`dockForms.tabHints.${tab}`) }}</p>
                <DockFormLookTab v-if="tab === 'look'" v-model="forms[index]!" v-model:lang="lang" />
                <DockFormConnectTab v-else v-model="forms[index]!" />
                <DockFormPreview :form="form" :lang="lang" />
              </div>
            </v-expand-transition>
          </div>
        </div>
      </template>

      <EditorSaveBar
        v-if="clientApi.loaded.value"
        :dirty="siteForms.dirty.value || clientApi.dirty.value"
        :loading="saving"
        :undoing="undoing"
        @click="save"
        @undo="undo"
      >
        <template #prepend>
          <v-menu location="top">
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                color="secondary"
                prepend-icon="mdi-plus"
                size="large"
                variant="outlined"
              >
                {{ t('dockForms.add') }}
              </v-btn>
            </template>
            <v-list density="compact" theme="editorTheme">
              <v-list-item
                v-for="preset of DOCK_PRESETS"
                :key="preset"
                :prepend-icon="PRESET_ICONS[preset]"
                :subtitle="t(`dockForms.presetHints.${preset}`)"
                :title="t(`dockForms.presets.${preset}`)"
                @click="add(preset)"
              />
            </v-list>
          </v-menu>
        </template>
      </EditorSaveBar>
    </v-main>
  </v-app>
</template>

<style scoped>
.forms-hint {
  max-width: 900px;
  margin-bottom: 16px;
  font-size: 0.85rem;
  color: #7A8699;
}
.forms-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.forms-row {
  border: solid 1px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}
.forms-row-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  cursor: pointer;
}
.forms-icon {
  color: #7A8699;
}
.forms-names {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
}
.forms-name {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.forms-meta {
  font-size: 0.8rem;
  color: #7A8699;
}
.forms-actions {
  display: flex;
  align-items: center;
}
.forms-row-body {
  padding: 12px 12px 16px;
  border-top: solid 1px rgba(0, 0, 0, 0.06);
}
.forms-tabs {
  width: max-content;
  max-width: 100%;
  margin-inline: auto;
}
.forms-tab-hint {
  margin: 0 auto 16px;
  max-width: 720px;
  text-align: center;
  font-size: 0.85rem;
  color: #7A8699;
}
</style>
