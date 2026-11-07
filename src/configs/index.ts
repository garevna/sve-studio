import { banerTemplate } from './components/baner'
import { cardWithHoverGroupTemplate } from './components/cards/card-with-hover'
import { cardWithIconLeftTemplate, cardWithIconRowTemplate, cardWithIconTopTemplate } from './components/cards/card-with-icon'
import { cardWithToolbarImageGroupTemplate } from './components/cards/card-with-toolbar-image'
import { tabsTemplate } from './components/cards/tabs'
import { carouselWithCardsTemplate } from './components/carousel-with-cards'
import { faq } from './components/faq'
import { feedbackForm } from './components/feedback-form'
import { galery1 } from './components/galery-1'
import { galery2 } from './components/galery-2'
import { parallaxTemplate } from './components/parallax'
import { parallaxInsideTemplate } from './components/parallax-inside'
import { popularDestinations } from './components/popular-destinations'
import { darkFoneSectionTemplate } from './components/sections/dark-fone-section'
import { sectionImageLeftTemplate } from './components/sections/section-image-left'
import { sectionImageRightTemplate } from './components/sections/section-image-right'
import { sectionTwoImages } from './components/sections/section-two-images'
import { sectionsWithFreeContent } from './components/sections/sections-with-free-content'
import { button } from './components/simple/button'
import { header } from './components/simple/header'
import { iconButton } from './components/simple/icon-button'
import { image } from './components/simple/image'
// import { sectionCardsTemplate } from './components/section-with-free-content'
import { text } from './components/simple/text'
import { textWithIcon } from './components/simple/text-with-icon'
import { title } from './components/simple/title'
import { swiperWithImagesTemplate } from './components/swiper-with-images'
import { swiperWithThumbnailsTemplate } from './components/swiper-with-thumbnails'
import { transferServicesSteps } from './components/transfer-services-steps'

export const components = {
  'parallax': parallaxTemplate,
  'parallax-inside': parallaxInsideTemplate,
  'card-with-toolbar-image': cardWithToolbarImageGroupTemplate,
  'card-with-hover': cardWithHoverGroupTemplate,
  'card-with-icon-top': cardWithIconTopTemplate,
  'card-with-icon-left': cardWithIconLeftTemplate,
  'card-with-icon-row': cardWithIconRowTemplate,
  'carousel-with-cards': carouselWithCardsTemplate,
  'carousel-with-images': swiperWithImagesTemplate,
  'carousel-with-preview': swiperWithThumbnailsTemplate,
  'section-image-left': sectionImageLeftTemplate,
  'section-image-right': sectionImageRightTemplate,
  'sections-with-free-content': sectionsWithFreeContent,
  'section-two-images': sectionTwoImages,
  'dark-fone-section': darkFoneSectionTemplate,
  'baner': banerTemplate,
  // 'section-cards': sectionCardsTemplate,
  header,
  title,
  text,
  button,
  'tabs': tabsTemplate,
  'icon-button': iconButton,
  'text-with-icon': textWithIcon,
  'image-universal': image,
  galery1,
  galery2,
  faq,
  'popular-destinations': popularDestinations,
  'transfer-services-steps': transferServicesSteps,
  'feedback-form': feedbackForm,
}
