import { emptyTranslatedModel } from '@/utils/locale-text'
import { defaultTextClass } from '../../defaults/default-classes'

export function text () {
  return {
    type: 'text',
    content: emptyTranslatedModel(),
    class: defaultTextClass,
  }
}
