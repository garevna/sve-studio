import type { ISODateModel } from '../types/DateModels'
import { toISODateString } from '../services/date-formatting'

// The dates a route runs on, in the shape /booking/city-dates answers with:
//
//   [{ date: '2026-09-01', minPrice: 7082, currency: 'UAH' }, ...]
//
// Generated here instead of asked for, because the real endpoint needs a
// departure and a destination city id, and the search panel in this preview
// has no real cities behind its fields (see mock-cities.ts) - there is
// nothing to ask it about. The calendar is the one control whose LOOK
// depends on data, so the data has to exist: three of the palette's own
// colours (available-date-fone-color, selected-dates-fone-color,
// selected-date-first-fone-color) only ever appear once some days are
// marked available and one of them is picked.
//
// Records, not bare date strings, even though the calendar keeps only
// `date`: the price and currency are part of the contract, and a mock that
// drops them quietly teaches the next reader the wrong shape.
export type AllowedDateModel = {
  date: ISODateModel
  minPrice: number
  currency: string
}

const CURRENCY = 'UAH'

// Deterministic, so paging to the next month and back doesn't reshuffle the
// calendar under the cursor, and so the editor and the preview window show
// the same dates - a demo that changes every render reads as a bug.
// Park-Miller, small enough to be obvious and stable across engines.
function seededRandom (seed: number): () => number {
  let state = seed % 2_147_483_647
  if (state <= 0) {
    state += 2_147_483_646
  }
  return () => {
    state = (state * 16_807) % 2_147_483_647
    return (state - 1) / 2_147_483_646
  }
}

// A timetable, not scattered days: real coaches leave on fixed weekdays, and
// the sample response this imitates is exactly that (1, 8, 15, 22, 29
// September - every Tuesday). Two or three departures a week, the same ones
// in both months, so the marked days line up in columns the way they do on
// the site.
function scheduleFor (year: number): { weekdays: Set<number>, basePrice: number } {
  const random = seededRandom(year * 7919)
  const weekdays = new Set<number>()
  const departuresPerWeek = 2 + Math.floor(random() * 2)
  while (weekdays.size < departuresPerWeek) {
    weekdays.add(Math.floor(random() * 7))
  }
  return { weekdays, basePrice: 1800 + Math.floor(random() * 5800) }
}

/**
 * Available dates for one month, or an empty list for any month outside the
 * current one and the next - both because that is all this preview needs,
 * and because a carrier that sells half a year ahead would be its own lie.
 * Past days of the current month are left out: the picker disables them
 * anyway (`:min`), and the endpoint would not return them either.
 */
export function mockAllowedDates (monthIndex: number, year: number): AllowedDateModel[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const monthsAhead = (year - today.getFullYear()) * 12 + (monthIndex - today.getMonth())
  if (monthsAhead < 0 || monthsAhead > 1) {
    return []
  }

  const { weekdays, basePrice } = scheduleFor(year)
  const random = seededRandom(year * 100 + monthIndex + 1)
  const result: AllowedDateModel[] = []

  const cursor = new Date(year, monthIndex, 1)
  while (cursor.getMonth() === monthIndex) {
    if (weekdays.has(cursor.getDay()) && cursor >= today) {
      result.push({
        date: toISODateString(cursor),
        // Around the route's own price, not a flat number: the calendar
        // shows the cheapest day of each date, and identical prices
        // everywhere would misrepresent what that column means.
        minPrice: Math.round(basePrice * (0.9 + random() * 0.25)),
        currency: CURRENCY,
      })
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return result
}
