import type { PopupCalendarModel, PopupLookModel, PopupModel } from '../types/common'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dock, reportDock } from '../services/dock'
import { useCommonStore } from './common'

// The site's popups (content/settings/popups.json) and, for each, whether
// it is open. A popup is a fixed window component (PopupHost.vue, mounted
// once for the whole site) bound to its flag here; anything clickable that
// is meant to open it sets the flag - no listeners on window or document.
//
// show() also hands back the visitor's answer (configs/popup-kinds.ts):
// whoever opened the popup may wait for it, and it goes to the client's
// API request the popup names (`deliver` - a request of role 'answer' in
// content/settings/client-api.json, services/dock.ts). Closed without an
// answer - null.
export const usePopupsStore = defineStore('popups', () => {
  const items = ref<PopupModel[]>([])
  const open = ref<Record<string, boolean>>({})
  // The client's looks of popups and calendars (UI Kit "Попапи",
  // "Календар"; configs/popup-looks.ts).
  const looks = ref<PopupLookModel[]>([])
  const calendars = ref<PopupCalendarModel[]>([])
  // What each open popup is about (a card's title, say): a form shows it and
  // sends it with the answers.
  const context = ref<Record<string, string>>({})
  const waiting = new Map<string, (value: unknown) => void>()

  function show (id: string, about = ''): Promise<unknown> {
    // Opened again before it was answered: the earlier caller gets null.
    waiting.get(id)?.(null)
    context.value[id] = about
    open.value[id] = true
    return new Promise(resolve => waiting.set(id, resolve))
  }

  function answer (id: string, value: unknown) {
    open.value[id] = false
    const resolve = waiting.get(id)
    waiting.delete(id)
    resolve?.(value)
    const popup = items.value.find(item => item.id === id) as PopupModel | undefined
    if (popup?.deliver && value !== null && value !== undefined) {
      const common = useCommonStore()
      void dock.answer(popup.deliver, {
        source: 'popup',
        id,
        name: popup.name,
        kind: popup.kind ?? 'content',
        value,
        locale: common.locale,
        page: typeof location === 'undefined' ? '' : location.pathname,
        at: new Date().toISOString(),
      }).catch(error => reportDock(`popup "${popup.name}"`, error))
    }
  }

  function hide (id: string) {
    answer(id, null)
  }
  function hideAll () {
    for (const id of Object.keys(open.value)) {
      if (open.value[id]) {
        hide(id)
      }
    }
  }

  return { items, open, context, looks, calendars, show, answer, hide, hideAll }
})
