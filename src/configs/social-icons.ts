import type { SocialNetwork } from './social-networks'
import { footerIcons } from '../assets/footer-icons'
import facebookColor from '../assets/social-icons/facebook-color.svg'
import facebook from '../assets/social-icons/facebook.svg'
import instagramColor from '../assets/social-icons/instagram-color.svg'
import instagram from '../assets/social-icons/instagram.svg'
import telegramColor from '../assets/social-icons/telegram-color.svg'
import telegram from '../assets/social-icons/telegram.svg'
import tiktokColor from '../assets/social-icons/tiktok-color.svg'
import tiktok from '../assets/social-icons/tiktok.svg'
import viberColor from '../assets/social-icons/viber-color.svg'
import viber from '../assets/social-icons/viber.svg'
import whatsAppColor from '../assets/social-icons/whatsApp-color.svg'
import whatsApp from '../assets/social-icons/whatsApp.svg'

// The icons of the social networks and messengers, in a few looks:
//   color  - the network's own colours, shown as they are
//   mono   - the bare sign, one colour
//   circle - the sign cut out of a circle, one colour (the footer's icons)
// A one-colour look is painted with the icon's colour (a palette key) - so
// blue, grey or any other is the same icon, recoloured in the editor.
//
// An icon refers to one of them as "social-icon:<network>:<look>" rather
// than holding a copy of the picture.
//
// NOTE: site/src/configs/social-icons.ts is an exact copy - keep
// the two identical.

export type SocialIconLook = 'color' | 'mono' | 'circle'

export const SOCIAL_ICONS: Record<SocialNetwork, Partial<Record<SocialIconLook, string>>> = {
  facebook: { color: facebookColor, mono: facebook, circle: footerIcons.facebook },
  instagram: { color: instagramColor, mono: instagram, circle: footerIcons.instagram },
  tiktok: { color: tiktokColor, mono: tiktok, circle: footerIcons.tiktok },
  whatsApp: { color: whatsAppColor, mono: whatsApp, circle: footerIcons.whatsApp },
  viber: { color: viberColor, mono: viber, circle: footerIcons.viber },
  telegram: { color: telegramColor, mono: telegram, circle: footerIcons.telegram },
}

const PREFIX = 'social-icon:'

export function socialIconRef (network: SocialNetwork, look: SocialIconLook): string {
  return `${PREFIX}${network}:${look}`
}

export interface SocialIcon {
  network: SocialNetwork
  look: SocialIconLook
  src: string
  // One colour: drawn by its shape, in the icon's colour.
  tinted: boolean
}

export function socialIconOf (icon: string | undefined): SocialIcon | null {
  if (!icon?.startsWith(PREFIX)) {
    return null
  }
  const [network, look] = icon.slice(PREFIX.length).split(':') as [SocialNetwork, SocialIconLook]
  const src = SOCIAL_ICONS[network]?.[look]
  return src ? { network, look, src, tinted: look !== 'color' } : null
}

// The look a new line for a network starts with: its own colours, or the
// bare sign where there is no colour version.
export function defaultSocialIcon (network: SocialNetwork): string {
  return socialIconRef(network, SOCIAL_ICONS[network].color ? 'color' : 'mono')
}
