import type { PopupInputModel, PopupKind, PopupModel } from '../types/common'

// What each kind of popup asks of a visitor, and the words its buttons and
// checks use where the client has not written their own. The editor's copy
// is src/configs/popup-kinds.ts - keep the two the same.
//
//   content  - blocks; only the close cross              -> nothing
//   message  - a text and "OK" (ordinary or an error)    -> nothing
//   confirm  - "Confirm" / "Cancel"                      -> true | false
//   prompt   - a field; its text turned into its format  -> string | number
//   select   - a list of choices                         -> the chosen value
//   date     - a calendar                                -> 'YYYY-MM-DD'
//   feedback - a feedback form, sent to the site's channel
//   form     - the client's own form, sent to the channel as one message
// Closed with the cross (or Esc, or a click beside it): null.

type Words = { uk: string, en: string, de: string }

export const POPUP_WORDS = {
  ok: { uk: 'Добре', en: 'OK', de: 'OK' },
  confirm: { uk: 'Підтвердити', en: 'Confirm', de: 'Bestätigen' },
  cancel: { uk: 'Скасувати', en: 'Cancel', de: 'Abbrechen' },
  send: { uk: 'Надіслати', en: 'Send', de: 'Senden' },
  close: { uk: 'Закрити', en: 'Close', de: 'Schließen' },
  choose: { uk: 'Виберіть', en: 'Choose', de: 'Auswählen' },
  required: { uk: 'Заповніть це поле', en: 'Please fill in this field', de: 'Bitte füllen Sie dieses Feld aus' },
  requiredFields: { uk: 'Заповніть позначені поля', en: 'Please fill in the marked fields', de: 'Bitte füllen Sie die markierten Felder aus' },
  number: { uk: 'Потрібне число', en: 'A number is needed', de: 'Eine Zahl wird benötigt' },
  integer: { uk: 'Потрібне ціле число', en: 'A whole number is needed', de: 'Eine ganze Zahl wird benötigt' },
  email: { uk: 'Перевірте адресу пошти', en: 'Please check the email address', de: 'Bitte prüfen Sie die E-Mail-Adresse' },
  phone: { uk: 'Перевірте номер телефону', en: 'Please check the phone number', de: 'Bitte prüfen Sie die Telefonnummer' },
} satisfies Record<string, Words>

// The buttons a kind has, main first. 'feedback' draws its own (the form's
// "Send"); 'content' has only the cross.
export function popupButtons (kind: PopupKind): ('ok' | 'cancel')[] {
  switch (kind) {
    case 'message': {
      return ['ok']
    }
    case 'confirm':
    case 'prompt':
    case 'select':
    case 'date': {
      return ['ok', 'cancel']
    }
    case 'form': {
      return ['ok']
    }
    default: {
      return []
    }
  }
}

// The main button's own default word.
export function defaultOkWords (kind: PopupKind): Words {
  if (kind === 'confirm') {
    return POPUP_WORDS.confirm
  }
  if (kind === 'form') {
    return POPUP_WORDS.send
  }
  return POPUP_WORDS.ok
}

export function popupKind (popup: PopupModel): PopupKind {
  return popup.kind ?? 'content'
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// A field's text as the answer it is meant to be - or what is wrong with it.
export function convertInput (input: PopupInputModel | undefined, raw: string): { value: string | number | null } | { error: keyof typeof POPUP_WORDS } {
  const text = raw.trim()
  if (!text) {
    return input?.required ? { error: 'required' } : { value: null }
  }
  switch (input?.format) {
    case 'number': {
      const value = Number(text.replace(',', '.').replace(/\s/g, ''))
      return Number.isFinite(value) ? { value } : { error: 'number' }
    }
    case 'integer': {
      const value = Number(text.replace(/\s/g, ''))
      return Number.isInteger(value) ? { value } : { error: 'integer' }
    }
    case 'email': {
      return EMAIL.test(text) ? { value: text } : { error: 'email' }
    }
    case 'phone': {
      const digits = text.replace(/\D/g, '')
      return digits.length >= 7 && digits.length <= 15 ? { value: `${text.startsWith('+') ? '+' : ''}${digits}` } : { error: 'phone' }
    }
    default: {
      return { value: text }
    }
  }
}
