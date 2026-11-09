import { emptyTranslatedModel } from '@/utils/locale-text'

// An icon-only button with a tooltip (IconButtonEditor.vue). Starts with no
// icon: the editor asks for one, and for the tooltip, as soon as it is in.
// content = the tooltip, in every language of the site.
export function iconButton () {
  return {
    type: 'icon-button',
    content: emptyTranslatedModel(),
    icon: '',
    color: 'primary',
    size: 32,
  }
}
