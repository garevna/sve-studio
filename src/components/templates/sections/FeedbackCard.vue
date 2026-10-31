<script setup lang="ts">
  import { computed } from 'vue'
  import ukraineFlag from '@/assets/ukraine-flag.svg'
  import { FEEDBACK_FIELD_LABELS, feedbackFormKind } from '@/configs/feedback-forms'
  import { useCommonStore } from '@/stores/common'
  // Editor-side picture of the site's FeedbackCard.vue - a visual clone,
  // not a working form: its fields are disabled. Title/text are edited in
  // FeedbackCardDialog.vue; the fields come from the form's kind
  // (configs/feedback-forms.ts), the same list the site draws from.
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
</script>

<template>
  <div class="footer-feedback-card">
    <p v-if="props.title" class="h4 text-bold text-black">{{ props.title }}</p>
    <p v-if="props.text" class="small-text text-medium my-4 text-grey">{{ props.text }}</p>
    <div class="feedback-fields">
      <v-text-field
        v-if="has('name')"
        disabled
        hide-details
        :placeholder="FEEDBACK_FIELD_LABELS.name[lang]"
        prepend-icon="mdi-account-outline"
        variant="plain"
      />
      <v-text-field
        v-if="has('phone')"
        disabled
        hide-details
        placeholder="000 00 00 00"
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
      <v-text-field
        v-if="has('email')"
        disabled
        hide-details
        :placeholder="FEEDBACK_FIELD_LABELS.email[lang]"
        prepend-icon="mdi-email-outline"
        variant="plain"
      />
      <v-text-field
        v-if="has('date')"
        disabled
        hide-details
        :placeholder="FEEDBACK_FIELD_LABELS.date[lang]"
        prepend-icon="mdi-calendar-outline"
        variant="plain"
      />
      <v-rating
        v-if="has('rating')"
        color="grey"
        density="comfortable"
        disabled
        :model-value="0"
      />
      <v-textarea
        v-if="has('message')"
        disabled
        hide-details
        :label="kind.messageLabel?.[lang]"
        rows="3"
        variant="outlined"
      />
    </div>
    <v-btn class="primary-button mt-6" disabled :text="kind.button[lang]" />
  </div>
</template>

<style scoped>
.feedback-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
