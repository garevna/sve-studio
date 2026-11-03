// Whether a TextFormatMenu-driven class (size/weight/color/alignment, set
// via TextEditor.vue) has any real effect once rendered - production
// components in several places hardcode their own fixed class instead of
// reading it from the data, which makes the format button a working-looking
// no-op there. Keyed by the actual editing CONTEXT, not just the leaf
// `type` string - the same "header"/"title"/"text" type is genuinely
// class-driven when rendered as a normal page block or nested-section half
// (client-side/src/templates/TemplateText.vue reads item.class), but is
// the hero parallax overlay reads it too now (utils/parallax-text-class.ts
// in both apps: a formatted text keeps its format, an unformatted one the
// panel's own look).
export type TextFormatContext
  = | 'text-block'
    | 'nested-section'
    | 'hero-parallax'
    | 'card'
    | 'text-with-icon'
    | 'card-with-toolbar-image'

export const TEXT_FORMAT_SUPPORT: Record<TextFormatContext, boolean> = {
  // Standalone header/title/text page blocks (TextEditor.vue's default
  // usage) - client-side/src/templates/TemplateText.vue reads item.class.
  'text-block': true,
  // TemplateNestedSection.vue's text half (section-image-left/right etc.) -
  // same TemplateText.vue render path as text-block above.
  'nested-section': true,
  // HeroParallax.vue's header/title/text overlay - the site reads each
  // text's format (utils/parallax-text-class.ts).
  'hero-parallax': true,
  // "cards"/"carousel"/"card-with-hover" card title/content -
  // client-side/src/templates/components/TemplateCard.vue hardcodes its own
  // title/content classes and never reads any per-card field.
  'card': false,
  // TextWithIconEditor.vue's body text - client-side's TextWithIcon.vue
  // reads props.item.text (a mislabeled but real field) as this class.
  'text-with-icon': true,
  // client-side/src/templates/components/CardWithToolbarImage.vue reads
  // each child's own item.class directly.
  'card-with-toolbar-image': true,
}
