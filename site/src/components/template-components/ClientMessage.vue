<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { ref } from 'vue'
  import { useCommonStore } from '../../stores/common'

  // import type { ClientMessageModel } from '../../types/FeedbackModel'

  // import PhoneNumberInput from '@/components/inputs/PhoneNumberInput.vue'

  // import { requestParams } from '@/composables/request-params/feedback'
  // import { useAjaxStore } from '@/stores/ajax'

  // const ajax = useAjaxStore()

  const userName = ref('')
  const phoneNumber = ref('')
  const message = ref('')

  // async function sendMessage () {
  //   const data: ClientMessageModel = {
  //     subject: 'message',
  //     name: userName.value,
  //     phone: phoneNumber.value,
  //     email: 'client@noreply.ua',
  //     company: '',
  //     message: message.value,
  //   }
  //   await ajax.sendRequest(requestParams.message(data))
  // }

  const { locale } = storeToRefs(useCommonStore())

  const title = {
    uk: 'Маєте питання або пропозицію?',
    en: 'Do you have any questions or suggestions?',
    de: 'Haben Sie Fragen oder Anregungen?',
  }
  const text1 = {
    uk: 'Ми завжди відкриті до зворотного зв’язку.',
    en: 'We are always open to feedback.',
    de: 'Wir sind immer offen für Feedback.',
  }
  const text2 = {
    uk: 'Напишіть нам — відповімо якнайшвидше!',
    en: 'Write to us — we will respond as soon as possible!',
    de: 'Schreiben Sie uns – wir antworten so schnell wie möglich!',
  }

  const prompt = [
    {
      uk: 'Імʼя',
      en: 'Name',
      de: 'Name',
    },
    {
      uk: 'Ваше повідомлення',
      en: 'Your message',
      de: 'Ihre Nachricht',
    },
  ]

  const button = {
    uk: 'Надіслати',
    en: 'Send',
    de: 'Senden',
  }
</script>

<template>
  <v-card class="d-flex flex-wrap align-center justify-space-between pa-md-6 pa-sm-0 my-16" flat>
    <div class="w-md-50 w-sm-100 pa-8">
      <h2>
        {{ title[locale as keyof typeof title] }}
      </h2>
      <p class="default-text text-medium text-black mt-5">
        {{ text1[locale as keyof typeof text1] }}<br>
        {{ text2[locale as keyof typeof text2] }}
      </p>
    </div>
    <div class="w-md-50 w-sm-100 pa-5">
      <v-text-field
        v-model="userName"
        hide-details
        icon-color="primary"
        :placeholder="prompt[0]?.[locale as keyof typeof prompt[0]] || ''"
        prepend-icon="mdi-account-outline"
        variant="plain"
      />
      <PhoneNumberInput v-model="phoneNumber" class="mt-8" />

      <v-textarea
        v-model="message"
        auto-grow
        class="mt-12 mb-4"
        color="secondary"
        :label="prompt[1]?.[locale as keyof typeof prompt[1]] || ''"
        row-height="15"
        rows="5"
        variant="outlined"
      />

      <v-btn class="primary-button" :disabled="!userName || !phoneNumber || !message">
        {{ button[locale as keyof typeof button] }}
      </v-btn>
    </div>
  </v-card>
</template>
