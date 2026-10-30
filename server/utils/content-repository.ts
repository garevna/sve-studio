// The content repository on the Nitro server.
//   seed    - content/ bundled as server assets ("assets:seed"), so it is
//             readable on every deploy target, Cloudflare included (no fs);
//   storage - "content-docs" / "content-images", see nuxt.config.ts.
import type { SeedSource } from '../content-api/seed'
import { createContentRepository } from '../content-api/repository'

let repo: ReturnType<typeof createContentRepository> | null = null

export function useContentRepository () {
  if (repo) {
    return repo
  }
  const assets = useStorage('assets:seed')
  const toBytes = (raw: unknown): Uint8Array | null => {
    if (raw instanceof Uint8Array) return raw
    if (raw instanceof ArrayBuffer) return new Uint8Array(raw)
    if (typeof raw === 'string') return new TextEncoder().encode(raw)
    return null
  }
  const seed: SeedSource = {
    // Raw, not getItem: getItem would parse .json files into objects.
    readText: async path => {
      const bytes = toBytes(await assets.getItemRaw(path))
      return bytes ? new TextDecoder().decode(bytes) : null
    },
    readBytes: async path => toBytes(await assets.getItemRaw(path)),
  }
  repo = createContentRepository({
    seed,
    docs: useStorage('content-docs'),
    images: useStorage('content-images'),
  })
  return repo
}
