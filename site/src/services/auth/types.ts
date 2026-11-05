// Signing in on the site, as the pages see it: who is signed in and the few
// things a visitor can do. The pages never talk to an auth service directly -
// an adapter does (firebase.ts for the Pagewright demo); a client's site
// plugs in an adapter for its own API and the pages stay as they are.
//
// Which adapter is on is a site setting (global.json -> auth), so the demo's
// Firebase project is configuration, not code.

export interface AuthUser {
  uid: string
  email: string
  name: string
  photo: string
  provider: 'password' | 'google' | 'github' | 'other'
}

export interface AuthAdapter {
  // Called with the signed-in user (or null) now and on every change.
  onChange: (callback: (user: AuthUser | null) => void) => () => void
  // Proof of who is signed in, for a service of our own to check: the AI
  // assistant takes it as a Bearer token and counts its budget per account
  // (services/ai-agent). '' when nobody is signed in. Short-lived, so it is
  // asked for per call and never kept.
  idToken: () => Promise<string>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithGithub: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
  setLanguage: (locale: string) => void
}

// What went wrong, in words the pages can explain (configs/auth-texts.ts).
export type AuthErrorCode
  = | 'wrong-credentials'
    | 'email-in-use'
    | 'weak-password'
    | 'invalid-email'
    | 'cancelled'
    | 'popup-blocked'
    | 'too-many'
    | 'network'
    | 'domain'
    | 'not-allowed'
    | 'other-method'
    | 'unknown'

export class AuthError extends Error {
  constructor (public code: AuthErrorCode) {
    super(code)
  }
}

export type AuthMethod = 'password' | 'google' | 'github'

// global.json -> auth
export interface AuthSettings {
  provider?: 'firebase'
  // The ways to sign in shown on the page; absent: e-mail + password and
  // Google. Each must be turned on in the service too.
  methods?: AuthMethod[]
  // A Firebase web app's config (Project settings -> Your apps). Public by
  // design - it names the project, it grants nothing.
  firebase?: {
    apiKey: string
    authDomain: string
    projectId: string
    appId: string
    storageBucket?: string
    messagingSenderId?: string
  }
}
