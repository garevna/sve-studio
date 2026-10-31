// Utilities
/* eslint-disable unicorn/no-nested-ternary */
import type { EditorRoleModel } from '@/configs/editor-roles'
// import type { IconSetModel, LinksModel } from '@/types'
// import type { MenuItemModel } from '@/types/MainMenuModels'
// import type { DestinationModel } from '@/types/PopularDestinationModel'
// import type { RouteModel } from '@/types/RouteModel'
import type { FooterLayoutModel } from '@/configs/footer-layout'
import type { TemplateBlockModel, TemplatePageModel } from '@/types/TemplateBlockModel'
import type { LocaleModel } from '@/utils/locale-text'
import { defineStore } from 'pinia'
import { computed, getCurrentInstance, ref, watch } from 'vue'
import { DEFAULT_EDITOR_ROLE, editorRole } from '@/configs/editor-roles'
import { resolveFooterLayout } from '@/configs/footer-layout'
import { defaultSiteLocale, normalizeTranslatedFields, siteLocales } from '@/utils/locale-text'
// import { useRoute } from 'vue-router'
// import { getBreadcrumbs } from '@/composables/getBreadcrumbs'
// import { requestParams } from '@/composables/request-params/common'
// import { loadThemeStyles } from '@/utils/load-theme-styles'
import { useAjaxStore } from './ajax'
// import { useBookingStore } from './booking'
// import { usePassengerStore } from './passengers'

// type RouteSearchModeModel = 'route-search' | 'geo-location' | null
// type CountryModel = {
//   countryCode: string
//   countryName: string
//   phoneCode: string
// }
// export type LinksModel = {
//   instagram?: string
//   telegram?: string
//   whatsApp?: string
//   viber?: string
//   tiltok?: string
//   facebook?: string
// }

export const useCommonStore = defineStore('common', () => {
  // const route = useRoute()
  // const routeSeachMode: Ref<RouteSearchModeModel> = ref('route-search')
  const ajax = useAjaxStore()

  const activeTheme = computed(() => {
    const app = getCurrentInstance()
    return app?.appContext.config.globalProperties.$activeTheme || 2
  })

  const mode = ref<'preview' | 'edit' | 'drag'>('edit')

  // Which set of the editor's own sections/controls this session shows - see
  // configs/editor-roles.ts for what each role gets and why this is a
  // usability filter rather than a permission check. Persisted so a reload
  // doesn't quietly hand a content manager the full supervisor toolbar back;
  // localStorage can throw outright in a locked-down browser, hence the
  // try/catch on both sides.
  const ROLE_STORAGE_KEY = 'editor-role'
  function storedRole (): EditorRoleModel {
    try {
      const saved = localStorage.getItem(ROLE_STORAGE_KEY) as EditorRoleModel | null
      // editorRole() falls back to the default for anything unrecognised, so
      // a stale value from an older build can't leave the app role-less.
      return saved ? editorRole(saved).value : DEFAULT_EDITOR_ROLE
    } catch {
      return DEFAULT_EDITOR_ROLE
    }
  }
  const role = ref<EditorRoleModel>(storedRole())
  // Shown once per app start (deliberately NOT persisted - it's a reminder
  // about the bottom bar, not a setting), and only while the session is
  // still on whatever role it started with.
  const roleHintPending = ref(true)
  function dismissRoleHint () {
    roleHintPending.value = false
  }
  const roleConfig = computed(() => editorRole(role.value))
  function setRole (value: EditorRoleModel) {
    role.value = editorRole(value).value
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, role.value)
    } catch {
      // A browser that refuses storage still gets a working session, it just
      // starts from the default role again after a reload.
    }
  }

  // Which site language is being shown/edited in the content (one of the
  // site's own locales from global.json - see utils/locale-text.ts). Not the
  // editor's interface language, that one lives in src/i18n.
  const locale = ref<LocaleModel>(defaultSiteLocale())
  function setLocale (value: LocaleModel) {
    if (siteLocales().includes(value)) {
      locale.value = value
    }
  }
  // A language removed from the settings can't stay the one being edited.
  watch(() => siteLocales(), locales => {
    if (!locales.includes(locale.value)) {
      locale.value = defaultSiteLocale()
    }
  })

  // const isHeroSectionVisible = computed(() => {
  //   return (route.path) === '/' || (route.name as string) === 'direct-route-variants' || ((route.name as string) === 'dynamic-page' && dynamicPageContent.value?.hero)
  // })

  // const currencyRates = ref({ USD: 0, GBR: 0, EUR: 0 })
  // const countries = ref<CountryModel[]>([])
  // const popularDestinations = ref<DestinationModel[]>([])

  const winSize = ref({ width: window.innerWidth, height: window.innerHeight })

  // Mirrors the edited app's own mobileMode/currentBlockSpacing (600px is its
  // fixed mobile breakpoint) - the gap between top-level page blocks, read
  // from global.json instead of being hand-set per block.
  const mobileMode = computed(() => winSize.value.width <= 600)
  const blockSpacing = ref({ desktop: 100, mobile: 48 })
  // The footer's column layout as the designer set it in the UI Kit - see
  // configs/footer-layout.ts for what an unset value falls back to. Kept
  // here (rather than fetched by the footer itself) so every consumer reads
  // one already-resolved answer.
  const footerLayout = ref<FooterLayoutModel>(resolveFooterLayout(null))
  // The client's own name, from global.json - see above.
  const companyName = ref('')
  const currentBlockSpacing = computed(() => mobileMode.value ? blockSpacing.value.mobile : blockSpacing.value.desktop)
  // Mirrors the edited app's own pageContentMarginTop - a Vuetify mt-N
  // utility value (N x 4px, Vuetify's spacing scale), applied once above all
  // page content, not per-block like blockSpacing above (see
  // DynamicPageTemplate.vue's own `mt-${pageContentMarginTop}` class).
  const pageContentMarginTop = ref(4)

  const dynamicPageContent = ref<TemplatePageModel>({
    id: '',
    breadcrumbs: false,
    backButton: false,
    hero: false,
    blocks: [],
  })
  // Emptied before every page load - see clearDynamicPageContent. The
  // shape stays a real (empty) page rather than null so every consumer can
  // keep reading .blocks without a null check.
  const EMPTY_PAGE: TemplatePageModel = { id: '', breadcrumbs: false, backButton: false, hero: false, blocks: [] }

  // Navigating to another page used to leave the PREVIOUS page's content
  // sitting in the store until the new fetch resolved, so the old page went
  // on being rendered in the meantime - most obviously in preview mode,
  // where it simply looked like the wrong page had opened.
  function clearDynamicPageContent () {
    dynamicPageContent.value = { ...EMPTY_PAGE, blocks: [] }
  }

  const dynamicFooterContent = ref<TemplateBlockModel | null>(null)

  // Session-only cache (never saved into a page's own JSON) of the last
  // props a singleton `type:'component'` block had when it was deleted from
  // a page - keyed by the block's own `content` (e.g. 'FAQ'). Lets its
  // insert-menu factory (see configs/components/faq.ts) restore that content
  // instead of starting from the seed data again, without touching
  // TemplatePageModel's own schema or ever writing content the page itself
  // doesn't currently show. Lost on reload - see DynamicPageTemplate.vue's
  // requestDeleteBlock (writer) and the factories (readers).
  const deletedSingletonBlocks = ref<Record<string, TemplateBlockModel>>({})
  // const mainMenuContent = ref<MenuItemModel[]>([])

  // const provider = ref<string | null>(null)
  // const companyLogo = ref<string | null>(null)
  // const companyLogoWidth = ref(0)
  // const companyLogoHeight = ref(0)
  // const links = ref<LinksModel | null>(null)
  // const icons = ref<IconSetModel | null>(null)
  const userDashBreackpoint = ref(880)
  const baners = ref({ desktop: '', mobile: '' })

  const baner = computed(() => winSize.value.width < 600 ? baners.value.mobile : baners.value.desktop)
  const banerWidth = ref(0)
  const banerHeight = computed(() => {
    return winSize.value.width >= 1440
      ? 540
      : winSize.value.width >= 1024
        ? 384
        : winSize.value.width >= 912
          ? 342
          : winSize.value.width >= 820
            ? 308
            : winSize.value.width >= 768
              ? 290
              : winSize.value.width <= 600 && winSize.value.width > 450
                ? 590
                : 470
  })

  const heroSectionHeight = computed(() => {
    return winSize.value.width >= 1440
      ? 880
      : winSize.value.width >= 1024
        ? 700
        : winSize.value.width >= 912
          ? 650
          : winSize.value.width >= 820
            ? 620
            : winSize.value.width >= 768
              ? 760
              : winSize.value.width <= 600 && winSize.value.width > 450
                ? 1050
                : 930
  })

  const heroSectionItems = ref<{ value: string, label: string }[]>([])

  // async function getGlobalSettings () {
  //   const response = await ajax.getGlobalSettings()
  //   const styles = response.styles || {}
  //   loadThemeStyles(styles)
  //   provider.value = response.provider || ''
  //   companyLogo.value = response.logo.src
  //   companyLogoWidth.value = response.logo.width
  //   companyLogoHeight.value = response.logo.height
  //   links.value = response.links
  //   icons.value = response.icons
  //   baners.value = response.baner
  //   userDashBreackpoint.value = response.userDashBreackpoint || 880
  //   if (response.heroSectionItems) {
  //     heroSectionItems.value = response.heroSectionItems
  //   }
  // }

  // async function getMainMenuContent () {
  //   const response = await ajax.getMenuContent()
  //   if (response) {
  //     mainMenuContent.value = response as MenuItemModel[]
  //   }
  // }

  async function getGlobalSettings () {
    const response = await ajax.getGlobalSettings()
    // A failed/missing fetch resolves to null (see ajaxStore.getDynamicFilesData's
    // catch branch) rather than throwing - response.blockSpacing on that would
    // throw here uncaught, aborting whichever onBeforeMount awaited this
    // (e.g. PreviewView.vue) before it ever gets to fetch the page content,
    // silently leaving the page looking empty instead of surfacing an error.
    blockSpacing.value = response?.blockSpacing || { desktop: 100, mobile: 48 }
    footerLayout.value = resolveFooterLayout(response)
    pageContentMarginTop.value = response?.pageContentMarginTop || 4
    companyName.value = response?.provider || ''
    // The hero's banner, as the client set it in "Загальні налаштування".
    // Nothing read it before, because nothing rendered the hero.
    baners.value = response?.baner || { desktop: '', mobile: '' }
  }

  // One footer-content.json regardless of footerVariant - the variant only
  // picks which component renders this same content (FooterEditor today;
  // more component variants later, per the project owner - not a separate
  // JSON per variant). It already carries the new type:'footer-1' shape
  // (confirmed live), so there's no legacy-shape canonical slug to avoid
  // touching here anymore.
  async function getDynamicFooterContent () {
    const response = await ajax.getFooterContentDraft('footer-content')
    if (response) {
      normalizeTranslatedFields(response)
    }
    dynamicFooterContent.value = response
  }

  function updateDynamicPageContentSection (blockIndex: number, sectionIndex: number, value: TemplateBlockModel[]) {
    const block = dynamicPageContent.value?.blocks[blockIndex]
    const section = block?.children?.[sectionIndex]
    if (section && section.children) {
      section.children = [...value]
    }
  }

  async function getDynamicPageContent (pageId: string) {
    const response = await ajax.getDynamicPageContent(pageId)
    if (!response) {
      console.error(`Invalid path to dynamic page ${pageId} or file /files/theme_${activeTheme.value}/dynamic-pages/${pageId}.json does not exist.`)
      clearDynamicPageContent()
      return false
    }
    for (const block of response.blocks) {
      normalizeTranslatedFields(block)
    }
    // response.blocks.forEach(block => normalizeTranslatedFields(block))
    dynamicPageContent.value = response
    return true
  }

  // async function sendCallRequest (name: string, phone: string) {
  //   await ajax.sendRequest(requestParams.sendCallRequest(name, phone))
  // }

  function setWindowSize (size: { width: number, height: number }) {
    winSize.value = size
  }

  function updateDynamicPageContent (blockIndex: number, value: TemplateBlockModel) {
    if (dynamicPageContent.value && dynamicPageContent.value.blocks[blockIndex]) {
      dynamicPageContent.value.blocks.splice(blockIndex, 1, value)
    }
  }

  // const breadcrumbs = computed(() => getBreadcrumbs(route.name as string))

  // onBeforeMount(() => {
  //   const searchMode = localStorage.getItem('route-search-mode')
  //   routeSeachMode.value = (searchMode as RouteSearchModeModel) || null
  // })

  // async function getCurrencyRates () {
  //   const response = await ajax.sendRequest(requestParams.getCurrencyRates())
  //   currencyRates.value = response
  // }

  // function setRouteSearchMode (val: RouteSearchModeModel) {
  //   if (val) {
  //     localStorage.setItem('route-search-mode', val)
  //   }
  //   routeSeachMode.value = val
  // }

  // function gotoRoute (routeName: RouteModel) {
  //   gotoRoute(routeName)
  // }

  // function gotoPreviousRoute () {
  //   if (bookingStore.currentRouteIndex > 0) {
  //     bookingStore.currentRouteIndex--
  //     passengerStore.setActivePassengerIndex(0)
  //   } else {
  //     passengerStore.saveCurrentTickets()
  //     if (bookingStore.activeDirection === 'direct-trip') {
  //       gotoRoute('direct-route-variants')
  //     } else if (bookingStore.activeDirection === 'back-trip') {
  //       gotoRoute('back-route-variants')
  //     }
  //   }
  // }

  // async function loadCountryList (locale: string) {
  //   ajax.loading = true
  //   countries.value.length = 0
  //   const url = computed(() => locale === 'uk' ? '/countries-uk.json' : `https://flagcdn.com/${locale}/codes.json`)
  //   let response = await fetch(url.value)
  //   const json = await response.json()
  //   const result = Object.entries(json).map(arr => {
  //     const [key, val] = arr
  //     return { countryCode: key, countryName: val } as CountryModel
  //   })

  //   countries.value.push(...result)

  //   response = await fetch('/country-codes.json')
  //   const dialCodeList = await response.json()
  //   for (const item of dialCodeList) {
  //     const key = item.code.toLowerCase()
  //     const record = countries.value.find(rec => rec.countryCode === key)
  //     if (record) {
  //       Object.assign(record, { phoneCode: item.dial_code })
  //     }
  //   }
  //   ajax.loading = false
  // }

  return {
    role,
    roleConfig,
    setRole,
    roleHintPending,
    dismissRoleHint,
    activeTheme,
    mode,
    locale,
    setLocale,
    // breadcrumbs,
    // routeSeachMode,
    // currencyRates,
    // countries,
    winSize,
    mobileMode,
    blockSpacing,
    footerLayout,
    companyName,
    currentBlockSpacing,
    pageContentMarginTop,
    banerWidth,
    banerHeight,
    // popularDestinations,
    dynamicPageContent,
    clearDynamicPageContent,
    // mainMenuContent,
    dynamicFooterContent,
    deletedSingletonBlocks,
    // provider,
    // companyLogo,
    // companyLogoWidth,
    // companyLogoHeight,
    // links,
    // icons,
    userDashBreackpoint,
    baner,
    heroSectionHeight,
    heroSectionItems,
    // isHeroSectionVisible,
    // setRouteSearchMode,
    // loadCountryList,
    setWindowSize,
    // sendCallRequest,
    // getMainMenuContent,
    getDynamicPageContent,
    getDynamicFooterContent,
    getGlobalSettings,
    updateDynamicPageContent,
    updateDynamicPageContentSection,
  }
})
