<script setup lang="ts">
  import type { Translated } from '@/i18n/schema'
  import { SveBadge, SveButton, SveSegmented, SveTextField } from '@sve/editor-ui'
  import { computed, ref, toRaw, watch } from 'vue'
  import { applyMessages, t } from '@/i18n'
  import { MESSAGES } from '@/i18n/messages'

  // The editor's interface texts (src/i18n/messages/*.json), every one in
  // its three languages side by side. Dev only, on /editor-ui: "Зберегти"
  // writes the files (server/routes/__editor-api__/editor-texts.ts) and the
  // interface shows the new texts at once. An empty EN/DE shows the
  // Ukrainian text in the interface until it is translated.

  type Locale = 'uk' | 'en' | 'de'
  type Tree = { [key: string]: Tree | Translated }
  interface Row { section: string, key: string, text: Translated }

  const LOCALES: Locale[] = ['uk', 'en', 'de']

  function clone<T> (value: T): T {
    return structuredClone(toRaw(value))
  }
  const saved = ref(clone(MESSAGES) as unknown as Record<string, Tree>)
  const draft = ref(clone(saved.value))
  const dirtySections = computed(() => Object.keys(draft.value).filter(section => JSON.stringify(draft.value[section]) !== JSON.stringify(saved.value[section])))

  function isText (node: unknown): node is Translated {
    return !!node && typeof node === 'object' && typeof (node as Translated).uk === 'string'
  }
  function rowsOf (section: string, tree: Tree, prefix = ''): Row[] {
    return Object.entries(tree).flatMap(([key, node]) => {
      const path = prefix ? `${prefix}.${key}` : key
      return isText(node) ? [{ section, key: path, text: node }] : rowsOf(section, node, path)
    })
  }
  const allRows = computed(() => Object.keys(draft.value).flatMap(section => rowsOf(section, draft.value[section]!)))

  const missing = (row: Row, locale: Locale) => row.text[locale].trim() === ''
  const untranslated = (row: Row) => missing(row, 'en') || missing(row, 'de')

  // {name}-style placeholders the Ukrainian text has and a translation lacks.
  function lostPlaceholders (row: Row, locale: Locale): string[] {
    if (missing(row, locale)) {
      return []
    }
    return (row.text.uk.match(/\{\w+\}/g) ?? []).filter(placeholder => !row.text[locale].includes(placeholder))
  }

  const section = ref<string>('all')
  const filter = ref<'all' | 'untranslated'>('untranslated')
  const search = ref('')

  const sections = computed(() => Object.keys(draft.value).map(name => ({
    name,
    open: allRows.value.filter(row => row.section === name && untranslated(row)).length,
  })))
  const totalOpen = computed(() => allRows.value.filter(row => untranslated(row)).length)

  // Which rows are listed is decided when the section, filter or search
  // changes - not on every keystroke, or a row would vanish from "Без
  // перекладу" while its translation is still being typed.
  const listed = ref(new Set<string>())
  const idOf = (row: Row) => `${row.section}.${row.key}`
  function refresh () {
    const query = search.value.trim().toLowerCase()
    listed.value = new Set(allRows.value.filter(row =>
      (section.value === 'all' || row.section === section.value)
      && (filter.value === 'all' || untranslated(row))
      && (!query || row.key.toLowerCase().includes(query) || LOCALES.some(locale => row.text[locale].toLowerCase().includes(query))),
    ).map(row => idOf(row)))
  }
  watch([section, filter, search], refresh, { immediate: true })
  const rows = computed(() => allRows.value.filter(row => listed.value.has(idOf(row))))
  // Long lists render in pages, so typing stays quick.
  const PAGE = 60
  const shown = ref(PAGE)
  const visibleRows = computed(() => rows.value.slice(0, shown.value))

  const rowsFor = (text: string) => Math.min(6, Math.max(1, Math.ceil(text.length / 48)))

  const saving = ref(false)
  const message = ref('')
  async function save () {
    saving.value = true
    message.value = ''
    try {
      const body = { sections: Object.fromEntries(dirtySections.value.map(name => [name, draft.value[name]])) }
      const response = await fetch(`${location.origin}/__editor-api__/editor-texts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        throw new Error(response.statusText || `HTTP ${response.status}`)
      }
      saved.value = clone(draft.value)
      refresh()
      applyMessages(clone(draft.value) as unknown as typeof MESSAGES)
      message.value = t('editorTexts.savedTo', { value: Object.keys(body.sections).join(', ') })
    } catch (error) {
      message.value = t('editorTexts.saveFailed', { value: error instanceof Error ? error.message : String(error) })
    } finally {
      saving.value = false
    }
  }
  function reset () {
    draft.value = clone(saved.value)
    message.value = ''
    refresh()
  }
</script>

<template>
  <section class="texts">
    <div class="showcase-heading">{{ t('editorTexts.title') }}</div>
    <p class="showcase-text">
      {{ t('editorTexts.intro') }}
    </p>

    <div class="texts__sections">
      <button :class="['texts__section', { 'texts__section--active': section === 'all' }]" type="button" @click="section = 'all'; shown = PAGE">
        {{ t('blockMenu.all') }} <SveBadge v-if="totalOpen" tone="warning">{{ totalOpen }}</SveBadge>
      </button>
      <button
        v-for="item of sections"
        :key="item.name"
        :class="['texts__section', { 'texts__section--active': section === item.name }]"
        type="button"
        @click="section = item.name; shown = PAGE"
      >
        {{ item.name }} <SveBadge v-if="item.open" tone="warning">{{ item.open }}</SveBadge>
      </button>
    </div>

    <div class="texts__tools">
      <SveSegmented
        v-model="filter"
        :options="[{ value: 'untranslated', label: t('editorTexts.untranslated') }, { value: 'all', label: t('editorTexts.all') }]"
      />
      <SveTextField v-model="search" class="texts__search" :placeholder="t('editorTexts.search')" />
    </div>

    <p v-if="rows.length === 0" class="showcase-text">{{ t('editorTexts.allTranslated') }}</p>

    <div v-for="row of visibleRows" :key="`${row.section}.${row.key}`" class="texts__row">
      <div class="texts__key">{{ row.section }}.{{ row.key }}</div>
      <div class="texts__fields">
        <div v-for="locale of LOCALES" :key="locale" class="texts__field">
          <span class="texts__locale">{{ locale.toUpperCase() }}</span>
          <SveTextField
            v-model="row.text[locale]"
            :placeholder="locale === 'uk' ? '' : row.text.uk"
            :rows="rowsFor(row.text.uk)"
          />
          <SveBadge v-for="placeholder of lostPlaceholders(row, locale)" :key="placeholder" tone="warning">
            {{ t('editorTexts.lostPlaceholder', { placeholder }) }}
          </SveBadge>
        </div>
      </div>
    </div>

    <SveButton v-if="rows.length > shown" class="texts__more" @click="shown += PAGE">
      {{ t('editorTexts.showMore', { value: rows.length - shown }) }}
    </SveButton>

    <div class="texts__bar">
      <span class="texts__message">{{ message || (dirtySections.length > 0 ? t('editorTexts.changed', { value: dirtySections.join(', ') }) : '') }}</span>
      <SveButton :disabled="dirtySections.length === 0 || saving" @click="reset">{{ t('editorTexts.reset') }}</SveButton>
      <SveButton :disabled="dirtySections.length === 0 || saving" variant="primary" @click="save">{{ t('common.save') }}</SveButton>
    </div>
  </section>
</template>

<style scoped>
.texts { display: flex; flex-direction: column; gap: 16px; }
.texts__sections { display: flex; flex-wrap: wrap; gap: 6px; }
.texts__section {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--sve-border);
  border-radius: 999px;
  background: var(--sve-surface);
  color: var(--sve-text);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.texts__section--active { border-color: var(--sve-primary); background: var(--sve-primary-soft); }
.texts__tools { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.texts__search { flex: 1 1 240px; }
.texts__row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
  border-top: 1px solid var(--sve-border);
}
.texts__key { font-family: ui-monospace, monospace; font-size: 12px; color: var(--sve-text-muted); overflow-wrap: anywhere; }
.texts__fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.texts__field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.texts__locale { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; color: var(--sve-text-subtle); }
.texts__more { align-self: center; }
.texts__bar {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 0;
  background: var(--sve-bg);
  border-top: 1px solid var(--sve-border);
}
.texts__message { flex: 1 1 200px; font-size: 13px; color: var(--sve-text-muted); }

@media (max-width: 720px) {
  .texts__fields { grid-template-columns: 1fr; }
}
</style>
