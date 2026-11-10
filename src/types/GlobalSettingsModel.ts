import type { HeaderSettingsModel } from '@/configs/header-layout'
import type { DropdownStyle, MobileMenuStyle } from '@/configs/menu-style'
import type { SiteContact } from '@/configs/site-contacts'
export interface GlobalSettingsModel {
  activeTheme: number
  font: string
  // Optional second font for texts marked "Додатковий шрифт" (see utils/theme-fonts.ts).
  accentFont?: string
  // Every extra font, in order: classes accent-font, accent-font-2, ... (see utils/theme-fonts.ts).
  accentFonts?: string[]
  // The menus' look, set in the UI Kit (see configs/menu-style.ts).
  // Phones, emails, the address... - one source for every page and the
  // footer (see configs/site-contacts.ts).
  contacts?: SiteContact[]
  menuStyle?: { dropdown?: Partial<DropdownStyle>, mobile?: Partial<MobileMenuStyle> }
  // The site's content languages and the one shown when a text has no
  // translation (see utils/locale-text.ts). Missing = uk/en/de.
  locales?: string[]
  defaultLocale?: string
  provider: string
  logo: {
    src: string
    width: number
    height: number
  }
  baner: Banner
  // More banners after `baner`: with any, layout 1 turns into a carousel.
  banerSlides?: Banner[]
  logoWhite: string
  links: Record<string, string>
  styles: string[]
  icons: Record<string, string>
  // Social-network icon glyphs (base64 SVG data-uris), keyed by network name
  // (facebook/instagram/tiktok/whatsApp/viber/telegram) - a SEPARATE field
  // from `icons` above on purpose: that one is client-side's own
  // IconSetModel (trip-search calendar/direction icons, unrelated), reusing
  // it here would silently corrupt that real setting. Site-wide, same
  // reasoning as `links` (edited in GeneralSettingsView.vue, not per footer
  // variant) - content-driven rather than a hardcoded build-time asset, so
  // a client can swap a glyph without a deploy. Optional: falls back to the
  // bundled default SVGs (src/assets/footer-icons) when unset.
  socialIcons?: Record<string, string>
  userDashBreackpoint: number
  pageContentMarginTop: number
  blockSpacing: {
    desktop: number
    mobile: number
  }
  heroSection: Record<string, unknown>
  // Which layout variant (1, 2, ...) is currently published for the
  // footer/header - plain numbering, same convention as account-pages.json's
  // Record<string, number>, not a repo-derived name (where a variant came
  // from is internal to how this editor is built, never surfaced). Folded into global.json rather than its own
  // settings key: the backend only has a fixed, individually-registered set
  // of /content/settings/{key} endpoints (confirmed live - no generic "any
  // key" route), so a genuinely new key needs backend work first, while
  // global.json's endpoint already exists.
  // Footer LAYOUT (not its content, which lives in footer-content.json):
  // how many columns, how wide each one is, and the gap between them. Set by
  // the designer in the UI Kit, read by both this editor and client-side, so
  // neither hardcodes a column arrangement any more. Optional throughout -
  // an absent value means "use the default", see configs/footer-layout.ts.
  footer?: {
    columns?: number
    gap?: number
    // One entry per column, in order. Shorter than `columns` (or missing
    // entirely) means the remaining columns share the space equally.
    widths?: number[]
  }
  footerVariant?: number
  // Which hero component the site uses - see configs/hero-variants.ts. Same
  // shape and same role as footerVariant: it names the component, not the
  // content that component renders.
  heroVariant?: number
  // Settings of the layout heroVariant picks (company-name corner, menu bar
  // colour) - see configs/header-layout.ts.
  header?: Partial<HeaderSettingsModel>
  // Where the site's feedback forms send (the site reads it too).
  feedback?: { endpoint?: string }
  // The client's own API: where visitors' answers go (the site's
  // services/client-api.ts, docs/client-api.md).
  clientApi?: {
    baseUrl?: string
    endpoints?: { id: string, name?: string, url: string, method?: 'POST' | 'PUT' }[]
  }
  // Visitors' sign-in (the site's account pages). The editor's
  // "Повідомлення" section signs its admin in with the same - see
  // services/inbox.
  auth?: {
    provider?: string
    methods?: string[]
    firebase?: { apiKey: string, authDomain?: string, projectId?: string, storageBucket?: string, messagingSenderId?: string, appId?: string }
  }
}

// A text laid over a banner (layout 1 of the top of the site): its words in
// every language, where it sits and how big it is. Position and width are
// % of the banner box, size is % of its width (cqw) - so the text scales
// with the picture. A phone banner box is shaped differently: `mobile` has
// the text's own place there (derived from the desktop one when unset).
export type BannerTextBox = { x: number, y: number, width: number, size: number }
export type BannerText = BannerTextBox & {
  id: string
  text: { uk: string, en: string, de: string }
  // text format classes: weight, colour (text-<palette key>), alignment, font
  class: string
  mobile?: BannerTextBox
}

export type Banner = {
  desktop: string
  mobile: string
  texts?: BannerText[]
}
