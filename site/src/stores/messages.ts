import type { MessageDraft, SiteMessage } from '@/services/messages/types'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { report } from '../utils/report'
import { useAuthStore } from './auth'

// The signed-in visitor's messages and the replies to them - live: a reply
// written in the Telegram channel appears without reloading.
// Only with sign-in on (stores/auth); a guest's form goes to the channel
// only, as before.
export const useMessagesStore = defineStore('messages', () => {
  const auth = useAuthStore()
  const list = ref<SiteMessage[]>([])
  const loading = ref(false)
  const failed = ref(false)
  let stop: (() => void) | null = null

  watch(() => auth.user?.uid, async uid => {
    stop?.()
    stop = null
    list.value = []
    failed.value = false
    if (!uid) {
      return
    }
    loading.value = true
    try {
      const { watchMessages } = await import('@/services/messages/firebase')
      stop = await watchMessages(uid, next => {
        list.value = next
        loading.value = false
      }, error => {
        report('warn', 'messages', 'Could not watch messages', error)
        failed.value = true
        loading.value = false
      })
    } catch (error) {
      report('warn', 'messages', 'Could not read messages', error)
      failed.value = true
      loading.value = false
    }
  }, { immediate: true })

  // Saves a signed-in visitor's message; its id goes to the channel with it,
  // so a reply there finds its way back. Null when it could not be saved -
  // the form then still sends it to the channel, just without a way back.
  async function create (draft: Omit<MessageDraft, 'uid'>): Promise<string | null> {
    if (!auth.user) {
      return null
    }
    try {
      const { createMessage } = await import('@/services/messages/firebase')
      return await createMessage({ ...draft, uid: auth.user.uid })
    } catch (error) {
      report('warn', 'messages', 'Message not saved', error)
      return null
    }
  }

  return { list, loading, failed, create }
})
