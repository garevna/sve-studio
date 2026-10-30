<script setup lang="ts">
  import type { ISODateModel } from '@/types/DateModels'
  import { storeToRefs } from 'pinia'

  import { computed, ref } from 'vue'
  import { citiesForLocale } from '@/configs/mock-cities'

  import { useCommonStore } from '@/stores/common'
  import AutocompleteComponent from './inputs/AutocompleteComponent.vue'
  import PassengersNumber from './inputs/PassengersNumber.vue'
  import SelectDate from './search/SelectDate.vue'

  // Localised the way production localises it: the field receives plain
  // names for the current locale and nothing else, because that is all the
  // real component ever gets - the site refetches the whole list when the
  // language changes. See configs/mock-cities.ts.
  const listOfCities = computed(() => citiesForLocale(locale.value))

  const { locale } = storeToRefs(useCommonStore())

  const departurePointId = ref(91)
  const destinationPointId = ref(24)

  const emptyData = {
    uk: 'Немає даних',
    en: 'No data',
    de: 'Keine Daten',
  }

  const placeholderSearchFrom = {
    uk: 'Звідки',
    en: 'Where from',
    de: 'Woher',
  }

  const placeholderSearchTo = {
    uk: 'Куди',
    en: 'Where to',
    de: 'Wohin',
  }

  const checkboxLabel = {
    uk: 'Зворотній квиток',
    en: 'Return ticket',
    de: 'Rückflug',
  }

  const searchButtonText = {
    uk: 'Пошук',
    en: 'Search',
    de: 'Suchen',
  }

  // const panel = ref<0 | undefined>(undefined)

  const minDateBack = computed<ISODateModel>(() => {
    // const index = searchStore.rawDatesFrom.length > 1 ? 1 : (searchStore.rawDatesFrom.length === 1 ? 0 : -1)
    // const result = toISODateString(index >= 0 ? searchStore.rawDatesFrom[index] || new Date() : new Date()) as ISODateModel
    return new Date() as unknown as ISODateModel
  })

  const backTrip = ref(false)

  function switchPlaces () {
    ;[departurePointId.value, destinationPointId.value] = [destinationPointId.value, departurePointId.value]
  }

  // backTrip always mounts unchecked (it isn't persisted), so this also clears
  // any stale return date left in the (persisted) search store from an earlier
  // visit — otherwise a search could pick up a return leg the user never asked
  // for this time, e.g. after completing a booking or navigating back home.
  // watch(backTrip, checked => {
  //   if (!checked) {
  //     searchStore.updateDateBack([])
  //   }
  // }, { immediate: true })

  // const disabled = computed(() => !(route.name === 'dynamic-page' && route.params.pageId === 'home-page'))

  // const flexDirection = computed(() => backTrip.value ? 'column' : 'row')

  // async function searchForRouteVariants () {
  //   totalReset()
  //   panel.value = undefined
  //   await searchStore.searchForTrips()
  //   gotoRoute('direct-route-variants')
  // }

  // onBeforeMount(() => {
  //   if (passengerStore.passengers.length === 0) {
  //     createPassenger(0)
  //   }
  // })
</script>

<template>
  <div class="w-85 mt-16 mx-5">
    <div class="main-search-wrapper">
      <div class="route-select-panel">
        <AutocompleteComponent
          v-model="departurePointId"
          :empty-data="emptyData[locale as keyof typeof emptyData]"
          icon="mdi-map-marker"
          :items="listOfCities"
          :placeholder="placeholderSearchFrom[locale as keyof typeof placeholderSearchFrom]"
        />
        <v-icon
          class="grid-area-switch cursor-pointer"
          @click="switchPlaces"
        >mdi-swap-horizontal-bold</v-icon>
        <AutocompleteComponent
          v-model="destinationPointId"
          :empty-data="emptyData[locale as keyof typeof emptyData]"
          icon="mdi-map-marker"
          :items="listOfCities"
          :placeholder="placeholderSearchTo[locale as keyof typeof placeholderSearchTo]"
        />
      </div>
      <div class="dates-and-tickets">
        <div class="grid-area-date-from">
          <SelectDate
            direction="direct"
            :disabled="false"
            placeholder="search.forward"
          />
        </div>
        <div v-if="backTrip" class="grid-area-date-to">
          <SelectDate
            direction="back"
            :disabled="false"
            :min-date="minDateBack"
            placeholder="search.back"
          />
        </div>
        <div class="search-panel-tickets">
          <PassengersNumber />
        </div>
        <div class="search-panel-button">
          <v-btn
            class="primary-button search-button"
            :disabled="false"
          >
            {{ searchButtonText[locale as keyof typeof searchButtonText] }}
          </v-btn>
        </div>
      </div>
    </div>
    <div class="main-search-wrapper">
      <v-checkbox
        v-model="backTrip"
        class="back-route-checkbox ml-n2 mt-2"
        color="primary"
        :disabled="false"
        hide-details
        :label="checkboxLabel[locale as keyof typeof checkboxLabel]"
      />
    </div>
  </div>
</template>

<style>
.grid-area-switch {
  border-radius: 50%;
  background: var(--primary);
  border: solid 12px var(--primary);
  margin-right: 12px !important;
  color: var(--white);
  font-size: 40px !important;
  height: 56px;
  width: 56px;
  transition: background border-color .4s;
}
.grid-area-switch:hover {
  background: var(--secondary);
  border-color: var(--secondary);
}
/* .mdi-swap-horizontal, .mdi-swap-horizontal-bold {
  border-radius: 50%;
  border: solid 2px;
}

.mdi-swap-horizontal:hover, .mdi-swap-horizontal-bold:hover {
  color: var(primary);
} */

@media screen and (max-width: 710px) {
  .mdi-swap-horizontal, .mdi-swap-horizontal-bold {
    transform: rotate(90deg);
    margin-right: 0px !important;
  }
}
</style>
