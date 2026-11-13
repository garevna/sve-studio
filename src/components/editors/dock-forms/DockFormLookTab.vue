<script setup lang="ts">
  import type { DockFieldKind, DockForm, DockText } from '@sve/dock'
  import { blankField, formAction, formKeys } from '@sve/dock'
  import { computed } from 'vue'
  import { useRouter } from 'vue-router'
  import DockFormFieldEditor from '@/components/editors/dock-forms/DockFormFieldEditor.vue'
  import { editorDock } from '@/composables/useClientApi'
  import { useSitePopups } from '@/composables/useSitePopups'
  import { t } from '@/i18n'

  // "Вигляд" - the designer's tab of a docking form: its name, how it is
  // laid out, which calendar model it wears, its fields (order, icons,
  // captions, words) and the button's words. Which request each field and
  // the button talk to is the "Підключення" tab's.
  const form = defineModel<DockForm>({ required: true })
  const lang = defineModel<string>('lang', { required: true })
  const sitePopups = useSitePopups()

  const LANGS = ['uk', 'en', 'de']
  const KINDS: { kind: DockFieldKind, icon: string }[] = [
    { kind: 'choice', icon: 'mdi-format-list-bulleted' },
    { kind: 'dates', icon: 'mdi-calendar' },
    { kind: 'counters', icon: 'mdi-counter' },
    { kind: 'cards', icon: 'mdi-view-grid-outline' },
    { kind: 'text', icon: 'mdi-form-textbox' },
  ]

  const calendars = computed(() => sitePopups.calendars.value.map(item => ({ title: item.name || t(`calendars.variants.${item.variant}`), value: item.id })))
  // the UI Kit's "Елементи форми"
  const fieldLooks = computed(() => sitePopups.fieldLooks.value.map(item => ({ title: item.name, value: item.id })))
  const router = useRouter()
  function toKit () {
    void router.push({ path: '/ui-kit', query: { tab: 'fields' } })
  }
  const hasDates = computed(() => form.value.fields.some(field => field.kind === 'dates'))
  // the visitor stays and is told the values were taken
  const answers = computed(() => formAction(form.value) === 'channel' || editorDock.roleOf(form.value.button.request) === 'answer')

  function textOf (text: DockText | undefined): string {
    return text?.[lang.value] ?? ''
  }

  function add (kind: DockFieldKind) {
    const taken = new Set(formKeys(form.value))
    let index = 1
    while (taken.has(`${kind}-${index}`)) {
      index++
    }
    form.value.fields.push(blankField(kind, `${kind}-${index}`))
  }
  function move (index: number, by: number) {
    const fields = form.value.fields
    const [field] = fields.splice(index, 1)
    fields.splice(index + by, 0, field!)
  }
</script>

<template>
  <div class="dock-look">
    <div class="dock-look-row">
      <v-text-field
        v-model="form.name"
        density="compact"
        hide-details
        :label="t('dockForms.look.name')"
        variant="outlined"
      />
      <div class="dock-look-langs">
        <span class="dock-look-caption">{{ t('dockForms.look.textsLang') }}</span>
        <v-btn-toggle
          v-model="lang"
          color="primary"
          density="compact"
          mandatory
          variant="outlined"
        >
          <v-btn v-for="code of LANGS" :key="code" size="small" :value="code">{{ code.toUpperCase() }}</v-btn>
        </v-btn-toggle>
      </div>
    </div>

    <div class="dock-look-row">
      <div>
        <span class="dock-look-caption">{{ t('dockForms.look.layout') }}</span>
        <v-btn-toggle
          color="primary"
          density="compact"
          mandatory
          :model-value="form.layout ?? 'bar'"
          variant="outlined"
          @update:model-value="value => form.layout = value"
        >
          <v-btn prepend-icon="mdi-view-sequential-outline" size="small" value="bar">{{ t('dockForms.look.bar') }}</v-btn>
          <v-btn prepend-icon="mdi-view-agenda-outline" size="small" value="stack">{{ t('dockForms.look.stack') }}</v-btn>
        </v-btn-toggle>
        <p class="dock-look-hint">{{ t(`dockForms.look.${form.layout ?? 'bar'}Hint`) }}</p>
      </div>
      <v-select
        v-if="hasDates"
        class="dock-look-calendar"
        density="compact"
        hide-details
        :items="calendars"
        :label="t('dockForms.look.calendar')"
        :model-value="form.calendar ?? calendars[0]?.value ?? null"
        variant="outlined"
        @update:model-value="value => form.calendar = value ?? undefined"
      />
      <div class="dock-look-kit">
        <v-select
          density="compact"
          hide-details
          :items="fieldLooks"
          :label="t('fieldLooks.formLook')"
          :model-value="form.look ?? fieldLooks[0]?.value ?? null"
          variant="outlined"
          @update:model-value="value => form.look = value ?? undefined"
        />
        <v-btn
          prepend-icon="mdi-view-grid-outline"
          size="small"
          variant="text"
          @click="toKit"
        >{{ t('fieldLooks.toKit') }}</v-btn>
      </div>
    </div>

    <p class="dock-look-title">{{ t('dockForms.look.fields') }}</p>
    <div class="dock-look-fields">
      <DockFormFieldEditor
        v-for="(field, index) of form.fields"
        :key="`${index}-${field.kind}`"
        v-model="form.fields[index]!"
        :first="index === 0"
        :lang="lang"
        :last="index === form.fields.length - 1"
        :looks="fieldLooks"
        @down="move(index, 1)"
        @remove="form.fields.splice(index, 1)"
        @up="move(index, -1)"
      />
    </div>
    <v-menu location="bottom start">
      <template #activator="{ props: menuProps }">
        <v-btn
          v-bind="menuProps"
          class="mt-2"
          prepend-icon="mdi-plus"
          size="small"
          variant="text"
        >{{ t('dockForms.look.addField') }}</v-btn>
      </template>
      <v-list density="compact" theme="editorTheme">
        <v-list-item
          v-for="option of KINDS"
          :key="option.kind"
          :prepend-icon="option.icon"
          :subtitle="t(`dockForms.kindHints.${option.kind}`)"
          :title="t(`dockForms.kinds.${option.kind}`)"
          @click="add(option.kind)"
        />
      </v-list>
    </v-menu>

    <p class="dock-look-title">{{ t('dockForms.look.button') }}</p>
    <div class="dock-look-row">
      <v-text-field
        density="compact"
        hide-details
        :label="t('dockForms.look.buttonLabel')"
        :model-value="textOf(form.button.label)"
        variant="outlined"
        @update:model-value="value => form.button.label = { ...form.button.label, [lang]: value }"
      />
      <v-text-field
        v-if="answers"
        density="compact"
        hide-details
        :label="t('dockForms.look.done')"
        :model-value="textOf(form.button.done)"
        variant="outlined"
        @update:model-value="value => form.button.done = { ...form.button.done, [lang]: value }"
      />
    </div>
  </div>
</template>

<style scoped>
.dock-look {
  display: grid;
  gap: 12px;
}
.dock-look-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px 20px;
}
.dock-look-row > .v-input {
  flex: 1 1 260px;
}
.dock-look-calendar {
  max-width: 360px;
}
.dock-look-kit {
  display: flex;
  flex: 1 1 320px;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  max-width: 420px;
}
.dock-look-kit .v-select {
  width: 100%;
}
.dock-look-langs {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dock-look-caption {
  display: block;
  margin-bottom: 4px;
  font-size: 0.8rem;
  color: #7A8699;
}
.dock-look-langs .dock-look-caption {
  margin: 0;
}
.dock-look-hint {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: #7A8699;
}
.dock-look-title {
  margin: 8px 0 0;
  font-weight: 600;
}
.dock-look-fields {
  display: grid;
  gap: 8px;
}
</style>
