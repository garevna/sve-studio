// Templates of the cards with a hover side (UI Kit > Картки > «Шаблони
// карток з наведенням»): the designer's named looks - the resting side's
// fill and picture, the hover side's fill and picture, the card's layout.
// A card names one (`hoverTemplate` in its props - the group's toolbar sets
// it on every card of the group) and wears it; its own settings win over
// the template's (the card's dialog - the exception). Kept in global.json
// `hoverCardTemplates`.
//
// NOTE: src/configs/hover-card-templates.ts and
// site/src/configs/hover-card-templates.ts are identical - keep them so.

export const HOVER_TEMPLATE_FIELDS = ['backgroundColor', 'backgroundImage', 'hoverColor', 'hoverImage', 'ver'] as const
export type HoverTemplateField = typeof HOVER_TEMPLATE_FIELDS[number]

export type HoverCardTemplate = {
  id: string
  name: string
  backgroundColor?: string // the resting side's fill (palette key)
  backgroundImage?: string
  hoverColor?: string // the hover side's fill (palette key)
  hoverImage?: string
  ver?: number // the card's layout
}

type Templated = { hoverTemplate?: unknown } & { [K in HoverTemplateField]?: unknown }

function unset (value: unknown): boolean {
  return value === undefined || value === null || value === ''
}

export function findHoverTemplate (id: unknown, templates?: HoverCardTemplate[] | null): HoverCardTemplate | undefined {
  return typeof id === 'string' && id ? templates?.find(template => template.id === id) : undefined
}

// The card's props as worn: its own settings, the template's where it has none.
export function withHoverTemplate<T extends Templated> (props: T, templates?: HoverCardTemplate[] | null): T {
  const template = findHoverTemplate(props.hoverTemplate, templates)
  if (!template) {
    return props
  }
  const worn: Record<string, unknown> = { ...props }
  for (const field of HOVER_TEMPLATE_FIELDS) {
    if (unset(worn[field]) && !unset(template[field])) {
      worn[field] = template[field]
    }
  }
  return worn as T
}

export function overridesHoverTemplate (props: Templated): boolean {
  return !!props.hoverTemplate && HOVER_TEMPLATE_FIELDS.some(field => !unset(props[field]))
}

export function clearHoverTemplateFields (props: Templated) {
  for (const field of HOVER_TEMPLATE_FIELDS) {
    delete props[field]
  }
}
