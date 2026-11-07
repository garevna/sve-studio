import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
import { emptyTranslatedModel } from '@/utils/locale-text'

// A tabs block (TabSet.vue): a card set showing one card at a time. Starts
// with three tabs - fewer would not read as tabs. Each card's title is its
// tab's name.
function tabCard (icon: string): TemplateBlockModel {
  return {
    type: 'card',
    icon,
    title: emptyTranslatedModel(),
    content: emptyTranslatedModel(),
  }
}

export function tabsTemplate (): TemplateBlockModel {
  return {
    type: 'tabs',
    ver: 2,
    tabLook: 'pill',
    children: [tabCard('mdi-star-outline'), tabCard('mdi-star-outline'), tabCard('mdi-star-outline')],
  }
}
