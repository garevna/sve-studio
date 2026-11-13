import type { DockFormHost } from '@/components/dock/dock-form-host'
import { fieldLookOf } from '@sve/dock'
import { computed, provide, reactive } from 'vue'
import { DOCK_FORM_HOST } from '@/components/dock/dock-form-host'
import { editorDock, editorDockContext } from '@/composables/useClientApi'
import { useSitePopups } from '@/composables/useSitePopups'
import { calendarProps, newCalendar } from '@/configs/popup-looks'
import { useCommonStore } from '@/stores/common'
import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
import { report } from '@/utils/report'
import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

// A form drawn in the editor (the "Форма" block, the "Форми" preview):
// the same DockFormView the site runs, on the
// editor's own values - trying a form here never touches a visitor's - and
// the client's system opens in a tab of its own instead of leaving.
//
// lang: the language the form speaks (the page's, or the one picked on the
// section); editing: cards show at once, for sample values.
export function provideEditorDockFormHost (options: { lang?: () => string, editing: () => boolean }) {
  const commonStore = useCommonStore()
  const sitePopups = useSitePopups()
  void sitePopups.load()
  const lang = computed(() => {
    const asked = options.lang?.() ?? commonStore.locale
    return ['uk', 'en', 'de'].includes(asked) ? asked : 'uk'
  })

  const values = reactive<Record<string, unknown>>({})
  const host: DockFormHost = {
    values,
    set: (key, value) => {
      values[key] = value
    },
    dock: editorDock,
    context: (current, month) => editorDockContext(current, lang.value, month),
    lang: () => lang.value,
    calendarLook: id => calendarProps(sitePopups.calendars.value.find(item => item.id === id) ?? sitePopups.calendars.value[0] ?? newCalendar('simple', '', 'form')),
    fieldLook: id => fieldLookOf(sitePopups.fieldLooks.value, id),
    report: (what, error) => report('error', 'dock', `${what}: ${error instanceof Error ? error.message : String(error)}`, error),
    go: url => window.open(url, '_blank', 'noopener'),
    // trying a form in the editor sends nobody a message
    send: async () => 'sent',
    overlayClass: [EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME)].join(' '),
    overlayTheme: APP_THEME_NAME,
    editing: options.editing,
  }
  provide(DOCK_FORM_HOST, host)
  return host
}
