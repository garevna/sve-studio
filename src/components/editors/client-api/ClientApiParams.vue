<script setup lang="ts">
  import type { DockFormat, DockParam, DockPick, DockSource, DockSystemValue } from '@sve/dock'
  import { computed } from 'vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { t } from '@/i18n'

  // The named values of one request - a query parameter or a field of the
  // body - and where each comes from: a form field (by its key), something
  // the site knows, a fixed text, or (after a session request) its answer.
  // One row a value; it wraps under itself on a phone.
  const params = defineModel<DockParam[]>({ default: () => [] })
  const props = defineProps<{
    // the session's answer is a possible source (handoff target)
    allowResponse?: boolean
    // field keys offered for "Поле форми"
    keys: string[]
    // body fields may nest ("guests.adults")
    nested?: boolean
  }>()

  const SOURCES = computed(() => [
    { value: 'field', title: t('clientApi.sources.field') },
    { value: 'system', title: t('clientApi.sources.system') },
    { value: 'const', title: t('clientApi.sources.const') },
    ...(props.allowResponse ? [{ value: 'response', title: t('clientApi.sources.response') }] : []),
  ])
  const SYSTEM: DockSystemValue[] = ['locale', 'page', 'return', 'month', 'now']
  const PICKS: (DockPick | '')[] = ['', 'first', 'last', 'all', 'count']
  const FORMATS: DockFormat[] = ['as-is', 'YYYY-MM-DD', 'DD.MM.YYYY', 'MM/DD/YYYY', 'number', 'text']

  function sourceFor (from: DockSource['from']): DockSource {
    switch (from) {
      case 'field': {
        return { from, key: props.keys[0] ?? '' }
      }
      case 'system': {
        return { from, value: 'locale' }
      }
      case 'const': {
        return { from, value: '' }
      }
      case 'response': {
        return { from, path: '' }
      }
    }
  }

  function add () {
    params.value = [...params.value, { name: '', source: sourceFor('field') }]
  }
  function remove (index: number) {
    params.value = params.value.filter((_, at) => at !== index)
  }
  function setFrom (param: DockParam, from: DockSource['from']) {
    param.source = sourceFor(from)
  }
  function setPick (param: DockParam, pick: DockPick | '') {
    if (param.source.from !== 'field') {
      return
    }
    if (pick) {
      param.source.pick = pick
    } else {
      delete param.source.pick
    }
  }
  function setFormat (param: DockParam, format: DockFormat) {
    if (param.source.from !== 'field' && param.source.from !== 'system') {
      return
    }
    if (format === 'as-is') {
      delete param.source.format
    } else {
      param.source.format = format
    }
  }
</script>

<template>
  <div class="dock-params">
    <p v-if="params.length === 0" class="dock-params-empty">{{ t('clientApi.noParams') }}</p>
    <div v-for="(param, index) of params" :key="index" class="dock-param">
      <v-text-field
        v-model="param.name"
        class="dock-param-name"
        density="compact"
        hide-details
        :placeholder="nested ? 'guests.adults' : 'checkin'"
        variant="outlined"
      />
      <v-select
        class="dock-param-from"
        density="compact"
        hide-details
        :items="SOURCES"
        :model-value="param.source.from"
        variant="outlined"
        @update:model-value="value => setFrom(param, value)"
      />
      <v-combobox
        v-if="param.source.from === 'field'"
        v-model="param.source.key"
        class="dock-param-value"
        density="compact"
        hide-details
        :items="keys"
        variant="outlined"
      />
      <v-select
        v-else-if="param.source.from === 'system'"
        v-model="param.source.value"
        class="dock-param-value"
        density="compact"
        hide-details
        :item-title="value => t(`clientApi.system.${value}`)"
        :item-value="value => value"
        :items="SYSTEM"
        variant="outlined"
      />
      <v-text-field
        v-else-if="param.source.from === 'const'"
        v-model="param.source.value"
        class="dock-param-value"
        density="compact"
        hide-details
        variant="outlined"
      />
      <v-text-field
        v-else
        v-model="param.source.path"
        class="dock-param-value"
        density="compact"
        hide-details
        placeholder="token"
        variant="outlined"
      />
      <v-select
        v-if="param.source.from === 'field'"
        class="dock-param-pick"
        density="compact"
        hide-details
        :item-title="value => t(`clientApi.picks.${value || 'whole'}`)"
        :item-value="value => value"
        :items="PICKS"
        :model-value="param.source.pick ?? ''"
        variant="outlined"
        @update:model-value="value => setPick(param, value ?? '')"
      />
      <v-select
        v-if="param.source.from === 'field' || param.source.from === 'system'"
        class="dock-param-format"
        density="compact"
        hide-details
        :item-title="value => value === 'as-is' ? t('clientApi.formats.asIs') : value === 'number' ? t('clientApi.formats.number') : value === 'text' ? t('clientApi.formats.text') : value"
        :item-value="value => value"
        :items="FORMATS"
        :model-value="param.source.format ?? 'as-is'"
        variant="outlined"
        @update:model-value="value => setFormat(param, value)"
      />
      <ToolbarIconButton class="dock-param-remove" icon="mdi-close" :tooltip="t('common.delete')" @click="remove(index)" />
    </div>
    <v-btn
      class="align-self-start"
      prepend-icon="mdi-plus"
      size="small"
      variant="text"
      @click="add"
    >{{ t('clientApi.addParam') }}</v-btn>
  </div>
</template>

<style scoped>
.dock-params {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dock-params-empty {
  margin: 0;
  font-size: 0.85rem;
  color: #7A8699;
}
/* name, source, value, pick, format, × - wrapping under itself when narrow */
.dock-param {
  display: grid;
  grid-template-columns: minmax(110px, 1.1fr) minmax(120px, 1fr) minmax(120px, 1.2fr) minmax(100px, 0.9fr) minmax(110px, 1fr) 32px;
  gap: 6px;
  align-items: center;
}
@media (max-width: 900px) {
  .dock-param {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 32px;
    padding-bottom: 8px;
    border-bottom: solid 1px rgba(0, 0, 0, 0.06);
  }
  .dock-param-remove {
    grid-column: 3;
    grid-row: 1;
  }
}
</style>
