import type { ClientApiDocument, DockForm, DockPreset, FormsDocument } from '@sve/dock'
import { presetForm, withDefaultForms } from '@sve/dock'
import { ref, watch } from 'vue'
import { useAjaxStore } from '@/stores/ajax'
import { movePopupForms } from '@/utils/popup-form-move'

// The site's forms (content/settings/forms.json, packages/dock/src/form.ts) -
// one list for the whole site: the "Форми" section edits it, a page's
// "Форма" block names one of it.
//
// Module-level, like useClientApi: the section and the blocks on a page work
// on the same list. Every change is a draft at once; "Зберегти" publishes.

export const formsDocument = ref<FormsDocument>({ forms: [] })
const loaded = ref(false)
const dirty = ref(false)
let loading: Promise<void> | null = null
let skipNext = false
let timer: ReturnType<typeof setTimeout> | null = null

watch(formsDocument, () => {
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
    void useAjaxStore().saveForms(formsDocument.value, { publish: false })
  }, 800)
}, { deep: true })

// Before forms.json the forms lived in client-api.json. Such a document's
// forms are the newest there are (a draft made then): they move here, and
// leave client-api.json - both as drafts, published by the next "Зберегти".
async function takeLegacyForms (): Promise<DockForm[] | null> {
  const ajaxStore = useAjaxStore()
  const clientApi: ClientApiDocument = await ajaxStore.getClientApi()
  if (!clientApi.forms) {
    return null
  }
  const { forms, ...rest } = clientApi
  await ajaxStore.saveForms({ forms }, { publish: false })
  await ajaxStore.saveClientApi(rest, { publish: false })
  return forms
}

// Before "Форми" a form popup had fields of its own: they move here, each
// popup's to a form it then names (utils/popup-form-move.ts) - both lists
// saved as drafts, published by the next "Зберегти".
async function takePopupForms (forms: DockForm[]): Promise<boolean> {
  const ajaxStore = useAjaxStore()
  const popups = await ajaxStore.getPopups()
  if (!movePopupForms(popups.popups ?? [], forms)) {
    return false
  }
  await ajaxStore.saveForms({ forms }, { publish: false })
  await ajaxStore.savePopups(popups, { publish: false })
  return true
}

// Loaded once; useClientApi and useSitePopups wait for it too, so a
// client-api.json that still carries forms, or a popup with fields of its
// own, is never read before they moved. The base package's forms are there
// whatever the stored list says.
export function loadSiteForms (): Promise<void> {
  loading ??= (async () => {
    const ajaxStore = useAjaxStore()
    const legacy = await takeLegacyForms()
    const stored = legacy ? { forms: legacy } : await ajaxStore.getForms()
    const forms = [...(stored?.forms ?? [])]
    const fromPopups = await takePopupForms(forms)
    skipNext = true
    formsDocument.value = { forms: withDefaultForms(forms) }
    dirty.value = !!legacy || fromPopups || await ajaxStore.isFormsUpdated()
    loaded.value = true
  })()
  return loading
}

export function useSiteForms () {
  const ajaxStore = useAjaxStore()

  async function save () {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    await ajaxStore.saveForms(formsDocument.value, { publish: true })
    dirty.value = false
  }

  async function undo () {
    skipNext = true
    formsDocument.value = await ajaxStore.undoForms()
    dirty.value = false
  }

  function create (preset: DockPreset, name: string): DockForm {
    const forms = formsDocument.value.forms
    const taken = new Set(forms.map(item => item.id))
    let id: string = preset
    for (let index = 2; taken.has(id); index++) {
      id = `${preset}-${index}`
    }
    const form = presetForm(preset, id, name)
    forms.push(form)
    return form
  }

  function remove (id: string) {
    formsDocument.value.forms = formsDocument.value.forms.filter(item => item.id !== id)
  }

  return { document: formsDocument, loaded, dirty, load: loadSiteForms, save, undo, create, remove }
}
