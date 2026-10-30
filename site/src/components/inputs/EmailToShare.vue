<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import { useCommonStore } from '@/stores/common'

  const { locale } = storeToRefs(useCommonStore())

  const emailPlaceholder = {
    uk: 'пошта',
    en: 'email',
    de: 'E-Mail',
  }

  const email = defineModel({ default: '' })

  const isEmailValid = computed(() => {
    return email.value ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) : false
  })
</script>

<template>
  <v-text-field
    v-model="email"
    clear-icon="mdi-close"
    clearable
    hide-details
    :icon-color="isEmailValid ? 'primary' : 'error'"
    :placeholder="emailPlaceholder[locale as keyof typeof emailPlaceholder]"
    prepend-icon="mdi-email-outline"
    type="email"
    variant="plain"
  />
</template>
