import type { TemplateBlockModel } from '@/types/TemplateBlockModel'

export type ImageDeviceVariant = 'desktop' | 'mobile'

// Production toggles these two classes via CSS media queries (see
// .desktop-mode/.mobile-mode in common.css) - real page data often combines
// the toggle class with spacing utilities (e.g. "desktop-mode mt-12", see
// contacts-page.json), so this checks class TOKENS, not the whole string.
export function imageBlockVariant (block?: TemplateBlockModel): ImageDeviceVariant | null {
  if (block?.type !== 'image' || !block.class) {
    return null
  }
  const classes = block.class.split(/\s+/)
  if (classes.includes('desktop-mode')) {
    return 'desktop'
  }
  if (classes.includes('mobile-mode')) {
    return 'mobile'
  }
  return null
}

// A desktop/mobile pair is always the two blocks immediately adjacent to
// each other - see EditorView.vue's "image-desktop-mobile" picker entry,
// the only place that creates one.
export function imagePairSiblingIndex (blocks: TemplateBlockModel[], index: number): number | null {
  const own = imageBlockVariant(blocks[index])
  if (!own) {
    return null
  }
  const next = imageBlockVariant(blocks[index + 1])
  if (next && next !== own) {
    return index + 1
  }
  const prev = imageBlockVariant(blocks[index - 1])
  if (prev && prev !== own) {
    return index - 1
  }
  return null
}

// True when `index` is the second half of a desktop/mobile pair - the pair
// renders once, as a single tabbed unit anchored at the lower index (see
// DynamicPageTemplate.vue), so the page's block loop must skip rendering
// this half a second time in edit mode. Preview/production rendering never
// calls this - both halves render independently there, exactly like
// production's own CSS-toggled pair.
export function isSecondHalfOfImagePair (blocks: TemplateBlockModel[], index: number): boolean {
  const sibling = imagePairSiblingIndex(blocks, index)
  return sibling !== null && sibling < index
}
