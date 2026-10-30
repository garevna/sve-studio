// The footer's column layout, as the designer set it in the visual editor's
// UI Kit (stored in global.json under `footer`). Mirrors that app's own
// configs/footer-layout.ts - the two must agree on what "not set" means, or
// the editor shows one footer and the site renders another.
export const FOOTER_MIN_COLUMN_WIDTH = 240
export const FOOTER_DEFAULT_COLUMNS = 3
export const FOOTER_DEFAULT_GAP = 20
export const FOOTER_STEP = 4

// The gap when the designer has set none: it grows with the viewport
// (32 / 48 / 64px) rather than staying one number - the columns sit close
// together on a phone and need real air between them on a wide screen. A
// single stored number cannot say that, so it is expressed as Vuetify's own
// responsive column-gap classes and an explicit setting simply overrides it.
export const FOOTER_RESPONSIVE_GAP_CLASS = 'gc-8 gc-md-12 gc-lg-16'

export type FooterSettingsModel = {
  columns?: number
  gap?: number
  widths?: number[]
}

export type FooterLayoutModel = {
  columns: number
  gap: number
  // Whether that gap is a real setting or just the fallback - an explicit
  // number is one fixed gap at every width, no setting at all is the
  // responsive default, and the difference has to survive being resolved.
  gapSet: boolean
  // Per column: an explicit width, or null for "as wide as its content".
  widths: (number | null)[]
}

function snap (value: number): number {
  return Math.round(value / FOOTER_STEP) * FOOTER_STEP
}

export function resolveFooterLayout (stored?: FooterSettingsModel | null): FooterLayoutModel {
  // Two or three: four columns was ruled out by the project owner, so an
  // out-of-range stored value is clamped rather than trusted.
  const columns = Math.min(3, Math.max(2, Math.round(stored?.columns ?? FOOTER_DEFAULT_COLUMNS)))
  const gapSet = typeof stored?.gap === 'number'
  const gap = Math.max(0, snap(stored?.gap ?? FOOTER_DEFAULT_GAP))
  const widths: (number | null)[] = []
  for (let i = 0; i < columns; i++) {
    const raw = stored?.widths?.[i]
    widths.push(
      typeof raw === 'number' && raw > 0
        ? Math.max(FOOTER_MIN_COLUMN_WIDTH, snap(raw))
        : null,
    )
  }
  return { columns, gap, gapSet, widths }
}

export function footerGapClass (layout: FooterLayoutModel): string {
  return layout.gapSet
    ? `gc-${Math.min(16, Math.max(0, layout.gap / 4))}`
    : FOOTER_RESPONSIVE_GAP_CLASS
}
