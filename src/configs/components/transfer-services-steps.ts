import type { TemplateBlockModel, TranslatedModel } from '@/types/TemplateBlockModel'
import { textPlaceholder } from '../defaults/text-placeholder'

// "Кроки в кружках" - the numbered circles. Inserted with a heading and
// three empty steps rather than an empty block: the circles are the whole
// point of this block, and one with none of them renders as a title over
// nothing, which reads as broken rather than as "add your steps".
//
// Three, not five: the old hardcoded grid held exactly five, and offering
// five empty circles would quietly suggest that is the number. Adding and
// removing steps is what the block's own toolbar is for.
//
// No colours seeded either - unset means the theme's own two
// (--transfer-services-*-in-circle-background), so a fresh block matches the
// site until someone deliberately changes it.
const seedTitle: TranslatedModel = {
  uk: 'Як ми працюємо',
  en: 'How we work',
  de: 'So arbeiten wir',
}

const seedSubtitle: TranslatedModel = {
  uk: 'Від ідеї до запуску - кілька простих кроків',
  en: 'From idea to launch - a few simple steps',
  de: 'Von der Idee bis zum Start - ein paar einfache Schritte',
}

function emptyStep () {
  return { text: textPlaceholder(), bold: textPlaceholder() }
}

export function transferServicesSteps (): TemplateBlockModel {
  return {
    type: 'component',
    content: 'TransferServicesSteps',
    props: {
      title: structuredClone(seedTitle),
      subtitle: structuredClone(seedSubtitle),
      circles: [emptyStep(), emptyStep(), emptyStep()],
    },
  }
}
