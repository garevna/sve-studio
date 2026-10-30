import type { GlobalSettingsModel } from '@/types/GlobalSettingsModel'

// The footer's own column layout, resolved from whatever the designer set in
// the UI Kit. Everything here is optional in global.json, so this module is
// the single place that decides what "not set" means - the editor, the
// preview app and client-side all go through it rather than each carrying
// its own fallback numbers.

export const FOOTER_MIN_COLUMN_WIDTH = 240
export const FOOTER_DEFAULT_COLUMNS = 3
// Matches what client-side's own footer renders today, so a site that has
// never opened the UI Kit looks exactly as it does now.
export const FOOTER_DEFAULT_GAP = 20
// Every footer size is a multiple of 4 - the project's own spacing scale.
export const FOOTER_STEP = 4

// The gap when the designer has set none: it grows with the viewport
// (32 / 48 / 64px) rather than staying one number, because that is what a
// footer actually needs - the columns sit close together on a phone and
// need real air between them on a wide screen. A single stored number
// cannot say that, so it is expressed as Vuetify's own responsive
// column-gap classes and an explicit setting simply overrides it.
export const FOOTER_RESPONSIVE_GAP_CLASS = 'gc-8 gc-md-12 gc-lg-16'
// What that responsive default starts at - shown in the UI Kit's preview,
// which has one fixed width and so can only draw one of the three.
export const FOOTER_RESPONSIVE_GAP_BASE = 32

export type FooterLayoutModel = {
  columns: number
  gap: number
  // Whether that gap is a real setting or just the fallback. The two mean
  // different things on screen - an explicit number is one fixed gap at
  // every width, no setting at all is the responsive default - so the
  // difference has to survive being resolved.
  gapSet: boolean
  // Resolved per column: an explicit width, or null for "share the row
  // equally with the other unset ones".
  widths: (number | null)[]
}

export function snapFooterValue (value: number): number {
  return Math.round(value / FOOTER_STEP) * FOOTER_STEP
}

export function resolveFooterLayout (settings?: Pick<GlobalSettingsModel, 'footer'> | null): FooterLayoutModel {
  const stored = settings?.footer
  // Two or three: four columns was ruled out by the project owner (the
  // responsive rules aren't worth what they'd buy), so an out-of-range
  // stored value is clamped rather than trusted.
  const columns = Math.min(3, Math.max(2, Math.round(stored?.columns ?? FOOTER_DEFAULT_COLUMNS)))
  const gapSet = typeof stored?.gap === 'number'
  const gap = Math.max(0, snapFooterValue(stored?.gap ?? FOOTER_DEFAULT_GAP))
  const widths: (number | null)[] = []
  for (let i = 0; i < columns; i++) {
    const raw = stored?.widths?.[i]
    widths.push(
      typeof raw === 'number' && raw > 0
        ? Math.max(FOOTER_MIN_COLUMN_WIDTH, snapFooterValue(raw))
        : null,
    )
  }
  return { columns, gap, gapSet, widths }
}
