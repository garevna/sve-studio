import type {
  CountryModel,
  GlobalSettingsModel,
  IconSetModel,
  LinksModel,
  LocaleModel,
  MenuItemModel,
  PopularRouteModel,
  SeoSettingsModel,
  TemplateBlockModel,
  TemplatePageModel,
} from '../types/common'
import type { FooterSettingsModel } from '@/configs/footer-layout'
import type { HeaderSettingsModel } from '@/configs/header-layout'
import type { SiteContact } from '@/configs/site-contacts'
import type { Banner } from '@/types/common/GlobalSettingsModel'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { resolveHeaderSettings, resolveHeroVariant } from '@/configs/header-layout'
import { type MenuStyleModel, resolveMenuStyle } from '@/configs/menu-style'

import { popularTrips } from '../configs/popular-trips'

// import { useRoute } from 'vue-router'

// import { getBreadcrumbs } from '@/composables/getBreadcrumbs'

// import { requestParams } from '@/composables/request-params/common'
// import { phonesToCall, phonesToShow, workSchedule } from '@/configs/provider'

import { getImageURL } from '../services/get-image-url'
import { localeAsset } from '../utils/locale-asset'
import { PARALLAX_TEXT_DEFAULTS, parallaxTextClass as parallaxFormat } from '../utils/parallax-text-class'
// import { useAjaxStore } from './ajax'

// import { getBanersForLocale } from '@/services/common'

type ContentModel = { uk: string, en: string, de: string } | null

// const contacts = {
//   phonesToCall,
//   phonesToShow,
//   workSchedule,
// }

export const useCommonStore = defineStore('common', () => {
  // const route = useRoute()
  // const ajax = useAjaxStore()

  /* State */

  // The language of the page shown - set from its address (App.vue).
  const locale = ref('uk')
  // The site's languages and the one without an address prefix
  // (global.json locales / defaultLocale).
  const siteLocales = ref<string[]>(['uk'])
  const defaultLocale = ref('uk')
  // The page the address names - also while it is still loading or when
  // it does not exist (dynamicPageContent is null then).
  const currentPageId = ref('home-page')

  const currencyRates = ref({ USD: 0, GBR: 0, EUR: 0 })

  const countries = ref<CountryModel[]>([])

  // A desktop width until there is a window to measure (server rendering).
  const winSize = ref(typeof window === 'undefined' ? { width: 1440, height: 900 } : { width: window.innerWidth, height: window.innerHeight })

  const pageContentMarginTop = ref(0)
  const blockSpacing = ref({ desktop: 100, mobile: 32 })
  // The footer's column layout as the designer set it (global.json ->
  // footer), resolved in configs/footer-layout.ts - the same module the
  // editor and client-side use, so all three read one setting the same way.
  const footerSettings = ref<FooterSettingsModel | null>(null)

  // Which layout the top of the site uses, and that layout's settings
  // (global.json heroVariant / header) - see configs/header-layout.ts.
  const heroVariant = ref(resolveHeroVariant())
  const headerSettings = ref<HeaderSettingsModel>(resolveHeaderSettings())
  // The menus' look (global.json menuStyle) - see configs/menu-style.ts.
  const menuStyle = ref<MenuStyleModel>(resolveMenuStyle())
  // Phones, emails, the address (global.json contacts).
  const contacts = ref<SiteContact[]>([])
  // Where the feedback forms send (global.json feedback.endpoint).
  const feedbackEndpoint = ref('')

  const company = ref<{
    name: string
    // The logo for a dark menu bar; empty means the regular one is used.
    logoWhite?: string
    logo: {
      src: string
      width: number
      height: number
    }
    links: LinksModel | null
    icons: IconSetModel | null
    socialIcons?: Partial<Record<'facebook' | 'instagram' | 'tiktok' | 'whatsApp' | 'viber' | 'telegram', string>>
  } | null>(null)

  const userDashBreackpoint = ref(880)
  const baners = ref<Banner>({ desktop: '', mobile: '' })
  // The extra carousel banners of layout 1 (global.json banerSlides).
  const banerSlides = ref<Banner[]>([])
  const mainMenuContent = ref<MenuItemModel[]>([])

  const currentLocaleBaners = ref<{ mobile: boolean, locale: LocaleModel, id: number, imageURL: string }[]>([])

  const parallaxTheme = ref<'parallax-content-light' | 'parallax-content-dark'>('parallax-content-light')
  const parallaxImage = ref<string | null>(null)
  const parallaxHeader = ref<string | null>(null)
  const parallaxTitle = ref<string | null>(null)
  const parallaxText = ref<string | null>(null)
  // Their look (utils/parallax-text-class.ts).
  const parallaxHeaderClass = ref<string>(PARALLAX_TEXT_DEFAULTS.header)
  const parallaxTitleClass = ref<string>(PARALLAX_TEXT_DEFAULTS.title)
  const parallaxTextClass = ref<string>(PARALLAX_TEXT_DEFAULTS.text)

  /* Computed (getters) */

  const mobileMode = computed(() => winSize.value.width <= 600)

  const currentBlockSpacing = computed(() => mobileMode.value ? blockSpacing.value.mobile : blockSpacing.value.desktop)

  const banerWidth = computed(() => Math.min(1440, winSize.value.width))
  const banerHeight = computed(() => Math.round(mobileMode.value ? banerWidth.value / 0.91 : banerWidth.value / 2.67))
  const overlayOffset = computed(() => -(banerHeight.value * 0.25))
  const overlayHeight = computed(() => Math.round(winSize.value.width <= 888 ? 439 : (winSize.value.width <= 1266 ? 251 : 208)))
  const topHeaderHeight = computed(() => banerHeight.value + (overlayHeight.value + overlayOffset.value))

  // const breadcrumbs = computed(() => getBreadcrumbs(route.name as string))

  const popularRoutes = ref<PopularRouteModel[]>([])
  const dynamicPageContent = ref<TemplatePageModel | null>(null)
  const dynamicFooterContent = ref<TemplateBlockModel | null>(null)
  const seoSettings = ref<SeoSettingsModel | null>(null)

  const heroSection = ref<{
    items: { value: string, label: string }[]
    header: string
    text: string[]
  } | null>(null)

  /* getters */

  /* setters */

  function resetParallax () {
    parallaxImage.value = null
    parallaxHeader.value = null
    parallaxTitle.value = null
    parallaxText.value = null
    parallaxText.value = null
  }

  function setParallax (parallax: TemplateBlockModel) {
    const lang = locale.value as 'uk' | 'en' | 'de'
    // image: string, header: string, title: string, theme?: 'parallax-content-light' | 'parallax-content-dark'
    parallaxImage.value = getImageURL(localeAsset(parallax.content, lang, defaultLocale.value))
    const header: ContentModel = parallax.children ? parallax.children.find(child => child.type === 'header')?.content || null : null
    const title: ContentModel = parallax.children ? parallax.children.find(child => child.type === 'title')?.content || null : null
    parallaxHeader.value = header ? header[lang] : null
    parallaxTitle.value = title ? title[lang] : null
    parallaxText.value = parallax.children ? parallax.children.find(child => child.type === 'text')?.content?.[lang] || null : null
    parallaxTheme.value = parallax.dark ? 'parallax-content-dark' : 'parallax-content-light'
    const classOf = (type: string) => parallax.children?.find(child => child.type === type)?.class
    parallaxHeaderClass.value = parallaxFormat(classOf('header'), PARALLAX_TEXT_DEFAULTS.header)
    parallaxTitleClass.value = parallaxFormat(classOf('title'), PARALLAX_TEXT_DEFAULTS.title)
    parallaxTextClass.value = parallaxFormat(classOf('text'), PARALLAX_TEXT_DEFAULTS.text)
  }

  function setLocale (val: LocaleModel) {
    locale.value = val
  }

  /* Action (methods) */

  // async function sendCallRequest (name: string, phone: string) {
  //   await ajax.sendRequest(requestParams.sendCallRequest(name, phone))
  // }

  function resize () {
    winSize.value = { width: window.innerWidth, height: window.innerHeight }
  }

  // Also called with unsaved values from the editor's "Верхня частина
  // сторінки" page, which shows this app in a frame (see App.vue).
  function applyHeaderSettings (settings: Pick<GlobalSettingsModel, 'heroVariant' | 'header'>) {
    heroVariant.value = resolveHeroVariant(settings.heroVariant)
    headerSettings.value = resolveHeaderSettings(settings.header)
  }

  async function setGlobalSettings (response: GlobalSettingsModel) {
    const { provider, logo, logoWhite, links, icons, baner } = response
    company.value = Object.assign({}, { name: provider, logo, logoWhite, links, icons, baner })
    applyHeaderSettings(response)
    menuStyle.value = resolveMenuStyle(response.menuStyle)
    contacts.value = Array.isArray(response.contacts) ? response.contacts : []
    feedbackEndpoint.value = response.feedback?.endpoint || ''
    baners.value = response.baner
    banerSlides.value = Array.isArray(response.banerSlides) ? response.banerSlides : []
    if (Array.isArray(response.locales) && response.locales.length > 0) {
      siteLocales.value = response.locales
      defaultLocale.value = response.defaultLocale && response.locales.includes(response.defaultLocale) ? response.defaultLocale : response.locales[0]!
    }
    userDashBreackpoint.value = response.userDashBreackpoint || 880
    pageContentMarginTop.value = response.pageContentMarginTop || 4
    blockSpacing.value = response.blockSpacing || { desktop: 100, mobile: 32 }
    footerSettings.value = (response as { footer?: FooterSettingsModel }).footer || null
    if (response.heroSection) {
      heroSection.value = {
        items: [],
        header: '',
        text: [],
      }
      if (response.heroSection.items) {
        Object.assign(heroSection.value, { items: response.heroSection.items })
      }
      if (response.heroSection.header) {
        Object.assign(heroSection.value, { header: response.heroSection.header })
      }
      if (response.heroSection.text) {
        Object.assign(heroSection.value, { text: response.heroSection.text })
      }
    }
  }

  return {
    // searchPanelIcons,
    parallaxImage,
    parallaxTheme,
    parallaxHeader,
    parallaxTitle,
    parallaxText,
    mainMenuContent,
    popularTrips,
    // route,
    locale,
    siteLocales,
    defaultLocale,
    currentPageId,
    mobileMode,
    // breadcrumbs,
    // contacts,
    currencyRates,
    winSize,
    banerWidth,
    banerHeight,
    overlayOffset,
    topHeaderHeight,
    currentLocaleBaners,
    countries,
    popularRoutes,
    dynamicPageContent,
    dynamicFooterContent,
    seoSettings,
    pageContentMarginTop,
    blockSpacing,
    footerSettings,
    currentBlockSpacing,
    userDashBreackpoint,
    heroSection,
    baners,
    banerSlides,
    company,
    resize,
    setLocale,
    // sendCallRequest,
    setGlobalSettings,
    heroVariant,
    headerSettings,
    menuStyle,
    contacts,
    feedbackEndpoint,
    parallaxHeaderClass,
    parallaxTitleClass,
    parallaxTextClass,
    applyHeaderSettings,
    resetParallax,
    setParallax,
  }
})
