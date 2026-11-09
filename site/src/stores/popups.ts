import type { PopupModel } from '../types/common'
import { defineStore } from 'pinia'
import { ref } from 'vue'

// The site's popups (content/settings/popups.json) and, for each, whether
// it is open. A popup is a fixed window component (PopupHost.vue, mounted
// once for the whole site) bound to its flag here; anything clickable that
// is meant to open it sets the flag - no listeners on window or document.
export const usePopupsStore = defineStore('popups', () => {
  const items = ref<PopupModel[]>([])
  const open = ref<Record<string, boolean>>({})

  function show (id: string) {
    open.value[id] = true
  }
  function hide (id: string) {
    open.value[id] = false
  }
  function hideAll () {
    open.value = {}
  }

  return { items, open, show, hide, hideAll }
})
