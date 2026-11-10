import type { PopupCalendarModel, PopupKind, PopupLookModel, PopupModel, PopupsDocument, TemplateBlockModel, TemplatePageModel } from '@/types/TemplateBlockModel'
import { computed, ref, watch } from 'vue'
import { BUILT_IN_POPUP_IDS, withDefaultPopups } from '@/configs/default-popups'
import { withDefaultCalendars, withDefaultLooks } from '@/configs/popup-looks'
import { t } from '@/i18n'
import { useAjaxStore } from '@/stores/ajax'
import { useCommonStore } from '@/stores/common'
import { resolveLocaleText } from '@/utils/locale-text'

// The site's popups (content/settings/popups.json) - one set for the whole
// site, since any button on any page may open any of them. The editor's
// "Попапи" section (PopupsView.vue) lists and edits them; a button's
// settings pick one or start a new one (ButtonActionSettings.vue).
//
// Module-level: the section, a page's buttons and the popup window being
// edited all work on the same list. Every change is a draft at once;
// "Зберегти" in the section publishes.

const popups = ref<PopupModel[]>([])
// The client's looks of popups and calendars (UI Kit "Попапи" and
// "Календар", configs/popup-looks.ts) - kept in the same document.
const looks = ref<PopupLookModel[]>([])
const calendars = ref<PopupCalendarModel[]>([])
const loaded = ref(false)
const dirty = ref(false)
const editingId = ref<string | null>(null)
let loading: Promise<void> | null = null
let skipNext = false
let timer: ReturnType<typeof setTimeout> | null = null

const DEFAULT_WIDTH: Record<PopupModel['placement'], number | undefined> = { left: 420, right: 420, bottom: undefined, center: 480 }

export interface PopupUsePlace {
  pageId: string
  label: string
  count: number
}

// The buttons (any block) under `value` that open `id`; with `clear`, they
// stop opening it.
function visit (value: unknown, id: string, clear = false): number {
  if (Array.isArray(value)) {
    return value.reduce((sum: number, item) => sum + visit(item, id, clear), 0)
  }
  if (!value || typeof value !== 'object') {
    return 0
  }
  const block = value as TemplateBlockModel & Record<string, unknown>
  let count = 0
  if (block.action === 'popup' && block.popup === id) {
    count++
    if (clear) {
      delete block.action
      delete block.popup
    }
  }
  for (const item of Object.values(block)) {
    count += visit(item, id, clear)
  }
  return count
}

function documentOf (): PopupsDocument {
  return { popups: popups.value, looks: looks.value, calendars: calendars.value }
}

export function useSitePopups () {
  const ajaxStore = useAjaxStore()
  const commonStore = useCommonStore()

  function load (): Promise<void> {
    loading ??= (async () => {
      skipNext = true
      // The base package's popups are there whatever the stored list (or
      // a draft from before they existed) says.
      const document = await ajaxStore.getPopups()
      popups.value = withDefaultPopups(document.popups)
      looks.value = withDefaultLooks(document)
      calendars.value = withDefaultCalendars(document)
      dirty.value = await ajaxStore.isPopupsUpdated()
      loaded.value = true
    })()
    return loading
  }

  watch([popups, looks, calendars], () => {
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
      void ajaxStore.savePopups(documentOf(), { publish: false })
    }, 800)
  }, { deep: true })

  async function save () {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    await ajaxStore.savePopups(documentOf(), { publish: true })
    dirty.value = false
  }

  async function undo () {
    skipNext = true
    const document = await ajaxStore.undoPopups()
    popups.value = withDefaultPopups(document.popups)
    looks.value = withDefaultLooks(document)
    calendars.value = withDefaultCalendars(document)
    dirty.value = false
  }

  function newId (prefix = 'popup'): string {
    const taken = new Set([...popups.value, ...looks.value, ...calendars.value].map(item => item.id))
    for (;;) {
      const id = `${prefix}-${Math.random().toString(36).slice(2, 7)}`
      if (!taken.has(id)) {
        return id
      }
    }
  }

  // A new popup of a kind, with something in it to start from: a choice
  // list two choices long, a field that takes text.
  function create (kind: PopupKind, placement: PopupModel['placement'], name?: string): PopupModel {
    const popup: PopupModel = {
      id: newId(),
      name: name || t('pagePopups.newName', { n: popups.value.length + 1 }),
      kind,
      placement,
      width: DEFAULT_WIDTH[placement],
      content: { type: 'section-with-free-content', children: [] },
    }
    if (kind === 'message') {
      popup.tone = 'info'
    }
    if (kind === 'prompt') {
      popup.input = { format: 'text', required: true }
    }
    if (kind === 'select') {
      popup.options = [
        { value: 'one', label: { uk: 'Перший варіант', en: '', de: '' } },
        { value: 'two', label: { uk: 'Другий варіант', en: '', de: '' } },
      ]
    }
    popups.value.push(popup)
    return popups.value.at(-1)!
  }

  // Where it is opened from: every page (and the footer) is read as the
  // editor reads it - a draft first.
  async function places (id: string): Promise<PopupUsePlace[]> {
    const found: PopupUsePlace[] = []
    const pages = await ajaxStore.listDynamicPages()
    const ids = pages.map(page => ({ id: page.pageId, label: resolveLocaleText(page.title, commonStore.locale) || page.pageId }))
    if (!ids.some(page => page.id === 'footer-content')) {
      ids.push({ id: 'footer-content', label: t('common.footer') })
    }
    for (const page of ids) {
      const count = visit(await ajaxStore.getDynamicPageContent(page.id), id)
      if (count > 0) {
        found.push({ pageId: page.id, label: page.label, count })
      }
    }
    // other popups' own buttons
    const inPopups = visit(popups.value.filter(popup => popup.id !== id), id)
    if (inPopups > 0) {
      found.push({ pageId: '', label: t('pagePopups.list'), count: inPopups })
    }
    return found
  }

  // Gone, and the buttons that opened it lead nowhere yet. A page with an
  // unpublished draft stays a draft.
  async function remove (id: string, where: PopupUsePlace[]) {
    if (BUILT_IN_POPUP_IDS.has(id)) {
      return
    }
    for (const place of where) {
      if (!place.pageId) {
        continue
      }
      const content = await ajaxStore.getDynamicPageContent(place.pageId) as TemplatePageModel
      visit(content, id, true)
      const draft = await ajaxStore.isDynamicPageUpdated(place.pageId)
      await ajaxStore.saveDynamicPage(place.pageId, content, { publish: !draft })
    }
    visit(popups.value, id, true)
    popups.value = popups.value.filter(popup => popup.id !== id)
    if (editingId.value === id) {
      editingId.value = null
    }
  }

  const editing = computed(() => popups.value.find(popup => popup.id === editingId.value) ?? null)

  return {
    popups,
    looks,
    calendars,
    newId,
    loaded,
    dirty,
    load,
    save,
    undo,
    create,
    places,
    remove,
    editing,
    edit: (id: string | null) => {
      editingId.value = id
    },
  }
}
