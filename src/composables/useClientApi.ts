import type { ClientApiDocument, DockContext, DockRequest, DockRole } from '@sve/dock'
import { createDock } from '@sve/dock'
import { ref, watch } from 'vue'
import { useAjaxStore } from '@/stores/ajax'
import { appBase } from '@/utils/app-base'

// The docking block's settings (content/settings/client-api.json,
// packages/dock) - one document for the whole site. The editor's
// "Підключення API" (ClientApiView.vue) edits it; a block that talks to the
// client's API (HotelSearch.vue) names its requests from it.
//
// Module-level, like useSitePopups: the section and the blocks on a page
// work on the same document. Every change is a draft at once; "Зберегти"
// in the section publishes.

const document = ref<ClientApiDocument>({ requests: [] })
const loaded = ref(false)
const dirty = ref(false)
let loading: Promise<void> | null = null
let skipNext = false
let timer: ReturnType<typeof setTimeout> | null = null

// The demo's test API lives at the editor's own root.
function root (): string {
  return new URL(appBase(), location.origin).toString()
}

// The same docking block the site runs - here for the section's preview and
// "Перевірити", and for a block drawn in the editor.
export const editorDock = createDock({ document: () => document.value, root })

export const DOCK_ROLES: { role: DockRole, icon: string }[] = [
  { role: 'options', icon: 'mdi-format-list-bulleted' },
  { role: 'dates', icon: 'mdi-calendar-range' },
  { role: 'handoff', icon: 'mdi-exit-run' },
  { role: 'answer', icon: 'mdi-reply-outline' },
]

export function dockRoleIcon (role: DockRole): string {
  return DOCK_ROLES.find(item => item.role === role)?.icon ?? 'mdi-api'
}

// What the editor builds a request from: sample values for the fields, the
// site's root as "the site".
export function editorDockContext (values: Record<string, unknown>, locale: string, month?: string): DockContext {
  const site = new URL(`${appBase()}site/`, location.origin).toString()
  return {
    values,
    system: {
      locale,
      page: site,
      return: `${site}${locale === 'uk' ? '' : `${locale}/`}`,
      month: month ?? new Date().toISOString().slice(0, 7),
    },
  }
}

function blank (role: DockRole, id: string, name: string): DockRequest {
  switch (role) {
    case 'options': {
      return { id, name, role, call: { url: '', method: 'GET', query: [] }, list: { path: '', value: 'id', label: '{name}' } }
    }
    case 'dates': {
      return { id, name, role, call: { url: '', method: 'GET', query: [] }, result: { path: '', date: 'date', hint: '' } }
    }
    case 'handoff': {
      return { id, name, role, mode: 'link', target: { url: '', query: [] } }
    }
    case 'answer': {
      return { id, name, role, call: { url: '', method: 'POST' } }
    }
  }
}

export function useClientApi () {
  const ajaxStore = useAjaxStore()

  function load (): Promise<void> {
    loading ??= (async () => {
      skipNext = true
      const loadedDocument = await ajaxStore.getClientApi()
      document.value = { ...loadedDocument, requests: loadedDocument.requests ?? [] }
      dirty.value = await ajaxStore.isClientApiUpdated()
      loaded.value = true
    })()
    return loading
  }

  watch(document, () => {
    editorDock.forget()
    if (skipNext) {
      skipNext = false
      return
    }
    if (!loaded.value) {
      return
    }
    dirty.value = true
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      timer = null
      void ajaxStore.saveClientApi(document.value, { publish: false })
    }, 800)
  }, { deep: true })

  async function save () {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    await ajaxStore.saveClientApi(document.value, { publish: true })
    dirty.value = false
  }

  async function undo () {
    skipNext = true
    const restored = await ajaxStore.undoClientApi()
    document.value = { ...restored, requests: restored.requests ?? [] }
    dirty.value = false
  }

  function create (role: DockRole, name: string): DockRequest {
    const taken = new Set(document.value.requests.map(item => item.id))
    let index = document.value.requests.length + 1
    while (taken.has(`${role}-${index}`)) {
      index++
    }
    const request = blank(role, `${role}-${index}`, name)
    document.value.requests.push(request)
    return request
  }

  function remove (id: string) {
    document.value.requests = document.value.requests.filter(item => item.id !== id)
  }

  function ofRole<R extends DockRole> (role: R): Extract<DockRequest, { role: R }>[] {
    return document.value.requests.filter(item => item.role === role) as Extract<DockRequest, { role: R }>[]
  }

  return { document, loaded, dirty, load, save, undo, create, remove, ofRole }
}
