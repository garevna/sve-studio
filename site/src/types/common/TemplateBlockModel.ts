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
  ICON_BUTTON = 'icon-button',
  SECTION = 'section',
  FLOAT = 'float',
  CARD = 'card',
  CARDS = 'cards',
  TABS = 'tabs',
  // A field of a client's own form (in a 'form' popup).
  FORM_FIELD = 'form-field',
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
  tabLook?: string /* tabs: 'pill' | 'underline' | 'folder' */
  tabAccent?: string /* tabs: palette key */
  tabPlate?: string /* tabs: palette key */
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
  // dark-fone-section: the cards' width, px (240 when unset).
  cardWidth?: number
  route?: string /* route for type 'route */
  params?: object /* route params for type 'route */
  query?: RouteQueryModel /* route query for type 'route' */
  hash?: string /* route hash for type 'route' */
  switchOrder?: boolean /* section: switch left and right sides of section order in mobile mode (for type 'section') */
  dark?: boolean /* parallax */
  size: number /* text-with-icon: icon or image size */
  mobileSize?: number /* card: its icon's size on a phone; unset = the same size */
  color: string /* text-with-icon: icon color */
  text: TranslatedModel | string /* text-with-icon: class name for content */
  background: string /* for footer-icons component and for the future updates */
  // Footer root block, "Bento" variant: the palette keys of its tile
  // colours, as a set (configs/footer-variants.ts BENTO_TILE_SETS).
  tiles?: string[]
  // Button: what a click does. Unset = go to its page (route/params/hash);
  // 'form' = open the feedback form, with the texts in `form`, in a popup.
  action?: 'form' | 'popup'
  popup?: string /* action 'popup': the site's popup it opens */
  // action 'popup': what the popup is opened about (a card's button passes
  // its card's title when this is unset) - a form popup shows it and sends
  // it with the answers.
  popupContext?: TranslatedModel
  // A card's own button, under its text (a "button" block).
  button?: TemplateBlockModel
  // "cards" block: the gaps inside every card, px - under the title,
  // between the lines of the text, above the button.
  cardGaps?: { title?: number, lines?: number, button?: number }
  // 'form-field' block: the field it is.
  formField?: FormFieldModel
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
  // baner: the fill of the plate under its headline (a palette key).
  titleBackground?: string
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

// One of the site's popups (content/settings/popups.json, the editor's
// "Попапи" section): a window any button on any page opens (action 'popup',
// popup: id). The window itself is one of four fixed components (site
// PopupHost.vue); what is in it is the popup's own column of blocks, like
// one half of a "Довільний контент" section.
//   placement: left / right - a panel from that edge, full height, `width`
//              wide (at most the screen); bottom - a sheet from below;
//              center - a window in the middle, `width` wide.
export interface PopupModel {
  id: string
  // the client's own name for it, in the editor only
  name: string
  placement: 'left' | 'right' | 'bottom' | 'center'
  width?: number
  // What the popup is for (configs/popup-kinds.ts). Unset = 'content'.
  kind?: PopupKind
  // Every popup is the same frame (content/styles/popups.css): a close
  // cross, a title, a text, its own middle, a row of buttons.
  title?: TranslatedModel
  text?: TranslatedModel
  // 'message': an ordinary message or one about an error (its own colour).
  tone?: 'info' | 'error'
  // The buttons' words; each kind has its own defaults.
  okText?: TranslatedModel
  cancelText?: TranslatedModel
  // 'prompt': the field and what its text is turned into.
  input?: PopupInputModel
  // 'select': the choices; the chosen one's value is the answer.
  options?: PopupOptionModel[]
  // 'feedback': which form (configs/feedback-forms.ts) - sent to the
  // site's channel (global.json feedback.endpoint).
  feedbackType?: string
  // 'content' and 'form': the blocks in the middle ('form': fields among
  // them, sent to the channel as one message).
  content: TemplateBlockModel
  // Where the answer goes besides the page: one of the client's API
  // endpoints (global.json clientApi.endpoints[].id, docs/client-api.md).
  deliver?: string
  // Its look: one of the client's popup looks (UI Kit "Попапи",
  // PopupsDocument.looks) - the frame every simple popup shares. Unset =
  // the first.
  look?: string
  // 'date': one of the client's calendars (UI Kit "Календар",
  // PopupsDocument.calendars). Unset = the first.
  calendar?: string
  // This popup's own text format, over its look's (TextFormatMenu classes).
  titleClass?: string
  textClass?: string
}

// A look of popups, from the client's own set (UI Kit "Попапи"): one of our
// base variants (configs/popup-looks.ts), set up and named by the client.
// Colours are palette keys, the corners a radius variable of the theme.
// Simple popups (a message, an error, a confirmation, a field, a list) share
// it - usually there is one; a specific popup adds a model of its own part
// (a calendar, PopupCalendarModel).
export interface PopupLookModel {
  id: string
  name: string
  base: 'centered' | 'classic' | 'header'
  background?: string
  // 'header' only: the title strip's fill
  headerBackground?: string
  radius?: string
  closeColor?: string
  titleClass?: string
  textClass?: string
  // classes of the client's own buttons (UI Kit "Кнопки")
  buttons?: { main?: string, second?: string }
}

// A calendar of the client's own set (UI Kit "Календар"), for date popups:
// Vuetify's plain one, or the theme's own (content/styles/date-picker.css
// .custom-date-picker - the month large, the arrows at the right), with the
// colours of the chosen day and of today (palette keys).
export interface PopupCalendarModel {
  id: string
  name: string
  // the preset it started from; every detail below can then be changed
  variant: 'simple' | 'extended' | 'material' | 'weeks' | 'vertical' | 'tiles' | 'lines'
  // the strip with the month and the arrows - the window's own header
  headerBackground?: string
  headerColor?: string
  // the month's weight in the strip (400-700): 600 suits the main font (Manrope), another
  // font may want another
  monthWeight?: number
  prevIcon?: string
  nextIcon?: string
  // the day names: one letter (narrow) or two (short: Пн, Вт)
  weekdayFormat?: 'narrow' | 'short'
  weekdayColor?: string
  // a day's corners, px; 99 = a circle
  dayRadius?: number
  // the chosen day: its fill and its digits (palette keys)
  selectedColor?: string
  selectedTextColor?: string
  todayColor?: string
  // 1 = the week starts on Monday
  firstDayOfWeek?: 0 | 1
  // the window's corners and its buttons, over the popup's look
  radius?: string
  buttons?: { main?: string, second?: string }
}

export type PopupKind = 'content' | 'feedback' | 'form' | 'message' | 'confirm' | 'prompt' | 'select' | 'date'

export interface PopupInputModel {
  format?: 'text' | 'number' | 'integer' | 'email' | 'phone'
  label?: TranslatedModel
  placeholder?: TranslatedModel
  required?: boolean
  // several lines (text only)
  multiline?: boolean
}

export interface PopupOptionModel {
  value: string
  label: TranslatedModel
}

// content/settings/popups.json
export interface PopupsDocument {
  popups: PopupModel[]
  // the client's popup looks (UI Kit "Попапи"); the first is the default
  looks?: PopupLookModel[]
  // the client's calendars (UI Kit "Календар"); the first is the default
  calendars?: PopupCalendarModel[]
  // Before looks: the buttons every popup shared. Read once into the first
  // look (configs/popup-looks.ts withDefaultLooks), not written any more.
  buttons?: { main?: string, second?: string }
}

// A field of a client's own form ("form-field" block, in a 'form' popup).
export interface FormFieldModel {
  input: 'text' | 'textarea' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'checkbox'
  // the field's key in the message sent; made from its label when unset
  name?: string
  label?: TranslatedModel
  required?: boolean
  // 'select'
  options?: PopupOptionModel[]
}

// The feedback form's own settings: on a page (the "FeedbackForm" block),
// in the footer (FeedbackCard) and in a button's popup.
export interface FeedbackFormModel {
  // A kind from configs/feedback-forms.ts (callback, message, question...).
  type?: string
  title?: TranslatedModel
  text?: TranslatedModel
}
