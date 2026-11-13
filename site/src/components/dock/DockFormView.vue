<script setup lang="ts">
  import type { DockField, DockFieldKind, DockForm, DockOption } from '@sve/dock'
  import type { Component } from 'vue'
  import { formAction, formKeys, formMessage, inBar, isFilled, textOf } from '@sve/dock'
  import { computed, inject, provide, reactive, ref, watch } from 'vue'
  import { DOCK_FORM_HOST, DOCK_FORM_SCOPE, type DockFormScope, isoOf } from './dock-form-host'
  import DockFormCards from './DockFormCards.vue'
  import DockFormChoice from './DockFormChoice.vue'
  import DockFormCounters from './DockFormCounters.vue'
  import DockFormDates from './DockFormDates.vue'
  import DockFormText from './DockFormText.vue'

  // A form as the visitor sees it (packages/dock/src/form.ts): its fields -
  // in one row ("bar", cards and long texts under it) or one under another
  // ("stack") - and the button, which sends the values to the site's own
  // channel, or, to the client's API, takes the visitor on to the client's
  // own system (handoff) or sends the values (answer). Where the values live,
  // where they are sent and where the visitor goes is the host's
  // (dock-form-host.ts).
  //
  // NOTE: the editor's copy is src/components/dock/DockFormView.vue - keep
  // the two identical.
  const props = defineProps<{ form: DockForm | null }>()
  const host = inject(DOCK_FORM_HOST)!
  const lang = computed(() => host.lang() as 'uk' | 'en' | 'de')

  const WORDS = {
    failed: { uk: 'Не вдалося. Спробуйте ще раз трохи згодом.', en: 'That didn’t work. Please try again a little later.', de: 'Das hat nicht geklappt. Bitte versuchen Sie es etwas später noch einmal.' },
    sample: { uk: 'Приклад', en: 'Sample', de: 'Beispiel' },
    notSetUp: { uk: 'Надсилання форм на цьому сайті ще не налаштоване.', en: 'Sending forms isn’t set up on this site yet.', de: 'Das Senden von Formularen ist auf dieser Website noch nicht eingerichtet.' },
  } as const

  // each field's own component; it takes the field of its kind
  const KINDS: Record<DockFieldKind, Component> = { choice: DockFormChoice, dates: DockFormDates, counters: DockFormCounters, cards: DockFormCards, text: DockFormText }

  const fields = computed<DockField[]>(() => props.form?.fields ?? [])
  function fieldOf (key: string): DockField | undefined {
    return fields.value.find(field => field.key === key || (field.kind === 'counters' && field.items.some(item => item.key === key)))
  }
  function labelOf (key: string): string {
    const field = fieldOf(key)
    const item = field?.kind === 'counters' ? field.items.find(one => one.key === key) : undefined
    return textOf(item?.label ?? field?.label, lang.value, key)
  }

  // A change lets go of the days chosen for whatever the calendar read.
  function set (key: string, value: unknown) {
    host.set(key, value)
    for (const field of fields.value) {
      if (field.kind === 'dates' && field.key !== key && host.dock.reads(field.request).includes(key)) {
        host.set(field.key, [])
      }
    }
  }

  // The fields a request still waits for: no value yet, or one the field
  // itself does not count as given (the first day of a stay).
  function waitingFor (request: string | undefined, own: string): string[] {
    const missing = new Set(host.dock.missing(request, host.values))
    return host.dock.reads(request).filter(key => {
      if (key === own) {
        return false
      }
      const field = fieldOf(key)
      return missing.has(key) || (!!field && field.key === key && !isFilled(field, host.values))
    })
  }

  const lists = reactive<Record<string, DockOption[]>>({})
  function day (ahead: number) {
    return isoOf(new Date(Date.now() + ahead * 86_400_000))
  }
  // Values for cards to show with before the visitor has chosen: the first
  // of each list, three nights a month ahead. While editing only.
  function sampleFor (keys: string[]): Record<string, unknown> | null {
    if (!host.editing?.()) {
      return null
    }
    const values: Record<string, unknown> = { ...host.values }
    for (const key of keys) {
      const field = fieldOf(key)
      if (field?.kind === 'dates') {
        values[key] = field.range ? [day(30), day(33)] : [day(30)]
      } else if (field?.kind === 'text') {
        values[key] = WORDS.sample[lang.value]
      } else if (lists[key]?.[0]) {
        values[key] = lists[key]![0]!.value
      } else {
        return null
      }
    }
    return values
  }

  const scope: DockFormScope = reactive({
    ...host,
    set,
    lists,
    labelOf,
    fieldOf,
    waitingFor,
    sampleFor,
    calendar: () => props.form?.calendar,
    lookOf: (field: DockField) => host.fieldLook(field.look || props.form?.look),
  })
  provide(DOCK_FORM_SCOPE, scope)

  // The counters are read by the requests even when never touched.
  watch(fields, list => {
    for (const field of list) {
      if (field.kind === 'counters') {
        for (const item of field.items) {
          if (host.values[item.key] === undefined) {
            host.set(item.key, item.start)
          }
        }
      }
    }
  }, { immediate: true })

  const layout = computed(() => props.form?.layout ?? 'bar')
  const barFields = computed(() => props.form ? fields.value.filter(field => inBar(field, props.form!)) : [])
  const underFields = computed(() => props.form ? fields.value.filter(field => !inBar(field, props.form!)) : [])

  const ready = computed(() => fields.value.every(field => !field.required || isFilled(field, host.values)))
  const going = ref(false)
  const problem = ref('')
  const done = ref(false)

  async function submit () {
    const form = props.form
    if (!form || !ready.value) {
      return
    }
    going.value = true
    problem.value = ''
    const request = form.button.request
    try {
      if (formAction(form) === 'channel') {
        // a list's value said by its own words, not its id
        const said = (key: string, value: unknown) => lists[key]?.find(option => option.value === value)?.label
        const result = await host.send(formMessage(form, host.values, lang.value, said))
        if (result === 'sent') {
          done.value = true
        } else {
          problem.value = WORDS[result === 'not-configured' ? 'notSetUp' : 'failed'][lang.value]
        }
        return
      }
      const role = host.dock.roleOf(request)
      if (role === 'handoff') {
        host.go(await host.dock.handoff(request, host.context({ ...host.values })))
        return
      }
      if (role !== 'answer') {
        throw new Error(`docking form "${form.id}": the button sends to no handoff or answer`)
      }
      const values = Object.fromEntries(formKeys(form).map(key => [key, host.values[key] ?? null]))
      await host.dock.answer(request, { form: form.id, locale: lang.value, values })
      done.value = true
    } catch (error) {
      problem.value = WORDS.failed[lang.value]
      host.report(`docking form "${form.id}": button`, error)
    } finally {
      going.value = false
    }
  }
</script>

<template>
  <div v-if="form" :class="['pw-dock', `pw-dock--${layout}`]">
    <p v-if="done" class="pw-dock__done">{{ textOf(form.button.done, lang) }}</p>
    <template v-else>
      <div v-if="layout === 'bar'" class="pw-dock__bar" :style="{ '--pw-dock-columns': barFields.length }">
        <component
          :is="KINDS[field.kind]"
          v-for="field of barFields"
          :key="field.key"
          :field="field"
        />
        <v-btn
          class="primary-button pw-dock__button"
          :disabled="!ready"
          :loading="going"
          size="x-large"
          @click="submit"
        >
          {{ textOf(form.button.label, lang) }}
        </v-btn>
      </div>
      <div :class="layout === 'stack' ? 'pw-dock__stack' : 'pw-dock__under'">
        <component
          :is="KINDS[field.kind]"
          v-for="field of underFields"
          :key="field.key"
          :field="field"
        />
        <v-btn
          v-if="layout === 'stack'"
          block
          class="primary-button pw-dock__button"
          :disabled="!ready"
          :loading="going"
          size="x-large"
          @click="submit"
        >
          {{ textOf(form.button.label, lang) }}
        </v-btn>
      </div>
    </template>
    <p v-if="problem" class="pw-dock__problem">{{ problem }}</p>
  </div>
</template>

<!-- Not scoped: the fields are components of their own, and the calendar
     and the counters open in overlays; every class is pw-dock__*. -->
<style>
.pw-dock__bar {
  display: grid;
  grid-template-columns: repeat(var(--pw-dock-columns, 3), minmax(0, 1fr)) auto;
  gap: 8px;
  align-items: stretch;
  max-width: 1080px;
  margin-inline: auto;
  padding: 8px;
  border-radius: var(--small-border-radius, 28px);
  background: var(--white);
  box-shadow: 0 8px 32px rgb(0 0 0 / 0.12);
}
@media (max-width: 900px) {
  .pw-dock__bar {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  .pw-dock__bar > :first-child,
  .pw-dock__bar .pw-dock__button {
    grid-column: 1 / -1;
  }
}
@media (max-width: 560px) {
  .pw-dock__bar {
    grid-template-columns: minmax(0, 1fr);
  }
}
.pw-dock__stack {
  display: grid;
  gap: 10px;
  max-width: 640px;
  margin-inline: auto;
  padding: 16px;
  border-radius: var(--small-border-radius, 28px);
  background: var(--white);
  box-shadow: 0 8px 32px rgb(0 0 0 / 0.12);
}
.pw-dock__under {
  max-width: 1080px;
  margin-inline: auto;
}
/* The closed field, as its look says (UI Kit "Елементи форми",
   packages/dock/src/field-looks.ts): colours and corners come in as
   --pw-field-*; the variant decides where they go. */
.pw-dock__field {
  min-width: 0;
  min-height: 60px;
  border: 0;
  border-radius: var(--pw-field-radius, var(--extra-small-border-radius, 8px));
  background: var(--pw-field-bg, var(--light-grey-2));
}
.pw-dock__field--outlined {
  box-shadow: inset 0 0 0 1px var(--pw-field-border, var(--grey));
}
.pw-dock__field--underlined {
  border-radius: 0;
  background: var(--pw-field-bg, transparent);
  box-shadow: inset 0 -1px 0 var(--pw-field-border, var(--dark-grey));
}
.pw-dock__field--pill {
  border-radius: var(--pw-field-radius, 999px);
}
.pw-dock__pick.pw-dock__field--pill {
  padding-inline: 20px;
}
.pw-dock__field--icon-none > .v-icon {
  display: none;
}
.pw-dock__pick.pw-dock__field--icon-top {
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-height: 84px;
  padding-block: 12px;
}
.pw-dock__field--icon-top .pw-dock__pick-text {
  width: 100%;
}
/* no caption: the icon and the value say it; an empty field shows the
   caption in the value's place */
.pw-dock__field--label-hidden .pw-dock__pick-label:has(+ .pw-dock__pick-value),
.pw-dock__field--label-hidden .pw-dock__pick-label:has(+ .v-input) {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
.pw-dock__field--label-hidden .pw-dock__pick-label {
  font-size: 1rem;
}
.pw-dock__pick {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border: 0;
  color: var(--black);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.pw-dock__field--long {
  align-items: flex-start;
  cursor: text;
}
.pw-dock__pick > .v-icon {
  flex: none;
  color: var(--dark-grey);
}
.pw-dock__pick-text {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
}
.pw-dock__pick-label {
  font-size: 0.8rem;
  color: var(--dark-grey);
}
.pw-dock__pick--empty .pw-dock__pick-label {
  font-size: 1rem;
}
.pw-dock__pick-value {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* In the editor the site's Vuetify sheet sits in layer vuetify-app-styles,
   whose !important beats an unlayered one - app-content comes first; on the
   site the same layer beats the theme's unlayered !important. The theme
   dresses every text field (border, background, radius, margin, a 56px
   row); here the field is the value line of a box that has all of that. */
@layer app-content {
  .pw-dock__input {
    margin: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
  }
  .pw-dock__input .v-field {
    padding-left: 0 !important;
    --v-field-padding-start: 0px;
    --v-field-padding-end: 0px;
  }
  .pw-dock__input .v-field__field {
    height: auto !important;
  }
  .pw-dock__input .v-field__input {
    min-height: 0 !important;
    min-width: 0 !important;
    padding: 0 !important;
    font-weight: 600;
  }
  .pw-dock__input .v-field__append-inner {
    padding: 0 !important;
  }
}
.pw-dock__button {
  height: auto !important;
  min-height: 60px;
}
/* What opens from a field, as its look says: --pw-panel-* */
.pw-dock__panel {
  overflow: hidden;
  border-radius: var(--pw-panel-radius, var(--extra-small-border-radius, 8px));
  background: var(--pw-panel-bg, var(--white));
}
.pw-dock__panel--shadow {
  box-shadow: 0 8px 32px rgb(0 0 0 / 0.16);
}
.pw-dock__panel--sheet {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
.pw-dock__panel--inline {
  margin-top: 8px;
  border: solid 1px var(--light-grey-1);
}
.pw-dock__panel--dialog .pw-dock__calendar,
.pw-dock__panel--sheet .pw-dock__calendar {
  display: flex;
  justify-content: center;
}
.pw-dock__panel-done {
  display: flex;
  justify-content: flex-end;
  padding: 0 16px 16px;
}
/* inline: the field and its panel are the form's own items - in a row
   form the panel takes the whole row under it */
.pw-dock__inline {
  display: contents;
}
.pw-dock__bar > .pw-dock__inline > .pw-dock__panel {
  grid-column: 1 / -1;
  margin-top: 0;
}
.pw-dock__calendar {
  overflow: hidden;
}
.pw-dock__calendar-note {
  margin: 0;
  padding: 20px 24px;
  color: var(--dark-grey);
}
.pw-dock__day,
.pw-dock__day .v-btn__content {
  flex-direction: column;
  line-height: 1.05;
}
.pw-dock__day-hint {
  font-size: 0.6rem;
  opacity: 0.75;
}
.pw-dock__counters {
  display: grid;
  gap: 12px;
  min-width: 260px;
  padding: 16px 20px;
}
.pw-dock__counters-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.pw-dock__stepper {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pw-dock__stepper .v-btn--disabled {
  opacity: 0.35;
}
.pw-dock__count {
  min-width: 1.5em;
  font-weight: 600;
  text-align: center;
}
.pw-dock__cards {
  margin-top: 28px;
}
.pw-dock--stack .pw-dock__cards {
  margin-top: 4px;
}
.pw-dock__cards-title {
  margin: 0 0 16px;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 600;
}
.pw-dock--stack .pw-dock__cards-title {
  text-align: left;
  font-size: 1rem;
}
.pw-dock__sample {
  margin: -8px 0 12px;
  text-align: center;
  font-size: 0.85rem;
  color: var(--dark-grey);
}
.pw-dock__problem,
.pw-dock__done {
  margin: 12px 0 0;
  text-align: center;
}
.pw-dock__problem {
  color: var(--error);
}
.pw-dock__done {
  font-size: 1.15rem;
  font-weight: 600;
}
</style>
