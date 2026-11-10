import type { InjectionKey, Ref } from 'vue'
import type { FormFieldModel } from '@/types/TemplateBlockModel'

// The site's copy is site/src/utils/popup-form.ts - keep the two the same.
// In the editor nothing is sent: a preview only checks the fields.

// A client's own form (a 'form' popup): its "form-field" blocks put what the
// visitor filled in here, and the popup sends it all as one message
// (PopupAnswer.vue). A field outside such a form keeps its value to itself.
export interface PopupFormContext {
  values: Record<string, unknown>
  fields: Record<string, { label: string, required: boolean }>
  // set once "Send" was pressed with something missing
  checked: Ref<boolean>
}

export const POPUP_FORM: InjectionKey<PopupFormContext> = Symbol('popup-form')

// The field's key in the message: its own name, else its label.
export function formFieldKey (field: FormFieldModel | undefined, label: string): string {
  return field?.name?.trim() || label.trim() || 'field'
}

// Nothing given. A phone field starts as its country code alone, "(+380) ".
export function isEmptyAnswer (value: unknown): boolean {
  if (typeof value === 'string') {
    return !value.replace(/\(\+\d{1,4}\)/, '').trim()
  }
  return value === undefined || value === null || value === false
}

// Editor only: set inside a 'form' popup, where the insert menu of a
// "Довільний контент" column offers the form's fields (FreeContentInsertMenu.vue).
export const FORM_FIELDS_HERE: InjectionKey<Readonly<Ref<boolean>>> = Symbol('form-fields-here')
