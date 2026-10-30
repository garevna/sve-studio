// A snapshot of the real city list, taken from the API's own
// /booking/city-list in all three locales - not invented, and not a
// Ukrainian list with guessed translations beside it.
//
// The hero's search panel is a LIKENESS of production's, not a working copy:
// it asks nothing of the network. But production's list is already localised
// by the time a component sees it - the site refetches it whenever the
// locale changes, and the field only ever receives plain strings. Handing a
// component objects to pick a language out of would make this panel behave
// unlike the one it is imitating, so the same split happens here: the three
// languages live in the data, and citiesForLocale() hands the field exactly
// what production's store would.

export type MockCity = {
  id: number
  country: string
  name: { uk: string, en: string, de: string }
}

export const MOCK_CITIES: MockCity[] = [
  { id: 83, country: 'SI', name: { uk: 'Єшенца', en: 'Ješenca', de: 'Ješenca' } },
  { id: 82, country: 'IT', name: { uk: 'Імола', en: 'Imola', de: 'Imola' } },
  { id: 91, country: 'UA', name: { uk: 'Ірпінь', en: 'Irpin', de: 'Ірпінь' } },
  { id: 29, country: 'IT', name: { uk: 'Болонья', en: 'Bologna', de: 'Болонья' } },
  { id: 36, country: 'HU', name: { uk: 'Будапешт', en: 'Budapest', de: 'Будапешт' } },
  { id: 7, country: 'PL', name: { uk: 'Варшава', en: 'Warsaw', de: 'Варшава' } },
  { id: 32, country: 'IT', name: { uk: 'Венеція', en: 'Venice', de: 'Венеція' } },
  { id: 16, country: 'UA', name: { uk: 'Вінниця', en: 'Vinnytsia', de: 'Вінниця' } },
  { id: 50, country: 'UA', name: { uk: 'Городок', en: 'Horodok', de: 'Городок' } },
  { id: 47, country: 'UA', name: { uk: 'Дрогобич', en: 'Drohobych', de: 'Дрогобич' } },
  { id: 10, country: 'UA', name: { uk: 'Житомир', en: 'Zhytomyr', de: 'Житомир' } },
  { id: 86, country: 'UA', name: { uk: 'Золочів', en: 'Zolochiv', de: 'Золочів' } },
  { id: 39, country: 'UA', name: { uk: 'Казанка', en: 'Kazanka', de: 'Казанка' } },
  { id: 24, country: 'IT', name: { uk: 'Каттоліка', en: 'Cattolica', de: 'Каттоліка' } },
  { id: 11, country: 'UA', name: { uk: 'Київ', en: 'Kyiv', de: 'Київ' } },
  { id: 12, country: 'UA', name: { uk: 'Ковель', en: 'Kovel', de: 'Ковель' } },
  { id: 90, country: 'UA', name: { uk: 'Коцюбинське', en: 'Kotsiubynske', de: 'Коцюбинське' } },
  { id: 84, country: 'SK', name: { uk: 'Кошиці', en: 'Košice', de: 'Кошиці' } },
  { id: 19, country: 'UA', name: { uk: 'Кривий Ріг', en: 'Kryvyi Rih', de: 'Кривий Ріг' } },
  { id: 18, country: 'UA', name: { uk: 'Кропивницький', en: 'Kropyvnytskyi', de: 'Кропивницький' } },
  { id: 87, country: 'UA', name: { uk: 'Куцівка', en: 'Kutsivka', de: 'Куцівка' } },
  { id: 8, country: 'UA', name: { uk: 'Луцьк', en: 'Lutsk', de: 'Луцьк' } },
  { id: 4, country: 'UA', name: { uk: 'Львів', en: 'Lviv', de: 'Львів' } },
  { id: 34, country: 'SI', name: { uk: 'Любляна', en: 'Ljubljana', de: 'Любляна' } },
  { id: 35, country: 'SI', name: { uk: 'Марибор', en: 'Maribor', de: 'Марибор' } },
  { id: 5, country: 'PL', name: { uk: 'Медика', en: 'Medyka', de: 'Медика' } },
  { id: 22, country: 'UA', name: { uk: 'Миколаїв', en: 'Mykolaiv', de: 'Миколаїв' } },
  { id: 20, country: 'UA', name: { uk: 'Новий Буг', en: 'Novyi Buh', de: 'Новий Буг' } },
  { id: 31, country: 'IT', name: { uk: 'Падуя', en: 'Padua', de: 'Падуя' } },
  { id: 23, country: 'IT', name: { uk: 'Пезаро', en: 'Pesaro', de: 'Пезаро' } },
  { id: 6, country: 'PL', name: { uk: 'Перемишль', en: 'Przemyśl', de: 'Перемишль' } },
  { id: 85, country: 'SK', name: { uk: 'Пряшів', en: 'Prešov', de: 'Пряшів' } },
  { id: 9, country: 'UA', name: { uk: 'Рівне', en: 'Rivne', de: 'Рівне' } },
  { id: 26, country: 'IT', name: { uk: 'Ріміні', en: 'Rimini', de: 'Ріміні' } },
  { id: 25, country: 'IT', name: { uk: 'Річчоне', en: 'Riccione', de: 'Річчоне' } },
  { id: 93, country: 'IT', name: { uk: 'Сантарканджело', en: 'Santarcangelo', de: 'Сантарканджело' } },
  { id: 94, country: 'UA', name: { uk: 'Свірж', en: 'Svirzh', de: 'Свірж' } },
  { id: 43, country: 'UA', name: { uk: 'Стрий', en: 'Stryi', de: 'Стрий' } },
  { id: 14, country: 'UA', name: { uk: 'Тернопіль', en: 'Ternopil', de: 'Тернопіль' } },
  { id: 48, country: 'UA', name: { uk: 'Трускавець', en: 'Truskavets', de: 'Трускавець' } },
  { id: 33, country: 'IT', name: { uk: 'Трієст', en: 'Trieste', de: 'Трієст' } },
  { id: 17, country: 'UA', name: { uk: 'Умань', en: 'Uman', de: 'Умань' } },
  { id: 81, country: 'IT', name: { uk: 'Фаенца', en: 'Faenza', de: 'Фаенца' } },
  { id: 92, country: 'IT', name: { uk: 'Фальчіано', en: 'Falciano', de: 'Фальчіано' } },
  { id: 1, country: 'IT', name: { uk: 'Фано', en: 'Fano', de: 'Фано' } },
  { id: 30, country: 'IT', name: { uk: 'Феррара', en: 'Ferrara', de: 'Феррара' } },
  { id: 28, country: 'IT', name: { uk: 'Форлі', en: 'Forlì', de: 'Форлі' } },
  { id: 15, country: 'UA', name: { uk: 'Хмельницький', en: 'Khmelnytskyi', de: 'Хмельницький' } },
  { id: 13, country: 'PL', name: { uk: 'Холм', en: 'Kholm', de: 'Холм' } },
  { id: 27, country: 'IT', name: { uk: 'Чезена', en: 'Cesena', de: 'Чезена' } },
]

/**
 * What the autocomplete field expects, in production's own shape: `id` plus a
 * single ready-made `text` ("Київ, UA"). The site builds exactly that in its
 * search store, and the field reads `text` - handing it anything else made it
 * fall back to stringifying the whole record, which is where the
 * "[object Object]" in every city field came from.
 */
export function citiesForLocale (locale: string): { id: number, text: string }[] {
  return MOCK_CITIES.map(record => ({
    id: record.id,
    text: `${record.name[locale as keyof MockCity['name']] || record.name.uk}, ${record.country}`,
  }))
}
