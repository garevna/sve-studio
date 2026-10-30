import { emptyTranslatedModel } from '@/utils/locale-text'
import { defaultHeaderClass } from '../../defaults/default-classes'

export function header () {
  return {
    type: 'header',
    content: emptyTranslatedModel(),
    class: defaultHeaderClass,
  }
}
