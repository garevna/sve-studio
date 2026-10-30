import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
import { defaultImage } from '../../defaults/default-image'
import { textPlaceholder } from '../../defaults/text-placeholder'

export function cardWithToolbarImageTemplate (): TemplateBlockModel {
  return {
    type: 'card-with-toolbar-image',
    width: 390,
    height: 200,
    image: defaultImage(),
    children: [
      {
        type: 'title',
        class: 'my-4',
        content: textPlaceholder(),
      },
      {
        type: 'text',
        content: textPlaceholder(),
      },
      {
        type: 'text',
        content: textPlaceholder(),
      },
      {
        type: 'text',
        content: textPlaceholder(),
      },
    ],
  }
}

// Production only ever lays multiple card-with-toolbar-image cards out side
// by side via a "float" block's own flex-wrap row (TemplateFlexSection.vue -
// see contacts-page-style pages) - a bare top-level card-with-toolbar-image
// block has nothing to put it in that row, so it'd render alone on its own
// line. The picker inserts a fresh one-card group each time; adding more
// cards to an existing group happens via CardWithToolbarImageGroupActions.vue's
// "Додати картку" instead.
export function cardWithToolbarImageGroupTemplate (): TemplateBlockModel {
  return {
    type: 'float',
    children: [cardWithToolbarImageTemplate()],
  }
}
