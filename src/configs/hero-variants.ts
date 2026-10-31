// The layouts the top of a site can take, as the editor lists them. Which
// one is used is global.json `heroVariant` - the same shape and place as
// footerVariant: a number that picks which COMPONENT draws that part of the
// page, while the content it draws lives elsewhere. The ids, defaults and
// per-layout settings live in configs/header-layout.ts, shared with the
// preview app. Titles and descriptions: src/i18n/messages/header.json,
// variants.<id>.
import { HERO_SPLIT_VARIANT, HERO_WITH_TITLE_VARIANT } from './header-layout'

export { DEFAULT_HERO_VARIANT, resolveHeroVariant } from './header-layout'

export type HeroVariant = {
  id: number
  // Which of its own settings the layout has, besides the menu bar colour
  // every layout has: the company-name corner, or the fill and tagline.
  settings?: 'title' | 'split'
}

export const HERO_VARIANTS: HeroVariant[] = [
  { id: 1 },
  { id: HERO_WITH_TITLE_VARIANT, settings: 'title' },
  { id: HERO_SPLIT_VARIANT, settings: 'split' },
]
