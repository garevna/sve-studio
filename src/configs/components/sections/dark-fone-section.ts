import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
import { defaultIcon } from '@/configs/defaults/default-icon'
import { emptyTranslatedModel } from '@/utils/locale-text'

// One icon+title+text card inside the section - see DarkFoneSection.vue,
// which lays these out in a wrapping row. `background` doubles as this
// card's own icon-circle background (DarkFoneSection.vue falls back to a
// semi-transparent white circle when unset) - reusing the field BaseBlock
// already has for exactly this purpose elsewhere, rather than growing the
// type with a card-only field.
export function darkFoneSectionCard (): TemplateBlockModel {
  return {
    type: 'card',
    icon: defaultIcon,
    color: 'white',
    size: 24,
    title: emptyTranslatedModel(),
    text: emptyTranslatedModel(),
  }
}

export function darkFoneSectionTemplate (): TemplateBlockModel {
  return {
    type: 'dark-fone-section',
    class: 'my-16 pa-10',
    background: 'primary',
    title: emptyTranslatedModel(),
    text: emptyTranslatedModel(),
    children: [darkFoneSectionCard(), darkFoneSectionCard(), darkFoneSectionCard()],
  }
}
