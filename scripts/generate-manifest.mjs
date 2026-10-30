// Regenerates content/manifest.json - the list of pages, settings,
// stylesheets and images the demo ships with. Run after adding, removing or
// renaming any of them:
//   pnpm generate-manifest
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { regenerateManifest } from './manifest-lib.mjs'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const contentDir = path.join(rootDir, '..', 'content')

async function main () {
  const manifest = await regenerateManifest(contentDir)
  console.log(`content: ${manifest.pages.length} pages, ${manifest.settings.length} settings, ${manifest.styles.length} styles, ${manifest.images.length} images`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
