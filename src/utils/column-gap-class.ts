// Reads/writes a column-gap Vuetify spacing utility inside a class string,
// touching nothing else in it. Exactly the same idea as
// margin-bottom-class.ts does for mb-N, and for the same reason: Vuetify
// generates gc-0..gc-16 in 4px steps, so storing the CHOICE as a class gives
// the "always a multiple of 4" guarantee for free - no px field to validate,
// no custom CSS, and the value stays readable in the saved JSON.
//
// gc-N is column-gap only. A `ga-N` token sets both axes at once, so it is
// decomposed into `gr-N` (keeping the original row gap) plus the new gc-N
// rather than left to fight it - same treatment margin-bottom-class.ts gives
// the `my-N` shorthand.
const GC_RE = /\bgc-(\d+)\b/
const GA_RE = /\bga-(\d+)\b/
const MAX_STEP = 16

export const COLUMN_GAP_STEP_PX = 4
export const MAX_COLUMN_GAP_PX = MAX_STEP * COLUMN_GAP_STEP_PX

// The choices offered in the menu: every step Vuetify actually generates.
// A finite list is the point - it's what makes this a pick, not a number to
// type and then validate.
export const COLUMN_GAP_OPTIONS: number[] = Array.from(
  { length: MAX_STEP + 1 },
  (_, step) => step * COLUMN_GAP_STEP_PX,
)

export function readColumnGapPx (classString?: string): number {
  if (!classString) {
    return 0
  }
  const gc = classString.match(GC_RE)
  if (gc?.[1]) {
    return Number(gc[1]) * COLUMN_GAP_STEP_PX
  }
  const ga = classString.match(GA_RE)
  if (ga?.[1]) {
    return Number(ga[1]) * COLUMN_GAP_STEP_PX
  }
  return 0
}

export function writeColumnGapPx (classString: string | undefined, px: number): string {
  const step = Math.max(0, Math.min(MAX_STEP, Math.round(px / COLUMN_GAP_STEP_PX)))
  const tokens = (classString || '').split(/\s+/).filter(Boolean)
  const gaValue = tokens.find(token => GA_RE.test(token))?.match(GA_RE)?.[1]

  const kept = tokens.filter(token => !GC_RE.test(token) && !GA_RE.test(token))
  if (gaValue) {
    kept.push(`gr-${gaValue}`)
  }
  if (step > 0) {
    kept.push(`gc-${step}`)
  }

  return kept.join(' ')
}
