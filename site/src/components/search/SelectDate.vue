<!-- eslint-disable unicorn/prefer-at -->
<script setup lang="ts">
  import type { ISODateModel } from '../../types/DateModels'
  import { storeToRefs } from 'pinia'
  import { computed, onMounted, ref } from 'vue'

  // import { useI18n } from 'vue-i18n'

  import { useCommonStore } from '@/stores/common'

  // import { useNavigationStore } from '@/stores/navigation'

  // import { useSearchStore } from '@/stores/search'
  import { formatDate } from '../../services/date-formatting'
  import DatePicker from './DatePicker.vue'

  // const searchStore = useSearchStore()

  // const { rawDatesFrom, rawDatesBack } = storeToRefs(searchStore)

  // const { currentRouteName } = storeToRefs(useNavigationStore())

  const { company, locale } = storeToRefs(useCommonStore())

  // const i18n = useI18n()

  // const locale = computed(() => i18n.locale.value)

  // const { locale } = useI18n()

  type PropsModel = {
    placeholder: string | 'home.top.tab1.forward'
    minDate?: ISODateModel
    direction?: 'direct' | 'back'
    disabled: boolean
  }

  const properties = defineProps<PropsModel>()

  const rawDatesFrom = ref([new Date()])
  const rawDatesBack = ref([new Date(Date.now() + 1000 * 60 * 60 * 24 * 10)])

  const rawDates = computed(() => properties.direction === 'direct' ? rawDatesFrom.value : rawDatesBack.value)

  const dates = ref<Date[]>([])

  const open = ref(false)
  const overlayVisible = computed(() => open.value)

  const tab1Label = {
    uk: { forward: 'Туди', back: 'Назад' },
    en: { forward: 'Forward', back: 'Back' },
    de: { forward: 'Weiter', back: 'Zurück' },
  }
  const buttonText = computed(() => {
    const direction = !properties.direction || properties.direction === 'direct' ? 'forward' : 'back'
    return tab1Label[locale.value as keyof typeof tab1Label][direction]
  })

  function refreshDates () {
    dates.value = [...rawDates.value]
  }

  const date = computed(() => {
    refreshDates()
    if (dates.value.length === 0) return ''
    const [startDate, endDate] = [dates.value[0] as Date, dates.value[dates.value.length - 1] as Date]
    if (dates.value.length === 1) return formatDate(startDate, locale.value).full

    return formatDate(startDate, locale.value).short + ' - ' + formatDate(endDate, locale.value).short
  })

  const minDate = computed<ISODateModel>(() => (properties.minDate || new Date().toISOString()) as ISODateModel)

  // The picked dates go back where refreshDates() reads them from, or the
  // caption silently reverts: `date` calls refreshDates() on every read, and
  // production closes that loop through the search store
  // (searchStore.updateDateFrom/updateDateBack, right here). This preview
  // has no such store - the two refs above stand in for it - so the write
  // has to land on them instead, otherwise every pick is overwritten by
  // rawDates' own starting value on the next render.
  function updateDates (result: Date[]) {
    if (properties.direction === 'direct') {
      rawDatesFrom.value = [...result]
    } else {
      rawDatesBack.value = [...result]
    }
    dates.value = [...result]
    open.value = false
  }

  onMounted(refreshDates)
</script>

<template>
  <v-menu
    v-model="open"
    :close-on-content-click="false"
    :disabled="properties.disabled"
    location="bottom center"
    location-strategy="connected"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        class="simple-menu-activator justify-start"
        :disabled="false"
        @click="open = true"
      >
        <template v-if="company?.icons && company.icons.calendarIcon">
          <template v-if="company.icons.calendarIcon.startsWith('mdi-')">
            <v-icon class="mr-2" color="primary" :size="28" style="opacity: 0.7">{{ company.icons.calendarIcon }}</v-icon>
          </template>
          <template v-else>
            <img class="mr-2" height="24" :src="company.icons.calendarIcon" width="32">
          </template>
        </template>
        <template v-else>
          <v-icon class="mr-2" color="primary" :size="28" style="opacity: 0.7">mdi-calendar-multiselect-outline</v-icon>
        </template>
        <span
          :class="['default-text text-thin', date ? 'text-black' : 'text-special']"
        >
          {{ date || buttonText }}
        </span>
      </v-btn>
    </template>

    <DatePicker
      :direction="properties.direction"
      :initial-dates="dates"
      :min-date="minDate"
      @update-dates="updateDates"
    />
    <v-overlay
      v-model="overlayVisible"
      absolute
      class="date-picker-overlay"
      :opacity="0.5"
      @click="open = false"
    />
  </v-menu>
</template>

<!-- <style scoped>
.date-picker-overlay {
  z-index: 1000 !important;
}
.simple-menu-activator {
  width: 320px;
  padding: 0 0 12px 0;
  /* margin-bottom: 24px; */
  border-bottom: var(--light-border);
  /* border-radius: 0 !important; */
  border-radius: var(--large-border-radius);
}
</style> -->
