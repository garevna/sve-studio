import { hexToRgbTriple } from './hex-to-rgb-triple'

// Perceived-brightness heuristic (ITU-R BT.601), not a full WCAG contrast
// ratio calculation - good enough to gate "is white text readable on this
// swatch", which is all PaletteSwatchPicker's darkOnly mode needs. 0 (black)
// to 255 (white); ~140 is roughly where white text starts struggling.
const DARK_ENOUGH_FOR_WHITE_TEXT_THRESHOLD = 140

export function isColorDarkEnoughForWhiteText (hex: string): boolean {
  const rgb = hexToRgbTriple(hex)
  if (!rgb) {
    return false
  }
  const [r, g, b] = rgb.split(',').map(Number)
  const brightness = (0.299 * r!) + (0.587 * g!) + (0.114 * b!)
  return brightness < DARK_ENOUGH_FOR_WHITE_TEXT_THRESHOLD
}
