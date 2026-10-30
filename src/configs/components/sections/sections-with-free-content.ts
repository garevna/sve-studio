import type { TemplateBlockModel } from '@/types/TemplateBlockModel'

export function sectionsWithFreeContent (): TemplateBlockModel {
  return {
    type: 'section',
    children: [
      {
        type: 'section-with-free-content',
        children: [],
      },
      {
        type: 'section-with-free-content',
        children: [],
      },
    ],
  }
}
