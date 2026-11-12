import type { TranslatedModel } from '@/types/TemplateBlockModel'

// "Пошук готелю": where, when, how many - and on to the client's own
// booking engine. Inserted already joined to the docking block's demo
// requests (content/settings/client-api.json), so it works the moment it
// lands on a page; another client's requests are picked in the block's
// settings.
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

export function hotelSearch () {
  return {
    type: 'component',
    content: 'HotelSearch',
    props: {
      title: structuredClone(seedTitle),
      subtitle: structuredClone(seedSubtitle),
      destinations: 'hotel-destinations',
      availability: 'hotel-availability',
      roomTypes: 'hotel-rooms',
      booking: 'hotel-booking',
    },
  }
}
