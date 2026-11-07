import type { TemplateBlockModel } from '@/types/TemplateBlockModel'

// The shared look of a "cards"/"carousel" block, handed down to every card
// in it - individual children only override what actually differs about
// them. Lives here rather than in one of the two callers because both the
// page's own top-level cards blocks (DynamicPageTemplate.vue) and the ones
// inside a "Довільний контент" column (SectionWithFreeContent.vue) have to
// hand a card the same defaults, or the same block would look different
// depending on where it sits.
//
// width falls back to 320 to match CardSet.vue's own
// `computed(() => props.item.width || 320)` - without it, a block that
// never set an explicit width (relying on that same fallback for the real
// render) passed `width: undefined` to every card in edit mode, and
// TemplateCard.vue's own cardWidth falls back to '100%' for an unset width,
// stretching every card full-width while editing even though preview and
// production drew them at the correct fixed width all along.
export function cardDefaults (block: TemplateBlockModel): Partial<TemplateBlockModel> {
  return {
    ver: block.ver,
    width: block.width || 320,
    height: block.height,
    size: block.size,
    color: block.color,
    background: block.background,
    cardBackground: block.cardBackground,
    cardStyle: block.cardStyle,
    titleClass: block.titleClass,
    contentClass: block.contentClass,
  }
}

// A tabs block's cards are its panels, each as wide as the block: the same
// defaults minus the card width.
export function tabCardDefaults (block: TemplateBlockModel): Partial<TemplateBlockModel> {
  return { ...cardDefaults(block), width: 0 }
}
