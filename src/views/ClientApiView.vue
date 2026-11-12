<script lang="ts" setup>
  import type { DockRequest, DockRole } from '@sve/dock'
  import { fieldsOf } from '@sve/dock'
  import { computed, onMounted, ref } from 'vue'
  import ClientApiRequestPanel from '@/components/editors/client-api/ClientApiRequestPanel.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import { DOCK_ROLES, dockRoleIcon, useClientApi } from '@/composables/useClientApi'
  import { DEMO_CLIENT_URL, isDemoClient, openDemoAdmin } from '@/configs/demo-client'
  import { editorUiLocale, t } from '@/i18n'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'

  // "Підключення API" - the docking block (packages/dock): the one layer
  // between the site's forms and the client's own API. Each request is
  // edited under its own row (ClientApiRequestPanel.vue: settings left,
  // what goes out and "Перевірити" right); the bar at the bottom saves.
  // With the demo's made-up client connected, its admin opens in a window of
  // its own: everything the site sends shows up there as it arrives.
  const clientApi = useClientApi()
  const demoClient = computed(() => isDemoClient(clientApi.document.value.baseUrl))
  const expanded = ref<string | null>(null)
  const saving = ref(false)
  const undoing = ref(false)

  onMounted(() => clientApi.load())

  // The keys the site's forms fill in (HotelSearch.vue), plus any a request
  // already reads.
  const FORM_KEYS = ['destination', 'dates', 'adults', 'children', 'rooms']
  const keys = computed(() => {
    const used = clientApi.document.value.requests.flatMap(request => request.role === 'handoff'
      ? fieldsOf([...(request.session?.query ?? []), ...(request.session?.body ?? []), ...(request.target.query ?? [])])
      : fieldsOf([...(request.call.query ?? []), ...(request.call.body ?? [])]))
    return [...new Set([...FORM_KEYS, ...used])].filter(Boolean)
  })

  function toggle (id: string) {
    expanded.value = expanded.value === id ? null : id
  }

  function metaOf (request: DockRequest): string {
    const role = t(`clientApi.roles.${request.role}`)
    if (request.role === 'handoff') {
      return `${role} · ${request.mode === 'session' ? t('clientApi.modeSession') : t('clientApi.modeLink')} · ${request.target.url || '—'}`
    }
    return `${role} · ${request.call.method ?? 'GET'} ${request.call.url || '—'}`
  }

  function add (role: DockRole) {
    const request = clientApi.create(role, t(`clientApi.roles.${role}`))
    expanded.value = request.id
  }

  async function remove (request: DockRequest) {
    const sure = await useUiFeedbackStore().confirm({
      title: t('clientApi.deleteTitle', { name: request.name }),
      text: t('clientApi.deleteText'),
    })
    if (sure) {
      clientApi.remove(request.id)
    }
  }

  async function save () {
    saving.value = true
    try {
      await clientApi.save()
    } finally {
      saving.value = false
    }
  }
  async function undo () {
    undoing.value = true
    try {
      await clientApi.undo()
    } finally {
      undoing.value = false
    }
  }
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" detail="client-api.json" :title="t('clientApi.title')" />

      <p class="dock-hint">{{ t('clientApi.hint') }}</p>
      <v-progress-linear v-if="!clientApi.loaded.value" color="primary" indeterminate />
      <template v-else>
        <div v-if="demoClient" class="dock-demo">
          <v-icon class="dock-row-icon" icon="mdi-domain" />
          <p>{{ t('clientApi.demoClient', { url: DEMO_CLIENT_URL }) }}</p>
          <v-btn
            color="secondary"
            prepend-icon="mdi-open-in-new"
            variant="outlined"
            @click="openDemoAdmin(editorUiLocale())"
          >
            {{ t('clientApi.openAdmin') }}
          </v-btn>
        </div>
        <v-text-field
          v-model="clientApi.document.value.baseUrl"
          class="dock-base"
          density="compact"
          :hint="t('clientApi.baseUrlHint')"
          :label="t('clientApi.baseUrl')"
          persistent-hint
          placeholder="https://api.example.com/v1"
          variant="outlined"
        />
        <p v-if="clientApi.document.value.requests.length === 0" class="mb-6">{{ t('clientApi.none') }}</p>
        <div class="dock-list">
          <div v-for="(request, index) of clientApi.document.value.requests" :key="request.id" class="dock-row">
            <div class="dock-row-head" @click="toggle(request.id)">
              <v-icon class="dock-row-icon" :icon="dockRoleIcon(request.role)" />
              <div class="dock-row-names">
                <span class="dock-row-name">{{ request.name || request.id }}</span>
                <span class="dock-row-meta">{{ metaOf(request) }}</span>
              </div>
              <div class="dock-row-actions" @click.stop>
                <ToolbarIconButton icon="mdi-delete-outline" :tooltip="t('common.delete')" @click="remove(request)" />
                <ToolbarIconButton
                  :icon="expanded === request.id ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                  :tooltip="t('clientApi.edit')"
                  @click="toggle(request.id)"
                />
              </div>
            </div>
            <v-expand-transition>
              <div v-if="expanded === request.id" class="dock-row-body">
                <ClientApiRequestPanel v-model="clientApi.document.value.requests[index]!" :keys="keys" />
              </div>
            </v-expand-transition>
          </div>
        </div>
      </template>

      <EditorSaveBar
        v-if="clientApi.loaded.value"
        :dirty="clientApi.dirty.value"
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
                {{ t('clientApi.add') }}
              </v-btn>
            </template>
            <v-list density="compact" theme="editorTheme">
              <v-list-item
                v-for="option of DOCK_ROLES"
                :key="option.role"
                :prepend-icon="option.icon"
                :subtitle="t(`clientApi.roleHints.${option.role}`)"
                :title="t(`clientApi.roles.${option.role}`)"
                @click="add(option.role)"
              />
            </v-list>
          </v-menu>
        </template>
      </EditorSaveBar>
    </v-main>
  </v-app>
</template>

<style scoped>
.dock-demo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  max-width: 900px;
  margin-bottom: 20px;
  padding: 12px 16px;
  border: solid 1px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}
.dock-demo p {
  flex: 1 1 320px;
  margin: 0;
  font-size: 0.9rem;
}
.dock-hint {
  max-width: 900px;
  margin-bottom: 16px;
  font-size: 0.85rem;
  color: #7A8699;
}
.dock-base {
  max-width: 640px;
  margin-bottom: 20px;
}
.dock-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dock-row {
  border: solid 1px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}
.dock-row-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  cursor: pointer;
}
.dock-row-icon {
  color: #7A8699;
}
.dock-row-names {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
}
.dock-row-name {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.dock-row-meta {
  font-size: 0.8rem;
  color: #7A8699;
  overflow-wrap: anywhere;
}
.dock-row-actions {
  display: flex;
  align-items: center;
}
.dock-row-body {
  padding: 4px 12px 16px;
  border-top: solid 1px rgba(0, 0, 0, 0.06);
}
</style>
