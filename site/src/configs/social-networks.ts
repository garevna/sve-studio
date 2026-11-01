// The site's social networks and messengers. Their addresses have one
// source: global.json "links" (Загальні налаштування -> Соціальні мережі).
// Everything else - footer icons, the contact button, a text with an icon -
// takes them from there, so an address is changed in one place only.
//
// A link set elsewhere refers to one as "social:<network>" (e.g.
// "social:viber") instead of holding a copy of its address; resolveLink()
// turns it into the address when the page is drawn.
//
// NOTE: site/src/configs/social-networks.ts is an exact copy - keep
// the two identical.

export const SOCIAL_NETWORKS = ['facebook', 'instagram', 'tiktok', 'whatsApp', 'viber', 'telegram'] as const
export type SocialNetwork = typeof SOCIAL_NETWORKS[number]

export const SOCIAL_NETWORK_LABELS: Record<SocialNetwork, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  whatsApp: 'WhatsApp',
  viber: 'Viber',
  telegram: 'Telegram',
}

const PREFIX = 'social:'

export function socialLink (network: SocialNetwork): string {
  return PREFIX + network
}

// The network a link refers to, or null for an ordinary address.
export function socialNetworkOf (link: string | undefined): SocialNetwork | null {
  if (!link?.startsWith(PREFIX)) {
    return null
  }
  const name = link.slice(PREFIX.length)
  return (SOCIAL_NETWORKS as readonly string[]).includes(name) ? name as SocialNetwork : null
}

// The address to open: a network's from global.json, anything else as is.
// '' when the network has no address set (the line is then no link).
export function resolveLink (link: string | undefined, links: Partial<Record<string, string>> | null | undefined): string {
  if (!link) {
    return ''
  }
  if (!link.startsWith(PREFIX)) {
    return link
  }
  const network = socialNetworkOf(link)
  return network ? (links?.[network] || '') : ''
}
