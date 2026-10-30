import { emptyTranslatedModel } from '@/utils/locale-text'
import { defaultSubheaderClass } from '../../defaults/default-classes'

export function title () {
  return {
    type: 'title',
    content: emptyTranslatedModel(),
    class: defaultSubheaderClass,
  }
}
