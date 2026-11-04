import type { AuthAdapter, AuthErrorCode, AuthMethod, AuthSettings, AuthUser } from '@/services/auth/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { AuthError } from '@/services/auth/types'

// Who is signed in on the site, and the actions the pages call. The service
// behind it is an adapter (services/auth) picked by the site's settings
// (global.json -> auth): without one, `enabled` stays false and the sign-in
// page says signing in isn't set up.
export const useAuthStore = defineStore('auth', () => {
  const enabled = ref(false)
  // The first answer of "who is signed in" has come (a page waits for it
  // before deciding between the account and the sign-in form).
  const ready = ref(false)
  const user = ref<AuthUser | null>(null)
  const busy = ref(false)
  const error = ref<AuthErrorCode | ''>('')
  const methods = ref<AuthMethod[]>(['password', 'google'])

  let adapter: AuthAdapter | null = null
  let configured = ''
  let unsubscribe: (() => void) | null = null

  async function configure (settings: AuthSettings | undefined) {
    const key = JSON.stringify(settings ?? null)
    if (key === configured) {
      return
    }
    configured = key
    unsubscribe?.()
    unsubscribe = null
    adapter = null
    user.value = null
    methods.value = settings?.methods?.length ? settings.methods : ['password', 'google']
    if (settings?.provider === 'firebase' && settings.firebase?.apiKey) {
      try {
        const { firebaseAuth } = await import('@/services/auth/firebase')
        adapter = await firebaseAuth(settings.firebase)
        enabled.value = true
        unsubscribe = adapter.onChange(next => {
          user.value = next
          ready.value = true
        })
        return
      } catch (error_) {
        console.warn('[auth] not available', error_)
      }
    }
    enabled.value = false
    ready.value = true
  }

  async function run (action: (auth: AuthAdapter) => Promise<void>): Promise<boolean> {
    if (!adapter) {
      error.value = 'not-allowed'
      return false
    }
    busy.value = true
    error.value = ''
    try {
      await action(adapter)
      return true
    } catch (error_) {
      error.value = error_ instanceof AuthError ? error_.code : 'unknown'
      return false
    } finally {
      busy.value = false
    }
  }

  return {
    enabled,
    ready,
    user,
    busy,
    error,
    methods,
    configure,
    signIn: (email: string, password: string) => run(auth => auth.signIn(email.trim(), password)),
    signUp: (email: string, password: string, name: string) => run(auth => auth.signUp(email.trim(), password, name.trim())),
    signInWithGoogle: () => run(auth => auth.signInWithGoogle()),
    signInWithGithub: () => run(auth => auth.signInWithGithub()),
    resetPassword: (email: string) => run(auth => auth.resetPassword(email.trim())),
    signOut: () => run(auth => auth.signOut()),
    setLanguage: (locale: string) => adapter?.setLanguage(locale),
    clearError: () => {
      error.value = ''
    },
  }
})
