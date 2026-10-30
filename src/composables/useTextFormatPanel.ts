import { computed, ref } from 'vue'

// Module-level singleton: only one text field's format panel may be open
// anywhere on the page at a time (opening a second one closes the first),
// so the "currently open" state can't live per-component - every
// TextEditor.vue instance shares this same token.
const activeToken = ref<symbol | null>(null)
let listenerRegistered = false

// Opening a panel (v-expand-transition growing it from 0 to its real
// height) can itself nudge the page's scroll position - most visibly when
// the toggled item sits near the bottom of the viewport and the browser's
// own scroll-anchoring compensates for the new content pushing things
// around. Without this grace window, that self-triggered scroll immediately
// closed the panel that scroll just finished opening (reported: click the
// gear button near the bottom of the page, panel flashes open then shuts
// right away). 500ms comfortably covers the expand-transition's own
// duration; a genuine user scroll starting in that same instant just waits
// one beat before it's honored, same as always after that.
let ignoreScrollUntil = 0

export function useTextFormatPanel () {
  const token = Symbol('text-format-panel')

  if (!listenerRegistered) {
    listenerRegistered = true
    // Capture phase: scroll events don't bubble, but a capture listener on
    // window still sees them during the trickle-down phase regardless of
    // how deep the actual scrolling element is (e.g. EditableTextSection.vue's
    // own scrolling v-card-text) - this is the standard way to observe any
    // scroll on the page from a single top-level listener.
    window.addEventListener('scroll', () => {
      if (Date.now() < ignoreScrollUntil) {
        return
      }
      activeToken.value = null
    }, true)
  }

  const isOpen = computed(() => activeToken.value === token)

  function toggle () {
    if (isOpen.value) {
      activeToken.value = null
    } else {
      ignoreScrollUntil = Date.now() + 500
      activeToken.value = token
    }
  }

  function close () {
    if (isOpen.value) {
      activeToken.value = null
    }
  }

  // Focusing a text field to type in it shouldn't close that same field's
  // own just-opened panel, but focusing any OTHER field's text should close
  // whatever panel is currently open - since only one can be open, that's
  // simply "close it unless it's already mine".
  function closeIfForeign () {
    if (activeToken.value !== token) {
      activeToken.value = null
    }
  }

  return { isOpen, toggle, close, closeIfForeign }
}
