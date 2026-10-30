// The footer's look, chosen in the footer editor and kept on the footer
// block itself (`ver`), next to the content it shows - like the hero, the
// variant names the component, not the content. Same file in both apps.
export const FOOTER_VARIANTS = [
  { id: 1, title: 'Класичний', icon: 'mdi-view-column-outline' },
  // A wave for its top edge, the company's name across the bottom.
  { id: 2, title: 'Горизонт', icon: 'mdi-waves' },
] as const

export const FOOTER_HORIZON = 2

export function resolveFooterVariant (ver: number | undefined): number {
  return FOOTER_VARIANTS.some(variant => variant.id === ver) ? ver! : 1
}
