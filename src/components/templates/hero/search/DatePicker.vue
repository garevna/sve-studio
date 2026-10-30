<script setup lang="ts">
  // import type { ComputedRef, Ref } from 'vue'
  import type { ISODateModel } from '@/types/DateModels'
  // import { storeToRefs } from 'pinia'

  import { storeToRefs } from 'pinia'

  // import { getAllowedDates } from '@/services/search/get-allowedDates.ts'

  import { computed, nextTick, onMounted, ref } from 'vue'
  // import { getIntervalOfDates, getMinDate } from '@/utils'

  import { mockAllowedDates } from '@/configs/mock-allowed-dates'
  import { months } from '@/configs/months'
  import { daysOfWeek } from '@/configs/week-days'
  import { useCommonStore } from '@/stores/common'
  import { getIntervalOfDates } from '@/utils/date-formatting'
  import CustomSwitcher from './CustomSwitcher.vue'

  const { locale } = storeToRefs(useCommonStore())

  const intervalLabel = {
    uk: 'Обрати проміжок в 5 днів',
    en: 'Select a 5-day interval',
    de: '5-Tage-Intervall auswählen',
  }

  const weekDays = computed(() => {
    const result = []
    const translated = daysOfWeek[locale.value as keyof typeof daysOfWeek]
    for (let index = 0; index < 7; index++) {
      result.push(translated.short[index])
    }

    return result
  })

  // const weekDays = computed(() => [0, 1, 2, 3, 4, 5, 6].map((index: number) => weekDays[locale.value].short[${index}])))

  function getMonthName (index: number) {
    const translated = months[locale.value as keyof typeof months]
    return translated[index]
    // return t(`months[${index}]`)
  }

  const emit = defineEmits(['update-dates'])

  type PropsModel = {
    minDate?: ISODateModel
    direction?: 'direct' | 'back'
    initialDates: Date[]
  }

  const interval = ref(false)

  const props = defineProps<PropsModel>()

  const button = ref<HTMLButtonElement | null>(null)

  const selectedDate = ref<Date | null>(null)

  // const minDate: ComputedRef<string> = computed(() => props.minDate || getMinDate())
  const minDate = computed(() => props.minDate || new Date().toISOString())

  const currentMonth = ref(new Date(minDate.value).getMonth())
  const currentYear = ref(new Date(minDate.value).getFullYear())

  const rawDates = ref(props.initialDates)

  const availableDates = ref<string[]>([])

  const currentMonthDates = computed({
    get: () => rawDates.value.filter(date => date.getFullYear() == currentYear.value && date.getMonth() === currentMonth.value),
    set: () => {},
  })

  const currentMonthName = computed(() => getMonthName(currentMonth.value))

  const monthNamePlaceholder = ref<HTMLElement | null>(null)

  function addElem (container: HTMLElement) {
    // eslint-disable-next-line unicorn/prefer-dom-node-append
    return container.appendChild(document.createElement('div'))
  }

  onMounted(async () => {
    rawDates.value = props.initialDates
    currentMonth.value = (rawDates.value[0] || new Date(minDate.value)).getMonth()
    currentYear.value = (rawDates.value[0] || new Date(minDate.value)).getFullYear()

    // ajax.setGlobalProgress(false)

    await getAvailableDates()

    // ajax.setGlobalProgress(true)

    monthNamePlaceholder.value = document.querySelector('.v-date-picker-controls > .v-btn:first-child') as HTMLElement

    const controlsContainer = document.querySelector('.v-date-picker-controls') as HTMLElement

    const weekDaysContainer = controlsContainer ? addElem(controlsContainer) : null
    if (weekDaysContainer) {
      weekDaysContainer.className = 'custom-week-days v-date-picker-month'
      const weekDaysElems = addElem(weekDaysContainer)
      if (weekDaysElems) {
        weekDaysElems.className = 'v-date-picker-month__days custom-week-days'
        for (const weekDay of weekDays.value) {
          const day = addElem(weekDaysElems)
          if (day) {
            day.className = 'v-date-picker-month__day v-date-picker-month__day-btn'
            day.textContent = weekDay ?? ''
          }
        }
      }
    }
    setTitle()
    nextTick(setStyle)
  })

  // Picking a day is what puts the remaining palette colours on screen:
  // selected-date-first-* on the day itself, selected-dates-* on the four
  // that follow it once the 5-day switch is on. Production's own logic,
  // with its duplicate emit dropped - it sent the same list twice.
  function updateDates () {
    if (!selectedDate.value) {
      return
    }

    resetStyle()
    rawDates.value = interval.value ? getIntervalOfDates(selectedDate.value) : [selectedDate.value]
    emit('update-dates', rawDates.value)
  }

  function setSelectedDate (selected: Date | Date[] | null) {
    if (!selected) {
      return
    }

    selectedDate.value = Array.isArray(selected) ? selected[0] || null : selected

    updateDates()
    nextTick(setStyle)
  }

  function switchDateSelectionMode () {
    rawDates.value = []
    resetStyle()
    nextTick(setAvailableDates)
  }

  function setTitle () {
    if (monthNamePlaceholder.value) {
      monthNamePlaceholder.value.textContent = currentMonthName.value + ' ' + currentYear.value
    }
  }

  function setAvailableDates () {
    for (const date of availableDates.value) {
      const elem = document.querySelector(`div[data-v-date="${date}"] > button`)
      if (elem) elem.className = 'v-btn v-btn--icon v-theme--colorScheme v-btn--density-default v-btn--size-default v-btn--variant-text v-date-picker-month__day-btn available-date'
    }
  }

  // Production asks /booking/city-dates for the open month and keeps only
  // `date` out of each record (services/search/get-allowedDates.ts); the
  // records here are generated instead of fetched, for the reason spelled
  // out in configs/mock-allowed-dates.ts, but nothing else about this
  // changes - same shape in, same mapping, same marking pass after it.
  async function getAvailableDates () {
    availableDates.value = mockAllowedDates(currentMonth.value, currentYear.value)
      .map(record => record.date)
    // After the render, not before it: setAvailableDates() finds day cells by
    // `data-v-date` and marks them by hand, so the month it marks has to be
    // on screen already. Production gets that for free - it awaits an HTTP
    // round trip first - but these dates arrive synchronously, in the same
    // tick the month changed, and without this the new month came up unmarked.
    await nextTick()
    setAvailableDates()
  }

  async function monthUpdateHandler (val: number) {
    currentMonth.value = val
    setTitle()
    await getAvailableDates()
    setStyle()
  }

  function yearUpdateHandler (val: number) {
    currentYear.value = val
    setTitle()
  }

  // The first day of the range, in its own two palette colours. Written with
  // setProperty(..., 'important') rather than production's
  // `style.backgroundColor = 'var(--...)!important'`: the CSSOM rejects a
  // value carrying !important when it is assigned through a camelCase style
  // property, silently, so that line sets nothing at all and the day keeps
  // the range's own colour. Confirmed in the browser - the button came out
  // with no style attribute whatsoever. The `important` is needed on top of
  // that, because date-picker.css paints every selected day with
  // --selected-dates-fone-color !important.
  function setStyle () {
    button.value = document.querySelector('.v-date-picker-month__day--selected button')
    if (button.value instanceof HTMLButtonElement) {
      button.value.style.backgroundColor = 'var(--selected-date-first-fone-color)!important'
      button.value.style.color = 'var(--selected-date-first-text-color)!important'
    }
  }

  function resetStyle () {
    if (!button.value) return
    if (button.value instanceof HTMLButtonElement) {
      button.value.style = ''
    }
    button.value = null
    setAvailableDates()
  }
</script>

<template>
  <v-card class="date-picker-card">
    <v-date-picker
      v-model="currentMonthDates"
      class="custom-date-picker mx-auto"
      color="primary"
      control-variant="modal"
      :first-day-of-week="1"
      hide-header
      :locale="locale"
      :min="minDate"
      :month="currentMonth"
      :multiple="interval"
      next-icon="mdi-arrow-right"
      prev-icon="mdi-arrow-left"
      :year="currentYear"
      @update:model-value="setSelectedDate($event)"
      @update:month="monthUpdateHandler"
      @update:year="yearUpdateHandler"
    >
      <template #header />
      <template #title />
      <!-- <template #actions>
        <v-progress-linear :active="loading" class="mb-4" color="primary" indeterminate />
      </template> -->
    </v-date-picker>

    <v-card-actions class="checkbox-containter">
      <CustomSwitcher
        v-model="interval"
        :label="intervalLabel[locale as keyof typeof intervalLabel]"
        @update:model-value="switchDateSelectionMode"
      />
    </v-card-actions>
  </v-card>
</template>

<!-- <style>
.custom-date-picker {
  width: 100%;
}

.first-selected {
  background-color: var(--primary) !important;
  color: var(--white) !important;
}
.active {
  color: var(--primary);
}

.not-active {
  color: var(--grey);
}

.available-date {
  background: var(--available-date-fone-color) !important;
}

.custom-week-days {
  grid-area: week-days;
  width: calc(100% + 16px);
  margin-top: 8px;
  justify-content: center;
}

.checkbox-containter {
  display: grid;
  justify-content: center;
  margin-top: -36px;
}

.description {
  border-radius: var(--extra-small-border-radius);
  background: var(--light-grey);
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 400;
}
</style>

<style>
.v-date-picker-controls {
  background: var(--light-blue);
  margin-bottom: 16px;
}

.custom-date-picker .v-date-picker-controls > .v-btn:first-child {
  color: var(--black);
  font-size: 18px;
  font-weight: 600;
}
.custom-date-picker .v-date-picker-controls > .v-btn:first-child:disabled {
  color: var(--black) !important;
}
.custom-date-picker  .v-date-picker-month {
  margin-bottom: 24px;
}

.custom-date-picker .v-date-picker-controls > .v-btn:nth-child(2) {
  display: none;
}

.custom-date-picker .v-date-picker-controls {
  display: grid !important;
  grid-template-columns: 1fr 1fr 96px !important;
  grid-template-rows: 1fr 1fr !important;
  grid-template-areas:
    'month-name spacer buttons'
    'week-days week-days week-days';
  justify-items: start;
}

.v-date-picker-controls > *:nth-child(4) {
  color: var(--primary);
}

.custom-date-picker .v-date-picker-month__weekday {
  opacity: 0;
}

.custom-date-picker .v-btn--variant-outlined {
  border: var(--light-border);
  background: var(--soft-grey);
}

.custom-date-picker .v-btn--variant-outlined:disabled {
  opacity: 0.7;
}

.custom-date-picker .v-btn--variant-text {
  color: var(--primary);
  font-weight: 800;
}

.v-date-picker-month__day .v-btn.v-date-picker-month__day-btn {
  /* border-radius: var(--super-small-border-radius) !important; */
  height: 36px;
  width: 36px;
  font-size: 16px !important;
}

.v-date-picker-month__day--selected .v-btn.v-date-picker-month__day-btn {
  background: var(--selected-dates-fone-color) !important;
  color: var(--selected-dates-text-color) !important;
}

.v-date-picker-month__day--selected .v-btn.v-date-picker-month__day-btn:disabled,
.v-date-picker-month__day--selected .v-btn--disabled {
  background: transparent !important;
  color: var(--grey) !important;
  opacity: 1;
}

.v-date-picker-month__day--selected .v-btn.v-date-picker-month__day-btn:disabled .v-btn__overlay {
  opacity: 0;
}

[data-testid="prev-month"]:disabled {
  opacity: 0;
}
</style> -->
