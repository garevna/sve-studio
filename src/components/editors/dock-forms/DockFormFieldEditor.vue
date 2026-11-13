<script setup lang="ts">
  import type { DockCountersField, DockField, DockText } from '@sve/dock'
  import { ref } from 'vue'
  import IconPicker from '@/components/editors/icon/IconPicker.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { t } from '@/i18n'

  // One field of a docking form on the "Вигляд" tab: its icon, caption,
  // place in the order - and, under "more", what its kind has: a hint in
  // the empty field, one day or a stretch, the counters, the cards' words.
  // Texts are edited in the language picked on the tab. The field's key and
  // its request are the "Підключення" tab's.
  const field = defineModel<DockField>({ required: true })
  // looks: the UI Kit's "Елементи форми", for a field that wears its own
  const props = defineProps<{ lang: string, first: boolean, last: boolean, looks: { title: string, value: string }[] }>()
  const emit = defineEmits<{ up: [], down: [], remove: [] }>()
  const open = ref(false)
  const iconOpen = ref(false)

  function textOf (text: DockText | undefined): string {
    return text?.[props.lang] ?? ''
  }
  // holder[prop] in the tab's language
  function setText (holder: object, prop: string, value: string) {
    const texts = holder as Record<string, DockText | undefined>
    texts[prop] = { ...texts[prop], [props.lang]: value }
  }

  const INPUTS = ['text', 'tel', 'email', 'textarea'] as const

  function addCounter (field: DockCountersField) {
    const taken = new Set(field.items.map(item => item.key))
    let index = field.items.length + 1
    while (taken.has(`${field.key}-${index}`)) {
      index++
    }
    field.items.push({ key: `${field.key}-${index}`, label: {}, min: 0, max: 10, start: 0, units: {} })
  }
  function numberOf (value: unknown, fallback: number): number {
    const number = Number(value)
    return Number.isFinite(number) ? Math.round(number) : fallback
  }
</script>

<template>
  <div class="dock-field">
    <div class="dock-field-head">
      <v-menu v-model="iconOpen" :close-on-content-click="false" location="bottom start">
        <template #activator="{ props: menuProps }">
          <ToolbarIconButton v-bind="menuProps" :icon="field.icon || 'mdi-shape-outline'" :tooltip="t('dockForms.field.icon')" />
        </template>
        <div class="dock-field-icons editor-panel">
          <IconPicker v-model:icon="field.icon" />
          <v-btn
            v-if="field.icon"
            class="mt-2"
            prepend-icon="mdi-close"
            size="small"
            variant="text"
            @click="field.icon = ''"
          >{{ t('dockForms.field.noIcon') }}</v-btn>
        </div>
      </v-menu>
      <v-text-field
        class="dock-field-label"
        density="compact"
        hide-details
        :label="`${t('dockForms.field.label')} · ${t(`dockForms.kinds.${field.kind}`)}`"
        :model-value="textOf(field.label)"
        variant="outlined"
        @update:model-value="value => setText(field, 'label', value)"
      />
      <div class="dock-field-actions">
        <ToolbarIconButton :disabled="first" icon="mdi-arrow-up" :tooltip="t('dockForms.field.up')" @click="emit('up')" />
        <ToolbarIconButton :disabled="last" icon="mdi-arrow-down" :tooltip="t('dockForms.field.down')" @click="emit('down')" />
        <ToolbarIconButton icon="mdi-delete-outline" :tooltip="t('common.delete')" @click="emit('remove')" />
        <ToolbarIconButton :icon="open ? 'mdi-chevron-up' : 'mdi-chevron-down'" :tooltip="t('dockForms.field.more')" @click="open = !open" />
      </div>
    </div>

    <v-expand-transition>
      <div v-if="open" class="dock-field-body">
        <template v-if="field.kind === 'choice' || field.kind === 'text'">
          <v-select
            v-if="field.kind === 'text'"
            density="compact"
            hide-details
            :items="INPUTS.map(value => ({ value, title: t(`dockForms.field.inputs.${value}`) }))"
            :label="t('dockForms.field.input')"
            :model-value="field.input ?? 'text'"
            variant="outlined"
            @update:model-value="value => field.kind === 'text' && (field.input = value)"
          />
          <v-text-field
            density="compact"
            hide-details
            :label="t('dockForms.field.placeholder')"
            :model-value="textOf(field.placeholder)"
            variant="outlined"
            @update:model-value="value => setText(field, 'placeholder', value)"
          />
        </template>

        <template v-if="field.kind === 'dates'">
          <v-switch
            v-model="field.range"
            color="primary"
            density="compact"
            hide-details
            inset
            :label="t('dockForms.field.range')"
          />
          <v-text-field
            v-if="field.range"
            density="compact"
            :hint="t('dockForms.field.unitsHint')"
            :label="t('dockForms.field.units')"
            :model-value="textOf(field.units)"
            persistent-hint
            variant="outlined"
            @update:model-value="value => setText(field, 'units', value)"
          />
        </template>

        <template v-if="field.kind === 'cards'">
          <v-text-field
            density="compact"
            hide-details
            :label="t('dockForms.field.suffix')"
            :model-value="textOf(field.suffix)"
            variant="outlined"
            @update:model-value="value => setText(field, 'suffix', value)"
          />
          <v-text-field
            density="compact"
            hide-details
            :label="t('dockForms.field.empty')"
            :model-value="textOf(field.empty)"
            variant="outlined"
            @update:model-value="value => setText(field, 'empty', value)"
          />
        </template>

        <template v-if="field.kind === 'counters'">
          <div v-for="(item, index) of field.items" :key="index" class="dock-counter">
            <v-text-field
              density="compact"
              hide-details
              :label="t('dockForms.field.counter')"
              :model-value="textOf(item.label)"
              variant="outlined"
              @update:model-value="value => setText(item, 'label', value)"
            />
            <v-text-field
              density="compact"
              hide-details
              :label="t('dockForms.field.units')"
              :model-value="textOf(item.units)"
              :placeholder="t('dockForms.field.unitsHint')"
              variant="outlined"
              @update:model-value="value => setText(item, 'units', value)"
            />
            <div class="dock-counter-numbers">
              <v-text-field
                density="compact"
                hide-details
                :label="t('dockForms.field.min')"
                :model-value="item.min"
                type="number"
                variant="outlined"
                @update:model-value="value => item.min = numberOf(value, item.min)"
              />
              <v-text-field
                density="compact"
                hide-details
                :label="t('dockForms.field.max')"
                :model-value="item.max"
                type="number"
                variant="outlined"
                @update:model-value="value => item.max = numberOf(value, item.max)"
              />
              <v-text-field
                density="compact"
                hide-details
                :label="t('dockForms.field.start')"
                :model-value="item.start"
                type="number"
                variant="outlined"
                @update:model-value="value => item.start = numberOf(value, item.start)"
              />
              <ToolbarIconButton
                :disabled="field.items.length < 2"
                icon="mdi-delete-outline"
                :tooltip="t('common.delete')"
                @click="field.items.splice(index, 1)"
              />
            </div>
          </div>
          <v-btn
            prepend-icon="mdi-plus"
            size="small"
            variant="text"
            @click="addCounter(field)"
          >{{ t('dockForms.field.addCounter') }}</v-btn>
        </template>

        <v-select
          v-if="field.kind !== 'cards'"
          density="compact"
          hide-details
          :items="[{ title: t('fieldLooks.asForm'), value: '' }, ...looks]"
          :label="t('fieldLooks.fieldLook')"
          :model-value="field.look ?? ''"
          variant="outlined"
          @update:model-value="value => field.look = value || undefined"
        />
        <v-switch
          v-if="field.kind !== 'counters'"
          v-model="field.required"
          color="primary"
          density="compact"
          hide-details
          inset
          :label="t('dockForms.field.required')"
        />
      </div>
    </v-expand-transition>
  </div>
</template>

<style scoped>
.dock-field {
  border: solid 1px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}
.dock-field-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
}
.dock-field-label {
  flex: 1 1 auto;
  min-width: 0;
}
.dock-field-actions {
  display: flex;
  align-items: center;
}
.dock-field-body {
  display: grid;
  gap: 10px;
  padding: 4px 12px 12px;
}
.dock-field-icons {
  width: min(92vw, 420px);
  padding: 12px;
  background: #FFFFFF;
}
.dock-counter {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
  padding: 8px;
  border: dashed 1px rgba(58, 74, 88, 0.25);
  border-radius: 8px;
}
.dock-counter-numbers {
  display: flex;
  align-items: center;
  gap: 8px;
}
@media (max-width: 560px) {
  .dock-field-head {
    flex-wrap: wrap;
  }
  .dock-field-label {
    flex-basis: calc(100% - 44px);
  }
  .dock-field-actions {
    margin-left: auto;
  }
}
</style>
