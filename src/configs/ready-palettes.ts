// Ready palettes: for a client with no designer, who picks a look instead
// of building one. Each is a pair - the day set (worn by «Класика»,
// «Штрих», «Хвиля») and its night for «Неон» with a glow of its own.
//
// Picking one does not touch palette.json - that stays the site's own
// palette, the designer's (and only the palette's sections may write it).
// The choice is global.json `readyPalette`, and the site and the editor put
// the chosen colours over palette.json's (configs/neon-palette.ts,
// sitePalette). No choice: palette.json as it is.
//
// A palette names a few colours (roles); every palette.json key is worked
// out from them (readyDay / readyNight). The state colours - error,
// warning, success, green... - are the site's own and stay as they are.
// Names and descriptions: src/i18n/messages/readyPalettes.json.
//
// NOTE: src/configs/ready-palettes.ts and site/src/configs/ready-palettes.ts
// are identical - keep them so.

export type ReadyDay = {
  bg: string // the page
  text: string
  heading: string
  muted: string // secondary text
  primary: string
  secondary: string // the second accent, and the coloured sections' fill
  tint: string // light fills and lines (cards' borders, accents)
}

export type ReadyNight = {
  bg: string // the night - the page
  bg2: string // the night - what lies on it
  text: string
  muted: string
  primary: string
  secondary: string // the second light
  glow: string // «Неон»'s glow
}

export type ReadyPalette = { id: string, day: ReadyDay, night: ReadyNight }

export const READY_PALETTES: ReadyPalette[] = [
  {
    id: 'harbour',
    day: { bg: '#FFFFFF', text: '#111827', heading: '#152A68', muted: '#455B99', primary: '#152A68', secondary: '#3050B1', tint: '#D4DBF0' },
    night: { bg: '#070A18', bg2: '#0B1024', text: '#E8ECFF', muted: '#B8C2EE', primary: '#7C6CFF', secondary: '#22D3EE', glow: '#C3840F' },
  },
  {
    id: 'lagoon',
    day: { bg: '#F6FBFA', text: '#10201F', heading: '#0F5E63', muted: '#3F6E6C', primary: '#0F5E63', secondary: '#1F8A8A', tint: '#CFE7E4' },
    night: { bg: '#03151A', bg2: '#062229', text: '#E3FBF8', muted: '#9BD3CC', primary: '#2DD4BF', secondary: '#5EEAD4', glow: '#22D3EE' },
  },
  {
    id: 'coral',
    day: { bg: '#FFFFFF', text: '#2A1A17', heading: '#A93A2E', muted: '#7A5048', primary: '#C2453A', secondary: '#D9764A', tint: '#F6D9CB' },
    night: { bg: '#150A0C', bg2: '#22101A', text: '#FFECE6', muted: '#F2B8A8', primary: '#FF6B6B', secondary: '#FFA26B', glow: '#FF4FA3' },
  },
  {
    id: 'graphite',
    day: { bg: '#FAFAF9', text: '#15171A', heading: '#15171A', muted: '#5A6270', primary: '#2B2F36', secondary: '#5A6270', tint: '#E3E5E8' },
    night: { bg: '#09090B', bg2: '#141518', text: '#EDEEF0', muted: '#A9AEB8', primary: '#E6E8EB', secondary: '#A9AEB8', glow: '#3CF29A' },
  },
  {
    id: 'lavender',
    day: { bg: '#FBFAFE', text: '#211A33', heading: '#4B2F96', muted: '#6B5E8C', primary: '#5B3FA8', secondary: '#8C6CD8', tint: '#E6DEF8' },
    night: { bg: '#0D0720', bg2: '#170D33', text: '#F1EAFF', muted: '#C3B2F0', primary: '#B48CFF', secondary: '#E3A6FF', glow: '#E040FB' },
  },
  {
    id: 'forest',
    day: { bg: '#F8FAF6', text: '#17201A', heading: '#2F5D3A', muted: '#55704F', primary: '#2F5D3A', secondary: '#5C8F4A', tint: '#DCE8D4' },
    night: { bg: '#05120B', bg2: '#0A1F13', text: '#E7F7EA', muted: '#A7D3AE', primary: '#5CF28A', secondary: '#B7F36A', glow: '#A3FF4F' },
  },
]

// The palette key that holds a ready palette's glow at night - the
// «Стиль сайту» menu's glow is a palette key, and picking a ready palette
// sets it to this one.
export const READY_GLOW_KEY = 'special'

export function findReadyPalette (id: unknown): ReadyPalette | undefined {
  return READY_PALETTES.find(palette => palette.id === id)
}

function rgb (hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [0, 2, 4].map(i => Number.parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

// a toward b by t (0..1), as #RRGGBB
export function mixHex (a: string, b: string, t: number): string {
  const [x, y] = [rgb(a), rgb(b)]
  return `#${x.map((v, i) => Math.round(v + (y[i]! - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

// Only the keys palette.json has: a key it lacks is not invented here.
function only (palette: Record<string, string>, colors: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(colors).filter(([key]) => key in palette))
}

// The day set, over palette.json's keys.
export function readyDay (ready: ReadyPalette, palette: Record<string, string>): Record<string, string> {
  const d = ready.day
  return only(palette, {
    'main-background': d.bg,
    'homefone': d.bg,
    'white': '#FFFFFF',
    'black': d.text,
    'primary': d.primary,
    'secondary': d.secondary,
    'dark': mixHex(d.muted, d.heading, 0.5),
    'dark-grey': d.muted,
    'blue': mixHex(d.secondary, '#FFFFFF', 0.45),
    'special': mixHex(d.primary, '#FFFFFF', 0.3),
    'grey': mixHex(d.muted, '#FFFFFF', 0.45),
    'accent': d.tint,
    'bright-grey': d.tint,
    'soft-grey': mixHex(d.text, '#FFFFFF', 0.9),
    'light-grey-1': mixHex(d.tint, '#FFFFFF', 0.4),
    'light-grey-2': mixHex(d.tint, '#FFFFFF', 0.65),
    'available-date-fone-color': d.tint,
    'selected-date-first-fone-color': d.secondary,
    'selected-date-first-text-color': '#FFFFFF',
    'selected-dates-fone-color': mixHex(d.secondary, '#FFFFFF', 0.45),
    'selected-dates-text-color': '#FFFFFF',
  })
}

// The night set for «Неон», over palette.json's keys; its glow under
// READY_GLOW_KEY.
export function readyNight (ready: ReadyPalette, palette: Record<string, string>): Record<string, string> {
  const n = ready.night
  return only(palette, {
    'homefone': n.bg,
    'main-background': n.bg2,
    'white': '#FFFFFF',
    'black': n.text,
    'primary': n.primary,
    // the coloured sections' fill: a deep tone of the light, so a section
    // stays night-coloured
    'secondary': mixHex(n.primary, n.bg, 0.55),
    'dark': n.muted,
    'dark-grey': n.muted,
    'blue': n.secondary,
    [READY_GLOW_KEY]: n.glow,
    'grey': mixHex(n.muted, n.bg, 0.45),
    'accent': mixHex(n.primary, n.bg, 0.78),
    'bright-grey': mixHex(n.primary, n.bg, 0.78),
    'soft-grey': mixHex(n.text, n.bg, 0.88),
    'light-grey-1': mixHex(n.text, n.bg, 0.9),
    'light-grey-2': mixHex(n.text, n.bg, 0.93),
    'light-green': mixHex(palette.success ?? '#17A473', n.bg, 0.8),
    'light-warning': mixHex(palette.warning ?? '#C3840F', n.bg, 0.8),
    'available-date-fone-color': mixHex(n.primary, n.bg, 0.78),
    'selected-date-first-fone-color': mixHex(n.primary, n.bg, 0.2),
    'selected-date-first-text-color': '#FFFFFF',
    'selected-dates-fone-color': mixHex(n.primary, n.bg, 0.6),
    'selected-dates-text-color': '#FFFFFF',
    'deep-space-gradient': 'linear-gradient(160deg, var(--homefone) 0%, var(--main-background) 100%)',
    'soft-light-gradient': 'linear-gradient(180deg, var(--main-background) 0%, var(--accent) 100%)',
  })
}
