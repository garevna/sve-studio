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
// the list view.
export const BLOCK_DESCRIPTIONS: Record<string, string> = {
  'header': 'Великий заголовок розділу сторінки.',
  'title': 'Менший заголовок під основним.',
  'text': 'Абзац тексту з форматуванням.',
  'text-with-icon': 'Короткий текст з іконкою поруч.',
  'button': 'Кнопка: веде на сторінку чи її розділ або відкриває форму зворотного зв’язку.',
  'image-universal': 'Одне зображення для всіх екранів.',
  'image-desktop-mobile': 'Окремі зображення для комп’ютера й для телефона.',
  'parallax': 'Велике фото вгорі сторінки, заголовок поверх нього.',
  'parallax-inside': 'Фото з ефектом глибини посеред сторінки, текст поверх.',
  'galery1': 'Сітка фото із заголовком і текстом.',
  'galery2': 'Фото різного розміру з текстом поруч.',
  'carousel-with-images': 'Фото, що гортаються одне за одним.',
  'carousel-with-cards': 'Картки, що гортаються стрічкою.',
  'carousel-with-preview': 'Велике фото і стрічка ескізів під ним.',
  'section-image-left': 'Фото ліворуч, текст праворуч.',
  'section-image-right': 'Текст ліворуч, фото праворуч.',
  'section-two-images': 'Два фото поруч.',
  'sections-with-free-content': 'Дві колонки, у кожну - що завгодно: текст, фото, картки, кнопки, карусель.',
  'dark-fone-section': 'Темне тло із заголовком і картками.',
  'baner': 'Широкий банер: фото і текст на кольоровому тлі.',
  'card-with-toolbar-image': 'Картки з фото зверху і текстом під ним.',
  'card-with-icon-top': 'Картки з іконкою над назвою.',
  'card-with-icon-row': 'Картки списком: іконка ліворуч, текст поруч, на заливці.',
  'faq': 'Питання, що розгортаються у відповіді.',
  'popular-destinations': 'Популярні маршрути списком.',
  'transfer-services-steps': 'Кроки процесу в кружечках, один за одним.',
  'feedback-form': 'Форма, де відвідувач лишає ім’я, телефон і повідомлення. На неї може вести кнопка.',
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
