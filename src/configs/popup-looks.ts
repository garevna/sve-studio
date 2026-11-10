import type { PopupCalendarModel, PopupLookModel, PopupModel, PopupsDocument } from '@/types/TemplateBlockModel'

// How popups look (the "model" of a popup, as against its texts): our base
// variants, which a client takes into their own set in the UI Kit
// ("Попапи"), sets up and names; each popup then picks one of the set by
// name. The frame itself is content/styles/popups.css - a look only puts
// its class and its colours on it. The site's copy is
// site/src/configs/popup-looks.ts - keep the two the same.
//
//   centered - everything on one axis: title, text and buttons in the
//              middle, a message's sign above its text
//   classic  - a dialog: title and text from the left, the buttons at the
//              right end of their row
//   header   - the title on a strip of colour across the top

export const POPUP_LOOK_BASES: { id: PopupLookModel['base'], icon: string }[] = [
  { id: 'centered', icon: 'mdi-format-align-center' },
  { id: 'classic', icon: 'mdi-format-align-left' },
  { id: 'header', icon: 'mdi-page-layout-header' },
]

export const DEFAULT_LOOK_ID = 'look-main'

// Where a look leaves something unset.
export const LOOK_DEFAULTS = {
  background: 'white',
  headerBackground: 'primary',
  radius: 'large-border-radius',
  closeColor: 'grey',
  main: 'primary-button',
  second: 'outlined-button',
}

export function newLook (base: PopupLookModel['base'], name: string, id: string): PopupLookModel {
  return { id, name, base }
}

// The set with a look in it whatever was stored: a document from before
// looks had its buttons at the top; they become the first look's.
export function withDefaultLooks (document: PopupsDocument | null | undefined): PopupLookModel[] {
  const looks = document?.looks ?? []
  if (looks.length > 0) {
    return looks
  }
  return [{ ...newLook('centered', 'Основний', DEFAULT_LOOK_ID), buttons: document?.buttons ? { ...document.buttons } : undefined }]
}

export function lookOf (looks: PopupLookModel[], popup: PopupModel | null | undefined): PopupLookModel {
  return looks.find(look => look.id === popup?.look) ?? looks[0] ?? newLook('centered', '', DEFAULT_LOOK_ID)
}

// What the frame (.pw-popup) gets from a look: its class, and its colours as
// the variables content/styles/popups.css reads.
export function lookFrame (look: PopupLookModel): { class: string, style: Record<string, string> } {
  return {
    class: `pw-popup--look-${look.base}`,
    style: {
      '--pw-popup-bg': `var(--${look.background || LOOK_DEFAULTS.background})`,
      '--pw-popup-head-bg': `var(--${look.headerBackground || LOOK_DEFAULTS.headerBackground})`,
      '--pw-popup-radius': `var(--${look.radius || LOOK_DEFAULTS.radius})`,
      '--pw-popup-close': `var(--${look.closeColor || LOOK_DEFAULTS.closeColor})`,
    },
  }
}

// The title's and the text's format: the popup's own, else its look's. Set,
// it replaces the frame's own type (popups.css .pw-popup__title--own).
export function titleClassOf (look: PopupLookModel, popup: PopupModel): string {
  return popup.titleClass || look.titleClass || ''
}
export function textClassOf (look: PopupLookModel, popup: PopupModel): string {
  return popup.textClass || look.textClass || ''
}

export function lookButtons (look: PopupLookModel): { main: string, second: string } {
  return { main: look.buttons?.main || LOOK_DEFAULTS.main, second: look.buttons?.second || LOOK_DEFAULTS.second }
}

// --- calendars (UI Kit "Календар") ---------------------------------------------
// A calendar is the date popup's window itself: its strip with the month
// and the arrows is the window's header (no title bar above it), then the
// day names, the days, the buttons. Two presets to start from; choosing one
// fills every detail, and each detail can then be changed on its own.
//   simple   - Vuetify's own calendar: month and year pickers, chevrons
//   material - Vuetify's classic Material picker: a coloured header with the
//              popup's title and the chosen date large, then the month
//   weeks    - the simple one with the week numbers down the left
//   extended - the client's design (content/styles/date-picker.css
//              .custom-date-picker): the month large on a coloured strip,
//              arrows at the right, two-letter day names
//   vertical - turned on its side: the day names down the left, a week
//              a column
//   tiles    - every day a tile of its own, like keys
//   lines    - plain and strict: the day names in capitals over a thin
//              line, the weekend in the "today" colour
export const CALENDAR_VARIANTS: { id: PopupCalendarModel['variant'], icon: string }[] = [
  { id: 'simple', icon: 'mdi-calendar-blank-outline' },
  { id: 'material', icon: 'mdi-calendar-text-outline' },
  { id: 'weeks', icon: 'mdi-calendar-week-outline' },
  { id: 'extended', icon: 'mdi-calendar-month-outline' },
  { id: 'vertical', icon: 'mdi-calendar-blank-multiple' },
  { id: 'tiles', icon: 'mdi-view-grid-outline' },
  { id: 'lines', icon: 'mdi-table-row' },
]

export const CALENDAR_PRESETS: Record<PopupCalendarModel['variant'], Omit<PopupCalendarModel, 'id' | 'name' | 'variant' | 'radius' | 'buttons'>> = {
  simple: {
    headerBackground: 'white',
    headerColor: 'black',
    monthWeight: 600,
    prevIcon: 'mdi-chevron-left',
    nextIcon: 'mdi-chevron-right',
    weekdayFormat: 'narrow',
    weekdayColor: 'grey',
    dayRadius: 99,
    selectedColor: 'primary',
    selectedTextColor: 'white',
    todayColor: 'primary',
    firstDayOfWeek: 1,
  },
  material: {
    headerBackground: 'primary',
    headerColor: 'white',
    monthWeight: 600,
    prevIcon: 'mdi-chevron-left',
    nextIcon: 'mdi-chevron-right',
    weekdayFormat: 'narrow',
    weekdayColor: 'grey',
    dayRadius: 99,
    selectedColor: 'primary',
    selectedTextColor: 'white',
    todayColor: 'primary',
    firstDayOfWeek: 1,
  },
  weeks: {
    headerBackground: 'white',
    headerColor: 'black',
    monthWeight: 600,
    prevIcon: 'mdi-chevron-left',
    nextIcon: 'mdi-chevron-right',
    weekdayFormat: 'short',
    weekdayColor: 'grey',
    dayRadius: 6,
    selectedColor: 'secondary',
    selectedTextColor: 'white',
    todayColor: 'secondary',
    firstDayOfWeek: 1,
  },
  extended: {
    headerBackground: 'bright-grey',
    headerColor: 'primary',
    monthWeight: 600,
    prevIcon: 'mdi-arrow-left',
    nextIcon: 'mdi-arrow-right',
    weekdayFormat: 'short',
    weekdayColor: 'blue',
    dayRadius: 99,
    selectedColor: 'primary',
    selectedTextColor: 'white',
    todayColor: 'primary',
    firstDayOfWeek: 1,
  },
  vertical: {
    headerBackground: 'light-grey-2',
    headerColor: 'primary',
    monthWeight: 600,
    prevIcon: 'mdi-chevron-left',
    nextIcon: 'mdi-chevron-right',
    weekdayFormat: 'short',
    weekdayColor: 'secondary',
    dayRadius: 99,
    selectedColor: 'primary',
    selectedTextColor: 'white',
    todayColor: 'secondary',
    firstDayOfWeek: 1,
  },
  tiles: {
    headerBackground: 'white',
    headerColor: 'black',
    monthWeight: 600,
    prevIcon: 'mdi-chevron-left',
    nextIcon: 'mdi-chevron-right',
    weekdayFormat: 'short',
    weekdayColor: 'grey',
    dayRadius: 8,
    selectedColor: 'secondary',
    selectedTextColor: 'white',
    todayColor: 'primary',
    firstDayOfWeek: 1,
  },
  lines: {
    headerBackground: 'white',
    headerColor: 'primary',
    monthWeight: 600,
    prevIcon: 'mdi-arrow-left',
    nextIcon: 'mdi-arrow-right',
    weekdayFormat: 'short',
    weekdayColor: 'dark-grey',
    dayRadius: 2,
    selectedColor: 'black',
    selectedTextColor: 'white',
    todayColor: 'secondary',
    firstDayOfWeek: 1,
  },
}

// Editor only: colour schemes for a calendar - palette keys that go well
// together, for every coloured part at once (the strip and its text, the day
// names, the chosen day and its digits, today). One click instead of six
// colours; each can still be changed after.
export type CalendarColours = Pick<PopupCalendarModel, 'headerBackground' | 'headerColor' | 'weekdayColor' | 'selectedColor' | 'selectedTextColor' | 'todayColor'>
export const CALENDAR_SCHEMES: { id: string, colours: CalendarColours }[] = [
  { id: 'light', colours: { headerBackground: 'bright-grey', headerColor: 'primary', weekdayColor: 'blue', selectedColor: 'primary', selectedTextColor: 'white', todayColor: 'secondary' } },
  { id: 'deep', colours: { headerBackground: 'primary', headerColor: 'white', weekdayColor: 'dark-grey', selectedColor: 'secondary', selectedTextColor: 'white', todayColor: 'primary' } },
  { id: 'airy', colours: { headerBackground: 'white', headerColor: 'secondary', weekdayColor: 'special', selectedColor: 'secondary', selectedTextColor: 'white', todayColor: 'secondary' } },
  { id: 'quiet', colours: { headerBackground: 'light-grey-2', headerColor: 'black', weekdayColor: 'grey', selectedColor: 'black', selectedTextColor: 'white', todayColor: 'dark-grey' } },
  { id: 'night', colours: { headerBackground: 'black', headerColor: 'white', weekdayColor: 'grey', selectedColor: 'secondary', selectedTextColor: 'white', todayColor: 'secondary' } },
  { id: 'green', colours: { headerBackground: 'light-green', headerColor: 'green', weekdayColor: 'special', selectedColor: 'green', selectedTextColor: 'white', todayColor: 'success' } },
]

export const DEFAULT_CALENDAR_ID = 'calendar-main'

export function newCalendar (variant: PopupCalendarModel['variant'], name: string, id: string): PopupCalendarModel {
  return { id, name, variant, ...CALENDAR_PRESETS[variant] }
}

export function withDefaultCalendars (document: PopupsDocument | null | undefined): PopupCalendarModel[] {
  const calendars = document?.calendars ?? []
  return calendars.length > 0 ? calendars : [newCalendar('extended', 'Календар', DEFAULT_CALENDAR_ID)]
}

export function calendarOf (calendars: PopupCalendarModel[], popup: PopupModel | null | undefined): PopupCalendarModel {
  return calendars.find(calendar => calendar.id === popup?.calendar) ?? calendars[0] ?? newCalendar('extended', '', DEFAULT_CALENDAR_ID)
}

// What a calendar puts on v-date-picker: a detail it leaves unset is its
// preset's.
export function calendarProps (calendar: PopupCalendarModel) {
  // the variants drawn on the client's strip (month large, arrows at the right)
  const extended = ['extended', 'vertical', 'tiles', 'lines'].includes(calendar.variant)
  const c = { ...CALENDAR_PRESETS[calendar.variant], ...Object.fromEntries(Object.entries(calendar).filter(([, value]) => value !== undefined && value !== '')) } as PopupCalendarModel
  const radius = (c.dayRadius ?? 99) >= 99 ? '50%' : `${c.dayRadius}px`
  return {
    class: ['pw-calendar', `pw-calendar--${calendar.variant}`, extended ? 'custom-date-picker' : ''],
    style: {
      '--pw-cal-head-bg': `var(--${c.headerBackground})`,
      '--pw-cal-head-fg': `var(--${c.headerColor})`,
      '--pw-cal-month-weight': String(c.monthWeight ?? 600),
      '--pw-cal-weekday': `var(--${c.weekdayColor})`,
      '--pw-cal-day-radius': radius,
      '--pw-cal-sel-bg': `var(--${c.selectedColor})`,
      '--pw-cal-sel-fg': `var(--${c.selectedTextColor})`,
      '--pw-cal-today': `var(--${c.todayColor})`,
    },
    color: c.selectedColor || 'primary',
    firstDayOfWeek: c.firstDayOfWeek ?? 1,
    weekdayFormat: c.weekdayFormat ?? 'narrow',
    controlVariant: extended ? 'modal' as const : 'docked' as const,
    prevIcon: c.prevIcon || 'mdi-chevron-left',
    nextIcon: c.nextIcon || 'mdi-chevron-right',
    // material: Vuetify's own header, with the popup's title and the date
    hideHeader: calendar.variant !== 'material',
    showWeek: calendar.variant === 'weeks',
  }
}

// A date popup's window: its calendar may have corners and buttons of its
// own, over the popup's look.
export function frameFor (look: PopupLookModel, popup: PopupModel | null | undefined, calendar?: PopupCalendarModel) {
  const frame = lookFrame(look)
  if (popup?.kind === 'date' && calendar?.radius) {
    frame.style['--pw-popup-radius'] = `var(--${calendar.radius})`
  }
  return frame
}
export function buttonsFor (look: PopupLookModel, popup: PopupModel | null | undefined, calendar?: PopupCalendarModel) {
  const buttons = lookButtons(look)
  if (popup?.kind === 'date') {
    return { main: calendar?.buttons?.main || buttons.main, second: calendar?.buttons?.second || buttons.second }
  }
  return buttons
}
