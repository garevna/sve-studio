import type { Look } from './looks'
import { readonly, ref } from 'vue'
import { findLook, FONTS, lookVariables } from './looks'

// Which look the editor wears right now, and switching it.
//
// The choice is remembered in this browser (for trying the looks out on
// the showcase page); the default is DEFAULT_LOOK in looks.ts.

const STORAGE_KEY = 'sve-editor-look'

function storedLookId (): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const current = ref<Look>(findLook(storedLookId()))

// Called with the colours of every look applied - the editor passes a
// function that updates its Vuetify theme.
let onApply: ((look: Look) => void) | null = null

export function applyLook (look: Look) {
  const root = document.documentElement
  for (const [name, value] of Object.entries(lookVariables(look))) {
    root.style.setProperty(name, value)
  }
  root.dataset.sveLook = look.id
  void (FONTS[look.font] ?? FONTS.system).load()
  onApply?.(look)
}

export function useLook () {
  function setLook (id: string) {
    current.value = findLook(id)
    try {
      localStorage.setItem(STORAGE_KEY, current.value.id)
    } catch {
      // A browser that keeps nothing still shows the look - just for now.
    }
    applyLook(current.value)
  }
  return { look: readonly(current), setLook }
}

// At the editor's start: the remembered (or default) look, applied once,
// with `apply` called now and on every later switch.
export function startLook (apply?: (look: Look) => void): Look {
  onApply = apply ?? null
  applyLook(current.value)
  return current.value
}
