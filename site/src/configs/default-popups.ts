import type { PopupModel } from '../types/common'

// The popups every site comes with (the base package): always in the list,
// added where a stored list has not got them. The editor's copy is
// src/configs/default-popups.ts - keep the two the same.
export const FEEDBACK_POPUP_ID = 'popup-feedback'

function feedbackPopup (): PopupModel {
  return {
    id: FEEDBACK_POPUP_ID,
    name: 'Зворотний зв’язок',
    placement: 'center',
    width: 520,
    content: {
      type: 'section-with-free-content',
      children: [{
        type: 'component',
        content: 'FeedbackForm',
        props: {
          type: 'message',
          title: { uk: 'Маєте питання або пропозицію?', en: 'Do you have any questions or suggestions?', de: 'Haben Sie Fragen oder Anregungen?' },
          text: { uk: 'Напишіть нам - відповімо якнайшвидше!', en: 'Write to us - we will respond as soon as possible!', de: 'Schreiben Sie uns - wir antworten so schnell wie möglich!' },
        },
      }],
    },
  } as unknown as PopupModel
}

export function withDefaultPopups (popups: PopupModel[]): PopupModel[] {
  const missing = [feedbackPopup()].filter(popup => !popups.some(item => item.id === popup.id))
  return [...missing, ...popups]
}
