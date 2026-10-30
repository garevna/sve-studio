import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
import { defaultImage } from '../../defaults/default-image'
import { textPlaceholder } from '../../defaults/text-placeholder'

export function sectionImageLeftTemplate (): TemplateBlockModel {
  return {
    type: 'section',
    children: [
      {
        type: 'image',
        content: { uk: defaultImage(), en: defaultImage(), de: defaultImage() },
      },
      {
        type: 'section',
        children: [
          {
            type: 'title',
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
      },
    ],
  }
}
