// The layouts the top of a site can take, as the editor lists them. Which
// one is used is global.json `heroVariant` - the same shape and place as
// footerVariant: a number that picks which COMPONENT draws that part of the
// page, while the content it draws lives elsewhere. The ids, defaults and
// per-layout settings live in configs/header-layout.ts, shared with the
// preview app.
import { HERO_WITH_TITLE_VARIANT } from './header-layout'

export { DEFAULT_HERO_VARIANT, resolveHeroVariant } from './header-layout'

export type HeroVariant = {
  id: number
  title: string
  description: string
  // Has its own settings (company-name corner, menu bar colour).
  configurable?: boolean
}

export const HERO_VARIANTS: HeroVariant[] = [
  {
    id: 1,
    title: 'Банер з пошуком поїздки',
    description: 'Меню зверху, під ним карусель банерів на всю ширину і панель пошуку: міста, дата, пасажири. Для перевізників.',
  },
  {
    id: HERO_WITH_TITLE_VARIANT,
    title: 'Паралакс-банер з назвою компанії',
    description: 'Банер на всю ширину з паралаксом і великою назвою компанії в одному з кутів. Меню — під банером, при прокручуванні тримається вгорі.',
    configurable: true,
  },
]
