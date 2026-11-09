<script setup lang="ts">
  import { computed, ref } from 'vue'
  import ukraineFlag from '@/assets/ukraine-flag.svg'
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
  }

  const props = defineProps<PropsModel>()

  const commonStore = useCommonStore()
  const lang = computed(() => commonStore.locale as 'uk' | 'en' | 'de')
  const kind = computed(() => feedbackFormKind(props.type))
  const has = (field: string) => kind.value.fields.includes(field as never)
  // As on the site: a messenger or e-mail to answer to takes the place of
  // the e-mail field, and in a form with a message of the phone too.
  const asksContact = computed(() => (has('email') && kind.value.id !== 'subscribe') || (has('phone') && has('message')))
  const contactVia = ref<string>(FEEDBACK_CONTACT.ways[0].via)
  const contactWay = computed(() => FEEDBACK_CONTACT.ways.find(way => way.via === contactVia.value) ?? FEEDBACK_CONTACT.ways[0])
</script>

<template>
  <div class="footer-feedback-card">
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
      <v-text-field
        v-if="has('phone') && !asksContact"
        hide-details
        placeholder="000 00 00 00"
        readonly
        variant="plain"
      >
        <template #prepend-inner>
          <!-- A static flag: this card has no working country picker. -->
          <span class="feedback-phone-prefix">
            <img alt="" class="feedback-phone-flag" :src="ukraineFlag">
            +380
          </span>
        </template>
      </v-text-field>
      <div v-if="asksContact" class="feedback-contact">
        <p class="small-text text-grey">{{ FEEDBACK_CONTACT.label[lang] }}</p>
        <div class="feedback-contact-ways" role="radiogroup">
          <button
            v-for="way of FEEDBACK_CONTACT.ways"
            :key="way.via"
            :aria-checked="contactVia === way.via"
            :class="['feedback-contact-way', { 'feedback-contact-way--on': contactVia === way.via }]"
            role="radio"
            type="button"
            @click="contactVia = way.via"
          >
            {{ way.name }}
          </button>
        </div>
        <v-text-field
          hide-details
          icon-color="primary"
          :placeholder="contactWay.placeholder[lang]"
          :prepend-icon="contactVia === 'email' ? 'mdi-email-outline' : 'mdi-message-reply-text-outline'"
          readonly
          variant="plain"
        />
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
.feedback-contact-ways {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.feedback-contact-way {
  padding: 6px 14px !important;
  border-radius: 999px !important;
  border: 1px solid var(--light-grey-1);
  font-size: 14px !important;
  color: var(--dark-grey);
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.feedback-contact-way--on {
  border-color: var(--secondary);
  background: var(--secondary);
  color: var(--white);
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
.feedback-phone-prefix {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  white-space: nowrap;
}
.feedback-phone-flag {
  width: 24px;
  height: 24px;
}
/* Vuetify puts a field's prepend-inner at the top of the row; centred, the
   flag and "+380" line up with the placeholder. */
:deep(.v-field__prepend-inner) {
  display: flex;
  align-items: center;
  padding-top: 0;
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
  .footer-feedback-card .feedback-fields .v-textarea .v-field__field {
    height: auto !important;
  }
}
</style>
