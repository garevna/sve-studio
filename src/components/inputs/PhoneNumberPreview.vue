<script setup lang="ts">
  import { computed } from 'vue'
  import ukraineFlag from '@/assets/ukraine-flag.svg'

  // The site's phone field (site/src/components/inputs/PhoneNumberInput.vue:
  // CountryCode + InputPhoneNumber) in the same markup and classes, so the
  // theme's own rules (content/styles/inputs.css) draw it exactly as on the
  // site. What the editor leaves out: the country list (Ukraine always) and
  // the input mask - the field takes digits, and marks the number as the
  // site does (a tick or a cross) once it looks like a whole one.
  const phone = defineModel<string>({ default: '' })
  const props = defineProps<{ readonly?: boolean }>()

  const valid = computed(() => phone.value.replace(/\D/g, '').length >= 9)

  function onInput (event: Event) {
    const input = event.target as HTMLInputElement
    input.value = input.value.replace(/\D/g, '').slice(0, 15)
    phone.value = input.value
  }
</script>

<template>
  <div class="phone-number-input">
    <div class="country-code-button d-flex align-center country-code">
      <div class="country-input">
        <img
          alt=""
          class="mr-2"
          height="32"
          :src="ukraineFlag"
          style="border-radius: 50%;"
          width="32"
        >
        <input class="country-text" placeholder="+380" readonly value="+380">
      </div>
    </div>
    <div :class="['input-phone-number', valid ? 'success-state' : 'error-state']">
      <input
        class="default-text text-medium text-black"
        inputmode="numeric"
        :readonly="props.readonly"
        :value="phone"
        @input="onInput"
      >
    </div>
  </div>
</template>

<style>
/* As the site's own components carry them (not in the theme files). */
.phone-number-input {
  display: grid;
  grid-template-columns: 140px 180px;
  align-items: center;
}
.phone-number-input .country-input {
  display: flex;
  align-items: center;
  cursor: text;
}
.phone-number-input .country-text {
  border: none;
  outline: none;
  width: 240px;
}
.phone-number-input .country-code {
  padding: 8px 0 8px 8px;
}
.phone-number-input .input-phone-number input {
  outline: none;
}
.phone-number-input .input-phone-number {
  display: grid;
  grid-template-columns: 160px 16px;
  height: 44px;
  padding-left: 12px;
}
.phone-number-input .input-phone-number.success-state::after,
.phone-number-input .input-phone-number.error-state::after {
  font-size: 20px;
  padding-top: 4px;
  margin-left: -16px;
}
.phone-number-input .input-phone-number.success-state::after {
  content: '✔';
  color: var(--success);
}
.phone-number-input .input-phone-number.error-state::after {
  content: '✖';
  color: var(--error);
}
</style>
