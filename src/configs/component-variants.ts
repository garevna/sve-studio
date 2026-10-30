// Which page components come in several interchangeable variants, and in
// what order they are offered.
//
// A variant here is a WHOLE COMPONENT, not a flag: TemplateItem imports
// `home-page-components/${block.content}.vue`, so switching variants means
// rewriting the block's `content`. That is unlike a "cards" block, whose
// versions (block.ver) are one component wearing different CSS.
//
// Every variant of one component shares the block's `props`, so anything the
// client set - the heading, its classes - survives the switch. Keep that true
// when adding a variant: a setting only one variant understands belongs to
// that variant's own key inside props, not to a second props shape.
export const COMPONENT_VARIANTS: string[][] = [
  ['PopularDestinationsTheme1', 'PopularDestinationsTheme2', 'PopularDestinationsTheme3'],
]

/** The variant list a component belongs to, or null when it has none. */
export function variantsOf (content: unknown): string[] | null {
  if (typeof content !== 'string') {
    return null
  }
  return COMPONENT_VARIANTS.find(group => group.includes(content)) || null
}

/** 1-based position of `content` among its variants - what the toggle shows. */
export function variantNumber (content: unknown): number {
  const group = variantsOf(content)
  return group && typeof content === 'string' ? group.indexOf(content) + 1 : 0
}
