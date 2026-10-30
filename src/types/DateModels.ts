/* eslint-disable @stylistic/no-multi-spaces */

// type DecimalModel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
// type ValidModel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
// type BinModel = '0' | '1'
// type StartYearModel = '2' | '3' | '4' | '5'
// type YearModel = `20${StartYearModel}${DecimalModel}`
// type MonthModel = `0${ValidModel}` | '10' | `11` | `12`
// type DataModel = `0${ValidModel}` | `1${DecimalModel}` | `2${DecimalModel}` | `3${BinModel}`

type TYear         = `${number}${number}${number}${number}`
type TMonth        = `${number}${number}`
type TDay          = `${number}${number}`
type THours        = `${number}${number}`
type TMinutes      = `${number}${number}`
type TSeconds      = `${number}${number}`
type TMilliseconds = `${number}${number}${number}`

type TDateISOTime = `${THours}:${TMinutes}:${TSeconds}.${TMilliseconds}`

export type ISODateModel = `${TYear}-${TMonth}-${TDay}`
export type DateISOModel = `${ISODateModel}T${TDateISOTime}Z`
