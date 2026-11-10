import type { PopupModel, TemplateBlockModel } from '../types/common'

// The popups every site comes with (the base package): always in the list,
// added where a stored list has not got them, and never deleted - a client
// may leave one unused. All three send to the site's channel
// (global.json feedback.endpoint):
//   popup-feedback    - a message or a question; the visitor leaves
//                       Telegram or e-mail to be answered at;
//   popup-callback    - a call request; the phone is a must;
//   popup-client-form - the client's own form, made of fields like a
//                       "Довільний контент" column is made of blocks.
// The editor's copy is src/configs/default-popups.ts - keep the two the same.
export const FEEDBACK_POPUP_ID = 'popup-feedback'
export const CALLBACK_POPUP_ID = 'popup-callback'
export const CLIENT_FORM_POPUP_ID = 'popup-client-form'

type Words = { uk: string, en: string, de: string }

function field (input: string, label: Words, required = false): TemplateBlockModel {
  return { type: 'form-field', class: 'mb-4', formField: { input, label, required } } as unknown as TemplateBlockModel
}

function defaults (): PopupModel[] {
  return [
    {
      id: FEEDBACK_POPUP_ID,
      name: 'Повідомлення або питання',
      kind: 'feedback',
      feedbackType: 'ask',
      placement: 'center',
      width: 480,
      title: { uk: 'Маєте питання або пропозицію?', en: 'Do you have any questions or suggestions?', de: 'Haben Sie Fragen oder Anregungen?' },
      text: { uk: 'Напишіть нам — відповімо якнайшвидше!', en: 'Write to us — we will respond as soon as possible!', de: 'Schreiben Sie uns – wir antworten so schnell wie möglich!' },
      content: { type: 'section-with-free-content', children: [] },
    },
    {
      id: CALLBACK_POPUP_ID,
      name: 'Замовити дзвінок',
      kind: 'feedback',
      feedbackType: 'call-request',
      placement: 'center',
      width: 480,
      title: { uk: 'Передзвонимо вам', en: 'We will call you back', de: 'Wir rufen Sie zurück' },
      text: { uk: 'Залиште номер телефону — зателефонуємо найближчим часом.', en: 'Leave your phone number — we will call you shortly.', de: 'Hinterlassen Sie Ihre Telefonnummer – wir rufen Sie in Kürze an.' },
      content: { type: 'section-with-free-content', children: [] },
    },
    {
      id: CLIENT_FORM_POPUP_ID,
      name: 'Своя форма',
      kind: 'form',
      placement: 'center',
      width: 480,
      title: { uk: 'Заявка', en: 'Request', de: 'Anfrage' },
      text: { uk: 'Заповніть, будь ласка, кілька полів.', en: 'Please fill in a few fields.', de: 'Bitte füllen Sie ein paar Felder aus.' },
      content: {
        type: 'section-with-free-content',
        children: [
          field('text', { uk: 'Ваше імʼя', en: 'Your name', de: 'Ihr Name' }, true),
          field('phone', { uk: 'Телефон', en: 'Phone', de: 'Telefon' }, true),
          field('textarea', { uk: 'Коментар', en: 'Comment', de: 'Kommentar' }),
        ],
      },
    },
  ] as PopupModel[]
}

export const BUILT_IN_POPUP_IDS = new Set([FEEDBACK_POPUP_ID, CALLBACK_POPUP_ID, CLIENT_FORM_POPUP_ID])

// The feedback popup as it was first stored: a "content" popup holding a
// FeedbackForm block, its title and text in the block. Now the frame has
// them, like every popup's.
function upgraded (popup: PopupModel): PopupModel {
  if (popup.id !== FEEDBACK_POPUP_ID || popup.kind) {
    return popup
  }
  const form = popup.content?.children?.find(child => child.type === 'component' && (child.content as unknown) === 'FeedbackForm') as { props?: { title?: unknown, text?: unknown } } | undefined
  const fresh = defaults()[0]!
  return {
    ...fresh,
    placement: popup.placement || fresh.placement,
    title: (popup.title ?? form?.props?.title ?? fresh.title) as PopupModel['title'],
    text: (form?.props?.text ?? fresh.text) as PopupModel['text'],
  }
}

// The list with every built-in popup in it, first, in its starting form
// where it is missing.
export function withDefaultPopups (popups: PopupModel[]): PopupModel[] {
  const list = popups.map(popup => upgraded(popup))
  const missing = defaults().filter(popup => !list.some(item => item.id === popup.id))
  return [...missing, ...list]
}
