// Reads/writes a margin-bottom Vuetify spacing utility inside a class
// string, touching nothing else in it. Vuetify generates mb-0..mb-16 in
// exact 4px steps (default 4px spacer) - clamping to that range is what
// gives the "always a multiple of 4" vertical-rhythm guarantee for free,
// no custom CSS or px math needed.
const MB_RE = /\bmb-(\d+)\b/
const MY_RE = /\bmy-(\d+)\b/
const MAX_STEP = 16

export function readMarginBottomPx (classString?: string): number {
  if (!classString) {
    return 0
  }
  const mb = classString.match(MB_RE)
  if (mb?.[1]) {
    return Number(mb[1]) * 4
  }
  const my = classString.match(MY_RE)
  if (my?.[1]) {
    return Number(my[1]) * 4
  }
  return 0
}

// Some existing defaults (default-classes.ts) bake their margin into a `my-N`
// shorthand (both top and bottom in one token) - layering a separate mb-N
// class alongside it would leave two same-specificity, non-!important rules
// both setting margin-bottom, with the winner decided by Vuetify's generated
// CSS source order rather than anything meaningful. So a `my-N` token is
// decomposed into `mt-N` (preserving the original top value) + the new
// mb-<value> instead of ever coexisting with a fresh mb-N.
export function writeMarginBottomPx (classString: string | undefined, px: number): string {
  const step = Math.max(0, Math.min(MAX_STEP, Math.round(px / 4)))
  const tokens = (classString || '').split(/\s+/).filter(Boolean)
  const myToken = tokens.find(token => MY_RE.test(token))
  const myValue = myToken?.match(MY_RE)?.[1]

  const kept = tokens.filter(token => !MB_RE.test(token) && !MY_RE.test(token))
  if (myValue) {
    kept.push(`mt-${myValue}`)
  }
  if (step > 0) {
    kept.push(`mb-${step}`)
  }

  return kept.join(' ')
}
