/* eslint-disable unicorn/no-useless-promise-resolve-reject */
import type { InternalAxiosRequestConfig } from 'axios'
import type { GlobalSettingsModel } from '@/types/GlobalSettingsModel'
import type { MenuItemModel } from '@/types/MenuItemModel'
import type { RequestModel } from '@/types/RequestModel'
import type { SeoSettingsModel } from '@/types/SeoSettingsModel'
import type { DynamicPageListItem, TemplateBlockModel, TemplatePageModel } from '@/types/TemplateBlockModel'
import axios from 'axios'
// import { getAuth } from 'firebase/auth'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dispatch, setListener } from '@/composables/eventEmitter'
import { API_REQUEST_MODE, REMOTE_API_DISABLED } from '@/configs/api-mode'
import { dbRequest } from '@/db/client'
import { themeFilePath } from '@/db/theme-layout'
import { t } from '@/i18n'
import { useUiFeedbackStore } from '@/stores/ui-feedback'
import { getActiveTheme } from '@/utils/active-theme'
import { appBase } from '@/utils/app-base'
import { syncContentImages } from '@/utils/dev-content-images'
import { clearStoredToken, extractToken, readStoredToken, storeToken, TOKEN_STORAGE_KEY, tokenExpiryMs } from '@/utils/launch-token'
// import { useCommonStore } from './common'

export const useAjaxStore = defineStore('ajax', () => {
  const loading = ref(false)
  const error = ref(false)
  const success = ref(false)

  const isLogged = ref(false)
  const token = ref('')

  const globalProgress = ref(true)
  function setGlobalProgress (val: boolean) {
    globalProgress.value = val
  }

  // Set whenever a live-mode (VITE_API_REQUEST_MODE !== 'test') request
  // fails and this store falls back to locally saved data (IndexedDB) - see
  // getDynamicFilesData/saveDynamicFileData/getStyleFile/etc below. App.vue
  // renders it as a persistent, dismissible banner - a global concern, not
  // something every individual view should have to wire up its own warning
  // for.
  //
  // The fallback warning is a popup now, not a strip across the top of the
  // page - see stores/ui-feedback.ts. Repeats collapse there too (an
  // identical message that's still on screen just gets its timer restarted),
  // which is what the old debounced auto-hide was for: autosave fires a live
  // PUT on every debounced edit, so a burst where only some requests fail
  // has to read as one continuous "having trouble" state rather than a
  // strobe of appearing and disappearing warnings.
  // 401/403 is not "no connection": the request reached the server and was
  // refused. It means one concrete thing here - the access token the host
  // system leaves in localStorage (utils/launch-token.ts) is missing or no
  // longer valid, since that token is the only credential the editor ever
  // sends. The generic "немає зв'язку" wording sent the reader looking for
  // a network problem that isn't there, so auth failures say what actually
  // happened. Renewing the token is the host system's job, not this app's.
  type AuthFailureKind = 'none' | 'token' | 'privilege'

  function authFailureKind (error: unknown): AuthFailureKind {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined
    if (status !== 401 && status !== 403) {
      return 'none'
    }
    if (!token.value) {
      return 'token'
    }
    const expiry = tokenExpiryMs(token.value)
    if (expiry === null) {
      return 'token'
    }
    return expiry <= Date.now() ? 'token' : 'privilege'
  }

  function logApiFallback (endpoint: string, error: unknown) {
    console.warn(`API request to ${endpoint} failed, falling back to locally saved data:`, error)
  }
  function warnApiFallback (endpoint: string, error: unknown) {
    logApiFallback(endpoint, error)
    const kind = authFailureKind(error)
    const feedback = useUiFeedbackStore()
    if (kind === 'privilege') {
      feedback.notifyWarning(t('popups.noPrivilege'), t('popups.noPrivilegeReadDetail'))
      return
    }
    feedback.notifyWarning(
      kind === 'token' ? t('popups.noApiAccess') : t('popups.noApiConnection'),
      kind === 'token' ? t('popups.noApiAccessDetail') : t('popups.noApiConnectionDetail'),
    )
  }

  // Reported centrally rather than by each view: every mutation that
  // actually reaches the server goes through one of the save/delete
  // functions below, so this is the one place that knows whether it worked.
  // Silent (publish:false) autosaves deliberately say nothing - they run on
  // a debounce while the user is still typing.
  function reportSaved (what: string) {
    useUiFeedbackStore().notifySuccess(t('popups.saved', { what }))
  }
  function reportSaveFailed (what: string, error: unknown) {
    console.error(`Failed to publish ${what}:`, error)
    // An auth refusal gets its own heading rather than a line buried under
    // "не вдалося зберегти": the request reached the server and was turned
    // away, so retrying changes nothing and the reader needs to know it's
    // the token, not the network or their content.
    const kind = authFailureKind(error)
    if (kind === 'privilege') {
      useUiFeedbackStore().notifyError(t('popups.noPrivilege'), t('popups.noPrivilegeWriteDetail', { what }))
      return
    }
    if (kind === 'token') {
      useUiFeedbackStore().notifyError(t('popups.tokenTitle'), t('popups.tokenWriteDetail', { what }))
      return
    }
    useUiFeedbackStore().notifyError(t('popups.saveFailed', { what }), t('popups.saveFailedDetail'))
  }

  const api = axios.create({
    // The API is shared across apps (this editor, client-side, ...) and
    // lives at the domain root's /api - NOT reverse-proxied under this
    // editor's own deploy sub-path (import.meta.env.BASE_URL), even though
    // the editor itself may be deployed under one (e.g. /visual-editor/).
    // Confirmed live: baking BASE_URL in here produced
    // https://.../visual-editor/api/... instead of https://.../api/....
    // Demo: the API is the in-browser mock at this origin's /api (see
    // public/mock-api-sw.js) - never a remote server.
    // The demo's API is the in-browser worker, under the app's own base
    // ("/" in dev, "/sve-studio/" on GitHub Pages).
    baseURL: REMOTE_API_DISABLED ? `${location.origin}${appBase()}api` : (import.meta.env.PROD ? `${location.origin}${appBase()}api` : import.meta.env.VUE_APP_API_URL || import.meta.env.VITE_API_URL),
    timeout: 50_000,
    // Lets the mock API serve the right theme even if two tabs differ.
    headers: { 'X-Theme': String(getActiveTheme()) },
  })

  // Guard for the demo: a request may only go to this origin's <base>api
  // ("/api" in dev, "/sve-studio/api" on GitHub Pages), and
  // only while the mock API is running. Anything else is rejected before it
  // is sent; callers fall back to IndexedDB / bundled files on failure.
  if (REMOTE_API_DISABLED) {
    api.interceptors.request.use(config => {
      const target = new URL(axios.getUri(config), location.origin)
      if (API_REQUEST_MODE === 'live' && target.origin === location.origin && target.pathname.startsWith(`${appBase()}api/`)) {
        return config
      }
      return Promise.reject(new Error(`Demo mode: request blocked (${config.method?.toUpperCase()} ${target.href})`))
    })
  }

  // No login flow of our own: the host system leaves a ready-made access
  // token in localStorage (see main.ts's readLaunchToken()) and the editor
  // sends it as a static header, set once at bootstrap by setToken() below.
  //
  // Keeping that token alive IS this app's job, though: the token expires
  // while someone is still working, and the first thing they'd notice
  // otherwise is a save being refused. On a refusal the editor asks
  // /user/refresh for a fresh one and replays the request that failed, so
  // the renewal is invisible unless it too fails.
  //
  // This API answers 403 - never 401 - for a missing, malformed, expired and
  // insufficiently-privileged token alike, all with the same body, and the
  // backend has confirmed it won't be splitting those codes. So the status
  // can't say which happened, and the TOKEN'S OWN `expire` decides instead:
  // still in the future means the token is fine and the refusal is about
  // privileges (refreshing would change nothing); already past means it
  // needs renewing. Unreadable expiry falls to the refresh, which is the
  // safe way to be wrong - one extra request rather than a session that
  // silently stops saving.
  const REFRESH_ENDPOINT = '/user/refresh'

  // axios hands the failed request's own config back for the replay - the
  // flag rides along on it so one request is only ever retried once, no
  // matter how the refresh went.
  type RetriableConfig = InternalAxiosRequestConfig & { __retried?: boolean }

  // The editor fires several requests at once (page content, styles, global
  // settings), so an expiry hits them all together. Without this they would
  // each start their own refresh, and every one but the last would install a
  // token that the next refresh immediately replaced.
  let refreshInFlight: Promise<string> | null = null

  // A failed refresh means either the session is really over or this was a
  // privilege refusal all along - in both cases the next few requests would
  // ask again for nothing. Short on purpose: it exists to stop a burst, not
  // to lock the editor out of ever renewing.
  const REFRESH_RETRY_PAUSE_MS = 30_000
  let refreshBlockedUntil = 0

  // The access token lives 15 minutes, so the reactive path above would fire
  // several times an hour - each time as a failed request the user has
  // already waited for. Renewing a minute ahead of expiry keeps that out of
  // sight; the interceptor stays as the safety net for everything the timer
  // can't cover (a token with no readable expiry, a laptop that was asleep
  // when the timer was due, a token revoked early).
  const REFRESH_LEAD_MS = 60_000
  let refreshTimer: ReturnType<typeof setTimeout> | null = null

  // setTimeout keeps its delay in a 32-bit signed int - anything past ~24.9
  // days overflows and fires IMMEDIATELY instead of never. Long-lived
  // tokens are not hypothetical here (the local dev one runs 80 days), and
  // the symptom is the opposite of obvious: a refresh request on every page
  // load, failing quietly, while the token it was renewing was fine. So the
  // wait is served in chunks and only acted on once the due time has really
  // arrived.
  const MAX_TIMER_MS = 6 * 60 * 60 * 1000

  function armRefreshTimer (dueAt: number) {
    // Never below a second: a token that arrives already expired would
    // otherwise schedule a burst of immediate refreshes, and each failure
    // is what refreshBlockedUntil is there to absorb.
    const delay = Math.max(1000, Math.min(dueAt - Date.now(), MAX_TIMER_MS))
    refreshTimer = setTimeout(() => {
      refreshTimer = null
      if (Date.now() < dueAt) {
        // Woke early - just another chunk of the wait, nothing to do yet.
        armRefreshTimer(dueAt)
        return
      }
      // Nothing to handle: a failed pre-emptive refresh just means the next
      // real request takes the reactive path, exactly as before.
      refreshToken().catch(() => {})
    }, delay)
  }

  function scheduleRefresh (value: string) {
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
    const expiry = tokenExpiryMs(value)
    if (expiry === null) {
      return
    }
    armRefreshTimer(expiry - REFRESH_LEAD_MS)
  }

  // withCredentials, confirmed by probing the live API: /user/refresh reads
  // the refresh token from a cookie, not from the Authorization header - it
  // answers 401 REFRESH_TOKEN_NOT_FOUND identically with and without a
  // valid Bearer token. The API replies with
  // Access-Control-Allow-Credentials: true and echoes the editor's own
  // origin, so the cookie is allowed cross-origin; without this flag the
  // browser simply wouldn't attach it and every refresh would fail.
  //
  // Set on this one request rather than on the instance: it is the only
  // call that needs the cookie, and the rest of the API is authorised by
  // the Bearer header alone.
  function refreshToken (): Promise<string> {
    refreshInFlight ??= api.get(REFRESH_ENDPOINT, { withCredentials: true })
      .then(({ data }) => {
        // Deliberately shape-agnostic - see extractToken's own comment.
        const fresh = extractToken(data)
        if (!fresh) {
          // A 200 with no token is not a renewed session - treated as a
          // failure so the request isn't replayed with the very same token
          // that was just refused.
          throw new Error('refresh response carried no token')
        }
        setToken(fresh)
        return fresh
      })
      .catch((refreshError: unknown) => {
        refreshBlockedUntil = Date.now() + REFRESH_RETRY_PAUSE_MS
        // 401 from the refresh endpoint is the one unambiguous signal this
        // API gives: the refresh cookie is gone or dead. Anything else
        // (network, 5xx) is treated as temporary - the pause above already
        // stops it from being retried in a burst.
        if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
          endSession(t('popups.sessionExpired'))
        }
        throw refreshError
      })
      .finally(() => {
        refreshInFlight = null
      })
    return refreshInFlight
  }

  // The token is shared state: the host system may rewrite it, and a second
  // editor tab refreshing installs a fresh one under the very same key. So
  // localStorage - not this store's memory - is the authority, and a value
  // there that differs from ours is simply adopted. This is what makes the
  // whole arrangement work no matter WHO renews the token, which matters
  // while it isn't settled whether renewal is ours to do at all.
  function adoptStoredToken (): string {
    const stored = readStoredToken()
    if (stored && stored !== token.value) {
      setToken(stored)
      return stored
    }
    return ''
  }

  // Fires only in OTHER tabs, which is exactly the point: one tab refreshes,
  // the rest pick the new token up without a request of their own.
  if (typeof window !== 'undefined' && !REMOTE_API_DISABLED) {
    window.addEventListener('storage', event => {
      // A whole-storage clear reports key === null; anything else isn't ours.
      if (event.key !== null && event.key !== TOKEN_STORAGE_KEY) {
        return
      }
      if (event.newValue) {
        if (event.newValue !== token.value) {
          setToken(event.newValue)
        }
        return
      }
      // The admin panel removes this key on logout, so its disappearance is
      // a logout that happened in another tab - the editor follows it out
      // rather than carrying on with a token whose session has ended.
      endSession(t('popups.loggedOut'))
    })
  }

  api.interceptors.response.use(response => response, async (error: unknown) => {
    const config = axios.isAxiosError(error) ? error.config as RetriableConfig | undefined : undefined

    // Only a refusal the TOKEN caused is worth a refresh - see
    // authFailureKind. A privilege refusal is passed straight through, so
    // opening a section the account has no rights to costs no request and
    // reports what actually happened. The refresh call itself is excluded:
    // it answers 401 when the cookie is gone, and would otherwise be asked
    // to refresh itself.
    if (authFailureKind(error) !== 'token' || !config || config.__retried
      || config.url?.endsWith(REFRESH_ENDPOINT)
      || Date.now() < refreshBlockedUntil) {
      throw error
    }
    config.__retried = true

    try {
      // Cheapest fix first: another tab may already have renewed the token
      // while this request was in flight, in which case replaying it costs
      // nothing and no refresh is needed at all.
      const fresh = adoptStoredToken() || await refreshToken()
      // The failed config still carries the OLD Authorization header, baked
      // in when it was first sent - replaying it as-is would repeat the same
      // 401 with a perfectly good token sitting in the defaults.
      config.headers.Authorization = `Bearer ${fresh}`
      return await api(config)
    } catch {
      // Deliberately does NOT clear the stored token. Since 403 is also
      // what a plain privilege refusal looks like here, a failed refresh is
      // no proof the token is dead - and throwing away a working token
      // because someone opened one section they have no rights to would
      // leave the whole editor read-only until it was relaunched.
      //
      // Rethrows the ORIGINAL failure, not the refresh's: what the caller
      // asked for is what didn't happen, and that's what its own error
      // handling (and the popup) is written around.
      throw error
    }
  })

  const setLoading = (value: boolean) => {
    loading.value = value
  }

  const setError = (value: boolean) => {
    error.value = value
  }

  const setSuccess = (value: boolean) => {
    success.value = value
  }

  function setToken (value: string) {
    token.value = value
    api.defaults.headers.common['Authorization'] = `Bearer ${value}`
    // Persisted as well as held in memory, so a reload after a refresh
    // continues with the renewed token rather than the stale one the host
    // system originally wrote.
    storeToken(value)
    scheduleRefresh(value)
  }

  function clearToken () {
    token.value = ''
    delete api.defaults.headers.common['Authorization']
    clearStoredToken()
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
  }

  // The session is over for good, and the editor must stop pretending
  // otherwise: keeping a dead token would let every later save fail one at a
  // time, each with its own popup, instead of saying once that the user has
  // to come back through the admin panel. Two ways to get here, both
  // definitive - the admin panel removed the token (logout), or
  // /user/refresh answered 401, which the backend confirms means the
  // refresh cookie itself is gone.
  //
  // Nothing is lost by this: edits live in IndexedDB and are still there
  // when the editor is opened again.
  function endSession (detail: string) {
    if (!token.value) {
      return
    }
    clearToken()
    useUiFeedbackStore().notifyError(t('popups.sessionEnded'), detail)
  }

  function setLocale (locale: string) {
    api.defaults.headers.common['X-Locale'] = locale
  }

  function getImageURL (imageId: string) {
    // Already a full URL (data:, blob:, http(s): - e.g. upload-image.ts's
    // dev-mirror return value) - nothing to resolve, and no domain-root path
    // to mis-anchor against the app's own base path (see theme-asset-path.ts).
    if (!imageId || /^[a-z][\w+.-]*:/i.test(imageId)) {
      return imageId
    }
    if (imageId.startsWith('/images/')) {
      const activeTheme = getActiveTheme()
      const base = appBase().replace(/\/$/, '')
      return location.origin + base + imageId.replace(/^\/images\//, `/images/theme_${activeTheme}/`)
    }
    // Anything else is what the real upload endpoint's response.path
    // already is - confirmed live: a domain-relative path that already
    // includes the /api/content/images/{hash}.ext segment itself (not a
    // bare name needing that prefix added here). Only the origin is
    // resolved fresh at render time (not baked in at upload time), so a
    // later API domain change is a config change (this baseURL), not a
    // rewrite of every page that references an image. Confirmed public (no
    // auth difference in a live probe) - safe to use in a plain <img src>,
    // which can't carry an Authorization header anyway.
    // The demo's API answers under the app's base ("/sve-studio/api/..." on
    // GitHub Pages), so a stored /api/... path gets that base in front.
    const apiBase = (REMOTE_API_DISABLED || import.meta.env.PROD) && imageId.startsWith('/api/') ? appBase().replace(/\/$/, '') : ''
    // Without the in-browser API in control (the first moments of a new
    // release, or "working on the local copy"), /api/... is not answered at
    // all on a static host - a picture of the release is then read from the
    // published files (/_seed/images/...) instead. An uploaded one has to
    // wait for the API.
    if (import.meta.env.PROD && imageId.startsWith('/api/content/images/') && (API_REQUEST_MODE !== 'live' || !navigator.serviceWorker?.controller)) {
      return `${location.origin}${appBase()}_seed/images/${imageId.slice('/api/content/images/'.length)}`
    }
    return new URL(api.defaults.baseURL || location.origin, location.origin).origin + apiBase + imageId
  }

  // Third fallback tier, below the live API and IndexedDB (see
  // readDynamicFilesDataLocal/getStyleFile below) - reads straight from the
  // deployed public/files/theme_N/... files, the same source IndexedDB
  // itself is seeded from. Only ever reached if IndexedDB has genuinely
  // nothing for this file yet (a fresh/broken seed), since the normal path
  // is live API -> IndexedDB and IndexedDB alone already covers the common
  // case.
  function publicFileUrl (relativePath: string): string {
    const base = appBase().replace(/\/$/, '')
    return `${location.origin}${base}/${themeFilePath(relativePath)}`
  }

  async function makeRequest (request: RequestModel) {
    setLoading(true)
    setError(false)
    setSuccess(false)
    const { method, endpoint, errorEvent, successEvent, data, headers } = request
    try {
      const url = `${api.defaults.baseURL}${endpoint}`
      // get/delete are axios(url, config) - 2 args, no data - while
      // post/put/patch are axios(url, data, config) - 3 args. Passing
      // `headers` positionally as a 3rd arg to a 2-arg method would just be
      // silently dropped by axios, so branch on shape instead of always
      // calling api[method](url, data, config).
      const response = method === 'get' || method === 'delete'
        ? await api[method](url, headers ? { headers } : undefined)
        : await api[method](url, data, headers ? { headers } : undefined)
      // The company's existing (Hyperf-based) backend reports a failed
      // lookup as HTTP 200 with {success:false, error:"..."} rather than a
      // 4xx/5xx status - confirmed by probing its current /content/public/...
      // endpoints, which this app isn't integrating against (see
      // docs/api-requirements.md - that data model is being replaced, not
      // reused), but the same envelope convention may carry over to the new
      // endpoints too. Cheap defensive check either way: without it, e.g. a
      // mistyped pageId would silently hand the caller an error-envelope
      // object instead of throwing.
      if (response.data && typeof response.data === 'object' && response.data.success === false) {
        throw new Error(response.data.error || 'Request failed')
      }
      // Confirmed live (2026-08): the backend sometimes answers a broken
      // endpoint with HTTP 200 and an HTML error/framework page instead of
      // any proper error status or {success:false} envelope - axios treats
      // that as a completely normal success, so every caller (getStyleFile,
      // getDynamicFilesData, ...) would otherwise silently accept an HTML
      // string as if it were real CSS/JSON content and write it straight
      // into the editor (confirmed: showed up as raw HTML inside the CSS
      // editor for a styles/{name} GET). Only ever a false positive if a
      // real CSS/JSON payload could itself start with "<!doctype html"/
      // "<html" - it can't - so this is safe to apply to every response
      // this app makes, GET or PUT, with no per-caller special-casing.
      if (typeof response.data === 'string' && /^\s*<(!doctype html|html[\s>])/i.test(response.data)) {
        throw new Error('API returned an HTML page instead of the expected content - treating as a failed request')
      }
      setSuccess(true)
      // A success deliberately does NOT clear a fallback warning that's
      // already on screen: autosave fires a live PUT on every debounced
      // edit, so clearing on the next success turned one transient failure
      // into a visible appear/disappear/reappear flicker. The warning ages
      // out on its own timer instead - see warnApiFallback.
      if (successEvent) {
        dispatch(successEvent, { data: response.data })
      }
      return response.data
    } catch (error_) {
      setError(true)
      const event = errorEvent || 'request-error'
      dispatch(event, { error: error_ })
      return Promise.reject(error_)
    } finally {
      setLoading(false)
    }
  }

  async function sendRequest (request: RequestModel) {
    if (!request.confirmEvent) {
      return await makeRequest(request)
    }

    const event = request.confirmEvent.replace('confirm-', '') + '-confirmation'

    const promise = new Promise<CustomEvent>(resolve => {
      setListener(event, (e: Event) => resolve(e as CustomEvent))
      dispatch(request.confirmEvent as string, { request })
    })
    return promise.then(response => {
      return response.detail.confirmed ? makeRequest(request) : { success: false }
    })
  }

  async function getListOfCountries () {
    const response = await axios.get(`https://flagcdn.com/de/codes.json`)
    return response
  }

  // Maps the file-name convention every call site already uses
  // ("dynamic-pages/bus-park.json", "global.json") to the IndexedDB worker's
  // {route, data} shape - see src/db/config.ts for the store layout this
  // mirrors. Styles have their own dedicated functions below (getStyleFile/
  // saveStyleFile/listStyleFiles) since they're addressed purely by name,
  // a genuinely different scheme from pages/settings.
  function dbRouteFor (fileName: string): { route: 'pages' | 'settings', data: Record<string, string> } {
    if (fileName.startsWith('dynamic-pages/')) {
      return { route: 'pages', data: { pageId: fileName.slice('dynamic-pages/'.length).replace(/\.json$/, '') } }
    }
    return { route: 'settings', data: { key: fileName.replace(/\.json$/, '') } }
  }

  async function readDynamicFilesDataLocal (fileName: string) {
    setLoading(true)
    setError(false)
    setSuccess(false)
    try {
      const { route, data } = dbRouteFor(fileName)
      const result = await dbRequest(route, 'get', data)
      if (result !== null && result !== undefined) {
        setSuccess(true)
        return result
      }
      // IndexedDB has nothing under this key (not seeded yet, or the seed
      // step missed it - see seedMissingSettings in worker.ts for a bug
      // this exact gap already caused once) - last resort, read the file
      // straight from public/, the same place seeding itself reads from.
      const publicResult = await fetch(publicFileUrl(fileName), { cache: 'no-store' })
        .then(response => response.ok ? response.json() : null)
        .catch(() => null)
      setSuccess(true)
      return publicResult
    } catch (error_) {
      setError(true)
      dispatch('request-error', { error: error_ })
      return null
    } finally {
      setLoading(false)
    }
  }

  // What the server just told us, kept as the new local baseline. The write
  // path has always mirrored into IndexedDB (see saveDynamicFileData below);
  // the read path never did, so the local copy stayed at whatever the bundled
  // public/files/theme_N snapshot held when the repo was last committed -
  // seedIfEmpty/seedMissingSettings fill it from public/, never from the API.
  // That is why the local DB drifts out of step with the real site without
  // anyone touching it, and why the standalone preview window - which reads
  // IndexedDB and never the API - could show content the editor itself had
  // long since moved past.
  //
  // A record with unpublished changes is left strictly alone. That flag is
  // the whole reason IndexedDB exists here (drafts + what Undo reverts to),
  // and silently replacing a draft with the server's version would throw away
  // work the user never chose to discard. Those records catch up the moment
  // they are published.
  //
  // Deliberately not routed through saveDynamicFileDataLocal: that one drives
  // the save/success UI state and, in dev, also writes the real public/ file.
  // Neither belongs to reading something.
  // Whether this file has edits that were never published. Failing the check
  // reports "no draft": a read must still work with the database unavailable,
  // and the cache write it gates is guarded again on its own.
  async function hasUnpublishedDraft (fileName: string): Promise<boolean> {
    try {
      const { route, data } = dbRouteFor(fileName)
      const status = await dbRequest<{ updated: boolean }>(route, 'status', data)
      return !!status?.updated
    } catch {
      return false
    }
  }

  async function cacheDynamicFileData (fileName: string, content: unknown) {
    try {
      const { route, data } = dbRouteFor(fileName)
      if (await hasUnpublishedDraft(fileName)) {
        return
      }
      await dbRequest(route, 'save', { ...data, content, published: true })
    } catch (error_) {
      // Refreshing the cache is never worth failing a read that already
      // succeeded - the caller has its answer either way.
      console.warn(`cacheDynamicFileData: could not refresh "${fileName}"`, error_)
    }
  }

  async function getDynamicFilesData (fileName: string, prodURL: string) {
    const mode = API_REQUEST_MODE
    if (mode === 'test') {
      return readDynamicFilesDataLocal(fileName)
    }

    // An unpublished draft outranks the server. Without this the editor would
    // show the published version while the user's own unsaved work sat in
    // IndexedDB unused - and the standalone preview window, which reads only
    // IndexedDB, would disagree with the editor about the same page. The
    // draft stops winning the moment it is published or undone.
    if (await hasUnpublishedDraft(fileName)) {
      return readDynamicFilesDataLocal(fileName)
    }

    try {
      const response = await makeRequest({
        method: 'get',
        endpoint: prodURL,
        errorEvent: 'request-error',
      })
      if (response !== null && response !== undefined) {
        await cacheDynamicFileData(fileName, response)
      }
      return response
    } catch (error_) {
      // The live API isn't reachable/isn't built yet - fall back to
      // whatever's already saved in IndexedDB (itself seeded from public/ on
      // first run) rather than leaving the caller with nothing to show.
      warnApiFallback(prodURL, error_)
      return readDynamicFilesDataLocal(fileName)
    }
  }

  // `publish` distinguishes a live in-progress edit (autosave - IndexedDB
  // only, record stays flagged "updated" so Undo has something to revert)
  // from an explicit "Зберегти" click (publish:true - also mirrors to the
  // real public/ file - standing in for "sent to the server" until a real
  // API exists - and clears the "updated" flag). Default true so any
  // existing call site that doesn't pass options keeps its old behavior.
  async function saveDynamicFileDataLocal (fileName: string, content: unknown, publish: boolean) {
    setLoading(true)
    setError(false)
    setSuccess(false)
    try {
      // IndexedDB write is the real success/failure signal - durable
      // across reloads and machines, unlike the dev-only mirror below.
      const { route, data } = dbRouteFor(fileName)
      await dbRequest(route, 'save', { ...data, content, published: publish })
      setSuccess(true)

      // Best-effort mirror onto a real public/files/theme_N/... file so
      // it stays committable/deployable, same as before this change -
      // only runs under `vite dev` (the middleware doesn't exist in a
      // deployed build), only on an explicit publish (this is the
      // "sent to server" moment, not every autosave tick), and must
      // never fail the save the user just saw succeed.
      if (publish && import.meta.env.DEV) {
        try {
          await axios.put(`${location.origin}/__editor-api__/public-file`, {
            path: themeFilePath(fileName),
            content,
          })
          // The pictures this content links to, too - see dev-content-images.ts.
          void syncContentImages()
        } catch (mirrorError) {
          console.warn('Dev-mirror write to public/ failed (IndexedDB save already succeeded):', mirrorError)
          // Refused by the denylist guard (server/routes/__editor-api__/
          // public-file.ts): the file keeps its clean version - say so.
          if ((mirrorError as { response?: { status?: number } })?.response?.status === 409) {
            useUiFeedbackStore().notifyError(t('popups.fileNotWritten'), t('popups.denylisted'))
          }
        }
      }
    } catch (error_) {
      setError(true)
      dispatch('request-error', { error: error_ })
      throw error_
    } finally {
      setLoading(false)
    }
  }

  // `what` names the thing in the confirmation the user sees ("Сторінку
  // збережено"). It's optional only because a silent autosave passes none:
  // reporting is tied to publish, not to every debounced keystroke.
  async function saveDynamicFileData (fileName: string, content: unknown, prodURL: string, options: { publish?: boolean, what?: string } = {}) {
    const mode = API_REQUEST_MODE
    const publish = options.publish ?? true
    const what = options.what

    // A DRAFT never goes to the server. Autosave runs on a debounce while
    // the user is still typing/dragging and passes publish:false; until this
    // check existed, every one of those keystrokes did a live PUT, so
    // experimenting in the editor changed the real site immediately and
    // "Зберегти" was decorative. Confirmed live: footer column widths tried
    // out in the editor were already on client-side, with no save pressed,
    // and no way back to the previous values.
    //
    // IndexedDB is the right home for a draft anyway - it's what the preview
    // window reads, so previewing before publishing still works exactly as
    // intended.
    if (mode === 'test' || !publish) {
      await saveDynamicFileDataLocal(fileName, content, publish)
      if (publish && what) {
        reportSaved(what)
      }
      return
    }

    try {
      await makeRequest({
        method: 'put',
        endpoint: prodURL,
        data: content as object,
        errorEvent: 'request-error',
      })
      // Mirror into IndexedDB too, not just on failure - the standalone
      // site (site/, "Перегляд") only ever reads local drafts,
      // never the live API, so without this a successful live save was
      // invisible there until an unrelated Undo/reset happened to also
      // refresh it (confirmed live: edited page content/styles, saved
      // successfully, opened the preview - still showed the old content,
      // and IndexedDB itself still held the old content on direct
      // inspection). publish reflects what was actually achieved here (it
      // did reach the server), same as the local-only ('test' mode) path.
      await saveDynamicFileDataLocal(fileName, content, publish)
      if (publish && what) {
        reportSaved(what)
      }
    } catch (error_) {
      // Same fallback as the read path - land the edit in IndexedDB so it
      // isn't lost, but always as "updated" (unsynced), regardless of what
      // the caller asked for: it did NOT actually reach the server, so the
      // dirty/Undo state must not claim otherwise.
      //
      // A failed PUBLISH reports the save failure rather than the generic
      // "no connection" warning: two popups for one event is noise, and the
      // save message is the one that says what happened to the user's edit.
      if (publish && what) {
        logApiFallback(prodURL, error_)
        reportSaveFailed(what, error_)
      } else {
        warnApiFallback(prodURL, error_)
      }
      await saveDynamicFileDataLocal(fileName, content, false)
    }
  }

  // Whether the IndexedDB record for this file differs from the last
  // publish (or, if never published this session, from the seeded public/
  // baseline) - drives whether an Undo button is shown/enabled.
  async function isDynamicFileUpdated (fileName: string): Promise<boolean> {
    const { route, data } = dbRouteFor(fileName)
    const result = await dbRequest<{ updated: boolean }>(route, 'status', data)
    return result.updated
  }

  // Discards whatever's in IndexedDB and restores the file straight from
  // public/ (the last-published baseline) - both in the DB and as the
  // returned content, so the caller can put it back into its own model.
  // "Скасувати" means: throw away my unpublished changes and go back to what
  // the site actually shows right now - so it reverts to the SERVER's current
  // version, not to the bundled public/files/theme_N snapshot. Those two used
  // to be the same thing and no longer are: the snapshot is only as new as
  // the last commit, so undoing could silently roll a page back past edits
  // that had been published long ago.
  //
  // The restored version is written as a clean record (published: true), so
  // the Undo affordance disappears and reads go back to the live path.
  //
  // The old behaviour is the fallback, not the default: with no endpoint to
  // ask (or the API unreachable) reverting to the bundled file is still far
  // better than refusing to revert at all - and it is what test mode, which
  // has no server, does anyway.
  //
  // `unwrap` exists for the one endpoint whose response is not the stored
  // shape: menu-content arrives as { items: [...] } and is stored as a bare
  // array (see getMenuContent for why that wrapping lives at the HTTP
  // boundary only).
  async function undoDynamicFileData<T = unknown> (fileName: string, prodURL?: string, unwrap?: (response: unknown) => T): Promise<T> {
    const { route, data } = dbRouteFor(fileName)
    const mode = API_REQUEST_MODE
    if (mode !== 'test' && prodURL) {
      try {
        const response = await makeRequest({
          method: 'get',
          endpoint: prodURL,
          errorEvent: 'request-error',
        })
        if (response !== null && response !== undefined) {
          const content = unwrap ? unwrap(response) : response as T
          await dbRequest(route, 'save', { ...data, content, published: true })
          return content
        }
      } catch (error_) {
        warnApiFallback(prodURL, error_)
      }
    }
    return dbRequest<T>(route, 'undo', data)
  }

  async function getGlobalSettings () {
    const response = await getDynamicFilesData('global.json', '/content/settings/global')
    return response as GlobalSettingsModel
  }

  async function saveGlobalSettings (settings: GlobalSettingsModel, options: { publish?: boolean } = {}) {
    await saveDynamicFileData('global.json', settings, '/content/settings/global', { what: t('common.generalSettings'), ...options })
  }

  async function isGlobalSettingsUpdated () {
    return isDynamicFileUpdated('global.json')
  }

  async function undoGlobalSettings () {
    return undoDynamicFileData<GlobalSettingsModel>('global.json', '/content/settings/global')
  }

  async function getSeoSettings () {
    const response = await getDynamicFilesData('seo.json', '/content/settings/seo')
    return response as SeoSettingsModel
  }

  async function saveSeoSettings (settings: SeoSettingsModel, options: { publish?: boolean } = {}) {
    await saveDynamicFileData('seo.json', settings, '/content/settings/seo', { what: t('saveTargets.seoSettings'), ...options })
  }

  async function isSeoSettingsUpdated () {
    return isDynamicFileUpdated('seo.json')
  }

  async function undoSeoSettings () {
    return undoDynamicFileData<SeoSettingsModel>('seo.json', '/content/settings/seo')
  }

  // Styles are addressed purely by (flat) file name - no folder/path at all,
  // matching how a real server will eventually hand these over. IndexedDB/
  // manifest.json/public files all key by the FULL filename ("buttons.css"),
  // but the live /content/styles LIST endpoint returns bare names ("buttons",
  // no extension) - confirmed live, and confirmed this exact mismatch is
  // what made a style file's route param (StyleFileView.vue, sourced from
  // that live list) end up bare, which then 404'd the public/ fallback
  // fetch below - and Vite's dev server serves index.html for any
  // unmatched path (SPA fallback), which silently got treated as if it
  // were the file's own CSS content. Normalizing once here, regardless of
  // what the caller passes, protects every caller of this function without
  // needing every call site to individually get the extension right.
  function withCssExtension (name: string): string {
    return name.endsWith('.css') ? name : `${name}.css`
  }

  async function readStyleFileLocal (name: string) {
    name = withCssExtension(name)
    const result = await dbRequest<string | null>('styles', 'get', { name })
    if (result !== null && result !== undefined) {
      return result
    }
    // Same third tier as readDynamicFilesDataLocal - IndexedDB has nothing
    // for this file, fall back to reading it straight from public/.
    return fetch(publicFileUrl(`styles/${name}`), { cache: 'no-store' })
      .then(response => response.ok ? response.text() : null)
      .catch(() => null)
  }

  async function getStyleFile (name: string) {
    const mode = API_REQUEST_MODE
    if (mode === 'test') {
      return readStyleFileLocal(name)
    }
    try {
      const response = await makeRequest({
        method: 'get',
        endpoint: `/content/styles/${name}`,
        errorEvent: 'request-error',
      })
      return response as string
    } catch (error_) {
      warnApiFallback(`/content/styles/${name}`, error_)
      return readStyleFileLocal(name)
    }
  }

  async function saveStyleFileLocal (name: string, content: string, publish: boolean) {
    name = withCssExtension(name)
    await dbRequest('styles', 'save', { name, content, published: publish })
    // Best-effort mirror onto a real public/files/theme_N/styles/... file,
    // same non-fatal dev-only pattern as saveDynamicFileData above - only
    // on an explicit publish, not every autosave tick.
    if (publish && import.meta.env.DEV) {
      try {
        await axios.put(`${location.origin}/__editor-api__/public-file`, {
          path: themeFilePath(`styles/${name}`),
          content,
        })
      } catch (mirrorError) {
        console.warn('Dev-mirror write to public/ failed (IndexedDB save already succeeded):', mirrorError)
      }
    }
  }

  async function saveStyleFile (name: string, content: string, options: { publish?: boolean } = {}) {
    const mode = API_REQUEST_MODE
    const publish = options.publish ?? true
    const what = t('saveTargets.styleFile', { name })
    // Drafts stay local - same rule as saveDynamicFileData above.
    if (mode === 'test' || !publish) {
      await saveStyleFileLocal(name, content, publish)
      if (publish) {
        reportSaved(what)
      }
      return
    }
    try {
      await makeRequest({
        method: 'put',
        endpoint: `/content/styles/${name}`,
        data: content as unknown as object,
        // Confirmed live: the backend rejects this PUT with 415 unless
        // Content-Type is exactly text/css or text/plain - axios's own
        // default for PUT (application/x-www-form-urlencoded) doesn't
        // qualify, even though the body itself is already the raw CSS
        // string, not actually form-encoded.
        headers: { 'Content-Type': 'text/css' },
        errorEvent: 'request-error',
      })
      // Mirror into IndexedDB too, not just on failure - see
      // saveDynamicFileData's own comment on why (the standalone preview
      // window only ever reads local drafts).
      await saveStyleFileLocal(name, content, publish)
      if (publish) {
        reportSaved(what)
      }
    } catch (error_) {
      if (publish) {
        logApiFallback(`/content/styles/${name}`, error_)
        reportSaveFailed(what, error_)
      } else {
        warnApiFallback(`/content/styles/${name}`, error_)
      }
      // Same "never claim it reached the server" rule as saveDynamicFileData.
      await saveStyleFileLocal(name, content, false)
    }
  }

  async function isStyleFileUpdated (name: string): Promise<boolean> {
    const result = await dbRequest<{ updated: boolean }>('styles', 'status', { name: withCssExtension(name) })
    return result.updated
  }

  // Same rule as undoDynamicFileData above: back to the stylesheet the site
  // is serving right now, with the bundled public/ copy as the fallback.
  async function undoStyleFile (name: string): Promise<string> {
    const storedName = withCssExtension(name)
    const mode = API_REQUEST_MODE
    if (mode !== 'test') {
      try {
        const response = await makeRequest({
          method: 'get',
          endpoint: `/content/styles/${name}`,
          errorEvent: 'request-error',
        })
        // A stylesheet is plain text, and the backend has been seen answering
        // a broken endpoint with HTTP 200 and an HTML page (see makeRequest's
        // own note) - saving that over a real stylesheet would be worse than
        // not reverting, so anything that is not a string falls through to
        // the bundled copy, which the worker validates the same way.
        if (typeof response === 'string' && response.length > 0) {
          await dbRequest('styles', 'save', { name: storedName, content: response, published: true })
          return response
        }
      } catch (error_) {
        warnApiFallback(`/content/styles/${name}`, error_)
      }
    }
    return dbRequest<string>('styles', 'undo', { name: storedName })
  }

  async function readStyleFilesListLocal (): Promise<string[]> {
    const local = await dbRequest<string[]>('styles', 'list')
    if (local.length > 0) {
      return local
    }
    const manifest = await fetch(publicFileUrl('manifest.json'), { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .catch(() => null) as { styles?: string[] } | null
    return manifest?.styles ?? []
  }

  async function listStyleFiles (): Promise<string[]> {
    const mode = API_REQUEST_MODE
    if (mode === 'test') {
      return readStyleFilesListLocal()
    }
    try {
      const response = await makeRequest({ method: 'get', endpoint: '/content/styles', errorEvent: 'request-error' })
      if (!Array.isArray(response)) {
        throw new TypeError('Unexpected /content/styles response shape (not an array)')
      }
      // The live endpoint returns bare names (no ".css") - normalize here so
      // every name this function ever returns matches IndexedDB/manifest's
      // own convention, same reason withCssExtension exists (see
      // readStyleFileLocal's own comment) - this is the one spot a bare
      // name would otherwise become a route param and propagate everywhere.
      return (response as string[]).map(name => withCssExtension(name))
    } catch (error_) {
      warnApiFallback('/content/styles', error_)
      return readStyleFilesListLocal()
    }
  }

  // Every /content/settings/{key} document must be a JSON *object* at the
  // top level - confirmed live (PUT with a bare array: 400 "Setting
  // document must be a JSON object") and in the API's own OpenAPI schema
  // (MenuContentSettings: {type: "object"}). But the menu's real shape -
  // matching production's own client-side/public/files/menu-content.json,
  // MainMenu.vue's rendering, and this editor's own MenuItemModel[] state -
  // is a bare array. Rather than reshape the menu everywhere (a breaking
  // change to already-deployed production code), wrap/unwrap only at this
  // one HTTP boundary: local storage (IndexedDB/public/ fallback) and every
  // other function in this app keep working with a plain array.
  async function getMenuContent () {
    const mode = API_REQUEST_MODE
    if (mode === 'test') {
      return readDynamicFilesDataLocal('menu-content.json') as Promise<MenuItemModel[]>
    }
    try {
      const response = await makeRequest({ method: 'get', endpoint: '/content/settings/menu-content', errorEvent: 'request-error' })
      return (response?.items ?? response) as MenuItemModel[]
    } catch (error_) {
      warnApiFallback('/content/settings/menu-content', error_)
      return readDynamicFilesDataLocal('menu-content.json') as Promise<MenuItemModel[]>
    }
  }

  async function saveMenuContent (items: MenuItemModel[], options: { publish?: boolean } = {}) {
    const mode = API_REQUEST_MODE
    const publish = options.publish ?? true
    // Drafts stay local - same rule as saveDynamicFileData above.
    if (mode === 'test' || !publish) {
      await saveDynamicFileDataLocal('menu-content.json', items, publish)
      if (publish) {
        reportSaved(t('common.mainMenu'))
      }
      return
    }
    try {
      await makeRequest({ method: 'put', endpoint: '/content/settings/menu-content', data: { items }, errorEvent: 'request-error' })
      // Mirror into IndexedDB too, not just on failure - see
      // saveDynamicFileData's own comment on why.
      await saveDynamicFileDataLocal('menu-content.json', items, publish)
      if (publish) {
        reportSaved(t('common.mainMenu'))
      }
    } catch (error_) {
      if (publish) {
        logApiFallback('/content/settings/menu-content', error_)
        reportSaveFailed(t('common.mainMenu'), error_)
      } else {
        warnApiFallback('/content/settings/menu-content', error_)
      }
      await saveDynamicFileDataLocal('menu-content.json', items, false)
    }
  }

  async function isMenuContentUpdated () {
    return isDynamicFileUpdated('menu-content.json')
  }

  async function undoMenuContent () {
    return undoDynamicFileData<MenuItemModel[]>(
      'menu-content.json',
      '/content/settings/menu-content',
      response => ((response as { items?: MenuItemModel[] })?.items ?? response) as MenuItemModel[],
    )
  }

  // The 'footer-content' slug is really a single raw TemplateBlockModel
  // (footer-1's own root), not a TemplatePageModel - EditorView.vue/
  // commonStore/DynamicPageTemplate.vue only ever work with a
  // TemplatePageModel's {blocks:[...]} shape, so this wraps/unwraps at
  // exactly this boundary. That's what lets /editor/footer-content work
  // as a genuine (single-block) page editor with zero changes to any of
  // those three - they never see anything but a normal-shaped page.
  // Any footer slug, not just the canonical one. Confirmed live: the backend
  // also holds footer-content-1 and footer-content-client-side, and BOTH are
  // stored as a raw block (id 'app-footer', no blocks array), exactly like
  // footer-content itself. With an equality check they fell through to the
  // ordinary page path, which would read a block where it expects a page and
  // then PUT a page-shaped object back over it. EditorView.vue has always
  // used startsWith for the same set - the two definitions disagreeing was
  // the bug.
  function isFooterPseudoPage (pageId: string): boolean {
    return pageId.startsWith('footer-content')
  }

  function wrapFooterAsPage (pageId: string, footerBlock: TemplateBlockModel): TemplatePageModel {
    return { id: pageId, breadcrumbs: false, backButton: false, hero: false, blocks: [footerBlock] }
  }

  async function getDynamicPageContent (pageId: string) {
    if (isFooterPseudoPage(pageId)) {
      const footerBlock = await getFooterContentDraft(pageId)
      return wrapFooterAsPage(pageId, footerBlock)
    }
    const response = await getDynamicFilesData(`dynamic-pages/${pageId}.json`, `/content/pages/${pageId}`)
    return response as TemplatePageModel
  }

  // PUT is an upsert (creates the page if the slug doesn't exist yet) - both
  // "save an edit" and "create a new page" (see PagesListView.vue's
  // createPage) call this same function, and the slug is always
  // client-chosen up front, so there's never a separate POST-then-learn-the-id
  // step to reconcile.
  async function saveDynamicPage (pageId: string, content: TemplatePageModel, options: { publish?: boolean } = {}) {
    if (isFooterPseudoPage(pageId)) {
      const footerBlock = content.blocks[0]
      if (!footerBlock) {
        return
      }
      // There's one footer-content.json (no per-variant drafts - the
      // project owner's own design: footerVariant picks which COMPONENT
      // renders it, not which JSON to read), so this saves straight to the
      // real canonical slug. An earlier version of this function
      // deliberately avoided that, back when production's client-side
      // still only understood the old type:'float'/plain-string shape and
      // publishing footer-1 there broke the real site - confirmed since
      // resolved: client-side's own FooterTemplate.vue now explicitly
      // accepts type:'footer-1' (checked directly in that repo).
      await saveFooterContentDraft(pageId, footerBlock, options)
      return
    }
    await saveDynamicFileData(`dynamic-pages/${pageId}.json`, content, `/content/pages/${pageId}`, { what: t('saveTargets.page'), ...options })
  }

  async function isDynamicPageUpdated (pageId: string) {
    if (isFooterPseudoPage(pageId)) {
      return isFooterContentDraftUpdated(pageId)
    }
    return isDynamicFileUpdated(`dynamic-pages/${pageId}.json`)
  }

  async function undoDynamicPage (pageId: string) {
    if (isFooterPseudoPage(pageId)) {
      const footerBlock = await undoFooterContentDraft(pageId)
      return wrapFooterAsPage(pageId, footerBlock)
    }
    return undoDynamicFileData<TemplatePageModel>(`dynamic-pages/${pageId}.json`, `/content/pages/${pageId}`)
  }

  async function deleteDynamicPageLocal (pageId: string) {
    // IndexedDB delete is the real success/failure signal, same as every
    // other write path here - the dev-mirror file removal below is
    // best-effort and must never fail a delete the user already saw
    // succeed.
    await dbRequest('pages', 'delete', { pageId })
    if (import.meta.env.DEV) {
      try {
        await axios.delete(`${location.origin}/__editor-api__/public-file`, {
          params: { path: themeFilePath(`dynamic-pages/${pageId}.json`) },
        })
      } catch (mirrorError) {
        console.warn('Dev-mirror delete of public/ file failed (IndexedDB delete already succeeded):', mirrorError)
      }
    }
  }

  async function deleteDynamicPage (pageId: string) {
    const mode = API_REQUEST_MODE
    if (mode === 'test') {
      await deleteDynamicPageLocal(pageId)
      useUiFeedbackStore().notifySuccess(t('popups.pageDeleted'))
      return
    }
    try {
      await makeRequest({
        method: 'delete',
        endpoint: `/content/pages/${pageId}`,
        errorEvent: 'request-error',
      })
      await deleteDynamicPageLocal(pageId)
      useUiFeedbackStore().notifySuccess(t('popups.pageDeleted'))
    } catch (error_) {
      // Local IndexedDB is the only real store today (see fallback comments
      // above) - deleting there too keeps the editor's own view of the world
      // consistent, even though the (unreachable) server never heard about it.
      logApiFallback(`/content/pages/${pageId}`, error_)
      await deleteDynamicPageLocal(pageId)
      // Same three-way split as reportSaveFailed: "повторіть, коли з'явиться
      // зв'язок" would send the user retrying something that keeps failing
      // until the token is renewed - or that no retry can ever fix.
      const kind = authFailureKind(error_)
      const report = {
        privilege: [t('popups.noPrivilege'), t('popups.pageDeleteNoPrivilegeDetail')],
        token: [t('popups.tokenTitle'), t('popups.pageDeleteTokenDetail')],
        none: [t('popups.pageDeleteFailed'), t('popups.pageDeleteFailedDetail')],
      }[kind]
      useUiFeedbackStore().notifyError(report[0] as string, report[1])
    }
  }

  // Show/hide is a dedicated endpoint rather than a field inside the page's
  // own content PUT - hiding a page shouldn't require re-sending its whole
  // (possibly large) block tree, and production's own page-list consumers
  // only ever need this one flag, never the content.
  async function setDynamicPageVisibility (pageId: string, visible: boolean) {
    const mode = API_REQUEST_MODE
    if (mode === 'test') {
      await dbRequest('pages', 'set-visible', { pageId, visible })
      return
    }
    try {
      await makeRequest({
        method: 'patch',
        endpoint: `/content/pages/${pageId}/visibility`,
        data: { visible },
        errorEvent: 'request-error',
      })
    } catch (error_) {
      warnApiFallback(`/content/pages/${pageId}/visibility`, error_)
      await dbRequest('pages', 'set-visible', { pageId, visible })
    }
  }

  async function readDynamicPagesListLocal (): Promise<DynamicPageListItem[]> {
    // Worker already excludes 'footer-content'(-{variant}) - see
    // handlePages() in src/db/worker.ts.
    const local = await dbRequest<DynamicPageListItem[]>('pages', 'list')
    if (local.length > 0) {
      return local
    }
    // Third tier, same reasoning as readDynamicFilesDataLocal - IndexedDB's
    // pages store is empty (fresh/broken seed), fall back to manifest.json,
    // the same source seeding itself reads from. No per-page titles live
    // there (those are inside each page's own file) - entries just fall
    // back to showing their pageId, same as PagesListView.vue already does
    // for any page without a title.
    const manifest = await fetch(publicFileUrl('manifest.json'), { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .catch(() => null) as { pages?: string[] } | null
    return (manifest?.pages ?? [])
      .filter(pageId => !pageId.startsWith('footer-content'))
      .map(pageId => ({ pageId, visible: true }))
  }

  async function listDynamicPages (): Promise<DynamicPageListItem[]> {
    const mode = API_REQUEST_MODE

    if (mode === 'test') {
      return readDynamicPagesListLocal()
    }

    try {
      // includeHidden=true: this is the editor's own list (needs hidden pages
      // too, so they can be un-hidden) - production's page-list/menu/sitemap
      // consumers call the same endpoint without this param and only ever see
      // visible pages.
      const response = await makeRequest({ method: 'get', endpoint: '/content/pages?includeHidden=true', errorEvent: 'request-error' })
      // The real backend's response shape is still evolving and doesn't
      // match docs/api-requirements.md exactly yet - real items look like
      // {id, slug, status, ...}, not {pageId, title, visible} - so this
      // maps defensively instead of trusting it verbatim, and treats
      // anything that isn't even an array as untrustworthy (e.g. an
      // unmatched route silently falling through to a SPA's own index.html
      // with HTTP 200 - a real failure mode this project already hit once
      // probing the old /content/public/... domain, see
      // docs/api-requirements.md section 0). A response that LOOKS right
      // but silently isn't (this exact bug) is exactly why "the request
      // succeeded" alone was never enough of a trust signal.
      if (!Array.isArray(response)) {
        throw new TypeError('Unexpected /content/pages response shape (not an array)')
      }
      return (response as Record<string, unknown>[])
        // footer-content(-{variant}) slugs are footer drafts stored through
        // the generic page mechanism, not real pages - same exclusion
        // readDynamicPagesListLocal()/db/worker.ts already apply to the
        // local tiers, extended here in case the backend doesn't know to
        // exclude them from its own list yet.
        .filter(item => !((item.pageId ?? item.slug) as string || '').startsWith('footer-content'))
        .map(item => ({
          pageId: (item.pageId ?? item.slug) as string,
          title: item.title as DynamicPageListItem['title'],
          visible: typeof item.visible === 'boolean' ? item.visible : (item.status ? item.status === 'published' : true),
        }))
    } catch (error_) {
      warnApiFallback('/content/pages', error_)
      return readDynamicPagesListLocal()
    }
  }

  // Footer content ('footer-content', the only slug - see
  // FooterSettingsView.vue's own comment on why a variant is a different
  // component, not a different JSON) is a raw TemplateBlockModel
  // (type:'footer-1', children:[...]), not a TemplatePageModel -
  // saveDynamicPage/getDynamicPageContent above are typed for real pages
  // specifically, so this is a parallel set of functions over the same
  // generic saveDynamicFileData/getDynamicFilesData primitives. Still takes
  // a slug parameter rather than a hardcoded name, in case that ever
  // changes again.
  async function getFooterContentDraft (slug: string) {
    const response = await getDynamicFilesData(`dynamic-pages/${slug}.json`, `/content/pages/${slug}`)
    return response as TemplateBlockModel
  }

  async function saveFooterContentDraft (slug: string, content: TemplateBlockModel, options: { publish?: boolean } = {}) {
    await saveDynamicFileData(`dynamic-pages/${slug}.json`, content, `/content/pages/${slug}`, { what: t('common.footer'), ...options })
  }

  async function isFooterContentDraftUpdated (slug: string) {
    return isDynamicFileUpdated(`dynamic-pages/${slug}.json`)
  }

  async function undoFooterContentDraft (slug: string) {
    return undoDynamicFileData<TemplateBlockModel>(`dynamic-pages/${slug}.json`, `/content/pages/${slug}`)
  }

  async function getFooterContent () {
    return getFooterContentDraft('footer-content')
  }

  async function getPalette () {
    const response = await getDynamicFilesData('palette.json', '/content/settings/palette')
    return response as Record<string, string>
  }

  async function savePalette (palette: Record<string, string>, options: { publish?: boolean } = {}) {
    await saveDynamicFileData('palette.json', palette, '/content/settings/palette', { what: t('saveTargets.palette'), ...options })
  }

  async function isPaletteUpdated () {
    return isDynamicFileUpdated('palette.json')
  }

  async function undoPalette () {
    return undoDynamicFileData<Record<string, string>>('palette.json', '/content/settings/palette')
  }

  // Which variant (1, 2, ...) of each "Особистий кабінет" page is selected,
  // keyed by that page's production route name.
  async function getAccountPages () {
    const response = await getDynamicFilesData('account-pages.json', '/content/public/account-pages')
    return (response ?? {}) as Record<string, number>
  }

  async function saveAccountPages (selection: Record<string, number>, options: { publish?: boolean } = {}) {
    await saveDynamicFileData('account-pages.json', selection, '/content/public/account-pages', { what: t('saveTargets.accountPages'), ...options })
  }

  async function isAccountPagesUpdated () {
    return isDynamicFileUpdated('account-pages.json')
  }

  async function undoAccountPages () {
    return undoDynamicFileData<Record<string, number>>('account-pages.json', '/content/public/account-pages')
  }

  return {
    loading,
    error,
    success,
    isLogged,
    globalProgress,
    sendRequest,
    setToken,
    clearToken,
    setLocale,
    setLoading,
    setError,
    setSuccess,
    confirm,
    getListOfCountries,
    setGlobalProgress,
    getImageURL,
    getGlobalSettings,
    saveGlobalSettings,
    isGlobalSettingsUpdated,
    undoGlobalSettings,
    getSeoSettings,
    saveSeoSettings,
    isSeoSettingsUpdated,
    undoSeoSettings,
    getMenuContent,
    saveMenuContent,
    isMenuContentUpdated,
    undoMenuContent,
    getDynamicPageContent,
    saveDynamicPage,
    isDynamicPageUpdated,
    undoDynamicPage,
    deleteDynamicPage,
    setDynamicPageVisibility,
    listDynamicPages,
    // Always reads IndexedDB/public - unlike listDynamicPages, doesn't ask
    // the live server first. Needed wherever a caller specifically wants
    // "every page this editor knows about", not "what the server currently
    // has" - e.g. PagesListView.vue's bulk-publish action, which pushes
    // exactly the gap between those two lists up to the server.
    readDynamicPagesListLocal,
    getFooterContent,
    getFooterContentDraft,
    saveFooterContentDraft,
    isFooterContentDraftUpdated,
    undoFooterContentDraft,
    getPalette,
    savePalette,
    isPaletteUpdated,
    undoPalette,
    getAccountPages,
    saveAccountPages,
    isAccountPagesUpdated,
    undoAccountPages,
    getStyleFile,
    saveStyleFile,
    isStyleFileUpdated,
    undoStyleFile,
    listStyleFiles,
  }
})
