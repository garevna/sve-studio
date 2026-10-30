// The site's starting content: the repo's content/ folder (manifest.json,
// pages/, settings/, public/, styles/, images/). Read-only. Where it is read
// from depends on where the API runs - service-worker/content-api-sw.ts
// fetches it from /_seed, server/utils/content-repository.ts reads Nitro's
// server assets.

export interface SeedManifest {
  pages: string[]
  settings: string[]
  styles: string[]
  images: string[]
}

export interface SeedSource {
  // Paths relative to content/: "manifest.json", "pages/home-page.json"...
  // null when the file does not exist.
  readText: (path: string) => Promise<string | null>
  readBytes: (path: string) => Promise<Uint8Array | null>
}

const EMPTY_MANIFEST: SeedManifest = { pages: [], settings: [], styles: [], images: [] }

export async function readManifest (seed: SeedSource): Promise<SeedManifest> {
  const text = await seed.readText('manifest.json')
  if (!text) {
    return EMPTY_MANIFEST
  }
  try {
    return { ...EMPTY_MANIFEST, ...JSON.parse(text) as Partial<SeedManifest> }
  } catch {
    return EMPTY_MANIFEST
  }
}
