import type { TemplateBlockModel } from '@/types/TemplateBlockModel'

// Shared by CardWithToolbarImageGroupActions.vue (the group-level toggle)
// and CardWithToolbarImage.vue (propagating a single edit while that toggle
// is on) - "group" is the float block whose children are all
// card-with-toolbar-image cards; each card's own children are its title/text
// items (see card-with-toolbar-image.ts's cardWithToolbarImageTemplate).

function findTitleItem (card: TemplateBlockModel): TemplateBlockModel | undefined {
  return card.children?.find(child => child.type === 'title')
}

function findTextItems (card: TemplateBlockModel): TemplateBlockModel[] {
  return card.children?.filter(child => child.type === 'text') || []
}

export function applyTitleClassToGroup (group: TemplateBlockModel, className: string, exceptCard?: TemplateBlockModel) {
  for (const card of group.children || []) {
    if (card === exceptCard) {
      continue
    }
    const title = findTitleItem(card)
    if (title) {
      title.class = className
    }
  }
}

export function applyTextClassToGroup (group: TemplateBlockModel, className: string, exceptCard?: TemplateBlockModel) {
  for (const card of group.children || []) {
    if (card === exceptCard) {
      continue
    }
    for (const text of findTextItems(card)) {
      text.class = className
    }
  }
}

export function applyHeightToGroup (group: TemplateBlockModel, height: number, exceptCard?: TemplateBlockModel) {
  for (const card of group.children || []) {
    if (card !== exceptCard) {
      card.height = height
    }
  }
}

// Snaps every card to card[0]'s current title class / text class / height -
// used when the group toggle flips on, and when a new card is added while
// it's already on, so the visible result matches immediately rather than
// only from the next edit onward.
export function snapGroupToReference (group: TemplateBlockModel) {
  const cards = group.children || []
  const reference = cards[0]
  if (!reference) {
    return
  }

  const titleClass = findTitleItem(reference)?.class
  if (titleClass !== undefined) {
    applyTitleClassToGroup(group, titleClass, reference)
  }

  const textClass = findTextItems(reference)[0]?.class
  if (textClass !== undefined) {
    applyTextClassToGroup(group, textClass, reference)
  }

  if (reference.height !== undefined) {
    applyHeightToGroup(group, reference.height, reference)
  }
}
