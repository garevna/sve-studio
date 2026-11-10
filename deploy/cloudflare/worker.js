// pagewright.pp.ua on Cloudflare: the same static build as GitHub Pages,
// served from Workers static assets (wrangler.jsonc). Every existing file
// is answered by Cloudflare directly; this runs only for an address with
// no file of its own.
//
// A page address (/seo, /site/en/about-company) gets its app's start page
// with status 200 - the site under /site/, the editor everywhere else - and
// the app's router shows the page. On GitHub Pages the same addresses go
// through a 404 and a redirect (scripts/gh-pages-404.mjs); here search
// engines see real pages.
export default {
  async fetch (request, env) {
    const url = new URL(request.url)

    // No sign-in on a static host; the editor still asks
    // (src/services/editor-users.ts) and should get an answer, not a 404.
    if (url.pathname === '/api/users/me') {
      return Response.json({ signIn: false })
    }

    // A missing file (a script, a picture, anything with an extension, or
    // under /_nuxt/, /_seed/) stays a 404.
    const last = url.pathname.split('/').pop() ?? ''
    if (last.includes('.') || url.pathname.startsWith('/_')) {
      return env.ASSETS.fetch(request)
    }

    const inSite = url.pathname === '/site' || url.pathname.startsWith('/site/')
    const shell = await env.ASSETS.fetch(new URL(inSite ? '/site/200.html' : '/200.html', url))
    return new Response(shell.body, { status: 200, headers: shell.headers })
  },
}
