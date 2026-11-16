// pagewright.pp.ua on Cloudflare (scripts/build-cloudflare.mjs builds what
// it serves, from Workers static assets - wrangler.jsonc):
//   /          the owner's own site - only the released content, built
//              apart from the demo (VITE_SITE_PUBLISHED=1);
//   /demo/     the demo: the Верф (/demo/...) and the visitor's own ship
//              (/demo/site/...), living in the visitor's browser.
// Every existing file is answered by Cloudflare directly; this runs only
// for an address with no file of its own.
//
// A page address gets its app's start page with status 200 and the app's
// router shows the page - search engines see real pages.

// The Верф's own sections, once at the root (src/router/routes.ts): an old
// link to one goes on to the demo. "account" is not here - it is the site's
// own (the visitor's account).
const VERF_SECTIONS = new Set([
  'architecture', 'auth-page', 'client-api', 'dock-forms', 'editor', 'editor-ui', 'footer', 'forms',
  'general-settings', 'header', 'log', 'menu', 'messages', 'pages', 'palette', 'popups', 'seo',
  'styles', 'ui-kit', 'users',
])

function moved (url, path) {
  return Response.redirect(new URL(path + url.search, url), 301)
}

export default {
  async fetch (request, env) {
    const url = new URL(request.url)
    const path = url.pathname

    // No sign-in on a static host; the Верф still asks
    // (src/services/editor-users.ts) and should get an answer, not a 404.
    if (path === '/demo/api/users/me' || path === '/api/users/me') {
      return Response.json({ signIn: false })
    }

    // Old addresses: the site was at /site/, the Верф at the root.
    if (path === '/site' || path.startsWith('/site/')) {
      return moved(url, path.slice('/site'.length) || '/')
    }
    if (path === '/demo') {
      return moved(url, '/demo/')
    }
    if (VERF_SECTIONS.has(path.split('/')[1])) {
      return moved(url, `/demo${path}`)
    }

    // A missing file (a script, a picture, anything with an extension, or
    // under /_nuxt/, /_seed/) stays a 404.
    const last = path.split('/').pop() ?? ''
    if (last.includes('.') || path.startsWith('/_') || path.startsWith('/demo/_')) {
      return env.ASSETS.fetch(request)
    }

    let shell = '/200.html'
    if (path === '/demo/site' || path.startsWith('/demo/site/')) {
      shell = '/demo/site/200.html'
    } else if (path.startsWith('/demo/')) {
      shell = '/demo/200.html'
    }
    const page = await env.ASSETS.fetch(new URL(shell, url))
    return new Response(page.body, { status: 200, headers: page.headers })
  },
}
