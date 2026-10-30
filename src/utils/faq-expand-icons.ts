// The FAQ accordion's expand/collapse chevron, as a small fixed set of
// PAIRS rather than a free icon search. Vuetify's v-expansion-panel-title
// takes two separate icons (expand-icon shown while collapsed, collapse-icon
// while open, defaulting to $expand/$collapse = mdi-chevron-down/up), and
// they only ever read correctly as a matched pair pointing opposite ways -
// a search field over all ~7000 mdi names (what this used to be) invites
// picking two unrelated glyphs, and costs a 165 kB lazy chunk of icon names
// for a setting with maybe five sensible answers.
export type FaqExpandIconPair = {
  expand: string
  collapse: string
  label: string
  // What the PICKER's own toolbar button shows once this pair is selected.
  // Only needed when the expand icon would collide with another button on
  // the same toolbar: mdi-plus there would sit right next to "add a
  // question" and read as a second add button. Defaults to `expand`.
  toolbarIcon?: string
}

// Chevron first: it's Vuetify's own default, so it's what an FAQ block that
// has never had this set actually renders.
export const FAQ_EXPAND_ICON_PAIRS: FaqExpandIconPair[] = [
  { expand: 'mdi-chevron-down', collapse: 'mdi-chevron-up', label: 'Шеврон (типово)' },
  { expand: 'mdi-plus', collapse: 'mdi-minus', label: 'Плюс / мінус', toolbarIcon: 'mdi-plus-minus-box' },
  { expand: 'mdi-menu-down', collapse: 'mdi-menu-up', label: 'Трикутник' },
  { expand: 'mdi-arrow-down-drop-circle', collapse: 'mdi-arrow-up-drop-circle', label: 'Стрілка в колі' },
  { expand: 'mdi-arrow-down-drop-circle-outline', collapse: 'mdi-arrow-up-drop-circle-outline', label: 'Стрілка в колі (контур)' },
]

// Resolves what the accordion should actually render, as a COMPLETE pair.
// The two icons are stored as two independent fields on the block, but they
// are only ever meaningful together, so the pair table - not the stored
// collapseIcon - is the authority whenever it can be: a block whose
// expandIcon is a known pair member always gets that pair's own partner,
// which self-heals every way the two fields can disagree (a block saved
// before collapseIcon existed and carrying only expandIcon; a stored
// collapseIcon left behind by an earlier pick; a write that only landed on
// one of the two). Only an expandIcon that isn't in the table at all - a
// leftover from the free-search picker this replaced - falls through to
// whatever was stored beside it.
//
// '' for either half means "unset": the caller passes undefined through, and
// Vuetify falls back to its own $expand/$collapse (mdi-chevron-down/up).
export function resolveIconPair (expandIcon: string | undefined, collapseIcon: string | undefined): { expand: string, collapse: string } {
  if (!expandIcon) {
    return { expand: '', collapse: '' }
  }
  const known = FAQ_EXPAND_ICON_PAIRS.find(pair => pair.expand === expandIcon)
  if (known) {
    return { expand: known.expand, collapse: known.collapse }
  }
  return { expand: expandIcon, collapse: collapseIcon || '' }
}

// The icon the picker's own toolbar button wears for the currently selected
// pair - see FaqExpandIconPair.toolbarIcon. Falls back to the chevron for a
// block that has never had this set (Vuetify's own default).
export function toolbarIconFor (expandIcon: string | undefined): string {
  const pair = FAQ_EXPAND_ICON_PAIRS.find(p => p.expand === expandIcon)
  return pair?.toolbarIcon ?? pair?.expand ?? FAQ_EXPAND_ICON_PAIRS[0]!.expand
}
