// The footer's look, chosen in the footer editor and kept on the footer
// block itself (`ver`), next to the content it shows - like the hero, the
// variant names the component, not the content. Same file in both apps.
export const FOOTER_VARIANTS = [
  { id: 1, title: 'Класичний', icon: 'mdi-view-column-outline' },
  // A wave for its top edge, the company's name across the bottom.
  { id: 2, title: 'Горизонт', icon: 'mdi-waves' },
  // A big invitation to get in touch over the columns, which line up below.
  { id: 3, title: 'Фінальний кадр', icon: 'mdi-movie-open-outline' },
  // The columns as tiles of different sizes in an asymmetric grid.
  { id: 4, title: 'Bento', icon: 'mdi-view-dashboard-outline' },
] as const

export const FOOTER_HORIZON = 2
export const FOOTER_FINAL_FRAME = 3
export const FOOTER_BENTO = 4

// "Фінальний кадр" until the site sets its own words (ctaTitle / ctaText).
export const FOOTER_CTA_DEFAULTS: Record<string, { title: string, text: string }> = {
  uk: { title: 'Поговорімо?', text: 'Ми на зв’язку щодня - оберіть зручний спосіб нижче.' },
  en: { title: 'Let’s talk?', text: 'We are in touch every day - pick the way that suits you below.' },
  de: { title: 'Lass uns reden?', text: 'Wir sind jeden Tag erreichbar - wählen Sie unten den passenden Weg.' },
}

export function resolveFooterVariant (ver: number | undefined): number {
  return FOOTER_VARIANTS.some(variant => variant.id === ver) ? ver! : 1
}
