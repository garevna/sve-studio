// The Pagewright demo's sign-in: Firebase Authentication (email + password,
// Google). Loaded only when the site's settings turn it on, so a site
// without it never downloads the SDK.
import type { User } from 'firebase/auth'
import type { AuthAdapter, AuthErrorCode, AuthSettings, AuthUser } from './types'
import { AuthError } from './types'

const ERRORS: Record<string, AuthErrorCode> = {
  'auth/invalid-credential': 'wrong-credentials',
  'auth/invalid-login-credentials': 'wrong-credentials',
  'auth/wrong-password': 'wrong-credentials',
  'auth/user-not-found': 'wrong-credentials',
  'auth/email-already-in-use': 'email-in-use',
  'auth/weak-password': 'weak-password',
  'auth/invalid-email': 'invalid-email',
  'auth/missing-email': 'invalid-email',
  'auth/popup-closed-by-user': 'cancelled',
  'auth/cancelled-popup-request': 'cancelled',
  'auth/popup-blocked': 'popup-blocked',
  'auth/too-many-requests': 'too-many',
  'auth/network-request-failed': 'network',
  'auth/unauthorized-domain': 'domain',
  'auth/operation-not-allowed': 'not-allowed',
  'auth/account-exists-with-different-credential': 'other-method',
}

function failure (error: unknown): AuthError {
  const code = (error as { code?: string })?.code || ''
  if (!ERRORS[code]) {
    console.warn('[auth]', code || error)
  }
  return new AuthError(ERRORS[code] || 'unknown')
}

async function guarded (action: () => Promise<unknown>): Promise<void> {
  try {
    await action()
  } catch (error) {
    throw failure(error)
  }
}

export async function firebaseAuth (config: NonNullable<AuthSettings['firebase']>): Promise<AuthAdapter> {
  const [{ getApps, initializeApp }, fb] = await Promise.all([import('firebase/app'), import('firebase/auth')])
  const app = getApps()[0] ?? initializeApp(config)
  const auth = fb.getAuth(app)
  // The pages' listener - told again when a change of the profile itself
  // (a new account's name) comes after Firebase's own "signed in".
  let listener: ((user: AuthUser | null) => void) | null = null

  function toUser (user: User | null): AuthUser | null {
    if (!user) {
      return null
    }
    const via = user.providerData[0]?.providerId
    return {
      uid: user.uid,
      email: user.email || '',
      name: user.displayName || '',
      photo: user.photoURL || '',
      provider: ({ 'google.com': 'google', 'github.com': 'github', 'password': 'password' } as const)[via as 'password'] ?? 'other',
    }
  }

  return {
    onChange: callback => {
      listener = callback
      return fb.onAuthStateChanged(auth, user => callback(toUser(user)))
    },
    // Firebase refreshes it on its own when it is close to expiring, so this
    // is asked for per call rather than held: a token kept for an hour is a
    // token that has expired.
    idToken: () => auth.currentUser?.getIdToken() ?? Promise.resolve(''),
    signIn: (email, password) => guarded(() => fb.signInWithEmailAndPassword(auth, email, password)),
    signUp: (email, password, name) => guarded(async () => {
      const created = await fb.createUserWithEmailAndPassword(auth, email, password)
      if (name) {
        await fb.updateProfile(created.user, { displayName: name })
        // onAuthStateChanged fired before the name was set.
        await created.user.reload()
        listener?.(toUser(auth.currentUser))
      }
    }),
    signInWithGoogle: () => guarded(() => fb.signInWithPopup(auth, new fb.GoogleAuthProvider())),
    signInWithGithub: () => guarded(() => fb.signInWithPopup(auth, new fb.GithubAuthProvider())),
    resetPassword: email => guarded(() => fb.sendPasswordResetEmail(auth, email)),
    signOut: () => guarded(() => fb.signOut(auth)),
    // Firebase's own e-mails (password reset) in the visitor's language.
    setLanguage: locale => {
      auth.languageCode = locale
    },
  }
}
