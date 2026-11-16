// What Pagewright on Cloudflare serves (deploy/cloudflare/worker.js picks
// the folder by the host), built into dist/:
//   dist/          pagewright.pp.ua - the owner's own site: the site app
//                  built apart (VITE_SITE_PUBLISHED=1, at the root), reading
//                  only the released content - dist/_seed/, a copy of
//                  content/;
//   dist/dock/     dock.pagewright.pp.ua - the whole demo (the Верф and the
//                  visitor's ship), the same build as GitHub Pages, at the
//                  root of its own address.
// The demo never reaches the owner's site: a visitor's changes live in their
// browser, and the owner's site does not read them.
//
//   node scripts/build-cloudflare.mjs
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const nuxt = join(dirname(createRequire(import.meta.url).resolve('nuxt/package.json')), 'bin', 'nuxt.mjs')

// env: added to this process's; a key set to undefined is left out
function generate (args, env) {
  const merged = { ...process.env, ...env }
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete merged[key]
    }
  }
  const result = spawnSync(process.execPath, [nuxt, 'generate', ...args], { cwd: root, stdio: 'inherit', env: merged })
  if (result.status !== 0) {
    throw new Error(`nuxt generate ${args.join(' ')} failed (exit code ${result.status})`)
  }
}

// copy every file of `from` into `to`, keeping what is there already
function addMissing (from, to) {
  for (const name of readdirSync(from)) {
    if (!existsSync(join(to, name))) {
      cpSync(join(from, name), join(to, name), { recursive: true })
    }
  }
}

rmSync(dist, { recursive: true, force: true })
mkdirSync(dist, { recursive: true })

// 1. the demo, at the root of the dock's address (it generates its own
//    ship into site/.output too)
generate([], { NUXT_APP_BASE_URL: undefined })
cpSync(join(root, '.output', 'public'), join(dist, 'dock'), { recursive: true })

// 2. the owner's site at the root
// (the Верф's base must not reach it - Nuxt would take it as the site's)
generate(['site'], { NUXT_APP_BASE_URL: undefined, SVE_ROOT: '/', VITE_SITE_PUBLISHED: '1' })
cpSync(join(root, 'site', '.output', 'public'), dist, { recursive: true })

// 3. what the owner's site reads and shares with the demo: the released
//    content, the icons, the country lists
cpSync(join(root, 'content'), join(dist, '_seed'), { recursive: true })
addMissing(join(root, 'public'), dist)

// 4. the host's own files (the search console's check file)
cpSync(join(root, 'deploy', 'cloudflare', 'public'), dist, { recursive: true })

process.stdout.write('dist/ ready: the owner\'s site in dist/, the dock in dist/dock/\n')
