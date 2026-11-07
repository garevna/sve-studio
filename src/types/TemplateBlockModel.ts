import type { ShallowRef } from 'vue'

enum BlockTypeModel {
  HEADER = 'header',
  SUBHEADER = 'subheader',
  TITLE = 'title',
  text = 'text',
  image = 'image',
  button = 'button',
  // An icon-only button with a tooltip (IconButtonEditor.vue).
  ICON_BUTTON = 'icon-button',
  SECTION = 'section',
  FLOAT = 'float',
  CARD = 'card',
  CARDS = 'cards',
  // A set of cards shown one at a time, under a row of tabs (TabSet.vue).
  TABS = 'tabs',
  PARALLAX = 'parallax',
  PARALLAX_INSIDE = 'parallax-inside',
  SWIPER = 'swiper',
  SLIDER_WITH_IMAGES = 'slider-with-images',
  COMPONENT = 'component',
  ROUTE = 'route',
  CAROUSEL = 'carousel',
  CARD_WITH_TOOLBAR_IMAGE = 'card-with-toolbar-image',
  BANER = 'baner',
  TEXT_WITH_ICON = 'text-with-icon',
  // A horizontal line between the lines of a card.
  DIVIDER = 'divider',
  DARK_FONE_SECTION = 'dark-fone-section',
  // A footer's list of links to pages and in-page anchors. A type of its
  // own rather than the generic 'section' it used to be stored as, because
  // what a block IS decides which controls the editor offers for it - see
  // configs/footer-blocks.ts.
  PAGE_LINKS = 'page-links',
  SECTION_WITH_FREE_CONTENT = 'section-with-free-content',
  // One type per footer variant, not one shared "footer" type - variants
  // can differ substantially in structure (a future footer-2 for a
  // different production layout isn't guaranteed to share this one's
  // left/center/right shape), so each gets its own dedicated renderer
  // built against its own real structure - see FooterEditor.vue.
  FOOTER_1 = 'footer-1',
}

export type TemplateBlockTypeModel = `${BlockTypeModel}`

export type AlignmentModel = 'center' | 'left' | 'right' | 'justify'

// One text in every site language: { "<locale>": "text" }. Which locales
// exist is a per-site setting (global.json "locales") - see utils/locale-text.ts.
export type TranslatedModel = Record<string, string | string[]>

export interface BaseBlock {
  type: TemplateBlockTypeModel
  id?: string
  // A human-readable name for this block, used ONLY by this editor - to
  // name it in the list of places a link can jump to inside a page (see
  // LinkTargetSettings.vue). Production and the preview app never read it.
  //
  // Optional by design: most blocks are never a jump target, and a block
  // has nothing to be called at the moment it is inserted - it is empty.
  // It gets a name when someone actually needs to point at it, and until
  // then the list falls back to describing it (see utils/block-label.ts).
  editorLabel?: string
  width?: number
  height?: number
  // Footer only, on the footer-1 root: the px gap between its sections,
  // set by dragging the strip between them (see FooterEditor.vue). Like
  // every size the footer stores, always a multiple of 4.
  gap?: number
  icon?: string
  // icon-button: the plate under the icon on hover (palette key; unset = none)
  hoverBackground?: string
  // tabs: how the row of tabs looks ('pill' | 'underline' | 'folder'), its
  // accent and its plate (palette keys) - see TabStrip.vue
  tabLook?: string
  tabAccent?: string
  tabPlate?: string
  // Lets an icon stay configured (color/size/background all preserved) but
  // not rendered - e.g. toggling it off/on to compare a card-with-hover
  // side with vs without an icon, without losing the setup each time.
  iconHidden?: boolean
  image?: string
  title?: TranslatedModel | string
  content?: TranslatedModel | string
  class?: string
  align?: AlignmentModel
  ver?: number
  // Both "swiper" (SliderWithThumbnails.vue) and "slider-with-images"
  // (SliderWithImages.vue) blocks use this - plain strings are a legacy
  // shape SliderWithThumbnails.vue still normalizes on read, but new
  // uploads (SwiperImagesEditor.vue) always write the object shape, since
  // it's the only one production's SliderWithImages.vue actually reads
  // (item.images[i].src/.width).
  images?: (string | { src: string, width?: number })[]
  component?: ShallowRef<any> | null
  props?: object
  // callback?: () => void
  route?: string /* route for type 'route */
  params?: object /* route params for type 'route */
  query?: object /* route query for type 'route' */
  // Scroll target within the linked route/page, e.g. "#faq-section" -
  // mirrors client-side's own BaseBlock.hash. Only meaningful alongside
  // route/params (type:'route', and the footer's own center-column links).
  hash?: string
  switchOrder?: boolean /* section: switch left and right side order in mobile mode */
  dark?: boolean /* parallax */
  size?: number /* text-with-icon: icon or image size */
  mobileSize?: number /* card: its icon's size on a phone; unset = the same size */
  color?: string /* text-with-icon: icon color */
  text?: TranslatedModel | string /* text-with-icon: class name for content; dark-fone-section: translated body copy (field is overloaded) */
  background?: string /* for footer-icons component and for the future updates */
  // Footer root block, "Bento" variant: the palette keys of its tile
  // colours, as a set (configs/footer-variants.ts BENTO_TILE_SETS).
  tiles?: string[]
  // Text with icon: where a click leads - a web address (a social network,
  // say), tel:... or mailto:... (utils/link-href.ts). Opened by the site.
  link?: string
  // A contact from global.json (configs/site-contacts.ts) this line shows.
  contact?: string
  // dark-fone-section: the cards' width, px (240 when unset).
  cardWidth?: number
  // Button: what a click does. Unset = go to its page (route/params/hash);
  // 'form' = open the feedback form, with the texts in `form`, in a popup.
  action?: 'form'
  form?: FeedbackFormModel
  // Footer root block only (FooterSettingsView.vue) - whether the footer
  // renders at all. Default true when unset, same convention as
  // DynamicPageListItem.visible.
  visible?: boolean
  // Footer root block only, "Фінальний кадр" variant (configs/footer-variants.ts):
  // the big invitation over the columns and the line under it.
  ctaTitle?: TranslatedModel
  ctaText?: TranslatedModel
  // A page's top-level block hidden from the page (and the site) without
  // deleting it - brought back from the editor's "Приховані блоки" menu.
  hidden?: boolean
  // card-with-toolbar-image group ("float" block whose children are all
  // card-with-toolbar-image cards): keep every card's title/text class and
  // toolbar image height in sync - see card-with-toolbar-image-format-sync.ts.
  // Editor-only state, but drives real class/height fields production reads
  // (unlike the removed titleClass/contentClass gap - see memory).
  uniformCardFormat?: boolean
  // card-with-toolbar-image (individual card): sync this card's own text
  // items to each other - only meaningful while the group's uniformCardFormat
  // above is off (that already forces every card's text items together).
  syncTextFormat?: boolean
  // "cards"/"carousel" block (TemplateCard-based, icon cards): whether
  // CardEditDialog.vue's blockTarget is set to this whole block (icon
  // color/size/background writes land here, CardSet.vue already overlays
  // them onto every card) or left per-card independent - see
  // CardContainerActions.vue/DynamicPageTemplate.vue's openCardEditor.
  uniformCardIcon?: boolean
  // "cards"/"carousel" block: the CARD's own background, as a bare palette
  // key ("light-green"). Deliberately not `background` - that one has always
  // meant the ICON's disc behind the glyph (see IconVariant.vue), and a card
  // whose icon is a full-bleed illustration needs to colour the card without
  // putting a second disc behind the picture. Unset means transparent, which
  // is what every card looked like before this field existed.
  cardBackground?: string
  // Class of a UI Kit card style (content/styles/cards.css) - see configs/card-style.ts.
  cardStyle?: string
  // "cards" block: the text format shared by every card in it - one class
  // string for the titles, one for the body text, set from the block's own
  // toolbar and read by production's TemplateCard.vue as well as this app's.
  // Per-CARD versions of these existed once and were removed: production
  // ignored them, so they styled the editor's preview and nothing else.
  titleClass?: string
  // baner: the fill of the plate under its headline (a palette key).
  titleBackground?: string
  contentClass?: string
}

type BlockTreeModel = BaseBlock & { children?: BlockTreeModel[] }

export type TemplateBlockModel = BlockTreeModel

// Per-page SEO overrides - see SeoSettingsModel.ts for the site-wide
// defaults these fall back to (titleTemplate/defaultTitle/defaultDescription/
// defaultOgImage). Everything here is optional and empty-by-default: a page
// with no seo object at all just uses the site-wide defaults untouched.
export interface PageSeoModel {
  title?: string
  description?: string
  ogImage?: string
  // Renders <meta name="robots" content="noindex,follow"> - for pages that
  // shouldn't show up in search results (e.g. a "thank you" confirmation
  // page) without blocking the crawler from still following its links.
  noindex?: boolean
}

// title: editor-only display name (shown in the pages list, never read by
// production) - production pages don't carry anything equivalent, so it's
// optional and the list falls back to the raw id for any page without one.
// title: the page's name in every language of the site (a plain string in
// pages saved before that) - see utils/page-title.ts.
export type TemplatePageModel = { id: string, title?: TranslatedModel | string, breadcrumbs: boolean, backButton: boolean, hero: boolean, blocks: TemplateBlockModel[], seo?: PageSeoModel }

// listDynamicPages()'s own return shape - just enough to render
// PagesListView.vue's list without fetching every page's full content.
// visible: page-list metadata, not part of the page's own content blob (see
// setDynamicPageVisibility in ajax.ts) - defaults to true for any page that
// predates this field. A hidden page still exists and is still editable,
// it's just excluded from anything production shows to real visitors
// (main menu, sitemap, direct-route resolution).
export interface DynamicPageListItem { pageId: string, title?: TranslatedModel | string, visible?: boolean }

// The feedback form's own settings: on a page (the "FeedbackForm" block),
// in the footer (FeedbackCard) and in a button's popup.
export interface FeedbackFormModel {
  // A kind from configs/feedback-forms.ts (callback, message, question...).
  type?: string
  title?: TranslatedModel
  text?: TranslatedModel
}
