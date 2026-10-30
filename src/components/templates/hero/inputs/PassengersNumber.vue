<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'
  import { useCommonStore } from '@/stores/common'
  import SelectComponent from './SelectComponent.vue'

  const { locale } = storeToRefs(useCommonStore())

  const passengersLabel = {
    uk: 'Кількість пасажирів',
    en: 'Number of passengers',
    de: 'Anzahl der Passagiere',
  }

  const icon = 'mdi-account-group'

  const passengerTypes = [
    {
      id: 0,
      name: 'Дорослий',
      icon: 'mdi-account',
      isDefault: true,
    },
    {
      id: 1,
      name: 'Дитина',
      icon: 'mdi-baby-face-outline',
      isDefault: false,
    },
    {
      id: 2,
      name: 'Інвалід',
      icon: 'mdi-wheelchair',
      isDefault: false,
    },
    {
      id: 9,
      name: 'Військовий',
      icon: 'mdi-pistol',
      isDefault: false,
    },
  ]

  const passengers = ref([
    { type: 0 },
  ])

  // const icon = computed(() => activeTheme.value === 1 ? 'mdi-account' : 'mdi-account-group')

  const title = computed(() => {
    const res = []
    for (const passengerType of passengerTypes) {
      const numberOfPassengers = passengers.value.filter(passenger => passenger.type === passengerType.id).length
      if (numberOfPassengers > 0) {
        res.push(`${passengerType.name}: ${numberOfPassengers}`)
      }
    }
    return res.join(', ')
  })

  const passengersByType = computed(() => {
    const result = {}
    for (const type of passengerTypes) {
      Object.assign(result, { [type.id]: passengers.value.filter(passenger => passenger.type === type.id).length })
    }
    return result
  })

  function createPassenger (passengerType: number) {
    passengers.value.push({ type: passengerType })
  }
</script>

<template>
  <select-component>
    <template #button>
      <div class="d-flex align-center justify-space-between w-100">
        <v-icon class="mr-2" color="grey" :icon="icon" size="24" />
        <span class="button-text-elipsed">{{ title }}</span>
      </div>
    </template>

    <template #content>
      <div>
        <v-card-title class="search-panel-passengers-header mb-4">
          {{ passengersLabel[locale as keyof typeof passengersLabel] }}
        </v-card-title>
        <div class="search-panel-passengers">
          <template v-for="passengerType of passengerTypes" :key="passengerType.id">
            <div class="search-panel-passenger-type my-2">
              <v-icon class="mr-2" color="grey" :icon="passengerType.icon" size="20" />
              {{ passengerType.name }}
            </div>
            <v-icon
              class="icon-plus"
              :disabled="passengersByType[passengerType.id as keyof typeof passengersByType] === 0 || passengers.length === 1"
              size="large"
            >
              mdi-minus
            </v-icon>
            <span class="search-panel-passengers-number text-center">
              {{ passengersByType[passengerType.id as keyof typeof passengersByType] }}
            </span>
            <v-icon class="icon-plus" size="28" @click="createPassenger(passengerType.id)">mdi-plus</v-icon>
          </template>
        </div>
      </div>
    </template>
  </select-component>
</template>

<style scoped>
.search-panel-passengers {
  display: grid;
  grid-template-columns: 170px 30px 30px 30px;
  align-items: center;
  margin: 16px;
}
.search-panel-passengers-header {
  background: var(--bright-grey);
  height: 52px;
  border-radius: var(--default-border-radius) var(--default-border-radius) 0 0 !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  color: var(--primary);
}

.search-panel-passenger-type {
  font-size: 16px !important;
  font-weight: 600;
}

.search-panel-passengers-number {
  font-size: 14px;
  font-weight: 600;
}
.icon-plus {
  border-radius: 50%;
  background: var(--blue);
  color: white;
}
</style>
