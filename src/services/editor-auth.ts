// The editor's sign-in: ONE Firebase session, shared by everything that has
// to prove who is sitting here -
//   - "Повідомлення" (the feedback service checks the token, services/inbox),
//   - "Користувачі" (the content API checks it, server/content-api),
//   - and, through stores/ajax.ts, every save the editor makes once the
//     deployment keeps the roles on the server.
// Sharing it is the point: signing in once in one section and being asked
// again in the next is the bug this file exists to prevent.
//
// The Firebase app is named 'pagewright-inbox' because the inbox was the
// first section to need it, and the name is part of where the browser keeps
// the session: renaming it would sign everybody out once, for nothing.
//
// Not for a client's own site: it signs in against whatever global.json
// sets up (auth.provider), and only 'firebase' leads here.
import type { FirebaseOptions } from 'firebase/app'
import type * as FirebaseAuth from 'firebase/auth'

const APP_NAME = 'pagewright-inbox'

export interface EditorUser {
  email: string
  name: string
  photo: string
}

// 'domain' - the sign-in window refused this address: it is not in the
// Firebase project's authorised domains. Anything else is 'failed'.
export class EditorAuthError extends Error {
  constructor (public code: 'domain' | 'failed', detail = '') {
    super(detail || code)
  }
}

export interface EditorAuth {
  // Called now and on every sign-in/out; returns the way to stop listening.
  watchUser: (onUser: (user: EditorUser | null) => void) => Promise<() => void>
  // false - the person closed the sign-in window. Throws EditorAuthError.
  signIn: () => Promise<boolean>
  signOut: () => Promise<void>
  // The ID token to send as `Authorization: Bearer ...`, or null when
  // nobody is signed in. Safe to call per request: the Firebase SDK keeps
  // the token and renews it shortly before it expires, so there is nothing
  // to schedule or cache here.
  token: () => Promise<string | null>
}

// The session itself, created once. Firebase is loaded only when something
// actually needs the sign-in - the editor opens without it.
let ready: Promise<{ auth: FirebaseAuth.Auth, module: typeof FirebaseAuth }> | null = null

function toUser (user: { email: string | null, displayName: string | null, photoURL: string | null } | null): EditorUser | null {
  return user ? { email: user.email ?? '', name: user.displayName ?? '', photo: user.photoURL ?? '' } : null
}

export function editorAuth (config: FirebaseOptions): EditorAuth {
  function session () {
    ready ??= (async () => {
      const [app, module] = await Promise.all([import('firebase/app'), import('firebase/auth')])
      const instance = app.getApps().find(item => item.name === APP_NAME) ?? app.initializeApp(config, APP_NAME)
      return { auth: module.getAuth(instance), module }
    })()
    return ready
  }

  return {
    async watchUser (onUser) {
      const { auth, module } = await session()
      return module.onAuthStateChanged(auth, user => onUser(toUser(user)))
    },

    async signIn () {
      const { auth, module } = await session()
      const provider = new module.GoogleAuthProvider()
      // Always the account picker: the one the browser remembers may not be
      // the one that has access here.
      provider.setCustomParameters({ prompt: 'select_account' })
      try {
        await module.signInWithPopup(auth, provider)
        return true
      } catch (error) {
        const code = (error as { code?: string }).code ?? ''
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          return false
        }
        throw new EditorAuthError(code === 'auth/unauthorized-domain' ? 'domain' : 'failed', code)
      }
    },

    async signOut () {
      const { auth, module } = await session()
      await module.signOut(auth)
    },

    async token () {
      const { auth } = await session()
      await auth.authStateReady()
      return auth.currentUser ? await auth.currentUser.getIdToken() : null
    },
  }
}
