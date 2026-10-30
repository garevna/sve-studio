import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
import { defaultImage } from '../defaults/default-image'
import { textPlaceholder } from '../defaults/text-placeholder'

// Mirrors production's "parallax-inside" block type (see TemplateParallax.vue) -
// an in-flow parallax that can be inserted anywhere and stays content-block
// width, unlike the page's single top-of-page hero parallax (type "parallax",
// see parallax.ts - that one is extracted out of the normal block flow
// entirely and rendered full-width by HeroParallax.vue).
export function parallaxInsideTemplate (): TemplateBlockModel {
  return {
    type: 'parallax-inside',
    content: { uk: defaultImage(), en: defaultImage(), de: defaultImage() },
    children: [
      {
        type: 'header',
        content: textPlaceholder(),
      },
      {
        type: 'title',
        content: textPlaceholder(),
      },
    ],
  }
}
