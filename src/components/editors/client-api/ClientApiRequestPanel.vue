<script setup lang="ts">
  import type { DockCall, DockOutgoing, DockRequest } from '@sve/dock'
  import { DockError, fieldsOf } from '@sve/dock'
  import { computed, ref, watch } from 'vue'
  import ClientApiCall from '@/components/editors/client-api/ClientApiCall.vue'
  import ClientApiParams from '@/components/editors/client-api/ClientApiParams.vue'
  import { editorDock, editorDockContext } from '@/composables/useClientApi'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'

  // One request of the docking block, opened under its row in
  // "Підключення API": its settings on the left; on the right, what it
  // would send right now - built from sample values of the fields - and
  // "Перевірити", which sends it for real and shows the answer.
  const request = defineModel<DockRequest>({ required: true })
  const props = defineProps<{ keys: string[] }>()

  const commonStore = useCommonStore()

  // --- sample values -----------------------------------------------------------

  function isoIn (days: number): string {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date.toISOString().slice(0, 10)
  }
  const SAMPLES: Record<string, string> = {
    destination: 'lviv',
    dates: `${isoIn(30)},${isoIn(31)},${isoIn(32)},${isoIn(33)}`,
    adults: '2',
    children: '1',
    rooms: '1',
  }
  const samples = ref<Record<string, string>>({ ...SAMPLES })

  const usedKeys = computed(() => {
    const found = request.value
    const params = found.role === 'handoff'
      ? [...(found.session?.query ?? []), ...(found.session?.body ?? []), ...(found.target.query ?? [])]
      : [...(found.call.query ?? []), ...(found.call.body ?? [])]
    return [...new Set(fieldsOf(params))].filter(Boolean)
  })

  // "a,b,c" is a field of several values (a date range).
  const values = computed(() => Object.fromEntries(usedKeys.value.map(key => {
    const text = samples.value[key] ?? ''
    return [key, text.includes(',') ? text.split(',').map(item => item.trim()).filter(Boolean) : text]
  })))
  const context = computed(() => editorDockContext(values.value, commonStore.locale))
  const plan = computed<DockOutgoing[]>(() => editorDock.plan(request.value, context.value))

  // --- trying it ---------------------------------------------------------------

  const checking = ref(false)
  const result = ref<{ ok: boolean, title: string, lines: string[], raw?: string, open?: string } | null>(null)
  watch(request, () => {
    result.value = null
  }, { deep: true })

  function json (value: unknown): string {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  }

  async function check () {
    checking.value = true
    result.value = null
    const found = request.value
    try {
      switch (found.role) {
        case 'options': {
          const answer = await editorDock.send(plan.value[0]!)
          const options = answer.ok ? await editorDock.options(found.id, context.value) : []
          result.value = {
            ok: answer.ok,
            title: answer.ok ? t('clientApi.checkOptions', { count: options.length }) : t('clientApi.checkStatus', { status: answer.status }),
            lines: options.slice(0, 8).map(option => `${option.value} — ${option.label}`),
            raw: json(answer.data),
          }
          break
        }
        case 'dates': {
          const answer = await editorDock.send(plan.value[0]!)
          const days = answer.ok ? (await editorDock.dates(found.id, context.value)) ?? [] : []
          result.value = {
            ok: answer.ok,
            title: answer.ok ? t('clientApi.checkDays', { count: days.length }) : t('clientApi.checkStatus', { status: answer.status }),
            lines: days.slice(0, 8).map(day => (day.hint ? `${day.date} — ${day.hint}` : day.date)),
            raw: json(answer.data),
          }
          break
        }
        case 'answer': {
          const outgoing = { ...plan.value[0]!, method: found.call.method === 'PUT' ? 'PUT' as const : 'POST' as const, body: { source: 'popup', id: 'check', name: t('clientApi.checkAnswerName'), kind: 'confirm', value: true, locale: commonStore.locale, page: context.value.system.page, at: new Date().toISOString() } }
          const answer = await editorDock.send(outgoing)
          result.value = { ok: answer.ok, title: t('clientApi.checkStatus', { status: answer.status }), lines: [], raw: json(answer.data) }
          break
        }
        case 'handoff': {
          const url = await editorDock.handoff(found.id, context.value)
          result.value = { ok: true, title: t('clientApi.checkHandoff'), lines: [url], open: url }
          break
        }
      }
    } catch (error) {
      result.value = {
        ok: false,
        title: error instanceof Error ? error.message : String(error),
        lines: error instanceof DockError && error.detail ? [error.detail] : [],
      }
    } finally {
      checking.value = false
    }
  }

  // --- handoff -------------------------------------------------------------------

  function setMode (mode: 'link' | 'session') {
    const found = request.value
    if (found.role !== 'handoff') {
      return
    }
    found.mode = mode
    if (mode === 'session' && !found.session) {
      found.session = { url: '', method: 'POST', body: [] } satisfies DockCall
    }
  }
</script>

<template>
  <div class="dock-panel">
    <div class="dock-panel-settings">
      <v-text-field
        v-model="request.name"
        density="compact"
        hide-details
        :label="t('clientApi.name')"
        variant="outlined"
      />
      <p class="dock-panel-id">{{ t('clientApi.id') }}: <code>{{ request.id }}</code></p>

      <template v-if="request.role === 'options'">
        <ClientApiCall v-model="request.call" :keys="props.keys" :methods="['GET', 'POST']" />
        <p class="dock-panel-caption">{{ t('clientApi.listCaption') }}</p>
        <div class="dock-panel-grid">
          <v-text-field
            v-model="request.list.path"
            density="compact"
            :hint="t('clientApi.pathHint')"
            :label="t('clientApi.listPath')"
            persistent-hint
            placeholder="items"
            variant="outlined"
          />
          <v-text-field
            v-model="request.list.value"
            density="compact"
            :hint="t('clientApi.valueHint')"
            :label="t('clientApi.listValue')"
            persistent-hint
            placeholder="id"
            variant="outlined"
          />
          <v-text-field
            v-model="request.list.label"
            density="compact"
            :hint="t('clientApi.labelHint')"
            :label="t('clientApi.listLabel')"
            persistent-hint
            placeholder="{name}, {country}"
            variant="outlined"
          />
        </div>
        <p class="dock-panel-caption">{{ t('clientApi.cardsCaption') }}</p>
        <div class="dock-panel-grid">
          <v-text-field
            v-model="request.list.image"
            density="compact"
            :hint="t('clientApi.imageHint')"
            :label="t('clientApi.listImage')"
            persistent-hint
            placeholder="image"
            variant="outlined"
          />
          <v-text-field
            v-model="request.list.details"
            density="compact"
            :hint="t('clientApi.detailsHint')"
            :label="t('clientApi.listDetails')"
            persistent-hint
            placeholder="perks"
            variant="outlined"
          />
          <v-text-field
            v-model="request.list.hint"
            density="compact"
            :hint="t('clientApi.cardHintHint')"
            :label="t('clientApi.listHint')"
            persistent-hint
            placeholder="{perNight} €"
            variant="outlined"
          />
        </div>
      </template>

      <template v-else-if="request.role === 'dates'">
        <ClientApiCall v-model="request.call" :keys="props.keys" :methods="['GET', 'POST']" />
        <p class="dock-panel-caption">{{ t('clientApi.daysCaption') }}</p>
        <div class="dock-panel-grid">
          <v-text-field
            v-model="request.result.path"
            density="compact"
            :hint="t('clientApi.pathHint')"
            :label="t('clientApi.listPath')"
            persistent-hint
            placeholder="days"
            variant="outlined"
          />
          <v-text-field
            v-model="request.result.date"
            density="compact"
            :hint="t('clientApi.dateHint')"
            :label="t('clientApi.dayField')"
            persistent-hint
            placeholder="date"
            variant="outlined"
          />
          <v-text-field
            v-model="request.result.hint"
            density="compact"
            :hint="t('clientApi.dayHintHint')"
            :label="t('clientApi.dayHint')"
            persistent-hint
            placeholder="{price}"
            variant="outlined"
          />
        </div>
      </template>

      <template v-else-if="request.role === 'handoff'">
        <v-btn-toggle
          class="dock-panel-mode"
          color="primary"
          density="compact"
          mandatory
          :model-value="request.mode"
          variant="outlined"
          @update:model-value="setMode"
        >
          <v-btn prepend-icon="mdi-link-variant" value="link">{{ t('clientApi.modeLink') }}</v-btn>
          <v-btn prepend-icon="mdi-swap-horizontal" value="session">{{ t('clientApi.modeSession') }}</v-btn>
        </v-btn-toggle>
        <p class="dock-panel-hint">{{ request.mode === 'session' ? t('clientApi.modeSessionHint') : t('clientApi.modeLinkHint') }}</p>
        <template v-if="request.mode === 'session' && request.session">
          <p class="dock-panel-caption">{{ t('clientApi.sessionCaption') }}</p>
          <ClientApiCall v-model="request.session" :keys="props.keys" :methods="['POST', 'PUT']" />
        </template>
        <p class="dock-panel-caption">{{ t('clientApi.targetCaption') }}</p>
        <v-text-field
          v-model="request.target.url"
          density="compact"
          :hint="request.mode === 'session' ? t('clientApi.targetUrlSessionHint') : ''"
          :label="t('clientApi.targetUrl')"
          :persistent-hint="request.mode === 'session'"
          placeholder="https://book.example.com/search"
          variant="outlined"
        />
        <p class="dock-panel-caption">{{ t('clientApi.query') }}</p>
        <ClientApiParams v-model="request.target.query" :allow-response="request.mode === 'session'" :keys="props.keys" />
      </template>

      <template v-else-if="request.role === 'answer'">
        <div class="dock-call-line">
          <v-select
            v-model="request.call.method"
            density="compact"
            hide-details
            :items="['POST', 'PUT']"
            variant="outlined"
          />
          <v-text-field
            v-model="request.call.url"
            density="compact"
            hide-details
            :label="t('clientApi.url')"
            variant="outlined"
          />
        </div>
        <p class="dock-panel-hint">{{ t('clientApi.answerHint') }}</p>
      </template>
    </div>

    <aside class="dock-panel-preview">
      <p class="dock-panel-caption mt-0">{{ t('clientApi.samples') }}</p>
      <p v-if="usedKeys.length === 0" class="dock-panel-hint">{{ t('clientApi.noFields') }}</p>
      <div v-else class="dock-panel-samples">
        <v-text-field
          v-for="key of usedKeys"
          :key="key"
          v-model="samples[key]"
          density="compact"
          hide-details
          :label="key"
          variant="outlined"
        />
      </div>

      <p class="dock-panel-caption">{{ t('clientApi.goesOut') }}</p>
      <div v-for="(outgoing, index) of plan" :key="index" class="dock-panel-out">
        <span v-if="plan.length > 1" class="dock-panel-step">{{ index === 0 ? t('clientApi.stepSession') : t('clientApi.stepVisitor') }}</span>
        <code class="dock-panel-url"><b>{{ outgoing.method }}</b> {{ outgoing.url || '—' }}</code>
        <pre v-if="outgoing.body" class="dock-panel-body">{{ json(outgoing.body) }}</pre>
      </div>

      <v-btn
        class="mt-3"
        color="primary"
        :loading="checking"
        prepend-icon="mdi-play-circle-outline"
        variant="tonal"
        @click="check"
      >
        {{ t('clientApi.check') }}
      </v-btn>

      <div v-if="result" :class="['dock-panel-result', { 'dock-panel-result--failed': !result.ok }]">
        <p class="dock-panel-result-title">{{ result.title }}</p>
        <code v-for="(line, index) of result.lines" :key="index" class="dock-panel-line">{{ line }}</code>
        <v-btn
          v-if="result.open"
          class="mt-2 align-self-start"
          :href="result.open"
          prepend-icon="mdi-open-in-new"
          size="small"
          target="_blank"
          variant="outlined"
        >
          {{ t('clientApi.open') }}
        </v-btn>
        <details v-if="result.raw" class="dock-panel-raw">
          <summary>{{ t('clientApi.rawAnswer') }}</summary>
          <pre>{{ result.raw }}</pre>
        </details>
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* settings left, what goes out right; one column on a narrow screen */
.dock-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 24px;
  padding-top: 12px;
}
@media (max-width: 1100px) {
  .dock-panel {
    grid-template-columns: minmax(0, 1fr);
  }
}
.dock-panel-settings,
.dock-panel-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
/* the two columns share a row's height; their fields keep their own */
.dock-panel-settings > *,
.dock-panel-preview > * {
  flex: 0 0 auto;
}
.dock-panel-preview {
  align-self: start;
  padding: 12px 16px;
  border-radius: 8px;
  background: #F4F6F9;
}
.dock-panel-id {
  margin: 0;
  font-size: 0.8rem;
  color: #7A8699;
}
.dock-panel-caption {
  margin: 8px 0 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #3A4A58;
}
.dock-panel-hint {
  margin: 0;
  font-size: 0.8rem;
  color: #7A8699;
}
.dock-panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
}
.dock-panel-mode {
  align-self: flex-start;
}
.dock-call-line {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 8px;
}
.dock-panel-samples {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}
.dock-panel-out {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dock-panel-step {
  font-size: 0.75rem;
  color: #7A8699;
}
.dock-panel-url,
.dock-panel-line {
  font-size: 0.8rem;
  overflow-wrap: anywhere;
}
.dock-panel-body,
.dock-panel-raw pre {
  margin: 0;
  max-height: 240px;
  overflow: auto;
  padding: 8px;
  border-radius: 6px;
  background: #FFFFFF;
  font-size: 0.78rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.dock-panel-result {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  padding: 10px 12px;
  border-left: solid 3px #4C9A6A;
  border-radius: 6px;
  background: #FFFFFF;
}
.dock-panel-result--failed {
  border-left-color: #C4534A;
}
.dock-panel-result-title {
  margin: 0;
  font-weight: 600;
  font-size: 0.85rem;
}
.dock-panel-raw summary {
  cursor: pointer;
  font-size: 0.8rem;
  color: #7A8699;
}
</style>
