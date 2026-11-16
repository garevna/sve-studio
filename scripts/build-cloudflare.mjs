// What Pagewright on Cloudflare serves (deploy/cloudflare/worker.js picks
// the folder by the host), built into dist/:
//   dist/          pagewright.pp.ua - the owner's own site: the site app
//                  built apart (VITE_SITE_PUBLISHED=1, at the root), reading
//                  only the released content - dist/_seed/, a copy of
//                  content/;
//   dist/dock/     dock.pagewright.pp.ua - the Верф at the root of its own
//                  address; its <root>site/ is the bridge the ship reads
//                  through (site/src/db/bridge.ts);
//   dist/ship/     demo.pagewright.pp.ua - the visitor's ship at the root of
//                  its own address, its content asked of the dock.
// The demo never reaches the owner's site: a visitor's changes live in their
// browser, and the owner's site does not read them.
//
//   node scripts/build-cloudflare.mjs
//   DOCK_ORIGIN=http://localhost:3010 SHIP_ORIGIN=http://localhost:3011 node scripts/build-cloudflare.mjs
//     (to try it on one's own machine)
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const DOCK_ORIGIN = process.env.DOCK_ORIGIN || 'https://dock.pagewright.pp.ua'
const SHIP_ORIGIN = process.env.SHIP_ORIGIN || 'https://demo.pagewright.pp.ua'
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

// 1. the Верф, at the root of the dock's address (it generates its own
//    <root>site/ into site/.output too: the bridge, and the frame the Верф
//    shows the site's header in)
generate([], { NUXT_APP_BASE_URL: undefined, VITE_SHIP_ORIGIN: SHIP_ORIGIN })
cpSync(join(root, '.output', 'public'), join(dist, 'dock'), { recursive: true })

// 1b. the visitor's ship, at the root of its own address, reading the dock
generate(['site'], { NUXT_APP_BASE_URL: undefined, SVE_ROOT: '/', VITE_DOCK_ORIGIN: DOCK_ORIGIN, VITE_SHIP_ORIGIN: undefined })
cpSync(join(root, 'site', '.output', 'public'), join(dist, 'ship'), { recursive: true })
addMissing(join(root, 'public'), join(dist, 'ship'))

// 2. the owner's site at the root
// (the Верф's base must not reach it - Nuxt would take it as the site's)
generate(['site'], { NUXT_APP_BASE_URL: undefined, SVE_ROOT: '/', VITE_SITE_PUBLISHED: '1', VITE_SHIP_ORIGIN: undefined, VITE_DOCK_ORIGIN: undefined })
cpSync(join(root, 'site', '.output', 'public'), dist, { recursive: true })

// 3. what the owner's site reads and shares with the demo: the released
//    content, the icons, the country lists
cpSync(join(root, 'content'), join(dist, '_seed'), { recursive: true })
addMissing(join(root, 'public'), dist)

// 4. the host's own files (the search console's check file)
cpSync(join(root, 'deploy', 'cloudflare', 'public'), dist, { recursive: true })

process.stdout.write('dist/ ready: the owner\'s site in dist/, the dock in dist/dock/, the ship in dist/ship/\n')
