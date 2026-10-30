import type { RouterConfig } from 'nuxt/schema'
import { editorRoutes } from '@/router/routes'

// The editor's own route table instead of a pages/ folder - the same one the
// old Vite build uses (src/router/routes.ts).
export default {
  routes: () => editorRoutes,
} satisfies RouterConfig
