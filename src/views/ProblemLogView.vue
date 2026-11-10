<script lang="ts" setup>
  import { SveBadge, SveButton, SveSegmented } from '@sve/editor-ui'
  import { computed, onMounted, ref } from 'vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import { editorUiLocale, t } from '@/i18n'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { useUsersStore } from '@/stores/users'
  import { appBase } from '@/utils/app-base'

  // "Журнал помилок": what went wrong in the editor and on the site, as the
  // apps reported it (utils/report.ts, site/src/utils/report.ts) instead of
  // writing it to a browser console. The content API keeps it
  // (server/content-api/log-routes.ts) and hands it to a supervisor or an
  // owner only; in the demo it is the visitor's own, kept in their browser.
  interface LogEntry {
    at: string
    level: 'error' | 'warn'
    app: 'editor' | 'site'
    source: string
    message: string
    detail?: string
    page?: string
    agent?: string
  }

  const users = useUsersStore()
  const feedback = useUiFeedbackStore()

  const entries = ref<LogEntry[]>([])
  const loading = ref(false)
  type Problem = 'unavailable' | 'forbidden' | 'loadFailed' | null
  const problem = ref<Problem>(null)
  const demo = ref(false)
  const open = ref<number | null>(null)

  type Filter = 'all' | 'error' | 'warn'
  const filter = ref<Filter>('all')
  const errorsCount = computed(() => entries.value.filter(entry => entry.level === 'error').length)
  const filters = computed(() => [
    { value: 'all' as const, label: `${t('problemLog.filterAll')} · ${entries.value.length}` },
    { value: 'error' as const, label: `${t('problemLog.filterErrors')} · ${errorsCount.value}` },
    { value: 'warn' as const, label: `${t('problemLog.filterWarnings')} · ${entries.value.length - errorsCount.value}` },
  ])
  const shown = computed(() => filter.value === 'all' ? entries.value : entries.value.filter(entry => entry.level === filter.value))

  async function headers (): Promise<Record<string, string>> {
    const token = await users.token().catch(() => null)
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function load () {
    loading.value = true
    problem.value = null
    try {
      const response = await fetch(`${appBase()}api/log`, { cache: 'no-store', headers: await headers() })
      demo.value = response.headers.get('X-Content-Api') === 'service-worker'
      if (response.status === 403 || response.status === 401) {
        problem.value = 'forbidden'
        return
      }
      const body = await response.json().catch(() => null) as { entries?: LogEntry[] } | null
      if (!response.ok || !body) {
        problem.value = response.status === 404 ? 'unavailable' : 'loadFailed'
        return
      }
      entries.value = body.entries ?? []
    } catch {
      problem.value = 'unavailable'
    } finally {
      loading.value = false
    }
  }

  async function clear () {
    if (!await feedback.confirm({ title: t('problemLog.clearTitle'), text: t('problemLog.clearText') })) return
    const response = await fetch(`${appBase()}api/log`, { method: 'DELETE', headers: await headers() }).catch(() => null)
    if (response?.ok) {
      entries.value = []
    } else {
      feedback.notify('error', t('problemLog.loadFailed'))
    }
  }

  function formatDate (value: string): string {
    return new Intl.DateTimeFormat(editorUiLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value))
  }

  onMounted(load)
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" :title="t('problemLog.title')" />

      <p class="log-hint">{{ demo ? `${t('problemLog.hint')} ${t('problemLog.demoHint')}` : t('problemLog.hint') }}</p>

      <div class="log-tools">
        <SveSegmented v-model="filter" :options="filters" />
        <div class="log-tools-buttons">
          <SveButton icon="mdi-refresh" :loading="loading" variant="ghost" @click="load">{{ t('problemLog.refresh') }}</SveButton>
          <SveButton :disabled="entries.length === 0" icon="mdi-delete-sweep-outline" variant="ghost" @click="clear">{{ t('problemLog.clear') }}</SveButton>
        </div>
      </div>

      <p v-if="problem" class="log-empty">{{ t(`problemLog.${problem}`) }}</p>
      <p v-else-if="!loading && shown.length === 0" class="log-empty">{{ t('problemLog.empty') }}</p>

      <div v-else class="log-list">
        <div
          v-for="(entry, index) of shown"
          :key="index"
          :class="['log-row', `log-row--${entry.level}`]"
          @click="open = open === index ? null : index"
        >
          <div class="log-row-head">
            <i :class="['mdi', entry.level === 'error' ? 'mdi-alert-circle-outline' : 'mdi-alert-outline', 'log-row-icon']" />
            <span class="log-row-message">{{ entry.message }}</span>
            <SveBadge>{{ t(`problemLog.apps.${entry.app}`) }}</SveBadge>
          </div>
          <div class="log-row-meta">{{ formatDate(entry.at) }} · {{ entry.source }}<template v-if="entry.page"> · {{ entry.page }}</template></div>
          <pre v-if="open === index && (entry.detail || entry.agent)" class="log-row-detail">{{ [entry.detail, entry.agent].filter(Boolean).join('\n\n') }}</pre>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.log-hint {
  font-size: 0.85rem;
  color: #7A8699;
  margin-bottom: 16px;
  max-width: 900px;
}
.log-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  margin-bottom: 16px;
}
.log-tools-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.log-empty {
  color: #7A8699;
}
.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.log-row {
  padding: 10px 12px;
  border: solid 1px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  cursor: pointer;
}
.log-row-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.log-row-icon {
  font-size: 20px;
  color: #7A8699;
}
.log-row--error .log-row-icon {
  color: rgb(var(--v-theme-error));
}
.log-row-message {
  flex: 1 1 auto;
  min-width: 0;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.log-row-meta {
  margin-top: 2px;
  padding-left: 28px;
  font-size: 0.8rem;
  color: #7A8699;
  overflow-wrap: anywhere;
}
.log-row-detail {
  margin: 8px 0 0 28px;
  padding: 8px;
  max-height: 260px;
  overflow: auto;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.04);
  font-size: 0.75rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
