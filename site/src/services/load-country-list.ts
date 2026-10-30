import type { CountryModel } from '../types/common'
import { useCommonStore } from '../stores/common'
import { sveRoot } from '../utils/sve-root'

// Ported from client-side's own services/common/load-country-list.ts, which
// App.vue there calls at startup and again on every locale change. Without
// it commonStore.countries stays empty, and CountryCode.vue then finds no
// record matching the phone field's own default dial code ('+380') - so its
// `v-if="selected"` flag never renders. That was the whole difference
// between the callback card here and the same card on the real site: the
// input showed "+380" (its placeholder) with no flag beside it.
//
// Same two files as production, copied into this repo's public/ (they had
// no reason to exist here before): countries-uk.json for Ukrainian country
// names, flagcdn's own codes.json for the other locales, then
// country-codes.json to attach a dial code to each.
export async function loadCountryList (locale: string) {
  const commonStore = useCommonStore()

  // The lists are among the files the editor and the site share, at the
  // demo's root ("/" locally, "/sve-studio/" on GitHub Pages).
  const base = sveRoot()
  const namesUrl = locale === 'uk' ? `${base}countries-uk.json` : `https://flagcdn.com/${locale}/codes.json`

  try {
    const names = await (await fetch(namesUrl)).json()
    commonStore.countries = Object.entries(names).map(([countryCode, countryName]) => (
      { countryCode, countryName } as CountryModel
    ))

    const dialCodes = await (await fetch(`${base}country-codes.json`)).json()
    for (const item of dialCodes as { code: string, dial_code: string }[]) {
      const record = commonStore.countries.find(entry => entry.countryCode === item.code.toLowerCase())
      if (record) {
        Object.assign(record, { dialCode: item.dial_code })
      }
    }
  } catch (error) {
    // A preview that can't reach the list still has to render: CountryCode
    // falls back to showing its placeholder without a flag, exactly as it
    // did before this existed.
    console.warn('Failed to load the country list - phone inputs will show no flag:', error)
  }
}
