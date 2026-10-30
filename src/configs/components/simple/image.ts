import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
import { defaultImage } from '../../defaults/default-image'

// `variantClass` tags this block as "desktop-mode"/"mobile-mode" (see
// common.css's CSS-toggle rules) when inserted as part of a desktop/mobile
// pair from the picker's "Зображення" submenu (see EditorView.vue) -
// omitted for a plain universal image, the default/unchanged behavior.
export function image (variantClass?: string): TemplateBlockModel {
  return {
    type: 'image',
    content: {
      uk: defaultImage(),
      en: defaultImage(),
      de: defaultImage(),
    },
    ...(variantClass ? { class: variantClass } : {}),
  }
}
