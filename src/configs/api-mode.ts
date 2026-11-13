// Which API the editor talks to. Nothing here is read from .env, so a stray
// .env.local can never point the editor at a remote backend.
//
// 'live'  - talk to /api on THIS origin. In the demo that is the in-browser
//           API (service-worker/content-api-sw.ts); on a real deployment it
//           is the server, and the choice between them is made once at start
//           by app/plugins/01.content-api.client.ts.
// 'test'  - neither could be reached; read/write IndexedDB directly.
//
// `let` on purpose: main.ts downgrades to 'test' before the app mounts if
// the service worker is unavailable. Imports see the change (ES live binding).
// eslint-disable-next-line import/no-mutable-exports
export let API_REQUEST_MODE = 'live'

export function useLocalOnlyMode () {
  API_REQUEST_MODE = 'test'
}

// Requests may only go to this origin's /api - see stores/ajax.ts.
export const REMOTE_API_DISABLED = true
