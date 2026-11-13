import type { TranslatedModel } from '@/types/TemplateBlockModel'
import { formsDocument } from '@/composables/useSiteForms'

// "Форма стикування": one of the docking block's forms (client-api.json
// `forms`, the editor's "Форми стикування") on a page. Inserted showing the
// first form there is - in the demo, the hotel booking joined to the demo
// client - so it works the moment it lands; another one is picked in the
// block's settings.
const seedTitle: TranslatedModel = {
  uk: 'Знайдіть свій готель',
  en: 'Find your hotel',
  de: 'Finden Sie Ihr Hotel',
}

const seedSubtitle: TranslatedModel = {
  uk: 'Оберіть місто й дати — вільні ночі й ціни видно одразу в календарі',
  en: 'Pick a city and dates — free nights and prices show right in the calendar',
  de: 'Stadt und Daten wählen — freie Nächte und Preise sehen Sie direkt im Kalender',
}

export function dockForm () {
  const first = formsDocument.value.forms[0]?.id
  return {
    type: 'component',
    content: 'DockForm',
    props: {
      title: structuredClone(seedTitle),
      subtitle: structuredClone(seedSubtitle),
      form: first ?? 'booking',
    },
  }
}
