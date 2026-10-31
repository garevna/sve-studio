import type { MessageSchema } from '@/i18n/schema'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { t } from '@/i18n'

export type ConfirmObjectKey = keyof MessageSchema['confirm']['objects']

// One channel for "did that work?" across the whole editor: every save,
// delete and API-fallback reports here, and AppFeedback.vue (mounted once in
// App.vue, above every view) is the only thing that draws them. Before this,
// each view carried its own <v-snackbar> with its own wording, several
// mutations reported nothing at all, and the API-fallback warning was a
// fixed strip across the top of the page that had to push <body> down to
// avoid covering the content underneath.
//
// The confirm half lives here too rather than in its own store: both are
// "the app needs to say something to the user right now", both are rendered
// by the same always-mounted component, and keeping them together means one
// import at each call site instead of two.

export type NotificationKindModel = 'success' | 'error' | 'warning'

export type NotificationModel = {
  id: number
  kind: NotificationKindModel
  text: string
  // Second line, smaller - the "why" behind an error, or what a warning
  // means in practice. Optional: most successes need only the one line.
  detail?: string
}

export type ConfirmRequestModel = {
  title: string
  text: string
  confirmText: string
  cancelText: string
}

// Long enough to read a two-line message without hunting for the close
// button; errors and warnings stay up longer because they usually carry a
// detail line and may need acting on.
const AUTO_DISMISS_MS: Record<NotificationKindModel, number> = {
  success: 4000,
  warning: 9000,
  error: 9000,
}

export const useUiFeedbackStore = defineStore('ui-feedback', () => {
  const notifications = ref<NotificationModel[]>([])
  const timers = new Map<number, ReturnType<typeof setTimeout>>()
  let nextId = 1

  function dismiss (id: number) {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    notifications.value = notifications.value.filter(item => item.id !== id)
  }

  function scheduleDismiss (item: NotificationModel) {
    timers.set(item.id, setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS[item.kind]))
  }

  function notify (kind: NotificationKindModel, text: string, detail?: string) {
    // A failing API tends to fail repeatedly - one request per style file, or
    // per page during a bulk publish - and stacking twenty identical
    // warnings says nothing the first one didn't. An identical message
    // that's still on screen just gets its timer restarted.
    const existing = notifications.value.find(item => item.kind === kind && item.text === text && item.detail === detail)
    if (existing) {
      const timer = timers.get(existing.id)
      if (timer) {
        clearTimeout(timer)
      }
      scheduleDismiss(existing)
      return existing.id
    }

    const item: NotificationModel = { id: nextId++, kind, text, detail }
    notifications.value = [...notifications.value, item]
    scheduleDismiss(item)
    return item.id
  }

  const notifySuccess = (text: string, detail?: string) => notify('success', text, detail)
  const notifyError = (text: string, detail?: string) => notify('error', text, detail)
  const notifyWarning = (text: string, detail?: string) => notify('warning', text, detail)

  // --- confirmation ---
  // Promise-based on purpose: a delete handler stays one readable function
  // (`if (!await confirmDelete(...)) return`) instead of being split across a
  // dialog-open handler, a piece of "what was I about to delete" state and a
  // separate @confirm callback - which is what every call site would
  // otherwise need, in fifteen different components.
  const confirmRequest = ref<ConfirmRequestModel | null>(null)
  let resolveCurrent: ((confirmed: boolean) => void) | null = null

  function confirm (options: Partial<ConfirmRequestModel> = {}): Promise<boolean> {
    // A second request while one is already up would strand the first
    // promise unresolved forever - answer it "no" and move on.
    resolveCurrent?.(false)
    confirmRequest.value = {
      title: options.title ?? t('confirm.title'),
      text: options.text ?? t('confirm.irreversible'),
      confirmText: options.confirmText ?? t('common.delete'),
      cancelText: options.cancelText ?? t('common.cancel'),
    }
    return new Promise<boolean>(resolve => {
      resolveCurrent = resolve
    })
  }

  function resolveConfirm (confirmed: boolean) {
    confirmRequest.value = null
    resolveCurrent?.(confirmed)
    resolveCurrent = null
  }

  // The common case, so it doesn't have to be spelled out at every one of
  // the delete call sites: `what` names the thing - a key of
  // confirm.objects in src/i18n/messages/confirm.json (e.g. 'card' -> "цю картку").
  function confirmDelete (what: ConfirmObjectKey, params: Record<string, string> = {}): Promise<boolean> {
    return confirm({
      title: t('confirm.deleteTitle', { what: t(`confirm.objects.${what}`, params) }),
      text: t('confirm.irreversible'),
      confirmText: t('common.delete'),
    })
  }

  return {
    notifications,
    notify,
    notifySuccess,
    notifyError,
    notifyWarning,
    dismiss,
    confirmRequest,
    confirm,
    confirmDelete,
    resolveConfirm,
  }
})
