<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'

  // import { useCustomerStore } from '@/stores/customer'
  import { useCommonStore } from '../../stores/common'

  const userCurrency = (typeof localStorage === 'undefined' ? null : localStorage.getItem('currency')) || 'UAH'

  const currencySymbol = computed(() => userCurrency === 'UAH' ? 'mdi-currency-uah' : (userCurrency === 'USD' ? 'mdi-currency-usd' : 'mdi-currency-eur'))

  // const { currencySymbol, userCurrency } = storeToRefs(useCustomerStore())
  const { winSize } = storeToRefs(useCommonStore())

  const props = defineProps<{
    size: 28 | 24 | 20 | 18 | 16
    color?: 'special-grey' | 'dark-grey' | 'black' | 'primary' | 'white' | 'error'
  }>()
  // const size2 = computed(() => props.size === 28 ? 26 : props.size === 24 ? 22 : props.size === 20 ? 18 : 16 )
  // const size2 = computed(() => props.size - 2 )
  const size = computed(() => {
    if (winSize.value.width > 600) {
      return userCurrency === 'USD' ? props.size : props.size - 2
    } else {
      return userCurrency === 'USD' ? props.size - 3 : props.size - 5
    }
  })
</script>

<template>
  <v-icon :color="props.color || 'black'" :size="size" style="vertical-align: baseline;">
    {{ currencySymbol }}
  </v-icon>
</template>
