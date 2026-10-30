// The site built with the editor (site/ - a Nuxt app of its own), served by
// the editor's server at /site/.
//
// Same origin on purpose: the site reads the visitor's copy of the content
// from the browser's IndexedDB, which only pages of the same origin can open.
//
//   dev   - the site runs its own dev server (port 3007) and this one
//           proxies /site to it, so both keep their own hot reload;
//   build - the site is generated first, and its files are served from
//           /site/; any address there that is not a file gets the site's
//           start page (server/routes/site/[...].ts), whose router then
//           shows the page the address names.
import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { createResolver, defineNuxtModule } from 'nuxt/kit'

const SITE_DEV_PORT = 3007

function nuxtCli (): string {
  const require = createRequire(import.meta.url)
  return join(dirname(require.resolve('nuxt/package.json')), 'bin', 'nuxt.mjs')
}

// The site is built under <root>site/: its base comes from SVE_ROOT, and the
// editor's own NUXT_APP_BASE_URL must not reach it (Nuxt would take it as
// the site's base too).
function run (args: string[], cwd: string): ChildProcess {
  const root = process.env.NUXT_APP_BASE_URL || '/'
  const env: NodeJS.ProcessEnv = { ...process.env, SVE_ROOT: root.endsWith('/') ? root : `${root}/` }
  delete env.NUXT_APP_BASE_URL
  return spawn(process.execPath, [nuxtCli(), ...args], { cwd, stdio: 'inherit', env })
}

export default defineNuxtModule({
  meta: { name: 'site-app' },
  async setup (_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const repoRoot = resolve('..')
    const siteRoot = resolve('../site')

    // The editor app must not pick up the site's files.
    nuxt.options.ignore.push('site/**')

    if (nuxt.options.dev) {
      // `nuxt dev` runs this module more than once (it restarts on config
      // changes); one site server is enough.
      const state = globalThis as { __sveSiteDev?: ChildProcess }
      if (!state.__sveSiteDev || state.__sveSiteDev.exitCode !== null) {
        state.__sveSiteDev = run(['dev', 'site', '--port', String(SITE_DEV_PORT)], repoRoot)
        const stop = () => state.__sveSiteDev?.kill()
        process.once('exit', stop)
        process.once('SIGINT', stop)
        process.once('SIGTERM', stop)
      }
      nuxt.options.nitro.devProxy ||= {}
      nuxt.options.nitro.devProxy['/site'] = {
        target: `http://localhost:${SITE_DEV_PORT}/site`,
        changeOrigin: true,
        ws: true,
      }
      return
    }

    // Build: generate the site, then ship its files with the editor's.
    if (!nuxt.options._prepare) {
      await new Promise<void>((done, fail) => {
        run(['generate', 'site'], repoRoot).on('exit', code => code === 0 ? done() : fail(new Error(`Site build failed (exit code ${code})`)))
      })
      const output = join(siteRoot, '.output', 'public')
      nuxt.options.nitro.publicAssets ||= []
      // fallthrough: an address that is not a file goes on to the start-page
      // route instead of a 404.
      nuxt.options.nitro.publicAssets.push({ baseURL: 'site', dir: output, maxAge: 0, fallthrough: true })
      // The start page for every other /site/ address - read by
      // server/routes/site/[...].ts.
      nuxt.options.nitro.serverAssets ||= []
      nuxt.options.nitro.serverAssets.push({ baseName: 'site', dir: output })
    }
  },
})
