import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
import { defaultImage } from '../defaults/default-image'
import { textPlaceholder } from '../defaults/text-placeholder'

// The page's single top-of-page hero parallax (mirrors production's App.vue -
// a "parallax" block is found via .find() and extracted out of the normal
// block flow entirely, rendered full page width above the content). Wired
// into the "Додати компонент" picker (configs/index.ts, under the
// "Паралакс" folder) same as any other block - EditorView.vue's
// selectHandler guards against inserting a second one, since HeroParallax.vue
// finds it by type, not position, so a duplicate would just be a dead block.
// For the version that CAN be inserted anywhere and stays content-width, see
// parallax-inside.ts.
export function parallaxTemplate (): TemplateBlockModel {
  return {
    type: 'parallax',
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
      {
        type: 'text',
        content: textPlaceholder(),
      },
    ],
  }
}
