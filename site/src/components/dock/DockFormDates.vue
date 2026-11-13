<script setup lang="ts">
  import type { DockDatesField, DockDay } from '@sve/dock'
  import { closedLook, countedText, textOf } from '@sve/dock'
  import { computed, ref, watch } from 'vue'
  import { isoOf, useDockFormScope } from './dock-form-host'
  import DockFieldOverlay from './DockFieldOverlay.vue'

  // A docking form's dates: one day (an appointment) or a stretch (a stay).
  // The client's API can say which days are free and put a line (a price)
  // under each; it is asked month by month, once what it reads is chosen.
  //
  // NOTE: the editor's copy is src/components/dock/DockFormDates.vue - keep
  // the two identical.
  const props = defineProps<{ field: DockDatesField }>()
  const scope = useDockFormScope()
  const lang = computed(() => scope.lang() as 'uk' | 'en' | 'de')

  const WORDS = {
    pickDates: { uk: 'Оберіть дати', en: 'Pick the dates', de: 'Daten wählen' },
    pickFirst: { uk: 'Спершу оберіть', en: 'First choose', de: 'Zuerst wählen' },
  } as const

  const look = computed(() => scope.calendarLook(scope.calendar()))
  // how the field and its calendar panel look (UI Kit "Елементи форми")
  const fieldLook = computed(() => scope.lookOf(props.field))
  const closed = computed(() => closedLook(fieldLook.value))
  const dates = computed<string[]>(() => {
    const current = scope.values[props.field.key]
    return Array.isArray(current) ? current as string[] : []
  })

  // what the calendar waits for before it can ask for free days
  const waiting = computed(() => scope.waitingFor(props.field.request, props.field.key))
  const waitingText = computed(() => `${WORDS.pickFirst[lang.value]}: ${waiting.value.map(key => scope.labelOf(key)).join(', ')}`)

  const open = ref(false)
  const shown = ref({ year: new Date().getFullYear(), month: new Date().getMonth() })
  const monthKey = computed(() => `${shown.value.year}-${String(shown.value.month + 1).padStart(2, '0')}`)
  // the free days of each month asked; null - the calendar is not limited
  const days = ref<Record<string, DockDay[] | null>>({})
  const loading = ref(false)

  async function load () {
    if (!open.value || waiting.value.length > 0 || monthKey.value in days.value) {
      return
    }
    loading.value = true
    const key = monthKey.value
    try {
      days.value = { ...days.value, [key]: await scope.dock.dates(props.field.request, scope.context({ ...scope.values }, key)) }
    } catch (error) {
      days.value = { ...days.value, [key]: null }
      scope.report(`docking form: ${props.field.key}`, error)
    } finally {
      loading.value = false
    }
  }
  watch([open, monthKey], load)
  const inputs = computed(() => scope.dock.reads(props.field.request).filter(key => key !== props.field.key).map(key => JSON.stringify(scope.values[key] ?? null)).join('|'))
  watch(() => [inputs.value, props.field.request, lang.value], () => {
    days.value = {}
    void load()
  })

  const dayIndex = computed(() => {
    const index = new Map<string, DockDay>()
    for (const list of Object.values(days.value)) {
      for (const day of list ?? []) {
        index.set(day.date, day)
      }
    }
    return index
  })

  const today = isoOf(new Date())
  // A day can be picked when the client offers it - or, once a stay has
  // begun, as the day of leaving: nobody pays for the night after it.
  function allowed (value: unknown): boolean {
    const iso = isoOf(value)
    if (iso < today) {
      return false
    }
    if (!props.field.request || days.value[iso.slice(0, 7)] === null || dayIndex.value.has(iso)) {
      return true
    }
    const start = props.field.range && dates.value.length === 1 ? dates.value[0] : undefined
    return !!start && iso > start
  }

  const pickerValue = computed(() => {
    const list = dates.value.map(iso => new Date(`${iso}T00:00:00`))
    return props.field.range ? list : list[0] ?? null
  })
  function pick (value: unknown) {
    const list = (Array.isArray(value) ? value : [value]).filter(Boolean).map(item => isoOf(item)).toSorted()
    scope.set(props.field.key, list)
    if (!props.field.range || list.length > 1) {
      open.value = false
    }
  }

  const text = computed(() => {
    if (dates.value.length === 0) {
      return ''
    }
    const format = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(lang.value, { day: 'numeric', month: 'short' })
    const first = dates.value[0]!
    const last = dates.value.at(-1)!
    if (first === last) {
      return format(first)
    }
    const nights = Math.round((new Date(`${last}T00:00:00`).getTime() - new Date(`${first}T00:00:00`).getTime()) / 86_400_000)
    const counted = textOf(props.field.units, lang.value) ? ` · ${countedText(props.field.units, lang.value, nights)}` : ''
    return `${format(first)} — ${format(last)}${counted}`
  })
</script>

<template>
  <DockFieldOverlay v-model="open" :look="fieldLook" :max-width="360">
    <template #activator="{ props: activatorProps }">
      <!-- not a <button>: the theme dresses every bare button (buttons.css,
           !important corners and shadow); the look says how this one is -->
      <div
        v-bind="activatorProps"
        :aria-label="textOf(field.label, lang)"
        :class="['pw-dock__field pw-dock__pick', closed.class, { 'pw-dock__pick--empty': !text }]"
        role="button"
        :style="closed.style"
        tabindex="0"
        @keydown.enter.prevent="(event: KeyboardEvent) => (event.currentTarget as HTMLElement).click()"
        @keydown.space.prevent="(event: KeyboardEvent) => (event.currentTarget as HTMLElement).click()"
      >
        <v-icon v-if="field.icon" :icon="field.icon" size="22" />
        <span class="pw-dock__pick-text">
          <span class="pw-dock__pick-label">{{ textOf(field.label, lang) }}</span>
          <span v-if="text" class="pw-dock__pick-value">{{ text }}</span>
        </span>
      </div>
    </template>
    <div class="pw-calendar-host pw-dock__calendar">
      <p v-if="waiting.length > 0" class="pw-dock__calendar-note">{{ waitingText }}</p>
      <v-locale-provider v-else :locale="lang">
        <v-date-picker
          :allowed-dates="allowed"
          :class="look.class"
          :color="look.color"
          :control-variant="look.controlVariant"
          :first-day-of-week="look.firstDayOfWeek"
          header="—"
          hide-header
          :model-value="pickerValue"
          :multiple="field.range ? 'range' : false"
          :next-icon="look.nextIcon"
          :prev-icon="look.prevIcon"
          :style="look.style"
          :title="WORDS.pickDates[lang]"
          :weekday-format="look.weekdayFormat"
          @update:model-value="pick"
          @update:month="value => shown = { ...shown, month: Number(value) }"
          @update:year="value => shown = { ...shown, year: Number(value) }"
        >
          <template #day="{ props: dayProps, item }">
            <v-btn v-bind="dayProps" class="pw-dock__day">
              <span>{{ item.localized }}</span>
              <small v-if="dayIndex.get(item.isoDate)?.hint && !item.isDisabled" class="pw-dock__day-hint">{{ dayIndex.get(item.isoDate)?.hint }}</small>
            </v-btn>
          </template>
        </v-date-picker>
        <v-progress-linear v-if="loading" color="primary" indeterminate />
      </v-locale-provider>
    </div>
  </DockFieldOverlay>
</template>
