<script setup lang="ts">
  import { computed, ref } from 'vue'
  import ContactWayInput from '@/components/inputs/ContactWayInput.vue'
  import PhoneNumberPreview from '@/components/inputs/PhoneNumberPreview.vue'
  import { FEEDBACK_CONTACT, FEEDBACK_FIELD_LABELS, feedbackFormKind } from '@/configs/feedback-forms'
  import { useCommonStore } from '@/stores/common'

  // Editor-side picture of the site's FeedbackCard.vue - the same fields in
  // the same order, so a preview (a page, a popup) shows what a visitor
  // gets; but it sends nothing. Fields are read-only rather than disabled,
  // so they keep the site's look; the way to be reached back can be
  // switched, as on the site. Title/text are edited in FeedbackCardDialog.vue;
  // the fields come from the form's kind (configs/feedback-forms.ts), the
  // same list the site draws from.
  type PropsModel = {
    type?: string
    title: string
    text: string
    // In a popup: the frame has the title; the text and the fields go into
    // its body, the button into its row of buttons (`buttonClass`, the look
    // all popups share) - as the site's FeedbackCard.vue does.
    framed?: boolean
    buttonClass?: string
    textClass?: string
  }

  const props = defineProps<PropsModel>()

  const commonStore = useCommonStore()
  const lang = computed(() => commonStore.locale as 'uk' | 'en' | 'de')
  const kind = computed(() => feedbackFormKind(props.type))
  const has = (field: string) => kind.value.fields.includes(field as never)
  // As on the site: a messenger or e-mail to answer to takes the place of
  // the e-mail field, and in a form with a message of the phone too.
  const asksContact = computed(() => (has('email') && kind.value.id !== 'subscribe') || (has('phone') && has('message')))
  // A kind may offer only some of the ways (a message or question:
  // Telegram or e-mail).
  const contactWays = computed(() => FEEDBACK_CONTACT.ways.filter(way => !kind.value.contactWays || kind.value.contactWays.includes(way.via)))
  const contactVia = ref<string>(FEEDBACK_CONTACT.ways[0].via)
  const contactValue = ref('')
</script>

<template>
  <template v-if="props.framed">
    <div class="pw-popup__body">
      <p v-if="props.text" :class="['pw-popup__text', props.textClass, { 'pw-popup__text--own': !!props.textClass }]">{{ props.text }}</p>
      <div class="feedback-fields">
        <v-text-field
          v-if="has('name')"
          hide-details
          icon-color="primary"
          :placeholder="FEEDBACK_FIELD_LABELS.name[lang]"
          prepend-icon="mdi-account-outline"
          readonly
          variant="plain"
        />
        <PhoneNumberPreview v-if="has('phone') && !asksContact" />
        <div v-if="asksContact" class="feedback-contact">
          <p class="small-text text-grey">{{ FEEDBACK_CONTACT.label[lang] }}</p>
          <ContactWayInput v-model="contactValue" v-model:via="contactVia" :lang="lang" :ways="contactWays" />
        </div>
        <v-text-field
          v-if="has('email') && !asksContact"
          hide-details
          icon-color="primary"
          :placeholder="FEEDBACK_FIELD_LABELS.email[lang]"
          prepend-icon="mdi-email-outline"
          readonly
          variant="plain"
        />
        <v-text-field
          v-if="has('date')"
          hide-details
          icon-color="primary"
          :placeholder="FEEDBACK_FIELD_LABELS.date[lang]"
          prepend-icon="mdi-calendar-outline"
          readonly
          variant="plain"
        />
        <v-rating
          v-if="has('rating')"
          active-color="primary"
          color="grey"
          density="comfortable"
          :model-value="0"
          readonly
        />
        <v-textarea
          v-if="has('message')"
          auto-grow
          hide-details
          :placeholder="kind.messageLabel?.[lang]"
          readonly
          rows="3"
          variant="plain"
        />
      </div>
    </div>
    <div class="pw-popup__actions">
      <v-btn :class="props.buttonClass || 'primary-button'" :text="kind.button[lang]" />
    </div>
  </template>
  <div v-else class="footer-feedback-card">
    <p v-if="props.title" class="h4 text-bold text-black">{{ props.title }}</p>
    <p v-if="props.text" class="small-text text-medium my-4 text-grey">{{ props.text }}</p>
    <div class="feedback-fields">
      <v-text-field
        v-if="has('name')"
        hide-details
        icon-color="primary"
        :placeholder="FEEDBACK_FIELD_LABELS.name[lang]"
        prepend-icon="mdi-account-outline"
        readonly
        variant="plain"
      />
      <PhoneNumberPreview v-if="has('phone') && !asksContact" />
      <div v-if="asksContact" class="feedback-contact">
        <p class="small-text text-grey">{{ FEEDBACK_CONTACT.label[lang] }}</p>
        <ContactWayInput v-model="contactValue" v-model:via="contactVia" :lang="lang" :ways="contactWays" />
      </div>
      <v-text-field
        v-if="has('email') && !asksContact"
        hide-details
        icon-color="primary"
        :placeholder="FEEDBACK_FIELD_LABELS.email[lang]"
        prepend-icon="mdi-email-outline"
        readonly
        variant="plain"
      />
      <v-text-field
        v-if="has('date')"
        hide-details
        icon-color="primary"
        :placeholder="FEEDBACK_FIELD_LABELS.date[lang]"
        prepend-icon="mdi-calendar-outline"
        readonly
        variant="plain"
      />
      <v-rating
        v-if="has('rating')"
        active-color="primary"
        color="grey"
        density="comfortable"
        :model-value="0"
        readonly
      />
      <v-textarea
        v-if="has('message')"
        auto-grow
        hide-details
        :placeholder="kind.messageLabel?.[lang]"
        readonly
        rows="3"
        variant="plain"
      />
    </div>
    <v-btn class="primary-button mt-6" :text="kind.button[lang]" />
  </div>
</template>

<style scoped>
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

<style>
/* In the editor the theme's field rules sit in the vuetify-app-styles
   layer (utils/load-scoped-vuetify-styles.ts), and a layered !important
   beats any unlayered one - so the "auto height" for the message field
   above lost to the theme's fixed 56px here, and the field's text hung
   above its box. An !important in an EARLIER layer wins over a later
   layer's, so the same rule is repeated in app-content. */
@layer app-content {
  .footer-feedback-card .feedback-fields .v-textarea .v-field__field,
  .pw-popup .v-textarea .v-field__field {
    height: auto !important;
  }
}
</style>
