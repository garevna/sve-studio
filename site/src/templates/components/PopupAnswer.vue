<script setup lang="ts">
  import type { PopupCalendarModel, PopupModel } from '../../types/common'
  import type { PopupFormContext } from '../../utils/popup-form'
  import { storeToRefs } from 'pinia'
  import { computed, provide, reactive, ref } from 'vue'
  import { convertInput, defaultOkWords, POPUP_WORDS, popupButtons, popupKind } from '../../configs/popup-kinds'
  import { calendarProps } from '../../configs/popup-looks'
  import { useCommonStore } from '../../stores/common'
  import { sendFeedback } from '../../utils/feedback-transport'
  import { isEmptyAnswer, POPUP_FORM } from '../../utils/popup-form'
  import TemplateItem from '../TemplateItem.vue'

  // The middle and the buttons of every popup but a feedback form
  // (PopupHost.vue draws the frame around it): the text, then what the
  // popup is for, then its row of buttons, main first.
  //   message - the text, "OK" (an error message wears the error colour)
  //   confirm - the text, "Confirm" / "Cancel"             -> true / false
  //   prompt  - a field                                    -> its value
  //   select  - a list                                     -> the chosen value
  //   date    - a calendar                                 -> 'YYYY-MM-DD'
  //   form    - the client's own fields, sent to the site's channel
  //   content - the popup's blocks, no buttons
  const props = defineProps<{
    popup: PopupModel
    // the look every popup's buttons share (popups.json `buttons`)
    mainClass?: string
    secondClass?: string
    // the text's format (its look's, or its own)
    textClass?: string
    // a date popup's calendar (UI Kit "Календар")
    calendar?: PopupCalendarModel
    // what it was opened about (a card's title): shown, and sent with a form
    about?: string
  }>()
  const emit = defineEmits<{ answer: [value: unknown], cancel: [] }>()

  const { locale, defaultLocale, feedbackEndpoint } = storeToRefs(useCommonStore())
  type Lang = keyof typeof POPUP_WORDS.ok
  const lang = computed(() => (locale.value in POPUP_WORDS.ok ? locale.value : 'en') as Lang)
  function words (value: unknown, fallback = ''): string {
    const translated = value as Record<string, string> | undefined
    return translated?.[locale.value] || translated?.[defaultLocale.value] || fallback
  }

  const kind = computed(() => popupKind(props.popup))
  const text = computed(() => words(props.popup.text))
  const buttons = computed(() => popupButtons(kind.value))
  const okText = computed(() => words(props.popup.okText, defaultOkWords(kind.value)[lang.value]))
  const cancelText = computed(() => words(props.popup.cancelText, POPUP_WORDS.cancel[lang.value]))
  const mainClass = computed(() => props.mainClass || 'primary-button')
  const calendarBinding = computed(() => (props.calendar ? calendarProps(props.calendar) : calendarProps({ id: '', name: '', variant: 'simple' })))
  const secondClass = computed(() => props.secondClass || 'outlined-button')

  // --- what the visitor answers with
  const typed = ref('')
  const chosen = ref<string | null>(null)
  const date = ref<Date | null>(null)
  const problem = ref('')
  const options = computed(() => (props.popup.options ?? []).map(option => ({ value: option.value, title: words(option.label, option.value) })))
  const inputType = computed(() => {
    const format = props.popup.input?.format
    if (format === 'number' || format === 'integer') return 'number'
    if (format === 'email') return 'email'
    if (format === 'phone') return 'tel'
    return 'text'
  })
  const INPUT_ICONS: Record<string, string> = { text: 'mdi-form-textbox', number: 'mdi-numeric', integer: 'mdi-numeric', email: 'mdi-email-outline', phone: 'mdi-phone-outline' }

  // --- a client's own form: its fields report here (FormField.vue)
  const form: PopupFormContext = { values: reactive({}), fields: reactive({}), checked: ref(false) }
  provide(POPUP_FORM, form)
  const sending = ref(false)
  const sent = ref(false)

  function isoDate (value: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
  }

  async function sendForm () {
    form.checked.value = true
    const missing = Object.entries(form.fields).some(([key, field]) => field.required && isEmptyAnswer(form.values[key]))
    if (missing) {
      problem.value = POPUP_WORDS.requiredFields[lang.value]
      return
    }
    problem.value = ''
    sending.value = true
    // One message: "label: value" a line, as the channel shows any other.
    const lines = Object.entries(form.fields)
      .filter(([key]) => !isEmptyAnswer(form.values[key]))
      .map(([key, field]) => {
        const value = form.values[key]
        return `${field.label}: ${value === true ? '✓' : String(value)}`
      })
    const result = await sendFeedback(feedbackEndpoint.value, {
      kind: 'form',
      locale: locale.value,
      page: typeof location === 'undefined' ? '' : location.pathname,
      fields: { message: [props.about ? `«${props.popup.name}» — ${props.about}` : `«${props.popup.name}»`, ...lines].join('\n') },
    })
    sending.value = false
    if (result === 'sent') {
      sent.value = true
      return
    }
    problem.value = result === 'not-configured'
      ? { uk: 'Надсилання форм на цьому сайті ще не налаштоване.', en: 'Sending forms isn’t set up on this site yet.', de: 'Das Senden von Formularen ist auf dieser Website noch nicht eingerichtet.' }[lang.value]
      : { uk: 'Не вдалося надіслати. Спробуйте ще раз трохи згодом.', en: 'Couldn’t send it. Please try again a little later.', de: 'Senden fehlgeschlagen. Bitte versuchen Sie es etwas später noch einmal.' }[lang.value]
  }

  function ok () {
    switch (kind.value) {
      case 'message': {
        // nothing to answer: read and closed
        emit('cancel')
        return
      }
      case 'confirm': {
        emit('answer', true)
        return
      }
      case 'prompt': {
        const result = convertInput(props.popup.input, typed.value)
        if ('error' in result) {
          problem.value = POPUP_WORDS[result.error][lang.value]
          return
        }
        emit('answer', result.value)
        return
      }
      case 'select': {
        if (chosen.value === null) {
          problem.value = POPUP_WORDS.choose[lang.value]
          return
        }
        emit('answer', chosen.value)
        return
      }
      case 'date': {
        if (!date.value) {
          problem.value = POPUP_WORDS.choose[lang.value]
          return
        }
        emit('answer', isoDate(date.value))
        return
      }
      case 'form': {
        if (sent.value) {
          emit('answer', true)
          return
        }
        void sendForm()
      }
    }
  }

  function cancel () {
    // "Cancel" in a confirmation is an answer too: no.
    if (kind.value === 'confirm') {
      emit('answer', false)
      return
    }
    emit('cancel')
  }
</script>

<template>
  <!-- A date popup is its calendar: the calendar's strip is the window's header. -->
  <div :class="['pw-popup__body', { 'pw-popup__body--date': kind === 'date' }]">
    <template v-if="kind === 'form' && sent">
      <i aria-hidden="true" class="pw-popup__icon mdi mdi-checkbox-marked-circle-outline" />
      <p class="pw-popup__text" role="status">
        {{ { uk: 'Дякуємо! Повідомлення надіслано — відповімо найближчим часом.', en: 'Thank you! Your message has been sent — we’ll get back to you soon.', de: 'Danke! Ihre Nachricht wurde gesendet – wir melden uns in Kürze.' }[lang] }}
      </p>
    </template>
    <template v-else>
      <i
        v-if="kind === 'message'"
        aria-hidden="true"
        :class="['pw-popup__icon mdi', popup.tone === 'error' ? 'mdi-close-circle-outline' : 'mdi-checkbox-marked-circle-outline']"
      />
      <p v-if="text && kind !== 'date'" :class="['pw-popup__text', props.textClass, { 'pw-popup__text--own': !!props.textClass }]">{{ text }}</p>
      <p v-if="props.about" class="pw-popup__about">{{ props.about }}</p>

      <div v-if="kind === 'prompt'" class="pw-popup__answer">
        <v-textarea
          v-if="popup.input?.multiline && inputType === 'text'"
          v-model="typed"
          auto-grow
          autofocus
          :error="!!problem"
          hide-details
          :placeholder="words(popup.input?.placeholder) || words(popup.input?.label)"
          rows="3"
          variant="plain"
          @update:model-value="problem = ''"
        />
        <v-text-field
          v-else
          v-model="typed"
          autofocus
          :error="!!problem"
          hide-details
          icon-color="primary"
          :inputmode="popup.input?.format === 'integer' ? 'numeric' : (popup.input?.format === 'number' ? 'decimal' : undefined)"
          :placeholder="words(popup.input?.placeholder) || words(popup.input?.label)"
          :prepend-icon="INPUT_ICONS[popup.input?.format || 'text']"
          :type="inputType"
          variant="plain"
          @keydown.enter="ok"
          @update:model-value="problem = ''"
        />
      </div>
      <div v-else-if="kind === 'select'" class="pw-popup__answer">
        <v-select
          v-model="chosen"
          :error="!!problem"
          hide-details
          icon-color="primary"
          :items="options"
          :placeholder="words(popup.input?.placeholder, POPUP_WORDS.choose[lang])"
          prepend-icon="mdi-format-list-bulleted"
          variant="plain"
          @update:model-value="problem = ''"
        />
      </div>
      <div v-else-if="kind === 'date'" class="pw-popup__answer">
        <!-- month and day names in the site's language -->
        <v-locale-provider :locale="locale">
          <v-date-picker
            v-model="date"
            :class="calendarBinding.class"
            :color="calendarBinding.color"
            :control-variant="calendarBinding.controlVariant"
            :first-day-of-week="calendarBinding.firstDayOfWeek"
            header="—"
            :hide-header="calendarBinding.hideHeader"
            :next-icon="calendarBinding.nextIcon"
            :prev-icon="calendarBinding.prevIcon"
            show-adjacent-months
            :show-week="calendarBinding.showWeek"
            :style="calendarBinding.style"
            :title="words(popup.title)"
            :weekday-format="calendarBinding.weekdayFormat"
            @update:model-value="problem = ''"
          />
        </v-locale-provider>
      </div>
      <p v-if="text && kind === 'date'" :class="['pw-popup__text pw-popup__text--after', props.textClass, { 'pw-popup__text--own': !!props.textClass }]">{{ text }}</p>
      <template v-else-if="kind === 'form' || kind === 'content'">
        <template-item v-for="(child, index) of popup.content.children || []" :key="index" :item="child" />
      </template>
      <p v-if="problem" class="pw-popup__error" role="alert">{{ problem }}</p>
    </template>
  </div>
  <div v-if="buttons.length > 0" class="pw-popup__actions">
    <v-btn
      :class="mainClass"
      :loading="sending"
      :text="kind === 'form' && sent ? POPUP_WORDS.close[lang] : okText"
      @click="ok"
    />
    <v-btn
      v-if="buttons.includes('cancel')"
      :class="secondClass"
      :text="cancelText"
      @click="cancel"
    />
  </div>
</template>
