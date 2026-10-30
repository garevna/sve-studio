import { emptyTranslatedModel } from '@/utils/locale-text'
import { defaultButtonClass } from '../../defaults/default-classes'

export function button () {
  return {
    type: 'button',
    content: emptyTranslatedModel(),
    class: defaultButtonClass,
  }
}
