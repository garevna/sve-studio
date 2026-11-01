import type { SocialNetwork } from '@/configs/social-networks'
import { defaultSocialIcon } from '@/configs/social-icons'
import { SOCIAL_NETWORK_LABELS, socialLink } from '@/configs/social-networks'
import { siteLocales } from '@/utils/locale-text'
import { textWithIcon } from './text-with-icon'

// A ready line for a social network or messenger: its icon, its name and a
// link to its address in the general settings. Neither the address nor the
// picture is copied here - both are references ("social:viber",
// "social-icon:viber:color"), see configs/social-networks.ts and
// configs/social-icons.ts. The icon's look is changed in the icon picker.
export function socialLinkItem (network: SocialNetwork) {
  const label = SOCIAL_NETWORK_LABELS[network]
  return {
    ...textWithIcon(),
    content: Object.fromEntries(siteLocales().map(locale => [locale, label])),
    icon: defaultSocialIcon(network),
    link: socialLink(network),
  }
}
