<script setup lang="ts">
  import { ref, watch } from 'vue'
  import CountryCode from './CountryCode.vue'
  import InputPhoneNumber from './InputPhoneNumber.vue'

  const phoneNumber = defineModel<string>()
  const phoneValid = defineModel<boolean>('validPhoneNumber', { default: false })

  // const borderBottom = computed(() => phoneValid.value ? 'var(--light-border)' : '1px solid var(--error)')

  const props = defineProps({
    editable: {
      type: Boolean,
      default: true,
    },
  })

  const countryCode = ref('+380')
  const phone = ref('')

  function extractCountryCode (val: string) {
    const match = val.match(/\(\+[0-9]{1,4}\)/)
    return match ? match[0].slice(1, -1) : '+380'
  }

  function extractPhone (val: string) {
    const match = val.match(/\(\+[0-9]{1,4}\)/)
    return match ? val.replace(match[0], '').trim() : val
  }

  function updateModel () {
    const formatted = `(${countryCode.value}) ${phone.value}`.trim()
    if (formatted !== phoneNumber.value) {
      phoneNumber.value = formatted
    }
  }

  watch(
    phoneNumber,
    val => {
      const initial = val && val.trim() !== '' ? val : '(+380) '
      const code = extractCountryCode(initial) || '+380'
      const num = extractPhone(initial)

      if (code !== countryCode.value) countryCode.value = code
      if (num !== phone.value) phone.value = num
    },
    { immediate: true },
  )

  watch([countryCode, phone], () => {
    updateModel()
  })
</script>

<template>
  <div class="phone-number-input">
    <CountryCode v-model="countryCode" mode="phone" />
    <InputPhoneNumber
      v-model="phone"
      v-model:valid-phone-number="phoneValid"
      :dial-code="countryCode"
      :editable="props.editable"
    />
  </div>
</template>

<style>
.country-code {
  padding: 8px 0 8px 8px;
}
.phone-number-input {
  display: grid;
  grid-template-columns: 140px 180px;
  align-items: center;
  /* height: 48px;
  border-bottom: var(--light-border); */
}
</style>
