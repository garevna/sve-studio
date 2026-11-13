<script setup lang="ts">
  import type { DockField, DockForm, DockFormAction, DockText } from '@sve/dock'
  import { fieldRequest, formAction, formKeys } from '@sve/dock'
  import { computed, reactive, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { editorDock, useClientApi } from '@/composables/useClientApi'
  import { isDemoClient, openDemoAdmin } from '@/configs/demo-client'
  import { editorUiLocale, t } from '@/i18n'

  // "Дія" - the developer's tab of a form: what its button does. To the
  // site's channel (like a popup's form) - then only where its lists come
  // from. To the client's API - as steps: where the API is (its requests
  // are described in "Підключення API"), the fields' keys (the names the
  // requests read them by), which request each list / calendar / cards
  // field reads from, what the button does, and how to try it.
  const form = defineModel<DockForm>({ required: true })
  const clientApi = useClientApi()
  const router = useRouter()
  const route = useRoute()

  const baseUrl = computed(() => clientApi.document.value.baseUrl || '')
  const demo = computed(() => isDemoClient(clientApi.document.value.baseUrl))
  function openApi () {
    void router.push({ path: '/client-api', query: { from: route.fullPath } })
  }

  function labelOf (text: DockText | undefined, fallback: string): string {
    return text?.uk || text?.en || text?.de || fallback
  }

  // --- step 2: the keys ----------------------------------------------------------

  interface KeyRow { id: string, icon?: string, label: string, get: () => string, set: (key: string) => void }
  const keyRows = computed<KeyRow[]>(() => form.value.fields.flatMap((field, index) => field.kind === 'counters'
    ? field.items.map((item, itemIndex) => ({
      id: `${index}:${itemIndex}`,
      icon: field.icon,
      label: `${labelOf(field.label, field.key)} · ${labelOf(item.label, item.key)}`,
      get: () => item.key,
      set: (key: string) => {
        item.key = key
      },
    }))
    : [{
      id: `${index}`,
      icon: field.icon,
      label: labelOf(field.label, field.key),
      get: () => field.key,
      set: (key: string) => {
        field.key = key
      },
    }]))

  // what is being typed, until it is a key the form can take
  const drafts = reactive<Record<string, string>>({})
  // the rows moved or changed: what was typed belongs to no row any more
  watch(() => form.value.fields.map(field => `${field.kind}:${field.key}`).join(','), () => {
    for (const id of Object.keys(drafts)) {
      delete drafts[id]
    }
  })
  const KEY = /^[A-Za-z][\w-]*$/
  function problemOf (row: KeyRow): string {
    const draft = drafts[row.id]
    if (draft === undefined || draft === row.get()) {
      return ''
    }
    if (!KEY.test(draft)) {
      return t('dockForms.connect.keyBad')
    }
    return formKeys(form.value).includes(draft) ? t('dockForms.connect.keyTaken') : ''
  }
  const formRequests = computed(() => [...form.value.fields.map(field => fieldRequest(field)), form.value.button.request].filter((id): id is string => !!id))
  function typeKey (row: KeyRow, value: string) {
    drafts[row.id] = value.trim()
    if (problemOf(row) || drafts[row.id] === row.get()) {
      return
    }
    clientApi.renameKey(row.get(), drafts[row.id]!, formRequests.value)
    row.set(drafts[row.id]!)
  }

  // --- step 3: where the fields take their data ----------------------------------

  type SourceField = Extract<DockField, { kind: 'choice' | 'dates' | 'cards' }>
  const sourced = computed(() => form.value.fields.filter((field): field is SourceField => field.kind === 'choice' || field.kind === 'dates' || field.kind === 'cards'))
  function requestsFor (field: SourceField) {
    return clientApi.ofRole(field.kind === 'dates' ? 'dates' : 'options').map(item => ({ title: item.name || item.id, value: item.id }))
  }
  function keyLabel (key: string): string {
    const field = form.value.fields.find(one => one.key === key || (one.kind === 'counters' && one.items.some(item => item.key === key)))
    const item = field?.kind === 'counters' ? field.items.find(one => one.key === key) : undefined
    return labelOf(item?.label ?? field?.label, key)
  }
  function waitsFor (field: SourceField): string {
    const keys = editorDock.reads(field.request).filter(key => key !== field.key && formKeys(form.value).includes(key))
    return keys.length > 0 ? t('dockForms.connect.waitsFor', { fields: keys.map(key => keyLabel(key)).join(', ') }) : ''
  }
  function unknownOf (request: string | undefined): string {
    const own = new Set(formKeys(form.value))
    const keys = editorDock.reads(request).filter(key => !own.has(key))
    return keys.length > 0 ? t('dockForms.connect.readsUnknown', { keys: keys.join(', ') }) : ''
  }

  // --- step 4: the button --------------------------------------------------------

  const buttonRequests = computed(() => [...clientApi.ofRole('handoff'), ...clientApi.ofRole('answer')]
    .map(item => ({ title: `${item.name || item.id} · ${t(`clientApi.roles.${item.role}`)}`, value: item.id })))

  // --- the action: the site's channel or the client's API -------------------------

  const ACTIONS: { value: DockFormAction, icon: string }[] = [
    { value: 'channel', icon: 'mdi-send-outline' },
    { value: 'api', icon: 'mdi-connection' },
  ]
  const action = computed<DockFormAction>({
    get: () => formAction(form.value),
    set: value => {
      form.value.button.action = value
    },
  })
  function openMessages () {
    void router.push({ path: '/messages' })
  }

  // --- what is still not connected ------------------------------------------------

  const missing = computed(() => [
    ...sourced.value.filter(field => !field.request).map(field => labelOf(field.label, field.key)),
    ...(action.value === 'channel' || form.value.button.request ? [] : [t('dockForms.connect.buttonMissing')]),
  ])
</script>

<template>
  <div class="dock-connect">
    <section class="dock-step">
      <h3>{{ t('dockForms.action.title') }}</h3>
      <v-btn-toggle
        v-model="action"
        class="dock-action"
        color="primary"
        density="compact"
        mandatory
        variant="outlined"
      >
        <v-btn
          v-for="option of ACTIONS"
          :key="option.value"
          :prepend-icon="option.icon"
          size="small"
          :value="option.value"
        >{{ t(`dockForms.action.${option.value}`) }}</v-btn>
      </v-btn-toggle>
      <p class="dock-action-hint">{{ t(`dockForms.action.${action}Hint`) }}</p>
      <v-btn
        v-if="action === 'channel'"
        prepend-icon="mdi-email-outline"
        size="small"
        variant="text"
        @click="openMessages"
      >{{ t('dockForms.action.openMessages') }}</v-btn>
    </section>

    <p v-if="action === 'api' || sourced.length > 0" :class="['dock-connect-state', { 'dock-connect-state--ready': missing.length === 0 }]">
      <v-icon :icon="missing.length === 0 ? 'mdi-check-circle-outline' : 'mdi-progress-alert'" size="20" />
      {{ missing.length === 0 ? t('dockForms.connect.ready') : t('dockForms.connect.notReady', { what: missing.join(', ') }) }}
    </p>

    <!-- a form to the site's channel: only where its lists come from -->
    <section v-if="action === 'channel' && sourced.length > 0" class="dock-step">
      <h3>{{ t('dockForms.action.sources') }}</h3>
      <p>{{ t('dockForms.action.sourcesText') }}</p>
      <div class="dock-step-rows">
        <div v-for="field of sourced" :key="field.key" class="dock-step-row dock-step-row--source">
          <span class="dock-step-name">
            <v-icon v-if="field.icon" :icon="field.icon" size="18" />
            {{ labelOf(field.label, field.key) }}
            <small>{{ t(`dockForms.kinds.${field.kind}`) }}</small>
          </span>
          <div class="dock-step-input">
            <v-select
              clearable
              density="compact"
              hide-details
              :items="requestsFor(field)"
              :model-value="field.request ?? null"
              :no-data-text="t('dockForms.connect.noneOfRole')"
              :placeholder="t('dockForms.connect.noRequest')"
              variant="outlined"
              @update:model-value="value => field.request = value ?? undefined"
            />
            <p v-if="waitsFor(field)" class="dock-step-note">{{ waitsFor(field) }}</p>
          </div>
        </div>
      </div>
      <v-btn
        class="mt-2"
        prepend-icon="mdi-connection"
        size="small"
        variant="text"
        @click="openApi"
      >{{ t('dockForms.connect.openApi') }}</v-btn>
    </section>

    <template v-if="action === 'api'">
      <section class="dock-step">
        <h3>{{ t('dockForms.connect.step1') }}</h3>
        <p>{{ t('dockForms.connect.step1Text') }}</p>
        <p class="dock-step-value">
          {{ t('dockForms.connect.baseUrl') }}
          <code>{{ baseUrl || t('dockForms.connect.baseUrlEmpty') }}</code>
        </p>
        <v-btn
          prepend-icon="mdi-connection"
          size="small"
          variant="text"
          @click="openApi"
        >{{ t('dockForms.connect.openApi') }}</v-btn>
      </section>

      <section class="dock-step">
        <h3>{{ t('dockForms.connect.step2') }}</h3>
        <p>{{ t('dockForms.connect.step2Text') }}</p>
        <div class="dock-step-rows">
          <div v-for="row of keyRows" :key="row.id" class="dock-step-row">
            <span class="dock-step-name">
              <v-icon v-if="row.icon" :icon="row.icon" size="18" />
              {{ row.label }}
            </span>
            <v-text-field
              class="dock-step-input"
              density="compact"
              :error-messages="problemOf(row)"
              :hide-details="!problemOf(row)"
              :model-value="drafts[row.id] ?? row.get()"
              spellcheck="false"
              variant="outlined"
              @update:model-value="value => typeKey(row, value)"
            />
          </div>
        </div>
      </section>

      <section class="dock-step">
        <h3>{{ t('dockForms.connect.step3') }}</h3>
        <p>{{ t('dockForms.connect.step3Text') }}</p>
        <div class="dock-step-rows">
          <div v-for="field of sourced" :key="field.key" class="dock-step-row dock-step-row--source">
            <span class="dock-step-name">
              <v-icon v-if="field.icon" :icon="field.icon" size="18" />
              {{ labelOf(field.label, field.key) }}
              <small>{{ t(`dockForms.kinds.${field.kind}`) }}</small>
            </span>
            <div class="dock-step-input">
              <v-select
                clearable
                density="compact"
                hide-details
                :items="requestsFor(field)"
                :model-value="field.request ?? null"
                :no-data-text="t('dockForms.connect.noneOfRole')"
                :placeholder="t('dockForms.connect.noRequest')"
                variant="outlined"
                @update:model-value="value => field.request = value ?? undefined"
              />
              <p v-if="waitsFor(field)" class="dock-step-note">{{ waitsFor(field) }}</p>
              <p v-if="unknownOf(field.request)" class="dock-step-note dock-step-note--warn">{{ unknownOf(field.request) }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="dock-step">
        <h3>{{ t('dockForms.connect.step4') }}</h3>
        <p>{{ t('dockForms.connect.step4Text') }}</p>
        <div class="dock-step-input dock-step-input--wide">
          <v-select
            clearable
            density="compact"
            hide-details
            :items="buttonRequests"
            :label="t('dockForms.connect.buttonRequest')"
            :model-value="form.button.request ?? null"
            :no-data-text="t('dockForms.connect.noneOfRole')"
            :placeholder="t('dockForms.connect.noRequest')"
            variant="outlined"
            @update:model-value="value => form.button.request = value ?? undefined"
          />
          <p v-if="unknownOf(form.button.request)" class="dock-step-note dock-step-note--warn">{{ unknownOf(form.button.request) }}</p>
        </div>
      </section>

      <section class="dock-step">
        <h3>{{ t('dockForms.connect.step5') }}</h3>
        <p>{{ t('dockForms.connect.step5Text') }}</p>
        <v-btn
          v-if="demo"
          color="secondary"
          prepend-icon="mdi-open-in-new"
          size="small"
          variant="outlined"
          @click="openDemoAdmin(editorUiLocale())"
        >{{ t('dockForms.connect.openAdmin') }}</v-btn>
      </section>
    </template>
  </div>
</template>

<style scoped>
.dock-connect {
  display: grid;
  gap: 16px;
}
.dock-connect-state {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-weight: 600;
  color: #6B7785;
}
.dock-connect-state--ready {
  color: rgb(var(--v-theme-primary));
}
.dock-step {
  padding: 12px 16px;
  border: solid 1px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}
.dock-step h3 {
  margin: 0 0 4px;
  font-size: 1rem;
}
.dock-step p {
  max-width: 820px;
  margin: 0 0 8px;
  font-size: 0.9rem;
}
.dock-action {
  flex-wrap: wrap;
  height: auto !important;
}
.dock-step .dock-action-hint {
  margin: 8px 0 0;
  font-size: 0.85rem;
  color: #7A8699;
}
.dock-step-value code {
  overflow-wrap: anywhere;
}
.dock-step-rows {
  display: grid;
  gap: 8px;
}
.dock-step-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  align-items: center;
  gap: 8px 16px;
}
.dock-step-row--source {
  align-items: start;
}
.dock-step-name {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
  padding-top: 8px;
}
.dock-step-name small {
  color: #7A8699;
}
.dock-step-input--wide {
  max-width: 560px;
}
.dock-step .dock-step-note {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: #7A8699;
}
.dock-step .dock-step-note--warn {
  color: rgb(var(--v-theme-error));
}
@media (max-width: 640px) {
  .dock-step-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
