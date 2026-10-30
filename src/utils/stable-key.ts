// Assigns a stable numeric key to each distinct object, memoized by
// identity - used for v-for :key in card lists where Sortable.js
// physically moves the DOM node during a drag (see EditableCardsBlock.vue's
// comment on why), so Vue needs to key on the card's own identity rather
// than its position in the array to reconcile the move correctly.
// TypeScript's :key typing only accepts primitives even though Vue's
// runtime keys off any value via an internal Map - this gets a stable
// primitive out of the same identity without casting past the type check.
// A WeakMap avoids leaking memory for cards that get deleted.
const keys = new WeakMap<object, number>()
let nextKey = 0

export function stableKey (item: object): number {
  let key = keys.get(item)
  if (key === undefined) {
    key = nextKey++
    keys.set(item, key)
  }
  return key
}
