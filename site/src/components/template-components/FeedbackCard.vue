<script setup lang="ts">
  import type { ContactVia } from '../../services/messages/types'

  import type { TranslatedModel } from '../../types/common'
  import { storeToRefs } from 'pinia'

  import { computed, ref } from 'vue'
  import { FEEDBACK_CONTACT, FEEDBACK_FIELD_LABELS, FEEDBACK_STATUS, feedbackFormKind } from '../../configs/feedback-forms'
  import { useAuthStore } from '../../stores/auth'
  import { useCommonStore } from '../../stores/common'
  import { useMessagesStore } from '../../stores/messages'
  import { sendFeedback } from '../../utils/feedback-transport'
  import ContactWayInput from '../inputs/ContactWayInput.vue'
  import PhoneNumberInput from '../inputs/PhoneNumberInput.vue'

  // The feedback form - in the footer, as a block on a page and in a
  // button's popup. Which fields it asks for depends on its kind (callback,
  // message, question, quote, booking, review, subscription - see
  // configs/feedback-forms.ts).
  const { locale, feedbackEndpoint } = storeToRefs(useCommonStore())
  // A signed-in visitor's message is kept in their account, and the reply
  // comes back there (stores/messages).
  const auth = useAuthStore()
  const messages = useMessagesStore()

  type PropsModel = {
    type?: string
    title: TranslatedModel | string
    text: TranslatedModel | string
    titleClass?: string
    textClass?: string
    // In a popup (PopupHost.vue): the popup's frame has the title; the
    // text and the fields go into its body, the button into its row of
    // buttons, in the look all popups share (`buttonClass`).
    framed?: boolean
    buttonClass?: string
  }

  const props = defineProps<PropsModel>()
  // close: "Закрити" after a popup's form was sent.
  const emit = defineEmits<{ sent: [], close: [] }>()

  type Lang = 'uk' | 'en' | 'de'
  const lang = computed(() => locale.value as Lang)
  const titleText = computed(() => (typeof props.title === 'string' ? props.title : props.title?.[lang.value]))
  const bodyText = computed(() => (typeof props.text === 'string' ? props.text : props.text?.[lang.value]))

  const kind = computed(() => feedbackFormKind(props.type))
  const has = (field: string) => kind.value.fields.includes(field as never)
  // A way back to the visitor, a messenger first - people answer those.
  // It takes the place of the e-mail and, in a form with a message, of the
  // phone too. A subscription stays about e-mail, a call request about the
  // phone.
  const asksContact = computed(() => (has('email') && kind.value.id !== 'subscribe') || (has('phone') && has('message')))
  // A kind may offer only some of the ways (a message or question: Telegram
  // or e-mail).
  const contactWays = computed(() => FEEDBACK_CONTACT.ways.filter(way => !kind.value.contactWays || kind.value.contactWays.includes(way.via)))
  const contactVia = ref<ContactVia>('telegram')
  const contactValue = ref('')
  const contactWay = computed(() => contactWays.value.find(way => way.via === contactVia.value) ?? contactWays.value[0]!)

  const userName = ref('')
  const userPhone = ref('(+380)')
  const userEmail = ref('')
  const userDate = ref('')
  const userRating = ref(0)
  const userMessage = ref('')
  const website = ref('')

  // Sent through whatever the site's settings name (utils/feedback-transport.ts);
  // the form itself doesn't know who receives it.
  type Status = 'idle' | 'sending' | 'sent' | 'sentToAccount' | 'failed' | 'notConfigured' | 'empty' | 'phoneRequired' | 'messageRequired' | 'contactRequired'
  const status = ref<Status>('idle')
  const statusText = computed(() => (status.value === 'idle' ? '' : FEEDBACK_STATUS[status.value][lang.value]))
  const done = computed(() => props.framed && (status.value === 'sent' || status.value === 'sentToAccount'))
  const sendClass = computed(() => props.framed ? (props.buttonClass || 'primary-button') : 'primary-button mt-6')
  const CLOSE = { uk: 'Закрити', en: 'Close', de: 'Schließen' }

  async function submit () {
    const phone = has('phone') && !asksContact.value && (userPhone.value.match(/\d/g) || []).length >= 7 ? userPhone.value : ''
    const contact = asksContact.value && contactValue.value.trim() ? { via: contactWay.value.via, value: contactValue.value.trim() } : null
    const email = has('email') && !asksContact.value ? userEmail.value.trim() : (contact?.via === 'email' ? contact.value : '')
    // A call request needs the number to call; a message or question needs
    // the message and a way back (a signed-in visitor gets the reply in the
    // account).
    if (kind.value.requires === 'phone' && !phone) {
      status.value = 'phoneRequired'
      return
    }
    if (kind.value.requires === 'message-and-contact') {
      if (!userMessage.value.trim()) {
        status.value = 'messageRequired'
        return
      }
      if (!contact && !auth.user) {
        status.value = 'contactRequired'
        return
      }
    }
    if (!userMessage.value.trim() && !phone && !email && !contact) {
      status.value = 'empty'
      return
    }
    status.value = 'sending'
    const name = userName.value.trim() || auth.user?.name || ''
    // Signed in: kept in the account first, so a reply finds its way back.
    const messageId = auth.user && has('message') && userMessage.value.trim()
      ? await messages.create({
        name,
        email: auth.user.email,
        contact,
        kind: kind.value.id,
        text: userMessage.value.trim(),
        page: typeof location === 'undefined' ? '' : location.pathname,
        locale: lang.value,
      })
      : null
    const result = await sendFeedback(feedbackEndpoint.value, {
      messageId: messageId ?? undefined,
      kind: kind.value.id,
      locale: lang.value,
      page: typeof location === 'undefined' ? '' : location.pathname,
      fields: {
        name: has('name') ? name : undefined,
        phone: has('phone') ? phone : undefined,
        email: email || (auth.user?.email ?? undefined),
        contact: contact ?? undefined,
        date: has('date') ? userDate.value : undefined,
        rating: has('rating') ? userRating.value : undefined,
        message: has('message') ? userMessage.value : undefined,
      },
      website: website.value,
    })
    status.value = result === 'sent' ? (messageId ? 'sentToAccount' : 'sent') : (result === 'not-configured' ? 'notConfigured' : 'failed')
    if (result === 'sent') {
      emit('sent')
      userName.value = ''
      userPhone.value = '(+380)'
      userEmail.value = ''
      contactValue.value = ''
      userDate.value = ''
      userRating.value = 0
      userMessage.value = ''
    }
  }
</script>

<template>
  <!-- In a popup: the frame's body and its row of buttons. -->
  <template v-if="props.framed">
    <div class="pw-popup__body">
      <template v-if="done">
        <i aria-hidden="true" class="pw-popup__icon mdi mdi-checkbox-marked-circle-outline" />
        <p class="pw-popup__text" role="status">{{ statusText }}</p>
      </template>
      <template v-else>
        <p v-if="bodyText" :class="['pw-popup__text', props.textClass, { 'pw-popup__text--own': !!props.textClass }]">{{ bodyText }}</p>
        <div class="feedback-fields">
          <v-text-field
            v-if="has('name') && !auth.user"
            v-model="userName"
            hide-details
            icon-color="primary"
            :placeholder="FEEDBACK_FIELD_LABELS.name[lang]"
            prepend-icon="mdi-account-outline"
            variant="plain"
          />
          <phone-number-input
            v-if="has('phone') && !asksContact"
            v-model="userPhone"
            :valid-phone-number="true"
          />
          <div v-if="asksContact" class="feedback-contact">
            <p class="small-text text-grey">{{ auth.user ? FEEDBACK_CONTACT.signedIn[lang] : FEEDBACK_CONTACT.label[lang] }}</p>
            <ContactWayInput v-model="contactValue" v-model:via="contactVia" :lang="lang" :ways="contactWays" />
          </div>
          <v-text-field
            v-if="has('email') && !asksContact"
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
        <p v-if="statusText && status !== 'sending'" class="pw-popup__error" role="status">{{ statusText }}</p>
      </template>
    </div>
    <div class="pw-popup__actions">
      <v-btn v-if="done" :class="sendClass" :text="CLOSE[lang]" @click="emit('close')" />
      <v-btn
        v-else
        :class="sendClass"
        :disabled="status === 'sending'"
        :loading="status === 'sending'"
        :text="kind.button[lang]"
        @click="submit"
      />
    </div>
  </template>
  <div v-else class="footer-feedback-card">
    <p v-if="titleText" :class="['h4 text-bold', props.titleClass || 'text-black']">
      {{ titleText }}
    </p>
    <p v-if="bodyText" :class="['small-text text-medium my-4', props.textClass || 'text-grey']">
      {{ bodyText }}
    </p>
    <div class="feedback-fields">
      <v-text-field
        v-if="has('name') && !auth.user"
        v-model="userName"
        hide-details
        icon-color="primary"
        :placeholder="FEEDBACK_FIELD_LABELS.name[lang]"
        prepend-icon="mdi-account-outline"
        variant="plain"
      />
      <phone-number-input
        v-if="has('phone') && !asksContact"
        v-model="userPhone"
        :valid-phone-number="true"
      />
      <div v-if="asksContact" class="feedback-contact">
        <p class="small-text text-grey">{{ auth.user ? FEEDBACK_CONTACT.signedIn[lang] : FEEDBACK_CONTACT.label[lang] }}</p>
        <ContactWayInput v-model="contactValue" v-model:via="contactVia" :lang="lang" :ways="contactWays" />
      </div>
      <v-text-field
        v-if="has('email') && !asksContact"
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
      :class="sendClass"
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
.feedback-contact {
  display: grid;
  gap: 8px;
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
