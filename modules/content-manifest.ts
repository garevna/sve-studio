// Keeps content/manifest.json in step with the files in content/ - a page,
// stylesheet or image added, removed, renamed or edited is picked up
// without running `pnpm generate-manifest`. Regenerated once at startup
// (dev and build) and, in dev, again after every change: the manifest also
// carries a fingerprint of each file, which is how the browser's local
// database learns that a file changed.
import { watch } from 'node:fs'
import { join } from 'node:path'
import { useLogger } from 'nuxt/kit'
import { defineNuxtModule } from 'nuxt/kit'
import { regenerateManifest } from '../scripts/manifest-lib.mjs'

export default defineNuxtModule({
  meta: { name: 'content-manifest' },
  async setup (_options, nuxt) {
    const logger = useLogger('content-manifest')
    const contentDir = join(nuxt.options.rootDir, 'content')

    const regenerate = async () => {
      try {
        const manifest = await regenerateManifest(contentDir)
        logger.info(`${manifest.pages.length} pages, ${manifest.styles.length} styles, ${manifest.images.length} images`)
      } catch (error) {
        logger.error(`could not regenerate content/manifest.json - ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    await regenerate()
    if (!nuxt.options.dev) {
      return
    }

    // 'rename' is an added or removed file, 'change' an edited one; writing
    // manifest.json itself must not trigger another round.
    let timer: ReturnType<typeof setTimeout> | null = null
    const watcher = watch(contentDir, { recursive: true }, (event, file) => {
      if (!file || file === 'manifest.json') {
        return
      }
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void regenerate()
      }, 300)
    })
    nuxt.hook('close', () => watcher.close())
  },
})
