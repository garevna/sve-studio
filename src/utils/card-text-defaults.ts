// Mirrors production's own TemplateCard.vue exactly - it hardcodes these
// same classes inline rather than reading them from data, so the editor's
// own preview (src/components/templates/cards/TemplateCard.vue) uses this
// shared helper to render identically instead of drifting out of sync with
// its own separate copy.
//
// These are only the DEFAULTS now: a "cards" block can carry its own
// titleClass/contentClass, set once for every card in it from the block's
// toolbar (CardContainerActions.vue), and production reads them too. The
// gap below is deliberately NOT part of that string - it is spacing between
// the title and the text under it, not formatting, and it must survive
// whatever the format menu writes.
export function defaultCardTitleClass (ver: number): string {
  return `text-medium ${ver === 1 ? 'text-center' : 'text-left'}`
}

// The gap under the title. ver 4 carries its whole text in the title and
// nothing below it, so the gap that separates a title from its content on
// every other variant is dead space there - it would push the text off the
// icon's centre line, which is the one alignment this variant is built
// around.
export function cardTitleGapClass (ver: number): string {
  return ver === 1 ? 'mb-4' : (ver === 4 ? 'mb-0' : 'mb-2')
}

export function defaultCardContentClass (ver: number): string {
  return `default-text text-thin text-black ${ver === 1 ? 'text-center' : 'text-left'}`
}
