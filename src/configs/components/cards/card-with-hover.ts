import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
import { emptyTranslatedModel } from '@/utils/locale-text'

function hoverCardState (): TemplateBlockModel {
  return {
    type: 'card',
    icon: 'mdi-star-outline',
    title: emptyTranslatedModel(),
    content: emptyTranslatedModel(),
  }
}

// Renders via CardWithHover.vue (a home-page-components entry, dispatched
// through TemplateItem.vue's type:'component' branch) -> HoverTemplate.vue,
// which shows children[0] normally and swaps to children[1] on hover. Both
// states need to exist together from the start - HoverTemplate.vue's own
// v-if requires card.children[0] AND [1] both present, or it renders
// nothing at all - so this seeds both rather than letting the user add
// them one at a time.
export function cardWithHoverTemplate (): TemplateBlockModel {
  return {
    type: 'component',
    content: 'CardWithHover',
    props: {
      card: {
        type: 'card',
        children: [hoverCardState(), hoverCardState()],
      },
    },
  }
}

// Production only ever lays multiple card-with-hover cards out side by side
// via a "float" block's own flex-wrap row (TemplateFlexSection.vue - same
// grouping card-with-toolbar-image uses, see card-with-toolbar-image.ts) -
// a bare top-level card-with-hover block has nothing to put it in that row.
// The picker inserts a fresh one-card group each time; adding more cards to
// an existing group happens via CardWithHoverGroupActions.vue's
// "Додати картку" instead. Can't reuse the plain "cards" block type here -
// production's own CardSet.vue there expects flat card objects, not
// type:'component' children.
export function cardWithHoverGroupTemplate (): TemplateBlockModel {
  return {
    type: 'float',
    children: [cardWithHoverTemplate()],
  }
}
