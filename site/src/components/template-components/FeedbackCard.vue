<script setup lang="ts">
  import type { TranslatedModel } from '../../types/common'

  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'

  import { useCommonStore } from '../../stores/common'
  import PhoneNumberInput from '../inputs/PhoneNumberInput.vue'

  const { locale } = storeToRefs(useCommonStore())

  type PropsModel = {
    type?: 'call-request' | 'message'
    title: TranslatedModel | string
    text: TranslatedModel | string
    titleClass?: string
    textClass?: string
  }

  const props = defineProps<PropsModel>()

  const titleText = computed(() => (typeof props.title === 'string' ? props.title : props.title[locale.value as 'uk' | 'en' | 'de']))
  const bodyText = computed(() => (typeof props.text === 'string' ? props.text : props.text[locale.value as 'uk' | 'en' | 'de']))

  const userName = ref(' ')
  // const userEmail = ref('noreply@user.com')
  const userPhone = ref('(+380)')
  const userMessage = ref('')

  const propmt = {
    userName: {
      uk: 'Імʼя',
      en: 'First name',
      de: 'Vorname',
    },
    button: {
      uk: 'Замовити',
      en: 'Request',
      de: 'Bestellen',
    },
  }
</script>

<template>
  <div class="footer-feedback-card">
    <p :class="['h4 text-bold', props.titleClass || 'text-black']">
      {{ titleText }}
    </p>
    <p :class="['small-text text-medium my-4', props.textClass || 'text-grey']">
      {{ bodyText }}
    </p>
    <v-text-field
      v-model="userName"
      hide-details
      icon-color="primary"
      :placeholder="propmt.userName[locale as keyof typeof propmt.userName]"
      prepend-icon="mdi-account-outline"
      variant="plain"
    />
    <phone-number-input
      v-model="userPhone"
      class="my-4"
      :valid-phone-number="true"
    />
    <v-textarea
      v-if="props.type === 'message'"
      v-model="userMessage"
    />
    <v-btn class="primary-button mt-6" :text="propmt.button[locale as keyof typeof propmt.button]" />
  </div>
</template>
