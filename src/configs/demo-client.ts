// The demo's made-up client, "Kalyna Hotels" (services/demo-client-api):
// its API, its booking page and its admin, on an address of their own.
export const DEMO_CLIENT_URL = 'https://demo-api.pagewright.pp.ua'

// Its admin opens in a window of its own, to keep beside the site and watch
// what the site sends arrive.
export function openDemoAdmin (lang: string) {
  window.open(`${DEMO_CLIENT_URL}/admin?lang=${encodeURIComponent(lang)}`, 'pw-demo-admin', 'popup=yes,width=1100,height=820')
}

export function isDemoClient (baseUrl: string | undefined): boolean {
  return (baseUrl ?? '').trim().replace(/\/+$/, '') === DEMO_CLIENT_URL
}
