// «Неон» has a palette of its own. Glowing glass needs the night around it:
// a light page turns the glass into grey slabs, so while the whole site
// wears «Неон» (configs/site-style.ts) it takes this set of colours instead
// of palette.json's - and everything that reads the palette (the site's
// stylesheets, the colour classes, Vuetify's theme) goes dark at once.
//
// The same keys as palette.json, never new ones: the blocks and stylesheets
// keep naming the same colours. NEON_PALETTE is the starting set; the
// client's own changes (the Palette screen's «Неон» tab) are kept in
// global.json `neonPalette`, over it. A key neither has (a gradient the
// client added later) keeps its palette.json value.
//
// NOTE: src/configs/neon-palette.ts and site/src/configs/neon-palette.ts
// are identical - keep them so.
import { resolveSiteStyle } from './site-style'

export const NEON_PALETTE: Record<string, string> = {
  // the night: the page and what lies on it
  'homefone': '#070A18',
  'main-background': '#0B1024',
  // the text - a light, slightly cold white
  'black': '#E8ECFF',
  // the light itself: violet for headings and buttons; deep indigo for
  // the coloured sections, so a section stays night-coloured
  'primary': '#7C6CFF',
  'secondary': '#2A2F7F',
  'dark': '#A9B4E8',
  'dark-grey': '#B8C2EE',
  // two more lights for the glow to choose from (the «Стиль сайту»
  // menu): cyan and magenta, beside gold (warning) and green
  'special': '#E040FB',
  'blue': '#22D3EE',
  'grey': '#6B7598',
  // what were light fills and lines: dark tones now
  'accent': '#2A3466',
  'bright-grey': '#2A3466',
  'soft-grey': '#1C2342',
  'light-grey-1': '#1A2140',
  'light-grey-2': '#141A33',
  'light-green': '#0F2A22',
  'light-warning': '#2E2410',
  'available-date-fone-color': '#2A3466',
  // a section's fill and a subheading's colour at once - a violet that
  // carries white text and still reads on the night
  'selected-date-first-fone-color': '#5B4BDB',
  'selected-dates-fone-color': '#3B4577',
  // gradients built on «black» would turn light - from the night instead
  'deep-space-gradient': 'linear-gradient(160deg, var(--homefone) 0%, var(--main-background) 100%)',
  'soft-light-gradient': 'linear-gradient(180deg, var(--main-background) 0%, var(--accent) 100%)',
}

// The «Неон» set for this palette: the client's value, else the starting
// one, else the palette's own - for palette.json's keys only.
export function neonPalette (palette: Record<string, string>, own?: Record<string, string> | null): Record<string, string> {
  return Object.fromEntries(Object.entries(palette).map(([key, value]) => [key, own?.[key] ?? NEON_PALETTE[key] ?? value]))
}

// The colours the site wears: «Неон»'s while the whole site wears it.
export function sitePalette (palette: Record<string, string>, settings?: { siteStyle?: unknown, neonPalette?: Record<string, string> } | null): Record<string, string> {
  return resolveSiteStyle(settings?.siteStyle) === 'neon' ? neonPalette(palette, settings?.neonPalette) : palette
}
