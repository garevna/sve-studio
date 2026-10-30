import { emptyTranslatedModel } from '@/utils/locale-text'
import { defaultTextClass } from '../../defaults/default-classes'
import { defaultIcon } from '../../defaults/default-icon'

export function textWithIcon () {
  return {
    type: 'text-with-icon',
    content: emptyTranslatedModel(),
    class: defaultTextClass,
    icon: defaultIcon,
    size: 24,
    color: 'grey',
  }
}
