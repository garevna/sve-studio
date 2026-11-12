<script setup lang="ts">
  import type { DockDay, DockOption } from '@sve/dock'
  import type { PopupCalendarModel, TranslatedModel } from '@/types/TemplateBlockModel'
  import { computed, onMounted, reactive, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import DockChoiceCards from '@/components/dock/DockChoiceCards.vue'
  import EditableBlockHeading from '@/components/editors/EditableBlockHeading.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { editorDock, editorDockContext, useClientApi } from '@/composables/useClientApi'
  import { useBlockActionsTarget } from '@/composables/useEditableBlockActions'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { useSitePopups } from '@/composables/useSitePopups'
  import { calendarProps, newCalendar } from '@/configs/popup-looks'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { emptyTranslatedModel, isTranslatedModel } from '@/utils/locale-text'
  import { report } from '@/utils/report'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // "Пошук готелю" in the editor: the site's own block (the site's
  // HotelSearch.vue - same markup, same classes, same look), working against
  // the same docking block, so the calendar shows the client's free days
  // and prices right here. In edit mode: the heading in place, and under
  // the form the block's settings - which of the docking block's requests
  // it uses, the calendar model, the fields' captions.
  defineOptions({ inheritAttrs: false })

  type Lang = 'uk' | 'en' | 'de'
  type LabelKey = 'destination' | 'dates' | 'guests' | 'button' | 'room'
  interface PropsModel {
    title?: TranslatedModel
    subtitle?: TranslatedModel
    titleClass?: string
    subtitleClass?: string
    labels?: Partial<Record<LabelKey, TranslatedModel>>
    destinations?: string
    availability?: string
    roomTypes?: string
    booking?: string
    calendar?: string
  }

  const model = defineModel<PropsModel>({ default: () => ({}) })
  const mode = useEditorMode()
  const blockActionsTarget = useBlockActionsTarget()
  const commonStore = useCommonStore()
  const router = useRouter()
  const clientApi = useClientApi()
  const sitePopups = useSitePopups()
  onMounted(() => {
    void clientApi.load()
    void sitePopups.load()
  })

  const lang = computed(() => (['uk', 'en', 'de'].includes(commonStore.locale) ? commonStore.locale : 'uk') as Lang)
  function patch (changes: Partial<PropsModel>) {
    model.value = { ...model.value, ...changes }
  }

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
    room: { uk: 'Оберіть номер', en: 'Choose a room', de: 'Zimmer wählen' },
    perNight: { uk: 'за ніч', en: 'a night', de: 'pro Nacht' },
    noRooms: { uk: 'На ці дати для такої кількості гостей вільних номерів немає. Спробуйте інші дати.', en: 'No rooms are free for these dates and guests. Try other dates.', de: 'Für diese Daten und Gäste sind keine Zimmer frei. Versuchen Sie andere Daten.' },
  } as const
  const LABEL_KEYS: LabelKey[] = ['destination', 'dates', 'guests', 'button', 'room']

  function label (key: LabelKey): string {
    const own = model.value.labels?.[key]?.[lang.value]
    return (typeof own === 'string' && own) || WORDS[key][lang.value]
  }
  // the current language only, like every text field in the editor
  function setLabel (key: LabelKey, value: string) {
    const current = model.value.labels?.[key]
    const bag = isTranslatedModel(current) ? { ...current } : emptyTranslatedModel()
    bag[lang.value] = value
    patch({ labels: { ...model.value.labels, [key]: bag } })
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

  // --- the fields (the editor keeps its own, the site's are the visitor's) ---

  const values = reactive<Record<string, unknown>>({ adults: 2, children: 0, rooms: 1 })
  const destination = computed({
    get: () => (typeof values.destination === 'string' ? values.destination : null),
    set: value => {
      values.destination = value
      values.dates = []
    },
  })
  const dates = computed<string[]>(() => (Array.isArray(values.dates) ? values.dates as string[] : []))
  function numberValue (key: string, fallback: number): number {
    const value = Number(values[key])
    return Number.isFinite(value) && value >= 0 ? value : fallback
  }

  function reportDock (what: string, error: unknown) {
    report('error', 'dock', `${what}: ${error instanceof Error ? error.message : String(error)}`, error)
  }

  // --- destinations ------------------------------------------------------------

  const options = ref<DockOption[]>([])
  const optionsLoading = ref(false)
  async function loadOptions () {
    await clientApi.load()
    optionsLoading.value = true
    try {
      options.value = await editorDock.options(model.value.destinations, editorDockContext({ ...values }, lang.value))
    } catch (error) {
      options.value = []
      reportDock('hotel search: destinations', error)
    } finally {
      optionsLoading.value = false
    }
  }
  onMounted(loadOptions)
  watch(() => [model.value.destinations, lang.value, clientApi.document.value], loadOptions, { deep: true })

  // --- the calendar ------------------------------------------------------------

  const calendarModel = computed<PopupCalendarModel>(() => sitePopups.calendars.value.find(item => item.id === model.value.calendar) ?? sitePopups.calendars.value[0] ?? newCalendar('simple', '', 'search'))
  const calendar = computed(() => calendarProps(calendarModel.value))

  const datesOpen = ref(false)
  const shown = ref({ year: new Date().getFullYear(), month: new Date().getMonth() })
  const monthKey = computed(() => `${shown.value.year}-${String(shown.value.month + 1).padStart(2, '0')}`)
  const days = ref<Record<string, DockDay[] | null>>({})
  const daysLoading = ref(false)

  async function loadDays () {
    if (!datesOpen.value || !destination.value || monthKey.value in days.value) {
      return
    }
    daysLoading.value = true
    const key = monthKey.value
    try {
      days.value = { ...days.value, [key]: await editorDock.dates(model.value.availability, editorDockContext({ ...values }, lang.value, key)) }
    } catch (error) {
      days.value = { ...days.value, [key]: null }
      reportDock('hotel search: free days', error)
    } finally {
      daysLoading.value = false
    }
  }
  watch([datesOpen, monthKey], loadDays)
  watch(() => [destination.value, model.value.availability, lang.value, clientApi.document.value], () => {
    days.value = {}
    void loadDays()
  }, { deep: true })

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

  function allowed (value: unknown): boolean {
    const iso = isoOf(value)
    if (iso < today) {
      return false
    }
    const known = days.value[iso.slice(0, 7)]
    if (known === null || !model.value.availability) {
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
      values.dates = list
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
    values[key] = Math.min(rule.max, Math.max(rule.min, numberValue(key, rule.fallback) + by))
  }
  const guestsText = computed(() => {
    const parts = [counted('adults', numberValue('adults', 2))]
    if (numberValue('children', 0) > 0) {
      parts.push(counted('children', numberValue('children', 0)))
    }
    parts.push(counted('rooms', numberValue('rooms', 1)))
    return parts.join(' · ')
  })

  // --- the room (cards from the client's room categories) ---------------------

  const room = computed({
    get: () => (typeof values.room === 'string' ? values.room : null),
    set: value => {
      values.room = value
    },
  })
  const roomOptions = ref<DockOption[]>([])
  const roomsLoading = ref(false)
  const roomsAsked = ref(false)
  // never set - the docking block's first card list; '' - switched off
  const roomsRequest = computed(() => model.value.roomTypes ?? editorDock.cardsRequest())
  const chosen = computed(() => !!destination.value && dates.value.length > 1)
  // While editing, the cards are there before anything is chosen - for the
  // first city and three nights a month ahead - so their look can be seen.
  const roomsSample = computed(() => mode.value === 'edit' && !chosen.value && options.value.length > 0)
  const roomsShown = computed(() => !!roomsRequest.value && (chosen.value || roomsSample.value))

  function sampleValues (): Record<string, unknown> {
    const day = (ahead: number) => isoOf(new Date(Date.now() + ahead * 86_400_000))
    return { ...values, destination: options.value[0]!.value, dates: [day(30), day(33)] }
  }

  async function loadRooms () {
    if (!roomsShown.value) {
      roomOptions.value = []
      roomsAsked.value = false
      return
    }
    roomsLoading.value = true
    try {
      roomOptions.value = await editorDock.options(roomsRequest.value, editorDockContext(roomsSample.value ? sampleValues() : { ...values }, lang.value))
    } catch (error) {
      roomOptions.value = []
      reportDock('hotel search: rooms', error)
    } finally {
      roomsLoading.value = false
      roomsAsked.value = true
    }
    if (room.value && !roomOptions.value.some(option => option.value === room.value)) {
      room.value = null
    }
  }
  watch(() => [roomsRequest.value, roomsSample.value, destination.value, dates.value.join(','), values.adults, values.children, values.rooms, lang.value, clientApi.document.value], loadRooms, { deep: true })

  // --- "Знайти": in the editor, the client's engine opens in a new tab ---------

  const ready = computed(() => !!destination.value && dates.value.length > 1)
  const going = ref(false)
  const problem = ref('')
  async function search () {
    if (!ready.value) {
      return
    }
    going.value = true
    problem.value = ''
    try {
      window.open(await editorDock.handoff(model.value.booking, editorDockContext({ ...values }, lang.value)), '_blank', 'noopener')
    } catch (error) {
      problem.value = WORDS.failed[lang.value]
      reportDock('hotel search: handoff', error)
    } finally {
      going.value = false
    }
  }

  // --- the block's settings ----------------------------------------------------

  const settingsOpen = ref(false)
  const requestsOf = (role: 'options' | 'dates' | 'handoff') => clientApi.ofRole(role).map(item => ({ title: item.name || item.id, value: item.id }))
  const calendars = computed(() => sitePopups.calendars.value.map(item => ({ title: item.name || t(`calendars.variants.${item.variant}`), value: item.id })))
  const overlayClass = computed(() => [EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME)].join(' '))
</script>

<template>
  <section class="pw-search">
    <EditableBlockHeading
      :subtitle="model.subtitle"
      :subtitle-class="model.subtitleClass || 'h3 text-center mb-5'"
      :title="model.title"
      :title-class="model.titleClass || 'h2 text-center mb-4'"
      @update="patch"
    />

    <template v-if="mode === 'edit'">
      <Teleport :disabled="!blockActionsTarget" :to="blockActionsTarget || 'body'">
        <ToolbarIconButton :active="settingsOpen" icon="mdi-tune-variant" :tooltip="t('clientApi.block.settings')" @click="settingsOpen = !settingsOpen" />
      </Teleport>
    </template>

    <div class="pw-search__bar">
      <div class="pw-search__field pw-search__pick pw-search__field--where">
        <v-icon icon="mdi-map-marker-outline" size="22" />
        <span class="pw-search__pick-text">
          <span class="pw-search__pick-label">{{ label('destination') }}</span>
          <v-autocomplete
            v-model="destination"
            class="pw-search__where-input"
            :content-class="overlayClass"
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

      <v-menu
        v-model="datesOpen"
        :close-on-content-click="false"
        :content-class="overlayClass"
        location="bottom start"
        max-width="360"
      >
        <template #activator="{ props: menuProps }">
          <button v-bind="menuProps" :class="['pw-search__field pw-search__pick', { 'pw-search__pick--empty': !datesText }]" type="button">
            <v-icon icon="mdi-calendar-range" size="22" />
            <span class="pw-search__pick-text">
              <span class="pw-search__pick-label">{{ label('dates') }}</span>
              <span v-if="datesText" class="pw-search__pick-value">{{ datesText }}</span>
            </span>
          </button>
        </template>
        <v-theme-provider :theme="APP_THEME_NAME">
          <div class="pw-calendar-host pw-search__calendar">
            <p v-if="!destination" class="pw-search__calendar-note">{{ WORDS.pickFirst[lang] }}</p>
            <v-locale-provider v-else :locale="lang">
              <v-date-picker
                :allowed-dates="allowed"
                :class="calendar.class"
                :color="calendar.color"
                :control-variant="calendar.controlVariant"
                :first-day-of-week="calendar.firstDayOfWeek"
                header="—"
                hide-header
                :model-value="pickerValue"
                multiple="range"
                :next-icon="calendar.nextIcon"
                :prev-icon="calendar.prevIcon"
                :style="calendar.style"
                :title="WORDS.pickDates[lang]"
                :weekday-format="calendar.weekdayFormat"
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
        </v-theme-provider>
      </v-menu>

      <v-menu v-model="guestsOpen" :close-on-content-click="false" :content-class="overlayClass" location="bottom start">
        <template #activator="{ props: menuProps }">
          <button v-bind="menuProps" class="pw-search__field pw-search__pick" type="button">
            <v-icon icon="mdi-account-multiple-outline" size="22" />
            <span class="pw-search__pick-text">
              <span class="pw-search__pick-label">{{ label('guests') }}</span>
              <span class="pw-search__pick-value">{{ guestsText }}</span>
            </span>
          </button>
        </template>
        <v-theme-provider :theme="APP_THEME_NAME">
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
        </v-theme-provider>
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

    <div v-if="roomsShown" class="pw-search__rooms">
      <h3 class="pw-search__rooms-title">{{ label('room') }}</h3>
      <p v-if="roomsSample" class="search-sample-note">{{ t('clientApi.block.roomsSample') }}</p>
      <DockChoiceCards
        v-model="room"
        :empty-text="roomsAsked ? WORDS.noRooms[lang] : ''"
        :hint-suffix="WORDS.perNight[lang]"
        :loading="roomsLoading"
        :options="roomOptions"
      />
    </div>

    <p v-if="problem" class="pw-search__problem">{{ problem }}</p>

    <!-- The block's settings, under the form it changes (edit mode only). -->
    <v-expand-transition>
      <div v-if="mode === 'edit' && settingsOpen" class="search-settings v-theme--editorTheme">
        <div class="search-settings-grid">
          <v-select
            clearable
            density="compact"
            hide-details
            :items="requestsOf('options')"
            :label="t('clientApi.block.destinations')"
            :model-value="model.destinations ?? null"
            :placeholder="t('clientApi.block.notSet')"
            variant="outlined"
            @update:model-value="value => patch({ destinations: value ?? undefined })"
          />
          <v-select
            clearable
            density="compact"
            hide-details
            :items="requestsOf('dates')"
            :label="t('clientApi.block.availability')"
            :model-value="model.availability ?? null"
            :placeholder="t('clientApi.block.notSet')"
            variant="outlined"
            @update:model-value="value => patch({ availability: value ?? undefined })"
          />
          <v-select
            clearable
            density="compact"
            hide-details
            :items="requestsOf('options')"
            :label="t('clientApi.block.roomTypes')"
            :model-value="roomsRequest || null"
            :placeholder="t('clientApi.block.roomsOff')"
            variant="outlined"
            @update:model-value="value => patch({ roomTypes: value ?? '' })"
          />
          <v-select
            clearable
            density="compact"
            hide-details
            :items="requestsOf('handoff')"
            :label="t('clientApi.block.booking')"
            :model-value="model.booking ?? null"
            :placeholder="t('clientApi.block.notSet')"
            variant="outlined"
            @update:model-value="value => patch({ booking: value ?? undefined })"
          />
          <v-select
            density="compact"
            hide-details
            :items="calendars"
            :label="t('clientApi.block.calendar')"
            :model-value="model.calendar ?? calendars[0]?.value ?? null"
            variant="outlined"
            @update:model-value="value => patch({ calendar: value ?? undefined })"
          />
        </div>
        <p class="search-settings-caption">{{ t('clientApi.block.labels') }} ({{ lang.toUpperCase() }})</p>
        <div class="search-settings-grid">
          <v-text-field
            v-for="key of LABEL_KEYS"
            :key="key"
            density="compact"
            hide-details
            :label="WORDS[key][lang]"
            :model-value="model.labels?.[key]?.[lang] ?? ''"
            :placeholder="WORDS[key][lang]"
            variant="outlined"
            @update:model-value="value => setLabel(key, value)"
          />
        </div>
        <v-btn
          class="mt-3"
          prepend-icon="mdi-connection"
          size="small"
          variant="text"
          @click="router.push('/client-api')"
        >{{ t('clientApi.block.toApi') }}</v-btn>
      </div>
    </v-expand-transition>
  </section>
</template>

<style scoped>
/* The site's own block (site HotelSearch.vue), as it is. */
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
/* In the editor the site's Vuetify sheet sits in layer vuetify-app-styles,
   whose !important beats an unlayered one - app-content comes first. */
@layer app-content {
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
.pw-search__rooms {
  max-width: 1080px;
  margin: 28px auto 0;
}
.pw-search__rooms-title {
  margin: 0 0 16px;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 600;
}
.pw-search__problem {
  margin: 12px 0 0;
  color: var(--error);
  text-align: center;
}

/* the editor's own: the block's settings */
.search-settings {
  max-width: 1080px;
  margin: 16px auto 0;
  padding: 12px 16px;
  border: dashed 1px rgba(58, 74, 88, 0.3);
  border-radius: 8px;
  background: #FFFFFF;
}
.search-settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}
.search-sample-note {
  margin: -4px 0 12px;
  text-align: center;
  font-size: 0.85rem;
  color: #6B7785;
}

.search-settings-caption {
  margin: 12px 0 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #3A4A58;
}
</style>
