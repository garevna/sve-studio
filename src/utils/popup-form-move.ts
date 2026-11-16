import type { DockField, DockForm, DockText } from '@sve/dock'
import type { FormFieldModel, PopupModel, TemplateBlockModel } from '@/types/TemplateBlockModel'
import { CLIENT_FORM_ID } from '@sve/dock'
import { CLIENT_FORM_POPUP_ID } from '@/configs/default-popups'
import { POPUP_WORDS } from '@/configs/popup-kinds'

// Before "Форми" a form popup carried its own fields: "form-field" blocks
// in its middle. Each such popup's fields become one of the site's forms
// (forms.json) - named as the popup, sending to the site's channel as the
// popup did - and the popup only names it.

const ICONS: Partial<Record<FormFieldModel['input'], string>> = {
  text: 'mdi-form-textbox',
  email: 'mdi-email-outline',
  phone: 'mdi-phone-outline',
  number: 'mdi-numeric',
  textarea: 'mdi-message-text-outline',
  select: 'mdi-format-list-bulleted',
  date: 'mdi-calendar-outline',
}

const THANKS = {
  uk: 'Дякуємо! Повідомлення надіслано — відповімо найближчим часом.',
  en: 'Thank you! Your message has been sent — we’ll get back to you soon.',
  de: 'Danke! Ihre Nachricht wurde gesendet – wir melden uns in Kürze.',
}

// a translated text of the popup's, as a form's text
function words (value: unknown): DockText {
  return { ...(value as DockText | undefined) }
}

function fieldOf (block: TemplateBlockModel, key: string): DockField {
  const field: FormFieldModel = block.formField ?? { input: 'text' }
  const base = { key, label: words(field.label), ...(field.required ? { required: true } : {}) }
  const icon = ICONS[field.input]
  switch (field.input) {
    case 'checkbox': {
      return { ...base, kind: 'check' }
    }
    case 'select': {
      return { ...base, kind: 'choice', icon, options: (field.options ?? []).map(option => ({ value: option.value, label: words(option.label) })) }
    }
    case 'date': {
      return { ...base, kind: 'dates', icon, range: false }
    }
    case 'phone': {
      return { ...base, kind: 'text', icon, input: 'tel' }
    }
    case 'email':
    case 'number':
    case 'textarea': {
      return { ...base, kind: 'text', icon, input: field.input }
    }
    default: {
      return { ...base, kind: 'text', icon, input: 'text' }
    }
  }
}

function freeId (wanted: string, taken: Set<string>): string {
  let id = wanted || 'form'
  for (let index = 2; taken.has(id); index++) {
    id = `${wanted}-${index}`
  }
  taken.add(id)
  return id
}

// The form of a popup's own fields; null - it has none.
export function formOfPopup (popup: PopupModel, takenIds: Set<string>): DockForm | null {
  const blocks = (popup.content?.children ?? []).filter(child => child.type === 'form-field')
  if (blocks.length === 0) {
    return null
  }
  const keys = new Set<string>()
  const fields = blocks.map((block, index) => fieldOf(block, freeId(block.formField?.name?.trim() || `field-${index + 1}`, keys)))
  const wanted = popup.id === CLIENT_FORM_POPUP_ID ? CLIENT_FORM_ID : popup.id.replace(/^popup-/, '')
  return {
    id: freeId(wanted, takenIds),
    name: popup.name || wanted,
    layout: 'stack',
    fields,
    button: {
      label: { ...POPUP_WORDS.send, ...words(popup.okText) },
      action: 'channel',
      done: { ...THANKS },
    },
  }
}

// Every old form popup of the list moves its fields into `forms`; true -
// something moved (both lists changed in place).
export function movePopupForms (popups: PopupModel[], forms: DockForm[]): boolean {
  const taken = new Set(forms.map(form => form.id))
  let moved = false
  for (const popup of popups) {
    if (popup.kind !== 'form' || popup.form) {
      continue
    }
    const form = formOfPopup(popup, taken)
    if (!form) {
      continue
    }
    forms.push(form)
    popup.form = form.id
    popup.okText = undefined
    popup.content = { ...popup.content, children: (popup.content.children ?? []).filter(child => child.type !== 'form-field') }
    moved = true
  }
  return moved
}
