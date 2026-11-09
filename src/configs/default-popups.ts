import type { PopupModel } from '@/types/TemplateBlockModel'
import { feedbackFormTexts } from './components/feedback-form'

// The popups every site comes with (the base package). They are always in
// the list - a stored list or a draft from before one of them existed gets
// it added - and cannot be deleted; what is in them can be edited like any
// other popup. The site's copy is site/src/configs/default-popups.ts.
export const FEEDBACK_POPUP_ID = 'popup-feedback'

function feedbackPopup (): PopupModel {
  return {
    id: FEEDBACK_POPUP_ID,
    name: 'Зворотний зв’язок',
    placement: 'center',
    width: 520,
    content: {
      type: 'section-with-free-content',
      children: [{ type: 'component', content: 'FeedbackForm', props: feedbackFormTexts() }],
    },
  }
}

export const BUILT_IN_POPUP_IDS = new Set([FEEDBACK_POPUP_ID])

// The list with every built-in popup in it, first, in its starting form
// where it is missing.
export function withDefaultPopups (popups: PopupModel[]): PopupModel[] {
  const missing = [feedbackPopup()].filter(popup => !popups.some(item => item.id === popup.id))
  return [...missing, ...popups]
}
