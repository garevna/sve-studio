<script setup lang="ts">
  import type { DockDay, DockOption } from '@sve/dock'
  import type { PopupCalendarModel, TranslatedModel } from '@/types/common/TemplateBlockModel'
  import { storeToRefs } from 'pinia'
  import { computed, onMounted, ref, watch } from 'vue'
  import { calendarProps, newCalendar } from '@/configs/popup-looks'
  import { dock, dockContext, dockValues, reportDock, setDockValue } from '@/services/dock'
  import { useCommonStore } from '@/stores/common'
  import { usePopupsStore } from '@/stores/popups'

  // "Пошук готелю": where, when, how many - and on to the client's own
  // booking engine. The form knows only its fields' keys (destination,
  // dates, adults, children, rooms); which of the client's addresses gives
  // the destinations and the free days, and how the visitor is handed over,
  // is the docking block's business (services/dock.ts,
  // content/settings/client-api.json). The block names the three requests.
  //
  // The calendar wears one of the client's calendar models (UI Kit
  // "Вибір дати"), like a date popup.
  type Lang = 'uk' | 'en' | 'de'

  const props = defineProps<{
    title?: TranslatedModel
    subtitle?: TranslatedModel
    labels?: Partial<Record<'destination' | 'dates' | 'guests' | 'button', TranslatedModel>>
    // the docking block's requests, by id
    destinations?: string
    availability?: string
    booking?: string
    // a calendar model (UI Kit); absent - the first one
    calendar?: string
  }>()

  const { locale } = storeToRefs(useCommonStore())
  const lang = computed(() => (['uk', 'en', 'de'].includes(locale.value) ? locale.value : 'uk') as Lang)
  const popupsStore = usePopupsStore()

  const WORDS = {
    destination: { uk: 'Куди', en: 'Where to', de: 'Wohin' },
    dates: { uk: 'Заїзд — виїзд', en: 'Check-in — check-out', de: 'Anreise — Abreise' },
    guests: { uk: 'Гості', en: 'Guests', de: 'Gäste' },
    button: { uk: 'Знайти', en: 'Search', de: 'Suchen' },
    adults: { uk: 'Дорослі', en: 'Adults', de: 'Erwachsene' },
    children: { uk: 'Діти', en: 'Children', de: 'Kinder' },
    rooms: { uk: 'Номери', en: 'Rooms', de: 'Zimmer' },
    pickDates: { uk: 'Оберіть дати', en: 'Pick the dates', de: 'Daten wählen' },
    pickFirst: { uk: 'Спершу оберіть, куди', en: 'Pick where to first', de: 'Zuerst das Ziel wählen' },
    noOptions: { uk: 'Нічого не знайдено', en: 'Nothing found', de: 'Nichts gefunden' },
    pickCity: { uk: 'Оберіть місто', en: 'Choose a city', de: 'Stadt wählen' },
    failed: { uk: 'Не вдалося. Спробуйте ще раз трохи згодом.', en: 'That didn’t work. Please try again a little later.', de: 'Das hat nicht geklappt. Bitte versuchen Sie es etwas später noch einmal.' },
    from: { uk: 'від', en: 'from', de: 'ab' },
  } as const

  function label (key: 'destination' | 'dates' | 'guests' | 'button'): string {
    return props.labels?.[key]?.[lang.value] || WORDS[key][lang.value]
  }
  // A word after a number: 1 ніч, 3 ночі, 5 ночей.
  const COUNTED = {
    nights: { uk: ['ніч', 'ночі', 'ночей'], en: ['night', 'nights'], de: ['Nacht', 'Nächte'] },
    adults: { uk: ['дорослий', 'дорослі', 'дорослих'], en: ['adult', 'adults'], de: ['Erwachsener', 'Erwachsene'] },
    children: { uk: ['дитина', 'дитини', 'дітей'], en: ['child', 'children'], de: ['Kind', 'Kinder'] },
    rooms: { uk: ['номер', 'номери', 'номерів'], en: ['room', 'rooms'], de: ['Zimmer', 'Zimmer'] },
  } as const
  function counted (what: keyof typeof COUNTED, count: number): string {
    const forms: readonly string[] = COUNTED[what][lang.value]
    const word = (index: number) => `${count} ${forms[index]}`
    if (lang.value !== 'uk') {
      return word(count === 1 ? 0 : 1)
    }
    const tens = count % 100
    const ones = count % 10
    if (tens > 10 && tens < 20) {
      return word(2)
    }
    if (ones === 1) {
      return word(0)
    }
    return word(ones >= 2 && ones <= 4 ? 1 : 2)
  }

  // --- the fields: kept in the docking block, by key ---------------------------

  function numberValue (key: string, fallback: number): number {
    const value = Number(dockValues[key])
    return Number.isFinite(value) && value >= 0 ? value : fallback
  }
  const destination = computed({
    get: () => (typeof dockValues.destination === 'string' ? dockValues.destination : null),
    set: value => {
      setDockValue('destination', value)
      // other place, other free days
      setDockValue('dates', [])
    },
  })
  const dates = computed<string[]>(() => (Array.isArray(dockValues.dates) ? dockValues.dates as string[] : []))
  const adults = computed(() => numberValue('adults', 2))
  const children = computed(() => numberValue('children', 0))
  const rooms = computed(() => numberValue('rooms', 1))

  // --- destinations ------------------------------------------------------------

  const options = ref<DockOption[]>([])
  const optionsLoading = ref(false)
  async function loadOptions () {
    optionsLoading.value = true
    try {
      options.value = await dock.options(props.destinations, dockContext(lang.value))
    } catch (error) {
      options.value = []
      reportDock('hotel search: destinations', error)
    } finally {
      optionsLoading.value = false
    }
  }
  onMounted(loadOptions)
  watch(() => [props.destinations, lang.value], loadOptions)

  // --- the calendar ------------------------------------------------------------

  const calendarModel = computed<PopupCalendarModel>(() => {
    const calendars = popupsStore.calendars as PopupCalendarModel[]
    return calendars.find(item => item.id === props.calendar) ?? calendars[0] ?? newCalendar('simple', '', 'search')
  })
  const look = computed(() => calendarProps(calendarModel.value))

  const datesOpen = ref(false)
  const shown = ref({ year: new Date().getFullYear(), month: new Date().getMonth() })
  const monthKey = computed(() => `${shown.value.year}-${String(shown.value.month + 1).padStart(2, '0')}`)
  // the free days of each month asked, by month; null - the calendar is not
  // limited (no request named, or none answered)
  const days = ref<Record<string, DockDay[] | null>>({})
  const daysLoading = ref(false)

  async function loadDays () {
    if (!datesOpen.value || !destination.value || monthKey.value in days.value) {
      return
    }
    daysLoading.value = true
    const key = monthKey.value
    try {
      days.value = { ...days.value, [key]: await dock.dates(props.availability, dockContext(lang.value, { month: key })) }
    } catch (error) {
      days.value = { ...days.value, [key]: null }
      reportDock('hotel search: free days', error)
    } finally {
      daysLoading.value = false
    }
  }
  watch([datesOpen, monthKey], loadDays)
  watch(() => [destination.value, props.availability, lang.value], () => {
    days.value = {}
    void loadDays()
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

  function isoOf (value: unknown): string {
    const date = value instanceof Date ? value : new Date(String(value))
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  const today = isoOf(new Date())

  // A day can be picked when the client offers it - or, once the stay has
  // begun, as the day of leaving: nobody pays for the night after it.
  function allowed (value: unknown): boolean {
    const iso = isoOf(value)
    if (iso < today) {
      return false
    }
    const known = days.value[iso.slice(0, 7)]
    if (known === null || !props.availability) {
      return true
    }
    if (dayIndex.value.has(iso)) {
      return true
    }
    const start = dates.value.length === 1 ? dates.value[0] : undefined
    return !!start && iso > start
  }

  const pickerValue = computed({
    get: () => dates.value.map(iso => new Date(`${iso}T00:00:00`)),
    set: (value: unknown) => {
      const list = (Array.isArray(value) ? value : [value]).filter(Boolean).map(item => isoOf(item)).toSorted()
      setDockValue('dates', list)
      if (list.length > 1) {
        datesOpen.value = false
      }
    },
  })

  const datesText = computed(() => {
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
    return `${format(first)} — ${format(last)} · ${counted('nights', nights)}`
  })

  // --- guests ------------------------------------------------------------------

  const guestsOpen = ref(false)
  const GUESTS = [
    { key: 'adults', min: 1, max: 12, fallback: 2 },
    { key: 'children', min: 0, max: 8, fallback: 0 },
    { key: 'rooms', min: 1, max: 6, fallback: 1 },
  ] as const
  function step (key: 'adults' | 'children' | 'rooms', by: number) {
    const rule = GUESTS.find(item => item.key === key)!
    setDockValue(key, Math.min(rule.max, Math.max(rule.min, numberValue(key, rule.fallback) + by)))
  }
  const guestsText = computed(() => {
    const parts = [counted('adults', adults.value)]
    if (children.value > 0) {
      parts.push(counted('children', children.value))
    }
    parts.push(counted('rooms', rooms.value))
    return parts.join(' · ')
  })

  // --- on to the client's engine -----------------------------------------------

  const ready = computed(() => !!destination.value && dates.value.length > 1)
  const going = ref(false)
  const problem = ref('')

  async function search () {
    if (!ready.value) {
      return
    }
    // the counts go out even when untouched
    for (const rule of GUESTS) {
      setDockValue(rule.key, numberValue(rule.key, rule.fallback))
    }
    going.value = true
    problem.value = ''
    try {
      location.assign(await dock.handoff(props.booking, dockContext(lang.value)))
    } catch (error) {
      problem.value = WORDS.failed[lang.value]
      reportDock('hotel search: handoff', error)
      going.value = false
    }
  }
</script>

<template>
  <section class="pw-search">
    <h2 v-if="title?.[lang]" class="h2 text-center mb-4">{{ title[lang] }}</h2>
    <p v-if="subtitle?.[lang]" class="h3 text-center mb-5">{{ subtitle[lang] }}</p>

    <div class="pw-search__bar">
      <div class="pw-search__field pw-search__pick pw-search__field--where">
        <v-icon icon="mdi-map-marker-outline" size="22" />
        <span class="pw-search__pick-text">
          <span class="pw-search__pick-label">{{ label('destination') }}</span>
          <v-autocomplete
            v-model="destination"
            class="pw-search__where-input"
            density="compact"
            hide-details
            item-title="label"
            item-value="value"
            :items="options"
            :loading="optionsLoading"
            :no-data-text="WORDS.noOptions[lang]"
            :placeholder="WORDS.pickCity[lang]"
            variant="plain"
          />
        </span>
      </div>

      <v-menu v-model="datesOpen" :close-on-content-click="false" location="bottom start" max-width="360">
        <template #activator="{ props: menuProps }">
          <button v-bind="menuProps" :class="['pw-search__field pw-search__pick', { 'pw-search__pick--empty': !datesText }]" type="button">
            <v-icon icon="mdi-calendar-range" size="22" />
            <span class="pw-search__pick-text">
              <span class="pw-search__pick-label">{{ label('dates') }}</span>
              <span v-if="datesText" class="pw-search__pick-value">{{ datesText }}</span>
            </span>
          </button>
        </template>
        <div class="pw-calendar-host pw-search__calendar">
          <p v-if="!destination" class="pw-search__calendar-note">{{ WORDS.pickFirst[lang] }}</p>
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
              multiple="range"
              :next-icon="look.nextIcon"
              :prev-icon="look.prevIcon"
              :style="look.style"
              :title="WORDS.pickDates[lang]"
              :weekday-format="look.weekdayFormat"
              @update:model-value="value => pickerValue = value"
              @update:month="value => shown = { ...shown, month: Number(value) }"
              @update:year="value => shown = { ...shown, year: Number(value) }"
            >
              <template #day="{ props: dayProps, item }">
                <v-btn v-bind="dayProps" class="pw-search__day">
                  <span>{{ item.localized }}</span>
                  <small v-if="dayIndex.get(item.isoDate)?.hint && !item.isDisabled" class="pw-search__day-hint">{{ dayIndex.get(item.isoDate)?.hint }}</small>
                </v-btn>
              </template>
            </v-date-picker>
            <v-progress-linear v-if="daysLoading" color="primary" indeterminate />
          </v-locale-provider>
        </div>
      </v-menu>

      <v-menu v-model="guestsOpen" :close-on-content-click="false" location="bottom start">
        <template #activator="{ props: menuProps }">
          <button v-bind="menuProps" class="pw-search__field pw-search__pick" type="button">
            <v-icon icon="mdi-account-multiple-outline" size="22" />
            <span class="pw-search__pick-text">
              <span class="pw-search__pick-label">{{ label('guests') }}</span>
              <span class="pw-search__pick-value">{{ guestsText }}</span>
            </span>
          </button>
        </template>
        <div class="pw-search__guests">
          <div v-for="rule of GUESTS" :key="rule.key" class="pw-search__guests-row">
            <span>{{ WORDS[rule.key][lang] }}</span>
            <span class="pw-search__stepper">
              <v-btn
                :aria-label="`${WORDS[rule.key][lang]} −`"
                :disabled="numberValue(rule.key, rule.fallback) <= rule.min"
                icon="mdi-minus"
                size="small"
                variant="outlined"
                @click="step(rule.key, -1)"
              />
              <span class="pw-search__count">{{ numberValue(rule.key, rule.fallback) }}</span>
              <v-btn
                :aria-label="`${WORDS[rule.key][lang]} +`"
                :disabled="numberValue(rule.key, rule.fallback) >= rule.max"
                icon="mdi-plus"
                size="small"
                variant="outlined"
                @click="step(rule.key, 1)"
              />
            </span>
          </div>
        </div>
      </v-menu>

      <v-btn
        class="primary-button pw-search__button"
        :disabled="!ready"
        :loading="going"
        size="x-large"
        @click="search"
      >
        {{ label('button') }}
      </v-btn>
    </div>

    <p v-if="problem" class="pw-search__problem">{{ problem }}</p>
  </section>
</template>

<style scoped>
.pw-search {
  padding-block: 32px;
}
.pw-search__bar {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1.2fr) minmax(0, 1fr) auto;
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
  .pw-search__bar {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  .pw-search__field--where {
    grid-column: 1 / -1;
  }
}
@media (max-width: 560px) {
  .pw-search__bar {
    grid-template-columns: minmax(0, 1fr);
  }
}
.pw-search__field {
  min-width: 0;
  min-height: 60px;
  border-radius: var(--extra-small-border-radius, 8px);
  background: var(--light-grey-2);
}
.pw-search__field--where .pw-search__pick-text {
  flex: 1 1 auto;
}
/* The theme dresses every text field (vuetify-text-field.css: border,
   background, radius, margin, a 56px row - all !important); here the
   field is the value line of a box that already has all of that. */
.pw-search__where-input {
  margin: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
}
.pw-search__where-input :deep(.v-field) {
  padding-left: 0 !important;
  --v-field-padding-start: 0px;
  --v-field-padding-end: 0px;
}
.pw-search__where-input :deep(.v-field__field) {
  height: auto !important;
}
.pw-search__where-input :deep(.v-field__input) {
  min-height: 0 !important;
  min-width: 0 !important;
  padding: 0 !important;
  font-weight: 600;
}
.pw-search__where-input :deep(.v-field__append-inner) {
  padding: 0 !important;
}
.pw-search__pick {
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
.pw-search__pick .v-icon {
  flex: none;
  color: var(--dark-grey);
}
.pw-search__pick-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.pw-search__pick-label {
  font-size: 0.8rem;
  color: var(--dark-grey);
}
.pw-search__pick--empty .pw-search__pick-label {
  font-size: 1rem;
}
.pw-search__pick-value {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pw-search__button {
  height: auto !important;
  min-height: 60px;
}
@media (max-width: 900px) {
  .pw-search__button {
    grid-column: 1 / -1;
  }
}
.pw-search__calendar {
  overflow: hidden;
  border-radius: var(--extra-small-border-radius, 8px);
  background: var(--white);
  box-shadow: 0 8px 32px rgb(0 0 0 / 0.16);
}
.pw-search__calendar-note {
  margin: 0;
  padding: 20px 24px;
  color: var(--dark-grey);
}
.pw-search__day {
  flex-direction: column;
  line-height: 1.05;
}
.pw-search__day :deep(.v-btn__content) {
  flex-direction: column;
}
.pw-search__day-hint {
  font-size: 0.6rem;
  opacity: 0.75;
}
.pw-search__guests {
  display: grid;
  gap: 12px;
  min-width: 260px;
  padding: 16px 20px;
  border-radius: var(--extra-small-border-radius, 8px);
  background: var(--white);
  box-shadow: 0 8px 32px rgb(0 0 0 / 0.16);
}
.pw-search__guests-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.pw-search__stepper {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pw-search__count {
  min-width: 1.5em;
  font-weight: 600;
  text-align: center;
}
.pw-search__problem {
  margin: 12px 0 0;
  color: var(--error);
  text-align: center;
}
</style>
