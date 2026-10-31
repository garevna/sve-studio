import type { FeedbackFormModel } from '@/types/TemplateBlockModel'

// The feedback form: a block of its own on a page (the "Контакти" page, for
// instance), and the form a button can open in a popup. The same form the
// footer's callback card shows - one look for all three places.
export function feedbackFormTexts (): FeedbackFormModel {
  return {
    type: 'message',
    title: { uk: 'Маєте питання або пропозицію?', en: 'Do you have any questions or suggestions?', de: 'Haben Sie Fragen oder Anregungen?' },
    text: { uk: 'Напишіть нам - відповімо якнайшвидше!', en: 'Write to us - we will respond as soon as possible!', de: 'Schreiben Sie uns - wir antworten so schnell wie möglich!' },
  }
}

export function feedbackForm () {
  return {
    type: 'component',
    content: 'FeedbackForm',
    props: feedbackFormTexts(),
  }
}
