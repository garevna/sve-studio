<script setup lang="ts">
  import type { PopupCalendarModel, PopupModel } from '@/types/TemplateBlockModel'
  import type { PopupFormContext } from '@/utils/popup-form'
  import { computed, provide, reactive, ref } from 'vue'
  import SectionWithFreeContent from '@/components/editors/sections/SectionWithFreeContent.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { convertInput, defaultOkWords, POPUP_WORDS, popupButtons, popupKind } from '@/configs/popup-kinds'
  import { calendarProps } from '@/configs/popup-looks'
  import { useCommonStore } from '@/stores/common'
  import { resolveLocaleText } from '@/utils/locale-text'
  import { FORM_FIELDS_HERE, isEmptyAnswer, POPUP_FORM } from '@/utils/popup-form'

  // The editor's picture of the site's PopupAnswer.vue: the middle and the
  // buttons of every popup but a feedback form, in the same markup and
  // classes (content/styles/popups.css). Being edited, the buttons and the
  // field are only shown; in a preview they work - a field is checked, a
  // choice is made - and the window closes, but nothing is sent anywhere.
  // A form's or a content popup's blocks are a "Довільний контент" column.
  const props = defineProps<{
    popup: PopupModel
    mainClass?: string
    secondClass?: string
    textClass?: string
    calendar?: PopupCalendarModel
  }>()
  const emit = defineEmits<{ close: [] }>()
  const mode = useEditorMode()
  const commonStore = useCommonStore()

  type Lang = keyof typeof POPUP_WORDS.ok
  const lang = computed(() => (commonStore.locale in POPUP_WORDS.ok ? commonStore.locale : 'en') as Lang)
  function words (value: unknown, fallback = ''): string {
    return resolveLocaleText(value as PopupModel['title'], commonStore.locale) || fallback
  }

  const kind = computed(() => popupKind(props.popup))
  const text = computed(() => words(props.popup.text))
  const buttons = computed(() => popupButtons(kind.value))
  const okText = computed(() => words(props.popup.okText, defaultOkWords(kind.value)[lang.value]))
  const cancelText = computed(() => words(props.popup.cancelText, POPUP_WORDS.cancel[lang.value]))
  const mainClass = computed(() => props.mainClass || 'primary-button')
  const calendarBinding = computed(() => calendarProps(props.calendar ?? { id: '', name: '', variant: 'simple' }))
  const secondClass = computed(() => props.secondClass || 'outlined-button')

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

  const form: PopupFormContext = { values: reactive({}), fields: reactive({}), checked: ref(false) }
  provide(POPUP_FORM, form)
  // a form's column offers the form's fields to add
  provide(FORM_FIELDS_HERE, computed(() => kind.value === 'form'))
  const sent = ref(false)

  function ok () {
    if (mode.value === 'edit') return
    problem.value = ''
    switch (kind.value) {
      case 'prompt': {
        const result = convertInput(props.popup.input, typed.value)
        if ('error' in result) {
          problem.value = POPUP_WORDS[result.error][lang.value]
          return
        }
        break
      }
      case 'select': {
        if (chosen.value === null) {
          problem.value = POPUP_WORDS.choose[lang.value]
          return
        }
        break
      }
      case 'date': {
        if (!date.value) {
          problem.value = POPUP_WORDS.choose[lang.value]
          return
        }
        break
      }
      case 'form': {
        if (sent.value) break
        form.checked.value = true
        if (Object.entries(form.fields).some(([key, field]) => field.required && isEmptyAnswer(form.values[key]))) {
          problem.value = POPUP_WORDS.requiredFields[lang.value]
          return
        }
        // the site sends it here; the preview only says it would
        sent.value = true
        return
      }
    }
    emit('close')
  }
  function cancel () {
    if (mode.value !== 'edit') emit('close')
  }
</script>

<template>
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

      <div v-if="kind === 'prompt'" class="pw-popup__answer">
        <v-textarea
          v-if="popup.input?.multiline && inputType === 'text'"
          v-model="typed"
          auto-grow
          :error="!!problem"
          hide-details
          :placeholder="words(popup.input?.placeholder) || words(popup.input?.label)"
          :readonly="mode === 'edit'"
          rows="3"
          variant="plain"
        />
        <v-text-field
          v-else
          v-model="typed"
          :error="!!problem"
          hide-details
          icon-color="primary"
          :placeholder="words(popup.input?.placeholder) || words(popup.input?.label)"
          :prepend-icon="INPUT_ICONS[popup.input?.format || 'text']"
          :readonly="mode === 'edit'"
          :type="inputType"
          variant="plain"
          @keydown.enter="ok"
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
        />
      </div>
      <div v-else-if="kind === 'date'" class="pw-popup__answer">
        <!-- month and day names in the site's language -->
        <v-locale-provider :locale="commonStore.locale">
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
          />
        </v-locale-provider>
      </div>
      <p v-if="text && kind === 'date'" :class="['pw-popup__text pw-popup__text--after', props.textClass, { 'pw-popup__text--own': !!props.textClass }]">{{ text }}</p>
      <SectionWithFreeContent v-else-if="kind === 'form' || kind === 'content'" :class="{ 'popup-middle-blocks': mode !== 'edit' }" :section="popup.content" />
      <p v-if="problem" class="pw-popup__error" role="alert">{{ problem }}</p>
    </template>
  </div>
  <div v-if="buttons.length > 0" class="pw-popup__actions">
    <v-btn :class="mainClass" :text="kind === 'form' && sent ? POPUP_WORDS.close[lang] : okText" @click="ok" />
    <v-btn v-if="buttons.includes('cancel')" :class="secondClass" :text="cancelText" @click="cancel" />
  </div>
</template>

<style scoped>
/* An empty column keeps a place while being edited; a visitor sees only
   what is in it. */
.popup-middle-blocks {
  min-height: 0;
}
</style>
