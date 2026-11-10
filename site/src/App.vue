<script setup lang="ts">
  import type { LocaleModel, SeoSettingsModel } from './types/common'
  import { useHead } from '#imports'
  import { storeToRefs } from 'pinia'
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { getActiveTheme } from '@/utils/active-theme'
  import { loadScopedVuetifyStyles } from '@/utils/load-scoped-vuetify-styles'
  import { loadThemeStyles } from '@/utils/load-theme-styles'
  import { applyThemeFonts } from '@/utils/theme-fonts'
  import LiveConnect from './components/buttons/theme_2/LiveConnect.vue'
  import FooterFinalFrame from './components/FooterFinalFrame.vue'
  import FooterHorizonSignature from './components/FooterHorizonSignature.vue'
  import FooterHorizonWave from './components/FooterHorizonWave.vue'
  import HeroSplit from './components/hero-section/HeroSplit.vue'
  import HeroWithTitle from './components/hero-section/HeroWithTitle.vue'
  import HeroSection from './components/hero-section/theme_2/HeroSection.vue'
  import MainMenu from './components/main-menu/MainMenu.vue'
  import SiteCopyright from './components/SiteCopyright.vue'
  import SiteNotice from './components/small/SiteNotice.vue'
  import { siteStyles } from './configs/card-style'
  import { FOOTER_FINAL_FRAME, FOOTER_HORIZON, resolveFooterVariant } from './configs/footer-variants'
  import { HERO_SPLIT_VARIANT, HERO_WITH_TITLE_VARIANT } from './configs/header-layout'
  import { loadCountryList } from './services/load-country-list'
  import { getFooter, getMenu, getPage, getPageTitles, getPalette, getPopups, getSeoSettings, getSiteSettings } from './services/site-data'
  import { ACCOUNT_PAGE_ID, AUTH_PAGE_ID, parseSitePath } from './services/site-links'
  import { useCommonStore } from './stores/common'
  import { usePopupsStore } from './stores/popups'
  import AccountPage from './templates/AccountPage.vue'
  import AuthPage from './templates/AuthPage.vue'
  import PopupHost from './templates/components/PopupHost.vue'
  import DynamicPageTemplate from './templates/DynamicPageTemplate.vue'
  import FooterTemplate from './templates/FooterTemplate.vue'
  import PageNotFound from './templates/PageNotFound.vue'
  import { type PageTitle, pageTitleText, withMenuLabels } from './utils/page-title'
  import { sveRoot } from './utils/sve-root'

  // The whole site around the page the address names: menu, top of the
  // page, the page's blocks, footer. Stays mounted while the visitor moves
  // between pages - only the page itself is loaded again.

  const route = useRoute()
  const commonStore = useCommonStore()
  const popupsStore = usePopupsStore()
  const {
    parallaxImage,
    parallaxHeader,
    parallaxHeaderClass,
    parallaxTitleClass,
    parallaxTextClass,
    parallaxTitle,
    parallaxText,
    parallaxTheme,
    dynamicFooterContent,
    dynamicPageContent,
    heroVariant,
    headerSettings,
    locale,
    company,
  } = storeToRefs(commonStore)

  // footer-content.json's own visible/background fields - visible defaults
  // true when unset, background to --primary.
  const footerVariant = computed(() => resolveFooterVariant(dynamicFooterContent.value?.ver))
  const footerBackground = computed(() => `var(--${dynamicFooterContent.value?.background || 'primary'})`)

  const headerVisibility = computed(() => dynamicPageContent.value?.hero)

  // Layout 2: the banner with the company name comes first and the menu bar
  // sits under it, sticking to the top once scrolled to (configs/header-layout.ts).
  const heroWithTitle = computed(() => heroVariant.value === HERO_WITH_TITLE_VARIANT)
  // Layout 3: the menu bar first, in the page's flow, then the split banner.
  const heroSplit = computed(() => heroVariant.value === HERO_SPLIT_VARIANT)
  const menuBarClass = computed(() => [
    'main-menu-bar',
    `main-menu-bar--${headerSettings.value.menuTheme}`,
    { 'main-menu-bar--in-flow': heroWithTitle.value || heroSplit.value },
  ])

  // 'loading' until the site's settings are in; then per page.
  const status = ref<'loading' | 'ready' | 'not-found' | 'auth' | 'account'>('loading')
  const seo = ref<SeoSettingsModel | null>(null)

  // --- the site, once ---------------------------------------------------------

  async function loadSite () {
    const [settings, palette, menu, footer, seoSettings, pageTitles, popups] = await Promise.all([
      getSiteSettings(),
      getPalette(),
      getMenu(),
      getFooter(),
      getSeoSettings(),
      getPageTitles(),
      getPopups(),
    ])
    popupsStore.items = popups.popups
    popupsStore.looks = popups.looks
    popupsStore.calendars = popups.calendars
    // buttons.css, home.css... read bare var(--primary) and so on.
    for (const [name, value] of Object.entries(palette)) {
      document.documentElement.style.setProperty(`--${name}`, value)
    }
    commonStore.setGlobalSettings(settings)
    // A menu item leading to a page says the page's name (utils/page-title.ts).
    commonStore.mainMenuContent = withMenuLabels(menu, pageTitles.titles as Record<string, PageTitle>, commonStore.siteLocales, commonStore.defaultLocale, pageTitles.hidden)
    commonStore.dynamicFooterContent = footer
    seo.value = seoSettings
    applyThemeFonts(settings)

    // Plain, unlayered stylesheets - exactly how a published site loads them.
    const theme = getActiveTheme()
    const vuetifyStylesEntry = settings.styles?.find(name => name.startsWith('vuetify-'))
    const plainStyles = siteStyles(settings.styles ?? [])
    await Promise.all([
      loadThemeStyles(theme, plainStyles),
      vuetifyStylesEntry ? loadScopedVuetifyStyles(theme, vuetifyStylesEntry) : Promise.resolve(),
    ])

    // Shown in the editor's frame ("Верхня частина сторінки"): ask it for
    // its unsaved settings now that the saved ones are in.
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'sve:preview-ready' }, location.origin)
    }
  }

  // --- the page the address names ---------------------------------------------

  // Opened from the editor ("?preview" - its "На сайті" button): this tab
  // also shows pages hidden in the editor, with a note saying so. A visitor
  // gets "page not found" for them.
  const PREVIEW_KEY = 'sve-editor-preview'
  function editorPreview (): boolean {
    try {
      if (route.query.preview !== undefined) sessionStorage.setItem(PREVIEW_KEY, '1')
      return sessionStorage.getItem(PREVIEW_KEY) === '1'
    } catch {
      return route.query.preview !== undefined
    }
  }
  const pageHidden = ref(false)
  const HIDDEN_NOTE = {
    uk: 'Ця сторінка прихована в редакторі: відвідувачі сайту її не бачать.',
    en: 'This page is hidden in the editor: site visitors do not see it.',
    de: 'Diese Seite ist im Editor ausgeblendet: Besucher sehen sie nicht.',
  }

  let pageRequest = 0
  async function showPage () {
    const segments = ([] as string[]).concat(route.params.slug ?? [])
    const target = parseSitePath(segments, commonStore.siteLocales, commonStore.defaultLocale)
    const request = ++pageRequest
    const languageChanged = target.locale !== locale.value
    commonStore.setLocale(target.locale as LocaleModel)
    commonStore.currentPageId = target.pageId
    // Signing in and the account are the site's own pages, not content.
    if (target.pageId === AUTH_PAGE_ID || target.pageId === ACCOUNT_PAGE_ID) {
      commonStore.dynamicPageContent = null
      pageHidden.value = false
      commonStore.resetParallax()
      status.value = target.pageId === AUTH_PAGE_ID ? 'auth' : 'account'
      await nextTick()
      window.scrollTo({ top: 0 })
      return
    }
    // footer-content is stored like a page, but it is not one.
    const page = target.pageId === 'footer-content' ? null : await getPage(target.pageId, { includeHidden: editorPreview() })
    if (request !== pageRequest) {
      return
    }
    commonStore.dynamicPageContent = page
    pageHidden.value = (page as { visible?: boolean } | null)?.visible === false
    status.value = page ? 'ready' : 'not-found'
    // The page's top parallax (block type "parallax") is drawn here, not by
    // the block loop.
    const parallaxBlock = page?.blocks?.find(block => block.type === 'parallax')
    if (parallaxBlock) {
      commonStore.setParallax(parallaxBlock as Parameters<typeof commonStore.setParallax>[0])
    } else {
      commonStore.resetParallax()
    }
    if (languageChanged) {
      loadCountryList(target.locale)
    }
    await nextTick()
    scrollToTarget()
  }

  // A link with "#block" lands on that block once the page is drawn; any
  // other page starts at the top.
  function scrollToTarget () {
    const id = route.hash ? decodeURIComponent(route.hash.slice(1)) : ''
    const element = id ? document.querySelector<HTMLElement>(`#${CSS.escape(id)}`) : null
    if (element) {
      // The menu bar stays on top - land below it.
      const top = element.getBoundingClientRect().top + window.scrollY - 96
      window.scrollTo({ top, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0 })
    }
  }

  watch(() => route.path, () => {
    if (status.value !== 'loading') {
      void showPage()
    }
  })
  watch(() => route.hash, (hash, previous) => {
    if (hash !== previous && status.value === 'ready') {
      scrollToTarget()
    }
  })

  // --- title, description, language of the document ---------------------------

  const pageTitle = computed(() => {
    const page = dynamicPageContent.value as (typeof dynamicPageContent.value & { title?: PageTitle }) | null
    const own = page?.seo?.title || pageTitleText(page?.title, locale.value, commonStore.defaultLocale) || seo.value?.defaultTitle || company.value?.name || ''
    const template = seo.value?.titleTemplate
    return template && template.includes('%s') ? template.replace('%s', own) : own
  })
  useHead(() => ({
    htmlAttrs: { lang: locale.value },
    title: pageTitle.value,
    meta: [
      { name: 'description', content: dynamicPageContent.value?.seo?.description || seo.value?.defaultDescription || '' },
      ...(dynamicPageContent.value?.seo?.noindex ? [{ name: 'robots', content: 'noindex,follow' }] : []),
    ],
    // The browser tab's icon is the site's own logo (Загальні налаштування)
    // - change the logo and the icon follows. The editor's icon until then.
    link: [{ rel: 'icon', href: company.value?.logo?.src || `${sveRoot()}favicon.ico`, key: 'favicon' }],
  }))

  // --- the editor's frame -------------------------------------------------------

  // "Верхня частина сторінки" shows the site in a frame and sends its
  // unsaved layout settings here, so a change shows at once.
  function onEditorMessage (event: MessageEvent) {
    if (event.origin !== location.origin || event.data?.type !== 'sve:header-settings') {
      return
    }
    commonStore.applyHeaderSettings(event.data.settings ?? {})
  }

  onMounted(async () => {
    window.addEventListener('message', onEditorMessage)
    window.addEventListener('resize', commonStore.resize)
    commonStore.resize()
    await loadSite()
    await showPage()
    loadCountryList(locale.value)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('message', onEditorMessage)
    window.removeEventListener('resize', commonStore.resize)
  })
</script>

<template>
  <v-layout ref="app" full-height>
    <template v-if="heroWithTitle">
      <div v-if="headerVisibility || parallaxImage" id="app-hero-section">
        <HeroWithTitle />
      </div>
      <MainMenu id="main-menu-bar" :class="menuBarClass" />
    </template>
    <template v-else-if="heroSplit">
      <MainMenu id="main-menu-bar" :class="menuBarClass" />
      <div v-if="headerVisibility" id="app-hero-section">
        <HeroSplit />
      </div>
    </template>
    <template v-else>
      <MainMenu id="main-menu-bar" :class="menuBarClass" />
      <div v-if="headerVisibility" id="app-hero-section">
        <HeroSection />
      </div>
    </template>
    <!-- The page's top parallax; layout 2 shows it above the menu instead
      (HeroWithTitle.vue). -->
    <div v-if="!heroWithTitle" id="parallax-placeholder" :class="{ 'parallax-placeholder--active': parallaxImage }">
      <v-parallax v-if="parallaxImage" eager :src="parallaxImage" width="100vw">
        <div v-if="parallaxHeader || parallaxTitle" :class="[parallaxTheme, 'parallax-panel']">
          <h2 v-if="parallaxHeader" :class="parallaxHeaderClass">{{ parallaxHeader }}</h2>
          <h4 :class="parallaxTitleClass">{{ parallaxTitle }}</h4>
          <p v-if="parallaxText" :class="parallaxTextClass">{{ parallaxText }}</p>
        </div>
      </v-parallax>
    </div>
    <v-main :class="['main-component mx-auto', headerVisibility ? 'pt-0' : '']">
      <!-- <div v-if="breadcrumbsVisibility" class="breadcrumbs-outer-container">
          <div class="breadcrumbs-inner-container">
            <v-breadcrumbs class="top-header-breadcrumbs">
              <v-breadcrumbs-item v-for="(item, index) of breadcrumbs" :key="index" @click="item.onclick">
                <span :class="!item.disabled ? 'cursor-pointer' : ''">{{ $t(item.title) }}</span>
                <v-breadcrumbs-divider v-if="index < breadcrumbs.length - 1">
                  <v-icon icon="mdi-chevron-right" />
                </v-breadcrumbs-divider>
              </v-breadcrumbs-item>
            </v-breadcrumbs>
          </div>
        </div> -->

      <div v-if="pageHidden && status === 'ready'" class="hidden-page-note">
        <i aria-hidden="true" class="mdi mdi-eye-off-outline" />
        {{ HIDDEN_NOTE[locale as keyof typeof HIDDEN_NOTE] || HIDDEN_NOTE.uk }}
      </div>
      <AuthPage v-if="status === 'auth'" />
      <AccountPage v-else-if="status === 'account'" />
      <PageNotFound v-else-if="status === 'not-found'" />
      <DynamicPageTemplate v-else />
    </v-main>

    <LiveConnect />

    <!-- id, not just the class: a link can now point at the footer
          ("У футер сторінки" in the editor's link settings), and a hash
          needs a real element to land on. The id matches the one the footer
          block has always carried in the content itself. -->
    <v-footer
      v-if="dynamicFooterContent?.visible !== false"
      id="app-footer"
      :class="['app-footer mt-4 py-8', `app-footer--v${footerVariant}`]"
      :style="{ backgroundColor: footerBackground, '--footer-bg': footerBackground }"
    >
      <!-- The look the footer's own `ver` picks (configs/footer-variants.ts). -->
      <FooterHorizonWave v-if="footerVariant === FOOTER_HORIZON" :color="footerBackground" />
      <FooterFinalFrame
        v-if="footerVariant === FOOTER_FINAL_FRAME"
        :text="dynamicFooterContent?.ctaText"
        :title="dynamicFooterContent?.ctaTitle"
      />
      <FooterTemplate />
      <SiteCopyright />
      <FooterHorizonSignature v-if="footerVariant === FOOTER_HORIZON" :text="company?.name || ''" />
    </v-footer>

    <!-- The site's popups: mounted once, each opened by its flag in the
      popups store (stores/popups.ts). -->
    <PopupHost />
    <SiteNotice />

    <!-- <AuthErrorPopup />
      <info-popup />
      <input-popup />
      <confirm-popup />
      <common-popup />
      <call-popup />
      <cancel-reservation />
      <ask-for-transfer />
      <SegmentDetails /> -->
    <!-- <v-container class="mt-12" fluid>
      <RouterView />
    </v-container> -->
  </v-layout>
</template>

<style scoped>
/* A formatted panel text (utils/parallax-text-class.ts) may be set big,
   and the panel is narrow on a phone: long words wrap instead of pushing
   the page wider, and the big sizes shrink with the screen. */
.parallax-panel > * {
  max-width: 100%;
  overflow-wrap: anywhere;
}
@media screen and (max-width: 960px) {
  .parallax-panel > .h1 { font-size: clamp(28px, 10vw, 68px); }
  .parallax-panel > .h2 { font-size: clamp(22px, 7vw, 36px); }
  .parallax-panel > .h3 { font-size: clamp(20px, 6vw, 28px); }
}
.v-footer {
  /* background-color comes from footerBackground (inline style) now -
     footer-content.json's own background field, defaulting to --primary. */
  color: var(--white);
  justify-content: center;
  /* the copyright line (SiteCopyright) goes under the columns, full width */
  flex-wrap: wrap;
  border-radius: var(--default-border-radius) var(--default-border-radius) 0 0;
}
/* "Горизонт": the wave is the footer's top edge (it sits above the box, so
   the box keeps room for it), straight corners, and the signature reaching
   the very bottom. */
.v-footer.app-footer--v2 {
  position: relative;
  margin-top: calc(clamp(40px, 6vw, 96px) + 24px) !important;
  padding-bottom: 0 !important;
  border-radius: 0;
  overflow: visible;
}
/* "Bento": the footer's columns as tiles - the first one tall, the others
   beside it - on the page's own background, each tile in a palette colour. */
.v-footer.app-footer--v4 {
  background: transparent !important;
  color: var(--white);
}
.v-footer.app-footer--v4 :deep(.footer-columns) {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
  gap: 16px !important;
  align-items: stretch !important;
  max-width: 1368px;
  margin-inline: auto;
}
.v-footer.app-footer--v4 :deep(.footer-column) {
  width: auto !important;
  max-width: none !important;
  padding: clamp(20px, 3vw, 36px);
  border-radius: var(--large-border-radius);
  background: var(--tile-bg, var(--dark));
}
.v-footer.app-footer--v4 :deep(.footer-column:first-child) {
  grid-row: span 2;
}
.v-footer.app-footer--v4 :deep(.site-copyright) {
  color: var(--black);
  border-top-color: var(--accent);
}
@media (max-width: 760px) {
  .v-footer.app-footer--v4 :deep(.footer-columns) { grid-template-columns: minmax(0, 1fr); }
  .v-footer.app-footer--v4 :deep(.footer-column:first-child) { grid-row: auto; }
}

@media screen and (max-width: 960px) {
  .parallax-content-2 {
    width: calc(100% - 40px);
    margin: 20px;
  }
  .parallax-title {
    font-size: 24px;
  }
}

@media screen and (max-width: 820px) {
  .parallax-header {
    font-size: 24px;
  }
  .parallax-title {
    font-size: 20px;
  }
}

@media screen and (max-width: 600px) {
  .parallax-header {
    font-size: 22px;
  }
  .parallax-title {
    font-size: 16px;
  }
}

/* Only in the editor's preview: a hidden page says so. */
.hidden-page-note {
  position: relative;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--light-grey-2);
  color: var(--dark-grey);
  font-size: 14px;
  text-align: center;
}
</style>
