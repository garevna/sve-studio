import type { BannerText, BannerTextBox } from '@/types/GlobalSettingsModel'

// Banner boxes on the site have fixed proportions (width / height) - see the
// site's banerHeight (stores/common.ts): 2.67 on a wide screen, 0.91 on a
// phone (600px and less). A text's place is kept as % of the box, so the
// editor shows it exactly where the site will.
// Same file in the editor (src/utils/) and the site (site/src/utils/) - keep the two in step.
export const BANNER_ASPECT = { desktop: 2.67, mobile: 0.91 } as const

// A phone box is about three times narrower than a desktop one, so a text
// sized for desktop would be tiny there: until it has its own phone place,
// it is wider and larger.
export function bannerTextBox (text: BannerText, mobile: boolean): BannerTextBox {
  if (!mobile) {
    return { x: text.x, y: text.y, width: text.width, size: text.size }
  }
  return text.mobile ?? {
    x: text.x,
    y: text.y,
    width: Math.min(90, Math.round(text.width * 1.8)),
    size: Math.min(14, Math.round(text.size * 2.5 * 4) / 4),
  }
}
