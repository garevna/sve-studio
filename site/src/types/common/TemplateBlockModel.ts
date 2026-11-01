import type { ShallowRef } from 'vue'
import type { RouteQueryModel } from '../navigation/RouteQueryModel'
import type { PageSeoModel } from './SeoSettingsModel'

enum BlockTypeModel {
  HEADER = 'header',
  SUBHEADER = 'subheader',
  TITLE = 'title',
  text = 'text',
  image = 'image',
  button = 'button',
  SECTION = 'section',
  FLOAT = 'float',
  CARD = 'card',
  CARDS = 'cards',
  PARALLAX = 'parallax',
  PARALLAX_INSIDE = 'parallax-inside',
  SWIPER = 'swiper',
  COMPONENT = 'component',
  ROUTE = 'route',
  CAROUSEL = 'carousel',
  SLIDER_WITH_IMAGES = 'slider-with-images',
  CARD_WITH_TOOLBAR_IMAGE = 'card-with-toolbar-image',
  CARDS_WITH_IMAGE_IN_CIRCLE = 'cards-with-image-in-circle',
  // CARD_WITH_IMAGE_IN_CIRCLE = 'card-with-image-in-circle',
  BANER = 'baner',
  TEXT_WITH_ICON = 'text-with-icon',
  // A horizontal line between the lines of a card.
  DIVIDER = 'divider',
  DARK_FONE_SECTION = 'dark-fone-section',
  HOVER_CARD = 'hover-card',
  // Two containers rather than leaves: each renders whatever it holds, and
  // neither has a look of its own. They are listed here because this app
  // has to RECOGNISE them to recurse into their children - a block whose
  // type this union doesn't know falls through to the generic item
  // renderer, which has no case for it, and the whole thing comes out
  // blank (which is exactly what happened to both).
  //
  // 'page-links' is a footer's list of links to pages; see the visual
  // editor's own configs/footer-blocks.ts.
  PAGE_LINKS = 'page-links',
  // 'section-with-free-content' is one half of a two-column block whose
  // content the user assembles freely.
  SECTION_WITH_FREE_CONTENT = 'section-with-free-content',
  // One type per footer variant, not one shared "footer" type - see the
  // visual editor's own FooterEditor.vue for the reasoning (variants can
  // differ substantially in structure).
  FOOTER_1 = 'footer-1',
}

type TemplateBlockTypeModel = `${BlockTypeModel}`

export type AlignmentModel = 'center' | 'left' | 'right' | 'justify'

export type TranslatedModel = {
  uk: string
  en: string
  de: string
}

export interface BaseBlock {
  type: TemplateBlockTypeModel
  id?: string
  width?: number
  height?: number
  icon?: string
  iconHidden?: boolean /* card: the icon is switched off ("Показувати іконку") */
  image?: string
  title?: TranslatedModel
  content: TranslatedModel
  class?: string
  align?: AlignmentModel
  ver?: number
  // Footer root block, "Фінальний кадр" variant: the big invitation and the line under it.
  ctaTitle?: Record<string, string>
  ctaText?: Record<string, string>
  images?: {
    src: string
    width?: number | undefined
  }[]
  component?: ShallowRef<unknown> | null
  props?: object
  callback?: () => void
  link?: string
  // A contact from global.json (configs/site-contacts.ts) this line shows.
  contact?: string
  route?: string /* route for type 'route */
  params?: object /* route params for type 'route */
  query?: RouteQueryModel /* route query for type 'route' */
  hash?: string /* route hash for type 'route' */
  switchOrder?: boolean /* section: switch left and right sides of section order in mobile mode (for type 'section') */
  dark?: boolean /* parallax */
  size: number /* text-with-icon: icon or image size */
  color: string /* text-with-icon: icon color */
  text: TranslatedModel | string /* text-with-icon: class name for content */
  background: string /* for footer-icons component and for the future updates */
  // Footer root block, "Bento" variant: the palette keys of its tile
  // colours, as a set (configs/footer-variants.ts BENTO_TILE_SETS).
  tiles?: string[]
  // Button: what a click does. Unset = go to its page (route/params/hash);
  // 'form' = open the feedback form, with the texts in `form`, in a popup.
  action?: 'form'
  form?: FeedbackFormModel
  // "cards" block: the CARD's own fill, as a bare palette key
  // ("light-green"). Not `background` above - that one has always meant the
  // disc drawn behind the icon (IconVariant.vue), and a card whose icon is a
  // whole illustration needs to colour the card without putting a second
  // disc behind the picture. Unset = transparent, i.e. what cards looked
  // like before the field existed.
  cardBackground?: string
  // Class of a UI Kit card style (content/styles/cards.css) - see configs/card-style.ts.
  cardStyle?: string
  // "cards" block: the text format shared by every card in it - one class
  // string for the titles, one for the body text, set once in the visual
  // editor's card-block toolbar. Unset means the classes TemplateCard.vue
  // has always hardcoded.
  titleClass?: string
  contentClass?: string
  // Footer root block only (footer-content.json) - whether the footer
  // renders at all. Default true when unset.
  visible?: boolean
  backgroundImage: string /* for hover-section */
  hoverColor: string /* for hover-section */
  hoverImage: string /* for hover-section */
}

type BlockTreeModel = BaseBlock & { children?: BlockTreeModel[] }

export type TemplateBlockModel = BlockTreeModel
export type TemplatePageModel = { id: string, breadcrumbs: boolean, backButton: boolean, hero: boolean, blocks: TemplateBlockModel[], seo?: PageSeoModel }

// The feedback form's own settings: on a page (the "FeedbackForm" block),
// in the footer (FeedbackCard) and in a button's popup.
export interface FeedbackFormModel {
  // A kind from configs/feedback-forms.ts (callback, message, question...).
  type?: string
  title?: TranslatedModel
  text?: TranslatedModel
}
