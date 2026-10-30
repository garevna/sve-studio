export interface ContentManifest {
  pages: string[]
  settings: string[]
  styles: string[]
  images: string[]
  // Short content fingerprint per file, keyed by its path under content/.
  hashes: Record<string, string>
}

export function regenerateManifest (contentDir: string): Promise<ContentManifest>
