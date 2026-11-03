import type { HeaderSettingsModel } from '../../configs/header-layout'
import type { IconSetModel } from './IconSetModel'
import type { LinksModel } from './LinksModel'
import type { DropdownStyle, MobileMenuStyle } from '@/configs/menu-style'
import type { SiteContact } from '@/configs/site-contacts'

export type GlobalSettingsModel = {
  styles?: string[]
  font?: string
  accentFont?: string
  // Every extra font, in order: classes accent-font, accent-font-2, ... (see utils/theme-fonts.ts).
  accentFonts?: string[]
  // The menus' look, set in the UI Kit (see configs/menu-style.ts).
  // Phones, emails, the address... - one source for every page and the
  // footer (see configs/site-contacts.ts).
  contacts?: SiteContact[]
  // Where the feedback forms send (utils/feedback-transport.ts). Absent:
  // the form says sending isn't set up.
  feedback?: { endpoint?: string }
  menuStyle?: { dropdown?: Partial<DropdownStyle>, mobile?: Partial<MobileMenuStyle> }
  provider: string
  logo: {
    src: string
    width: number
    height: number
  }
  // Logo for a dark menu bar; empty means the regular logo is used there too.
  logoWhite?: string
  links: LinksModel
  icons: IconSetModel
  // Social-network icon glyphs (base64 SVG data-uris), keyed by network name -
  // optional, falls back to the bundled default SVGs (src/assets/footer-icons)
  // when unset. See FooterIcons.vue.
  socialIcons?: Partial<Record<'facebook' | 'instagram' | 'tiktok' | 'whatsApp' | 'viber' | 'telegram', string>>
  langs: string[]
  locales: string[]
  // The language of addresses without a language prefix (/site/...).
  defaultLocale?: string
  baner: Banner
  // More banners after `baner`: with any, layout 1 turns into a carousel.
  banerSlides?: Banner[]
  userDashBreackpoint: number
  pageContentMarginTop: number
  blockSpacing: {
    desktop: number
    mobile: number
  }
  // Layout of the top of the site and its settings - configs/header-layout.ts.
  heroVariant?: number
  header?: Partial<HeaderSettingsModel>
  heroSection: {
    items?: { value: string, label: string }[]
    header?: string
    text?: string[]
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
