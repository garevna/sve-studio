/** "#RRGGBB" (or #RGB/#RRGGBBAA) -> "R,G,B", the format Vuetify's own
 * --v-theme-{name} custom properties use internally for rgb(var(--v-theme-x)). */
export function hexToRgbTriple (hex: string): string | null {
  let value = hex.replace('#', '')
  if (value.length === 3 || value.length === 4) {
    value = value.split('').map(c => c + c).join('')
  }
  if (value.length < 6) return null
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
  return `${r},${g},${b}`
}
