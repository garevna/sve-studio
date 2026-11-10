<script setup lang="ts">
  import type { FormFieldModel, TemplateBlockModel } from '../../types/common'
  import { storeToRefs } from 'pinia'
  import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
  import PhoneNumberInput from '../../components/inputs/PhoneNumberInput.vue'
  import { useCommonStore } from '../../stores/common'
  import { formFieldKey, isEmptyAnswer, POPUP_FORM } from '../../utils/popup-form'

  // One field of a client's own form (a "form-field" block in a 'form'
  // popup): in the same plain look as the feedback form's fields. What is
  // filled in goes into the form around it (utils/popup-form.ts), which
  // sends it all as one message.
  const props = defineProps<{ item: TemplateBlockModel }>()
  const { locale, defaultLocale } = storeToRefs(useCommonStore())
  const form = inject(POPUP_FORM, null)

  const field = computed<FormFieldModel>(() => props.item.formField ?? { input: 'text' })
  function text (value: unknown, lang: string): string {
    const words = value as Record<string, string> | undefined
    return words?.[lang] || words?.[defaultLocale.value] || ''
  }
  const label = computed(() => text(field.value.label, locale.value))
  const shownLabel = computed(() => (field.value.required ? `${label.value} *` : label.value))
  // The key in the message is the same whatever the visitor's language.
  const key = computed(() => formFieldKey(field.value, text(field.value.label, defaultLocale.value)))

  const ICONS: Record<FormFieldModel['input'], string> = {
    text: 'mdi-form-textbox',
    textarea: '',
    email: 'mdi-email-outline',
    phone: '',
    number: 'mdi-numeric',
    date: 'mdi-calendar-outline',
    select: 'mdi-format-list-bulleted',
    checkbox: '',
  }
  const options = computed(() => (field.value.options ?? []).map(option => ({ value: option.value, title: text(option.label, locale.value) || option.value })))

  const value = ref<unknown>(field.value.input === 'checkbox' ? false : (field.value.input === 'select' ? null : ''))
  const missing = computed(() => !!form?.checked.value && !!field.value.required && isEmptyAnswer(value.value))

  watch([key, value], ([now], [before]) => {
    if (!form) return
    if (before && before !== now) {
      delete form.values[before]
      delete form.fields[before]
    }
    form.values[now] = value.value
    form.fields[now] = { label: label.value || now, required: !!field.value.required }
  }, { immediate: true })
  onBeforeUnmount(() => {
    if (!form) return
    delete form.values[key.value]
    delete form.fields[key.value]
  })
</script>

<template>
  <!-- item.class: the gap below it, set in the editor between the
    column's elements (mb-N). -->
  <div :class="['pw-form-field', props.item.class, { 'pw-form-field--missing': missing }]">
    <v-textarea
      v-if="field.input === 'textarea'"
      v-model="value as string"
      auto-grow
      :error="missing"
      hide-details
      :placeholder="shownLabel"
      rows="3"
      variant="plain"
    />
    <div v-else-if="field.input === 'phone'" class="pw-form-field__phone">
      <PhoneNumberInput v-model="value as string" :valid-phone-number="!missing" />
      <span v-if="label" class="pw-form-field__label">{{ shownLabel }}</span>
    </div>
    <v-select
      v-else-if="field.input === 'select'"
      v-model="value"
      :error="missing"
      hide-details
      icon-color="primary"
      :items="options"
      persistent-placeholder
      :placeholder="shownLabel"
      :prepend-icon="ICONS.select"
      variant="plain"
    />
    <v-checkbox
      v-else-if="field.input === 'checkbox'"
      v-model="value"
      color="primary"
      :error="missing"
      hide-details
      :label="shownLabel"
    />
    <v-text-field
      v-else
      v-model="value as string"
      :error="missing"
      hide-details
      icon-color="primary"
      :placeholder="shownLabel"
      :prepend-icon="ICONS[field.input]"
      :type="field.input === 'text' ? 'text' : field.input"
      variant="plain"
    />
  </div>
</template>

<style scoped>
.pw-form-field :deep(.v-textarea .v-field__field) {
  height: auto !important;
}
.pw-form-field__phone {
  display: flex;
  flex-direction: column-reverse;
  gap: 4px;
}
.pw-form-field__label {
  font-size: 14px;
  color: var(--grey);
}
.pw-form-field--missing .pw-form-field__label {
  color: var(--error);
}
/* A field that must be filled in and was not, once "Send" was pressed. */
.pw-form-field--missing :deep(.v-input:not(.v-checkbox)) {
  border-radius: var(--large-border-radius);
  box-shadow: inset 0 0 0 1px var(--error);
}
.pw-form-field--missing :deep(.phone-number-input) {
  border-radius: var(--large-border-radius);
  box-shadow: inset 0 0 0 1px var(--error);
}
</style>
