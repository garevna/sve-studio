import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
import { defaultImage } from '../../defaults/default-image'

// Two pictures side by side - the shape about-company already uses (a
// type:'section' whose two children are images), which until now could only
// be written by hand in the JSON: the insert menu offered image+text in
// either order and a free-content pair, but not this.
//
// gr-5 is the row gap between the two halves once they wrap onto separate
// lines on a narrow screen, matching the existing page.
export function sectionTwoImages (): TemplateBlockModel {
  return {
    type: 'section',
    class: 'gr-5',
    children: [
      {
        type: 'image',
        content: { uk: defaultImage(), en: defaultImage(), de: defaultImage() },
      },
      {
        type: 'image',
        content: { uk: defaultImage(), en: defaultImage(), de: defaultImage() },
      },
    ],
  }
}
