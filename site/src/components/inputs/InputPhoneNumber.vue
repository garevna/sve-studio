<script setup lang="ts">
  import {
    isPossiblePhoneNumber,
    isValidPhoneNumber,
  } from 'libphonenumber-js'
  import { computed, watch } from 'vue'

  import { MaskInput } from 'vue-3-mask'

  import { simplifyPhoneNumber } from '../../services'

  /* Controlled v-model */
  const phoneNumber = defineModel<string>({ default: '' })
  const phoneValid = defineModel<boolean>('validPhoneNumber', { default: false })

  // const border = computed(() => phoneValid.value ? 'var(--light-border)' : '1px solid var(--error)')

  const props = defineProps({
    dialCode: {
      type: String,
      default: '+380',
    },
    editable: {
      type: Boolean,
      default: true,
    },
  })

  /* локальные состояния
   const countryCode = ref('+380')
   const phone = ref('')
*/

  /* маска */
  const phoneMask = computed(() => '#'.repeat(15))

  /* валидность */
  const phoneIsValid = computed(() => {
    const number = simplifyPhoneNumber(props.dialCode + phoneNumber.value || '')
    return (
      number.length > 9
      && isValidPhoneNumber(number)
      && isPossiblePhoneNumber(number)
    )
  })

  watch(phoneIsValid, (val: boolean) => {
    phoneValid.value = val
  })
</script>

<template>
  <div
    :class="[
      'input-phone-number',
      phoneIsValid ? 'success-state' : 'error-state'
    ]"
  >

    <MaskInput
      v-model="phoneNumber"
      class="default-text text-medium text-black"
      :disabled="!props.editable"
      :mask="phoneMask"
      :value="phoneNumber"
    />
  </div>
</template>

<style>
input {
  outline: none;
}

.input-phone-number {
  display: grid;
  grid-template-columns: 160px 16px;
  height: 44px;
  padding-left: 12px;
}
.input-phone-number.success-state::after,
.input-phone-number.error-state::after {
  font-size: 20px;
  padding-top: 4px;
  margin-left: -16px;
}
.input-phone-number.success-state::after {
  content: '✔';
  color: var(--success);
}
.input-phone-number.error-state::after {
  content: '✖';
  color: var(--error);
}
</style>
