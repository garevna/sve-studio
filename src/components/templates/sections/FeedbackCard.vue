<script setup lang="ts">
  import ukraineFlag from '@/assets/ukraine-flag.svg'
  // Editor-side preview of client-side's own FeedbackCard.vue - a visual
  // clone, not a functional one: the real component wires up useAuthStore/
  // ajaxStore.sendRequest/vue-i18n, none of which exist in this app (it has
  // no customer session or i18n runtime to preview against). Title/text are
  // the only genuinely editable parts (see FooterEditor.vue), so this only
  // needs to look right, not submit anything - the form fields below are
  // disabled for that reason, same convention as other editor-side previews
  // that can't be made fully functional (see memory on image-height gaps).
  type PropsModel = {
    type?: 'call-request' | 'message'
    title: string
    text: string
  }

  const props = defineProps<PropsModel>()
</script>

<template>
  <div class="footer-feedback-card">
    <p class="h4 text-bold text-black">{{ props.title }}</p>
    <p class="small-text text-medium my-4 text-grey">{{ props.text }}</p>
    <v-text-field
      disabled
      hide-details
      placeholder="Ім'я"
      prepend-icon="mdi-account-outline"
      variant="plain"
    />
    <v-text-field
      class="my-4"
      disabled
      hide-details
      placeholder="000 00 00 00"
      variant="plain"
    >
      <template #prepend-inner>
        <!-- The client-side's own ukraine-flag.svg, copied over as-is -
          already drawn as a circle (its clipPath rounds the corners to a
          full 12px radius), so nothing here has to crop it. Static on
          purpose: this card is a visual stand-in with no working country
          picker, so it needs neither production's flagcdn.com lookup nor a
          list to choose from. It replaces a 🇺🇦 emoji, which Windows has
          no flag glyphs for and rendered as the bare letters "UA". -->
        <span class="feedback-phone-prefix">
          <img alt="" class="feedback-phone-flag" :src="ukraineFlag">
          +380
        </span>
      </template>
      <template #append-inner>
        <v-icon color="error" icon="mdi-close" size="16" />
      </template>
    </v-text-field>
    <v-textarea v-if="props.type === 'message'" disabled hide-details placeholder="Повідомлення" />
    <v-btn class="primary-button mt-6" disabled text="Замовити" />
  </div>
</template>

<style scoped>
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
/* Vuetify aligns a field's prepend-inner to the TOP of the input row (the
   field's own density padding-top), which is fine for a bare icon but left
   a 24px flag and its "+380" sitting visibly below the placeholder they
   belong beside. Centring the slot lines all three up on one axis.
   Unlayered scoped rules outrank Vuetify's layered ones for normal
   declarations, so no !important is needed here. */
:deep(.v-field__prepend-inner) {
  display: flex;
  align-items: center;
  padding-top: 0;
}
/* The same row's trailing clear icon, for the same reason. */
:deep(.v-field__append-inner) {
  display: flex;
  align-items: center;
  padding-top: 0;
}
</style>
