// Where the content lives on the host this is deployed to.
//
// nuxt.config.ts gives the three stores a driver that always works
// ('memory' built, 'fs' in dev). This file is the one place a deployment
// changes that, at runtime, from what the host actually provides:
//
//   Cloudflare Workers - KV namespaces bound as CONTENT_DOCS,
//     CONTENT_IMAGES, CONTENT_USERS, and (for pictures, which outgrow KV)
//     an R2 bucket bound as CONTENT_FILES, used instead of CONTENT_IMAGES
//     when it is there.
//   Anything Node - NUXT_CONTENT_API_DATA_DIR, a folder on a disk that
//     survives a restart (a mounted volume, not the container's own disk).
//
// Nothing bound and nothing set: the stores stay as nuxt.config.ts left
// them, which for a built server means memory - every edit lost on restart.
// That is the right default for a demo and the wrong one for a site, so it
// is said out loud in the log once at start.
//
// The point of doing it here rather than in nuxt.config.ts: the bindings are
// the host's, known only when the thing is running, so a client's
// deployment needs no change to the build - let alone a fork of the
// repository - to put its content somewhere real. Every driver is imported
// on demand for the same reason: the Cloudflare build must not carry
// node:fs, and a Node build must not carry the workerd drivers.
import type { Driver } from 'unstorage'

type Bindings = Record<string, unknown>

// The three stores, and the binding each one looks for.
const STORES = [
  { mount: 'content-docs', binding: 'CONTENT_DOCS', folder: 'content-docs' },
  { mount: 'content-images', binding: 'CONTENT_IMAGES', folder: 'content-images' },
  { mount: 'content-users', binding: 'CONTENT_USERS', folder: 'content-users' },
] as const

// nuxt.config.ts has already mounted a driver at each of these bases, and
// unstorage refuses to mount twice at the same one ("already mounted at
// content-docs") - so the old mount goes first. Worth knowing where that
// error would otherwise end up: nitro catches whatever the `request` hook
// throws and carries on, so the server looks perfectly healthy and quietly
// keeps everything in memory. That is how this file was wrong the first
// time, and why the failure below is shouted rather than thrown.
async function remount (mount: string, driver: Driver): Promise<void> {
  const storage = useStorage()
  await storage.unmount(mount, true)
  storage.mount(mount, driver)
}

// Told apart by what they can do rather than by instanceof: the classes
// belong to the runtime, and a wrong binding name should read as "nothing
// bound" rather than crash the first request.
function isKVNamespace (value: unknown): boolean {
  return Boolean(value) && typeof (value as { get?: unknown }).get === 'function'
    && typeof (value as { put?: unknown }).put === 'function'
}

function isR2Bucket (value: unknown): boolean {
  return Boolean(value) && typeof (value as { put?: unknown }).put === 'function'
    && typeof (value as { createMultipartUpload?: unknown }).createMultipartUpload === 'function'
}

async function mountCloudflare (env: Bindings): Promise<string[]> {
  const done: string[] = []
  const bound = STORES.filter(store => isKVNamespace(env[store.binding]))
  if (bound.length > 0) {
    const { default: cloudflareKV } = await import('unstorage/drivers/cloudflare-kv-binding')
    for (const store of bound) {
      await remount(store.mount, cloudflareKV({ binding: env[store.binding] as never }) as Driver)
      done.push(`${store.mount} -> KV ${store.binding}`)
    }
  }
  // Pictures in KV work and are a poor idea: a value is capped at 25 MB and
  // every read is counted. An R2 bucket is the same few lines of setup and
  // is what a site with photographs on it wants.
  if (isR2Bucket(env.CONTENT_FILES)) {
    const { default: cloudflareR2 } = await import('unstorage/drivers/cloudflare-r2-binding')
    await remount('content-images', cloudflareR2({ binding: env.CONTENT_FILES as never }) as Driver)
    done.push('content-images -> R2 CONTENT_FILES')
  }
  return done
}

// Where Cloudflare's bindings actually are. Three places, in this order,
// because they are three different shapes of the same thing and which one a
// deployment gets depends on the preset: the worker runtime sets
// globalThis.__env__ before every request (nitropack's cloudflare module
// handler), while event.context carries them under `cloudflare` on some
// presets and under `_platform.cloudflare` on others. Reading only the
// context one is how this file first went out mounting nothing at all, and
// the symptom was not an error anywhere: the server answered perfectly and
// quietly kept everything in memory.
function cloudflareEnv (event: { context: Record<string, unknown> }): Bindings {
  const global = (globalThis as { __env__?: Bindings }).__env__
  const context = event.context as {
    cloudflare?: { env?: Bindings }
    _platform?: { cloudflare?: { env?: Bindings } }
  }
  return global ?? context.cloudflare?.env ?? context._platform?.cloudflare?.env ?? {}
}

async function mountFolder (dir: string): Promise<string[]> {
  const { default: fsDriver } = await import('unstorage/drivers/fs')
  const base = dir.replace(/[/\\]+$/, '')
  const done: string[] = []
  for (const store of STORES) {
    await remount(store.mount, fsDriver({ base: `${base}/${store.folder}` }) as Driver)
    done.push(`${store.mount} -> ${store.folder}`)
  }
  return done
}

export default defineNitroPlugin(nitroApp => {
  // Dev has its folder from nuxt.config.ts already (devStorage).
  if (import.meta.dev) {
    return
  }

  // Cloudflare hands the bindings to the REQUEST, not to the module, so this
  // waits for the first one - which is also where a folder is mounted, so
  // both hosts take the same path and there is one thing to get right.
  // Idempotent: after the first request it is one flag check.
  let mounting: Promise<void> | null = null

  nitroApp.hooks.hook('request', async event => {
    mounting ??= (async () => {
      const dir = process.env.NUXT_CONTENT_API_DATA_DIR
      const done = await (dir ? mountFolder(dir) : mountCloudflare(cloudflareEnv(event)))
        .catch(error => {
          // Not rethrown: nitro would swallow it and the server would carry
          // on in memory without a word. This is the word.
          console.error('[content-api] storage: COULD NOT BE SET UP, running in memory -', error)
          return [] as string[]
        })
      console.info(done.length > 0
        ? `[content-api] storage: ${done.join(', ')}${dir ? ` (${dir})` : ''}`
        : '[content-api] storage: in memory - every edit is lost when this server restarts. Bind KV/R2, or set NUXT_CONTENT_API_DATA_DIR to a folder that survives.')
    })()
    // Awaited: the first request must not reach the content API before its
    // storage is the real one, or it would answer from (and write to) memory.
    await mounting
  })
})
