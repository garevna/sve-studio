// The API returns a journey's length as a fraction of hours (40.9). Rounded
// to the minute and spelled out, because "40.9 год" is not how anyone reads a
// journey time. Minutes are dropped when there are none, so a round trip
// reads "4 год" rather than "4 год 0 хв".
//
// Shared by every "Популярні напрямки" variant that shows a duration - it was
// written for the cards (Theme2) and copied nowhere: a second variant showing
// the same number a different way would be a bug, not a variant.
const DURATION_UNITS: Record<string, { hour: string, minute: string }> = {
  uk: { hour: 'год', minute: 'хв' },
  en: { hour: 'h', minute: 'min' },
  de: { hour: 'Std.', minute: 'Min.' },
}

export function formatTripDuration (hours: number | undefined, locale: string): string {
  if (!hours || hours <= 0) {
    return ''
  }
  const units = DURATION_UNITS[locale] || DURATION_UNITS.uk!
  const total = Math.round(hours * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return m === 0 ? `${h} ${units.hour}` : `${h} ${units.hour} ${m} ${units.minute}`
}

// Distance comes back in kilometres, as a whole number.
const DISTANCE_UNITS: Record<string, string> = {
  uk: 'км',
  en: 'km',
  de: 'km',
}

export function formatTripDistance (km: number | undefined, locale: string): string {
  if (!km || km <= 0) {
    return ''
  }
  return `${km} ${DISTANCE_UNITS[locale] || DISTANCE_UNITS.uk}`
}
