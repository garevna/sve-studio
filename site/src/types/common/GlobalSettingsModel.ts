import type { HeaderSettingsModel } from '../../configs/header-layout'
import type { IconSetModel } from './IconSetModel'
import type { LinksModel } from './LinksModel'

export type GlobalSettingsModel = {
  styles?: string[]
  font?: string
  accentFont?: string
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
  baner: {
    desktop: string
    mobile: string
  }
  // More banners after `baner`: with any, layout 1 turns into a carousel.
  banerSlides?: { desktop: string, mobile: string }[]
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
