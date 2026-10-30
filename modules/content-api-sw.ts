// Builds service-worker/content-api-sw.ts into /content-api-sw.js.
//
// A service worker is a separate script the browser loads by URL, outside
// the app's own bundles - so it gets its own small esbuild step: once at
// startup (and on every change, in dev), served by Nitro as a public asset.
import type { BuildOptions } from 'esbuild'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { build, context } from 'esbuild'
import { createResolver, defineNuxtModule } from 'nuxt/kit'

export default defineNuxtModule({
  meta: { name: 'content-api-sw' },
  async setup (_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    // Not under buildDir: a build empties that folder after the modules
    // have run, and the worker built here then never reached the output.
    const outDir = join(nuxt.options.rootDir, 'node_modules', '.cache', 'sve', 'content-api-sw')
    await mkdir(outDir, { recursive: true })

    const options: BuildOptions = {
      entryPoints: [resolve('../service-worker/content-api-sw.ts')],
      outfile: join(outDir, 'content-api-sw.js'),
      bundle: true,
      format: 'iife',
      platform: 'browser',
      target: 'es2022',
      minify: !nuxt.options.dev,
      sourcemap: nuxt.options.dev ? 'inline' : false,
      logLevel: 'warning',
      define: { 'process.env.NODE_ENV': JSON.stringify(nuxt.options.dev ? 'development' : 'production') },
    }

    nuxt.options.nitro.publicAssets ||= []
    nuxt.options.nitro.publicAssets.push({ dir: outDir, maxAge: 0 })

    if (nuxt.options.dev) {
      const ctx = await context(options)
      await ctx.rebuild()
      await ctx.watch()
      nuxt.hook('close', () => ctx.dispose())
    } else {
      await build(options)
    }
  },
})
