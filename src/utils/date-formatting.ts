import type { ISODateModel } from '../types/DateModels'

const intervalLength = 5
const oneDay = 1000 * 60 * 60 * 24

export function getIntervalOfDates (startDate: Date | null) {
  if (!startDate) {
    return []
  }
  const result = []
  const ms = Date.parse(toISODateString(startDate))
  for (let i = 0; i < intervalLength; i++) {
    result.push(new Date(ms + i * oneDay))
  }

  return result
}

export function fullDateFormat (date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date).split(', ')[1]
}

export function formatIntervalOfDates (interval: Date[], locale: string) {
  // eslint-disable-next-line unicorn/prefer-at
  const [start, end] = [interval[0] as Date, interval[interval.length - 1] as Date]
  const iso = toISODateString(start) + '-' + toISODateString(end)
  const short = new Intl.DateTimeFormat([locale]).format(start) + '-' + new Intl.DateTimeFormat([locale]).format(end)
  const full = fullDateFormat(start, locale) + '-' + fullDateFormat(end, locale)

  return { iso, short, full }
}

export function formatDate (date: Date, locale: string) {
  const iso = toISODateString(date)
  const short = new Intl.DateTimeFormat([locale]).format(date)
  const full = fullDateFormat(date, locale)

  return { iso, short, full }
}

export function toISODateString (date: Date): ISODateModel {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const result = `${year}-${month}-${day}` as ISODateModel
  return result
}
