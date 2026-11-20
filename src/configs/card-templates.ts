// Card templates (UI Kit > Картки > Шаблони карток): the designer's named
// sets of a cards block's look - its card style, its fill, the format of
// its titles and texts, its icons' colour, disc and size. A block on a page
// names one (`cardTemplate`) and wears it; editing the template in the UI
// Kit restyles every block that names it.
//
// A setting made on the block itself still wins over the template's (the
// block's detailed settings - the exception, not the way): picking a
// template clears them, and «Повернути до шаблону» clears them again.
// Kept in global.json `cardTemplates`.
//
// NOTE: src/configs/card-templates.ts and site/src/configs/card-templates.ts
// are identical - keep them so.

export const CARD_TEMPLATE_FIELDS = ['cardStyle', 'cardBackground', 'titleClass', 'contentClass', 'color', 'background', 'size', 'mobileSize'] as const
export type CardTemplateField = typeof CARD_TEMPLATE_FIELDS[number]

export type CardTemplate = {
  id: string
  name: string
  cardStyle?: string // a UI Kit card style's class (cards.css); unset - the site style's
  cardBackground?: string // the card's own fill (palette key)
  titleClass?: string
  contentClass?: string
  color?: string // the icon's colour (palette key)
  background?: string // the disc behind the icon (palette key)
  size?: number // the icon's size, px
  mobileSize?: number
}

type Templated = { cardTemplate?: string } & { [K in CardTemplateField]?: unknown }

export function findCardTemplate (id: unknown, templates?: CardTemplate[] | null): CardTemplate | undefined {
  return typeof id === 'string' && id ? templates?.find(template => template.id === id) : undefined
}

function unset (value: unknown): boolean {
  return value === undefined || value === null || value === ''
}

// The block as it is worn: its own settings, and the template's where it
// has none.
export function withCardTemplate<T extends Templated> (block: T, templates?: CardTemplate[] | null): T {
  const template = findCardTemplate(block.cardTemplate, templates)
  if (!template) {
    return block
  }
  const worn: Record<string, unknown> = { ...block }
  for (const field of CARD_TEMPLATE_FIELDS) {
    if (unset(worn[field]) && !unset(template[field])) {
      worn[field] = template[field]
    }
  }
  return worn as T
}

// Has the block settings of its own over its template's?
export function overridesCardTemplate (block: Templated): boolean {
  return !!block.cardTemplate && CARD_TEMPLATE_FIELDS.some(field => !unset(block[field]))
}

// The block's own settings gone - it wears its template's (or the defaults).
export function clearCardTemplateFields (block: Templated) {
  for (const field of CARD_TEMPLATE_FIELDS) {
    delete block[field]
  }
}
