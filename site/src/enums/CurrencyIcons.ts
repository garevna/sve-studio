export enum CurrencyIcons {
  UAH = 'mdi-currency-uah',
  EUR = 'mdi-currency-eur',
  USD = 'mdi-currency-usd',
  PER = 'mdi-percent-outline',
}

export type CurrencyIconModel = `${CurrencyIcons}`

export const icons = Object.fromEntries(
  Object.entries(CurrencyIcons).filter(([key]) => key !== 'PER'),
)

export const DEFAULT_CURRENCY = 'UAH'
