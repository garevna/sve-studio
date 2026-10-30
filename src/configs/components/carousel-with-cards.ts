import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
import { emptyTranslatedModel } from '@/utils/locale-text'

// Renders via SliderWithCards.vue (TemplateItem.vue dispatches "carousel"
// blocks with children there) - seeded with one empty card, matching
// cardWithToolbarImageGroupTemplate's own convention, since the container's
// own "Додати картку" (CardContainerActions.vue) already covers adding
// more after insert.
export function carouselWithCardsTemplate (): TemplateBlockModel {
  return {
    type: 'carousel',
    height: 300,
    children: [
      {
        type: 'card',
        icon: 'mdi-star-outline',
        title: emptyTranslatedModel(),
        content: emptyTranslatedModel(),
      },
    ],
  }
}
