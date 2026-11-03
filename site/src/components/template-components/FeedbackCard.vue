<script setup lang="ts">
  import type { TranslatedModel } from '../../types/common'

  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'

  import { FEEDBACK_FIELD_LABELS, FEEDBACK_STATUS, feedbackFormKind } from '../../configs/feedback-forms'
  import { useCommonStore } from '../../stores/common'
  import { sendFeedback } from '../../utils/feedback-transport'
  import PhoneNumberInput from '../inputs/PhoneNumberInput.vue'

  // The feedback form - in the footer, as a block on a page and in a
  // button's popup. Which fields it asks for depends on its kind (callback,
  // message, question, quote, booking, review, subscription - see
  // configs/feedback-forms.ts).
  const { locale, feedbackEndpoint } = storeToRefs(useCommonStore())

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
  const website = ref('')

  // Sent through whatever the site's settings name (utils/feedback-transport.ts);
  // the form itself doesn't know who receives it.
  type Status = 'idle' | 'sending' | 'sent' | 'failed' | 'notConfigured' | 'empty'
  const status = ref<Status>('idle')
  const statusText = computed(() => (status.value === 'idle' ? '' : FEEDBACK_STATUS[status.value][lang.value]))

  async function submit () {
    const phone = (userPhone.value.match(/\d/g) || []).length >= 7 ? userPhone.value : ''
    if (!userMessage.value.trim() && !phone && !userEmail.value.trim()) {
      status.value = 'empty'
      return
    }
    status.value = 'sending'
    const result = await sendFeedback(feedbackEndpoint.value, {
      kind: kind.value.id,
      locale: lang.value,
      page: typeof location === 'undefined' ? '' : location.pathname,
      fields: {
        name: has('name') ? userName.value : undefined,
        phone: has('phone') ? phone : undefined,
        email: has('email') ? userEmail.value : undefined,
        date: has('date') ? userDate.value : undefined,
        rating: has('rating') ? userRating.value : undefined,
        message: has('message') ? userMessage.value : undefined,
      },
      website: website.value,
    })
    status.value = result === 'sent' ? 'sent' : (result === 'not-configured' ? 'notConfigured' : 'failed')
    if (result === 'sent') {
      userName.value = ''
      userPhone.value = '(+380)'
      userEmail.value = ''
      userDate.value = ''
      userRating.value = 0
      userMessage.value = ''
    }
  }
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
        :placeholder="FEEDBACK_FIELD_LABELS.date[lang]"
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
        :placeholder="kind.messageLabel?.[lang]"
        rows="3"
        variant="plain"
      />
    </div>
    <!-- Hidden from people (and from screen readers); a bot fills it in. -->
    <input
      v-model="website"
      aria-hidden="true"
      autocomplete="off"
      class="feedback-trap"
      name="website"
      tabindex="-1"
      type="text"
    >
    <v-btn
      class="primary-button mt-6"
      :disabled="status === 'sending'"
      :loading="status === 'sending'"
      :text="kind.button[lang]"
      @click="submit"
    />
    <p v-if="statusText && status !== 'sending'" :class="['small-text mt-3', status === 'sent' ? 'text-success' : 'text-error']" role="status">
      {{ statusText }}
    </p>
  </div>
</template>

<style scoped>
.feedback-trap {
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  opacity: 0;
}
.feedback-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
/* The message field wears the theme's own field look (plain, like the
   others - no Vuetify outline). The theme fixes every field at 56px high,
   which a several-line field does not fit into. */
.feedback-fields :deep(.v-textarea .v-field__field) {
  height: auto !important;
}
.feedback-fields :deep(.v-text-field) {
  margin: 0;
}
</style>
