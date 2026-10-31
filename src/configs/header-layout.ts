// The top of the site: which layout it uses and that layout's own settings.
// Same file in the site (site/src/configs/) - keep the two in
// step.
//
// global.json:
//   heroVariant - which layout (1, 2, ...);
//   header      - settings of the layouts that have any:
//     titlePosition - corner of the banner the company name sits in (2);
//     menuTheme     - black or white menu bar; every text, outline and
//                     icon on it follows (2, 3);
//     background    - palette key the split banner is filled with (3);
//                     a dark one - the text on it is white;
//     tagline       - the line under the company name (3), per language.

export type TitlePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type MenuTheme = 'light' | 'dark'
export type HeaderTagline = { uk: string, en: string, de: string }

export type HeaderSettingsModel = {
  titlePosition: TitlePosition
  menuTheme: MenuTheme
  background: string
  tagline: HeaderTagline
}

// 1 - banner carousel with the trip search, menu fixed on top (hidden in
//     the editor for now: it only makes sense for a carrier);
// 2 - parallax banner with the company name, menu right under it;
// 3 - split banner: menu on top, then the name and a tagline beside the
//     banner picture, on a palette colour.
export const HERO_VARIANT_IDS = [1, 2, 3] as const
export const DEFAULT_HERO_VARIANT = 2
export const HERO_WITH_TITLE_VARIANT = 2
export const HERO_SPLIT_VARIANT = 3

export const TITLE_POSITIONS: TitlePosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

export const HEADER_DEFAULTS: HeaderSettingsModel = {
  titlePosition: 'bottom-left',
  menuTheme: 'dark',
  background: 'primary',
  tagline: { uk: '', en: '', de: '' },
}

export function resolveHeroVariant (stored?: number | null): number {
  return (HERO_VARIANT_IDS as readonly number[]).includes(stored as number) ? (stored as number) : DEFAULT_HERO_VARIANT
}

export function resolveHeaderSettings (stored?: Partial<HeaderSettingsModel> | null): HeaderSettingsModel {
  const tagline = stored?.tagline
  return {
    titlePosition: TITLE_POSITIONS.includes(stored?.titlePosition as TitlePosition)
      ? stored!.titlePosition as TitlePosition
      : HEADER_DEFAULTS.titlePosition,
    menuTheme: stored?.menuTheme === 'light' || stored?.menuTheme === 'dark'
      ? stored.menuTheme
      : HEADER_DEFAULTS.menuTheme,
    background: typeof stored?.background === 'string' && stored.background ? stored.background : HEADER_DEFAULTS.background,
    tagline: {
      uk: typeof tagline?.uk === 'string' ? tagline.uk : '',
      en: typeof tagline?.en === 'string' ? tagline.en : '',
      de: typeof tagline?.de === 'string' ? tagline.de : '',
    },
  }
}
