import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
import { emptyTranslatedModel } from '@/utils/locale-text'

function iconCard (): TemplateBlockModel {
  return {
    type: 'card',
    icon: 'mdi-star-outline',
    title: emptyTranslatedModel(),
    content: emptyTranslatedModel(),
  }
}

// ver:1 = icon on top, ver:2 = icon on the left (see TemplateCard.vue's own
// ver-based CSS) - both are the same "cards" block type, just a different
// starting ver. CardContainerActions.vue's own "Варіант карток" ver-switcher
// already lets you flip between 1/2/3 at any time, so these two picker
// entries are "start here" shortcuts, not distinct block types - the whole
// editor (EditableCardsBlock.vue, add/delete/drag) is already shared as-is.
export function cardWithIconTopTemplate (): TemplateBlockModel {
  return { type: 'cards', ver: 1, children: [iconCard()] }
}

export function cardWithIconLeftTemplate (): TemplateBlockModel {
  return { type: 'cards', ver: 2, children: [iconCard()] }
}

// ver 4 = icon on the left with the text beside it, on a filled strip as
// wide as its column. Unlike ver 1/2 it is not a tile in a row of tiles but
// a line in a list, which is what makes it the useful shape inside one
// half of a "Довільний контент" block - see FreeContentInsertMenu.vue.
// It is in the page's block menu too ("Списком, з іконкою").
//
// No fill of its own: variant 4 defaults to the UI Kit's "Заливка" card
// style (configs/card-style.ts), which brings it. The block's toolbar can
// pick another style, or override the fill.
export function cardWithIconRowTemplate (): TemplateBlockModel {
  return { type: 'cards', ver: 4, children: [iconCard()] }
}
