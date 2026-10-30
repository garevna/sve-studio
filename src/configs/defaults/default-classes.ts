// The old text-16-400 / text-20-500 / text-black style scale isn't defined
// anywhere in the active theme's own CSS (public/files/theme_2/styles) - it
// was a leftover convention with nothing behind it. Headers/titles get their
// size from the h2/h3 tag itself; body text uses the real typographics.css
// scale (default-text/small-text/extra-small-text + text-bold/text-medium/
// text-thin), stepped via TextFormatMenu.
export const defaultHeaderClass = 'mt-16 mb-8 text-center'
export const defaultSubheaderClass = 'my-8 text-center'
export const defaultTextClass = 'default-text text-medium mb-4'
export const defaultButtonClass = 'primary-button mt-8'

// text-with-icon's paragraph sits as a grid item next to the icon (see
// TextWithIcon.vue in production) - defaultTextClass's mb-4 would add
// asymmetric bottom space inside that grid row and throw off the icon/text
// vertical centering, so this mirrors production's own fallback instead
// (TextWithIcon.vue: `props.item.text || 'default-text text-medium text-black text-left'`).
export const defaultIconTextClass = 'default-text text-medium text-black text-left'
