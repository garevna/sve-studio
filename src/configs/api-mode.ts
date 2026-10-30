// Demo build: the only API is the in-browser mock (public/mock-api-sw.js),
// served at this site's own /api. Nothing here is read from .env, so a stray
// .env.local can never point the editor at a real backend.
//
// 'live'  - talk to /api on this origin (answered by the mock API).
// 'test'  - the mock API could not start; read/write IndexedDB directly.
//
// `let` on purpose: main.ts downgrades to 'test' before the app mounts if
// the service worker is unavailable. Imports see the change (ES live binding).
// eslint-disable-next-line import/no-mutable-exports
export let API_REQUEST_MODE: string = 'live'

export function useLocalOnlyMode () {
  API_REQUEST_MODE = 'test'
}

// Requests may only go to this origin's /api - see stores/ajax.ts.
export const REMOTE_API_DISABLED = true
