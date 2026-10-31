<script setup lang="ts">
  import type { TranslatedModel } from '../../types/common'

  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'

  import { FEEDBACK_FIELD_LABELS, feedbackFormKind } from '../../configs/feedback-forms'
  import { useCommonStore } from '../../stores/common'
  import PhoneNumberInput from '../inputs/PhoneNumberInput.vue'

  // The feedback form - in the footer, as a block on a page and in a
  // button's popup. Which fields it asks for depends on its kind (callback,
  // message, question, quote, booking, review, subscription - see
  // configs/feedback-forms.ts).
  const { locale } = storeToRefs(useCommonStore())

  type PropsModel = {
    type?: string
    title: TranslatedModel | string
    text: TranslatedModel | string
    titleClass?: string
    textClass?: string
  }

  const props = defineProps<PropsModel>()

  type Lang = 'uk' | 'en' | 'de'
  const lang = computed(() => locale.value as Lang)
  const titleText = computed(() => (typeof props.title === 'string' ? props.title : props.title?.[lang.value]))
  const bodyText = computed(() => (typeof props.text === 'string' ? props.text : props.text?.[lang.value]))

  const kind = computed(() => feedbackFormKind(props.type))
  const has = (field: string) => kind.value.fields.includes(field as never)

  const userName = ref('')
  const userPhone = ref('(+380)')
  const userEmail = ref('')
  const userDate = ref('')
  const userRating = ref(0)
  const userMessage = ref('')
</script>

<template>
  <div class="footer-feedback-card">
    <p v-if="titleText" :class="['h4 text-bold', props.titleClass || 'text-black']">
      {{ titleText }}
    </p>
    <p v-if="bodyText" :class="['small-text text-medium my-4', props.textClass || 'text-grey']">
      {{ bodyText }}
    </p>
    <div class="feedback-fields">
      <v-text-field
        v-if="has('name')"
        v-model="userName"
        hide-details
        icon-color="primary"
        :placeholder="FEEDBACK_FIELD_LABELS.name[lang]"
        prepend-icon="mdi-account-outline"
        variant="plain"
      />
      <phone-number-input
        v-if="has('phone')"
        v-model="userPhone"
        :valid-phone-number="true"
      />
      <v-text-field
        v-if="has('email')"
        v-model="userEmail"
        hide-details
        icon-color="primary"
        :placeholder="FEEDBACK_FIELD_LABELS.email[lang]"
        prepend-icon="mdi-email-outline"
        type="email"
        variant="plain"
      />
      <v-text-field
        v-if="has('date')"
        v-model="userDate"
        hide-details
        icon-color="primary"
        :label="FEEDBACK_FIELD_LABELS.date[lang]"
        prepend-icon="mdi-calendar-outline"
        type="date"
        variant="plain"
      />
      <v-rating
        v-if="has('rating')"
        v-model="userRating"
        active-color="primary"
        color="grey"
        density="comfortable"
        hover
      />
      <v-textarea
        v-if="has('message')"
        v-model="userMessage"
        auto-grow
        hide-details
        :label="kind.messageLabel?.[lang]"
        rows="3"
        variant="outlined"
      />
    </div>
    <v-btn class="primary-button mt-6" :text="kind.button[lang]" />
  </div>
</template>

<style scoped>
.feedback-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
