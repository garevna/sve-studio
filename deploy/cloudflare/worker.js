// Pagewright on Cloudflare (scripts/build-cloudflare.mjs builds dist/,
// wrangler.jsonc sends every request here first):
//   pagewright.pp.ua       the owner's own site - only the released content,
//                          built apart from the demo (VITE_SITE_PUBLISHED=1),
//                          files in dist/;
//   dock.pagewright.pp.ua  the demo: the Верф (/...) and the visitor's own
//                          ship (/site/...), living in the visitor's browser,
//                          files in dist/dock/;
//   demo.pagewright.pp.ua  the visitor's ship at the root of its own address,
//                          reading what they built from the dock through a
//                          bridge (site/src/db/bridge.ts), files in dist/ship/.
// A page address gets its app's start page with status 200 and the app's
// router shows the page - search engines see real pages.

const DOCK_HOST = 'dock.pagewright.pp.ua'
const DEMO_HOST = 'demo.pagewright.pp.ua'

// The Верф's own sections, once at the root of the owner's address
// (src/router/routes.ts): an old link to one goes on to the dock. "account"
// is not here - it is the site's own (the visitor's account).
const VERF_SECTIONS = new Set([
  'architecture', 'auth-page', 'client-api', 'dock-forms', 'editor', 'editor-ui', 'footer', 'forms',
  'general-settings', 'header', 'log', 'menu', 'messages', 'pages', 'palette', 'popups', 'seo',
  'styles', 'ui-kit', 'users',
])

function moved (url, target) {
  return Response.redirect(target + url.search, 301)
}

// a file of dist/, or null
async function file (env, url, path) {
  const response = await env.ASSETS.fetch(new URL(path, url))
  return response.status === 404 ? null : response
}

// What has an extension, or lives under /_nuxt/, /_seed/, is a file or a 404.
function looksLikeFile (path) {
  return (path.split('/').pop() ?? '').includes('.') || path.startsWith('/_')
}

async function shell (env, url, path) {
  const page = await env.ASSETS.fetch(new URL(path, url))
  return new Response(page.body, { status: 200, headers: page.headers })
}

async function dock (request, env, url) {
  const path = url.pathname
  // No sign-in on a static host; the Верф still asks
  // (src/services/editor-users.ts) and should get an answer, not a 404.
  if (path === '/api/users/me') {
    return Response.json({ signIn: false })
  }
  const found = await file(env, url, `/dock${path}`)
  if (found) {
    return found
  }
  if (looksLikeFile(path)) {
    return new Response('Not found', { status: 404 })
  }
  // <dock>/site/ is the bridge the ship reads through (and the frame the
  // Верф shows the site's header in); a person following an old link to the
  // ship there goes on to the ship's own address
  if (path === '/site' || path.startsWith('/site/')) {
    const framed = request.headers.get('sec-fetch-dest') === 'iframe' || url.searchParams.has('sve-bridge')
    return framed ? shell(env, url, '/dock/site/200.html') : moved(url, `https://${DEMO_HOST}${path.slice('/site'.length) || '/'}`)
  }
  return shell(env, url, '/dock/200.html')
}

async function ship (request, env, url) {
  const path = url.pathname
  const found = await file(env, url, `/ship${path}`)
  if (found) {
    return found
  }
  // the released content and pictures are the dock's: a picture before the
  // ship's own worker took the page (public/ship-sw.js) gets the released one
  if (path.startsWith('/_seed/')) {
    return (await file(env, url, `/dock${path}`)) ?? new Response('Not found', { status: 404 })
  }
  if (path.startsWith('/api/content/images/')) {
    return (await file(env, url, `/dock/_seed/images/${path.slice('/api/content/images/'.length)}`)) ?? new Response('Not found', { status: 404 })
  }
  if (looksLikeFile(path)) {
    return new Response('Not found', { status: 404 })
  }
  return shell(env, url, '/ship/200.html')
}

async function ownerSite (request, env, url) {
  const path = url.pathname
  // Old addresses: the site was at /site/; the demo at the root, then at
  // /demo/ - it is the dock now.
  if (path === '/site' || path.startsWith('/site/')) {
    return moved(url, `${url.origin}${path.slice('/site'.length) || '/'}`)
  }
  // a browser that kept the demo's old worker asks for it here: it gets the
  // one that lets itself go (dist/content-api-sw.js)
  if (path === '/demo/content-api-sw.js') {
    return file(env, url, '/content-api-sw.js')
  }
  if (path === '/demo' || path.startsWith('/demo/')) {
    return moved(url, `https://${DOCK_HOST}${path.slice('/demo'.length) || '/'}`)
  }
  if (VERF_SECTIONS.has(path.split('/')[1])) {
    return moved(url, `https://${DOCK_HOST}${path}`)
  }
  // the dock's and the ship's own files are not the site's
  if (!/^\/(dock|ship)(\/|$)/.test(path)) {
    const found = await file(env, url, path)
    if (found) {
      return found
    }
  }
  if (looksLikeFile(path)) {
    return new Response('Not found', { status: 404 })
  }
  return shell(env, url, '/200.html')
}

export default {
  async fetch (request, env) {
    const url = new URL(request.url)
    if (url.hostname === DEMO_HOST) {
      return ship(request, env, url)
    }
    return url.hostname === DOCK_HOST ? dock(request, env, url) : ownerSite(request, env, url)
  },
}
