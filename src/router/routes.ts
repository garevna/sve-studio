// The editor's routes - wired into Nuxt by app/router.options.ts.
import type { RouteRecordRaw } from 'vue-router'

export const editorRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/editor/:pageId?',
    name: 'editor',
    component: () => import('@/views/EditorView.vue'),
  },
  {
    path: '/palette',
    name: 'palette',
    component: () => import('@/views/PaletteView.vue'),
  },
  {
    path: '/general-settings',
    name: 'general-settings',
    component: () => import('@/views/GeneralSettingsView.vue'),
  },
  {
    path: '/seo',
    name: 'seo',
    component: () => import('@/views/SeoSettingsView.vue'),
  },
  {
    path: '/ui-kit',
    name: 'ui-kit',
    component: () => import('@/views/UiKitListView.vue'),
  },
  {
    path: '/styles',
    name: 'styles',
    component: () => import('@/views/StylesListView.vue'),
  },
  {
    path: '/styles/:name',
    name: 'style-file',
    component: () => import('@/views/StyleFileView.vue'),
  },
  {
    path: '/header',
    name: 'header',
    component: () => import('@/views/HeaderSectionView.vue'),
    meta: { title: 'common.topOfThePage' },
  },
  {
    // No variant picker any more: the footer is one constructor now
    // (sections + blocks), not a choice between several fixed components,
    // so "Нижня частина сторінки" goes straight to editing it. Kept as a
    // redirect rather than deleted so the old path still resolves.
    path: '/footer',
    name: 'footer',
    redirect: '/editor/footer-content',
  },
  {
    path: '/pages',
    name: 'pages',
    component: () => import('@/views/PagesListView.vue'),
  },
  {
    path: '/menu',
    name: 'menu',
    component: () => import('@/views/MenuSettingsView.vue'),
  },
  {
    path: '/account',
    name: 'account',
    component: () => import('@/views/AccountPagesListView.vue'),
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('@/views/UsersView.vue'),
  },
  {
    path: '/architecture',
    name: 'architecture',
    component: () => import('@/views/ArchitectureView.vue'),
  },
  {
    path: '/log',
    name: 'log',
    component: () => import('@/views/ProblemLogView.vue'),
  },
  {
    path: '/popups',
    name: 'popups',
    component: () => import('@/views/PopupsView.vue'),
  },
  {
    path: '/messages',
    name: 'messages',
    component: () => import('@/views/MessagesView.vue'),
  },
  {
    path: '/auth-page',
    name: 'auth-page',
    component: () => import('@/views/AuthPageView.vue'),
  },
  // The editor's own interface kit, all controls in every look - for
  // working on the editor's design. Only while developing: a build has no
  // such page.
  ...(import.meta.env.DEV
    ? [{
        path: '/editor-ui',
        name: 'editor-ui',
        component: () => import('@/views/EditorUiShowcaseView.vue'),
      }]
    : []),
]
