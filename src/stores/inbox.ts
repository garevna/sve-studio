// The "Повідомлення" section's state: who is signed in, the messages and
// the answers sent from here. Talks to whichever inbox global.json sets up
// (services/inbox) - the messages are never kept in the editor's own
// IndexedDB or content files: the inbox service is their only home.
import type { InboxAdapter, InboxErrorCode, InboxMessage, InboxUser } from '@/services/inbox'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { InboxError, inboxFor } from '@/services/inbox'
import { useAjaxStore } from '@/stores/ajax'

function codeOf (error: unknown): InboxErrorCode {
  return error instanceof InboxError ? error.code : 'server'
}

export const useInboxStore = defineStore('inbox', () => {
  const ajaxStore = useAjaxStore()

  const adapter = shallowRef<InboxAdapter | null>(null)
  // false - global.json sets up no inbox.
  const configured = ref(true)
  const user = ref<InboxUser | null>(null)
  // The sign-in is restored asynchronously: until then nothing is shown.
  const ready = ref(false)
  const messages = ref<InboxMessage[]>([])
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref<InboxErrorCode | ''>('')

  const waitingCount = computed(() => messages.value.filter(item => item.replies.length === 0).length)

  async function load () {
    if (!adapter.value || !user.value) {
      return
    }
    loading.value = true
    try {
      messages.value = await adapter.value.list()
      loaded.value = true
      error.value = ''
    } catch (error_) {
      error.value = codeOf(error_)
    } finally {
      loading.value = false
    }
  }

  let started: Promise<void> | null = null
  function start () {
    started ??= (async () => {
      const settings = await ajaxStore.getGlobalSettings().catch(() => null)
      adapter.value = inboxFor(settings)
      configured.value = Boolean(adapter.value)
      if (!adapter.value) {
        ready.value = true
        return
      }
      await adapter.value.watchUser(next => {
        const changed = next?.email !== user.value?.email
        user.value = next
        ready.value = true
        if (changed) {
          messages.value = []
          loaded.value = false
          error.value = ''
          void load()
        }
      })
    })()
    return started
  }

  async function signIn () {
    if (!adapter.value) {
      return
    }
    try {
      error.value = ''
      // A different account, when the one signed in has no access.
      if (user.value) {
        await adapter.value.signOut()
      }
      await adapter.value.signIn()
    } catch (error_) {
      error.value = codeOf(error_)
    }
  }

  async function signOut () {
    await adapter.value?.signOut()
  }

  // Throws - the card that sent it says what went wrong. true: the answer
  // is in the messenger chat too.
  async function reply (messageId: string, text: string): Promise<boolean> {
    if (!adapter.value) {
      throw new InboxError('sign-in')
    }
    const { reply: saved, telegram } = await adapter.value.reply(messageId, text)
    const message = messages.value.find(item => item.id === messageId)
    message?.replies.push(saved)
    return telegram
  }

  // Throws, like reply().
  async function remove (messageId: string) {
    if (!adapter.value) {
      throw new InboxError('sign-in')
    }
    await adapter.value.remove(messageId)
    messages.value = messages.value.filter(item => item.id !== messageId)
  }

  return { remove, configured, user, ready, messages, loaded, loading, error, waitingCount, start, load, signIn, signOut, reply }
})
