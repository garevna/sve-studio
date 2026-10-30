const HEX_COLOR_PATTERN = /^#([\da-fA-F]{3,4}|[\da-fA-F]{6}|[\da-fA-F]{8})$/

export function isHexColor (value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_PATTERN.test(value)
}

/**
 * Mirrors the edited app's own styles-config.ts (buildColorScheme) so the
 * editor's live preview builds its Vuetify theme the exact same way the
 * real app does - straight from palette.json, not from a colors.json
 * snapshot that would go stale the moment the palette is edited here.
 */
export function buildColorScheme (palette: Record<string, string>) {
  const hexColors = Object.fromEntries(
    Object.entries(palette).filter(([, value]) => isHexColor(value)),
  )

  return {
    dark: false,
    colors: {
      ...hexColors,
      'surface': palette['main-background'],
      'surface-bright': palette.homefone,
      'surface-light': palette.white,
      'surface-variant': palette['light-grey-2'],
    },
    variables: {
      'default-border-radius': palette['default-border-radius'],
      'small-border-radius': palette['small-border-radius'],
      'extra-small-border-radius': palette['extra-small-border-radius'],
      'large-border-radius': palette['large-border-radius'],
      'super-border-radius': palette['super-border-radius'],
      // 'border-color': palette['light-grey-1'],
      // 'border-opacity': 0.2,
    },
  }
}
