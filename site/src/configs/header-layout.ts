// The top of the site: which layout it uses and that layout's own settings.
// Same file in the editor (src/configs/header-layout.ts) - keep the two in
// step.
//
// global.json:
//   heroVariant - which layout (1, 2, ...);
//   header      - settings of the layouts that have any:
//     titlePosition - corner of the banner the company name sits in;
//     menuTheme     - black or white menu bar; every text, outline and
//                     icon on it follows.

export type TitlePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type MenuTheme = 'light' | 'dark'

export type HeaderSettingsModel = {
  titlePosition: TitlePosition
  menuTheme: MenuTheme
}

// 1 - banner carousel with the trip search, menu fixed on top;
// 2 - parallax banner with the company name, menu right under it.
export const HERO_VARIANT_IDS = [1, 2] as const
export const DEFAULT_HERO_VARIANT = 1
export const HERO_WITH_TITLE_VARIANT = 2

export const TITLE_POSITIONS: TitlePosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

export const HEADER_DEFAULTS: HeaderSettingsModel = {
  titlePosition: 'bottom-left',
  menuTheme: 'dark',
}

export function resolveHeroVariant (stored?: number | null): number {
  return (HERO_VARIANT_IDS as readonly number[]).includes(stored as number) ? (stored as number) : DEFAULT_HERO_VARIANT
}

export function resolveHeaderSettings (stored?: Partial<HeaderSettingsModel> | null): HeaderSettingsModel {
  return {
    titlePosition: TITLE_POSITIONS.includes(stored?.titlePosition as TitlePosition)
      ? stored!.titlePosition as TitlePosition
      : HEADER_DEFAULTS.titlePosition,
    menuTheme: stored?.menuTheme === 'light' || stored?.menuTheme === 'dark'
      ? stored.menuTheme
      : HEADER_DEFAULTS.menuTheme,
  }
}
