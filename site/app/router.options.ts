import type { RouterConfig } from 'nuxt/schema'

// Every address of the site goes to one component; which page (and
// language) it names is content, worked out in src/App.vue - see
// src/services/site-links.ts for the address format.
export default {
  routes: () => [
    {
      name: 'site-page',
      path: '/:slug(.*)*',
      component: () => import('../src/App.vue'),
    },
  ],
  // src/App.vue scrolls once the new page is drawn (to the top, or to the
  // linked block) - the router would do it too early.
  scrollBehavior: () => false,
} satisfies RouterConfig
