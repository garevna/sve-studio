import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
import { defaultImage } from '../defaults/default-image'
import { textPlaceholder } from '../defaults/text-placeholder'

// A "baner" block: a wide promo card with a picture on one side and a
// headline plus a few lines of text on the other (see TemplateBaner.vue).
//
// TWO images on purpose, not one. Above 926px the block renders its own wide
// card and uses `image` for the picture; below that it hands over to
// TemplateParallax, which reads `content` instead - so the two fields are
// the desktop and the mobile picture. Both start from the same placeholder,
// exactly as the existing real content does, and can be replaced separately
// from the block's own toolbar.
//
// The headline lives on `title` rather than in a child block, because
// TemplateBaner styles it with its own hardwired .title-of-card class -
// which is also why it isn't formattable there.
export function banerTemplate (): TemplateBlockModel {
  return {
    type: 'baner',
    class: 'bright-grey pa-0',
    dark: false,
    image: defaultImage(),
    content: { uk: defaultImage(), en: defaultImage(), de: defaultImage() },
    title: textPlaceholder(),
    children: [
      {
        type: 'text',
        class: 'h4 text-medium text-primary my-8',
        content: textPlaceholder(),
      },
      {
        type: 'text',
        class: 'h6 text-medium text-black',
        content: textPlaceholder(),
      },
    ],
  }
}
