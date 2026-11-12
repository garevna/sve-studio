import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
import { cardWithIconRowTemplate } from './components/cards/card-with-icon'
import { button } from './components/simple/button'
import { header } from './components/simple/header'
import { image } from './components/simple/image'
import { text } from './components/simple/text'
import { textWithIcon } from './components/simple/text-with-icon'
import { title } from './components/simple/title'
import { swiperWithImagesTemplate } from './components/swiper-with-images'

// What the block gallery (BlockGallery.vue) says and shows about each block
// beyond its name - keyed by the ids of nav-panel-menu.ts.

// One line about each block: under its preview, and as the second line of
// the list view. Keys of the interface texts (messages/blockMenu.json).
export const BLOCK_DESCRIPTIONS: Record<string, string> = {
  'header': 'blockMenu.about.header',
  'title': 'blockMenu.about.title',
  'text': 'blockMenu.about.text',
  'text-with-icon': 'blockMenu.about.textWithIcon',
  'button': 'blockMenu.about.button',
  'icon-button': 'blockMenu.about.iconButton',
  'image-universal': 'blockMenu.about.imageUniversal',
  'image-desktop-mobile': 'blockMenu.about.imageDesktopMobile',
  'parallax': 'blockMenu.about.parallax',
  'parallax-inside': 'blockMenu.about.parallaxInside',
  'galery1': 'blockMenu.about.galery1',
  'galery2': 'blockMenu.about.galery2',
  'carousel-with-images': 'blockMenu.about.carouselWithImages',
  'carousel-with-cards': 'blockMenu.about.carouselWithCards',
  'carousel-with-preview': 'blockMenu.about.carouselWithPreview',
  'section-image-left': 'blockMenu.about.sectionImageLeft',
  'section-image-right': 'blockMenu.about.sectionImageRight',
  'section-two-images': 'blockMenu.about.sectionTwoImages',
  'sections-with-free-content': 'blockMenu.about.sectionsWithFreeContent',
  'dark-fone-section': 'blockMenu.about.darkFoneSection',
  'baner': 'blockMenu.about.baner',
  'card-with-toolbar-image': 'blockMenu.about.cardWithToolbarImage',
  'card-with-icon-top': 'blockMenu.about.cardWithIconTop',
  'card-with-icon-row': 'blockMenu.about.cardWithIconRow',
  'tabs': 'blockMenu.about.tabs',
  'faq': 'blockMenu.about.faq',
  'popular-destinations': 'blockMenu.about.popularDestinations',
  'transfer-services-steps': 'blockMenu.about.transferServicesSteps',
  'feedback-form': 'blockMenu.about.feedbackForm',
  'hotel-search': 'blockMenu.about.hotelSearch',
}

// Blocks whose content is up to the user: shown in the gallery as several
// examples in turn, so it is plain that anything can go there. Each is a
// whole block; the gallery fills in its empty texts and pictures.
function freeColumns (left: TemplateBlockModel[], right: TemplateBlockModel[]): TemplateBlockModel {
  return {
    type: 'section',
    children: [
      { type: 'section-with-free-content', children: left },
      { type: 'section-with-free-content', children: right },
    ],
  }
}
const asBlock = (block: unknown) => block as TemplateBlockModel

export const BLOCK_EXAMPLES: Record<string, () => TemplateBlockModel[]> = {
  'sections-with-free-content': () => [
    freeColumns([asBlock(header()), asBlock(text()), asBlock(button())], [image()]),
    freeColumns([image()], [asBlock(title()), cardWithIconRowTemplate()]),
    freeColumns([asBlock(textWithIcon()), asBlock(textWithIcon()), asBlock(textWithIcon())], [swiperWithImagesTemplate()]),
  ],
}
