export interface RequestModel {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch'
  endpoint: string
  confirmEvent?: string
  errorEvent?: string
  successEvent?: string
  params?: object
  data?: object
  // Per-request header overrides - e.g. styles' own PUT/GET (see ajax.ts's
  // saveStyleFile) needs an explicit Content-Type: text/css, since the
  // backend rejects anything else (confirmed live: 415 "Content-Type must
  // be text/css or text/plain") and axios's own default for PUT
  // (application/x-www-form-urlencoded) doesn't satisfy that, even though
  // the actual body being sent is already the raw CSS string.
  headers?: Record<string, string>
  options?: object
  callback?: () => void
}
