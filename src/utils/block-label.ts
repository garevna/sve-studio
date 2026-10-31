import type { LocaleModel } from './locale-text'
import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
import { resolveLocaleText } from './locale-text'

const CONTENT_LABEL_TYPES = new Set(['header', 'title', 'text'])

// What each block type is, in words. Without this a block with no text of
// its own - a FAQ, a gallery, a set of cards - was listed as "Блок 7
// (component)", and three of those in a row are indistinguishable: the user
// had to count blocks on the page to find the one they meant.
const TYPE_LABELS: Record<string, string> = {
  'baner': 'Банер',
  'button': 'Кнопка',
  'card': 'Картка',
  'cards': 'Картки',
  'card-with-toolbar-image': 'Картка із зображенням',
  'carousel': 'Карусель карток',
  'dark-fone-section': 'Темна секція',
  'float': 'Плаваюча секція',
  'image': 'Зображення',
  'page-links': 'Список посилань',
  'parallax': 'Паралакс',
  'parallax-inside': 'Паралакс',
  'route': 'Посилання',
  'section': 'Секція',
  'section-with-free-content': 'Довільний контент',
  'slider-with-images': 'Слайдер зображень',
  'swiper': 'Слайдер із прев’ю',
  'text-with-icon': 'Текст з іконкою',
}

// A component block says which component it is in its own `content`, and
// that name is far more useful than "component" - "FAQ" is exactly what the
// user is looking for. Only the ones a person would have to recognise are
// translated; anything else falls back to the component's own name, which
// is still better than nothing.
const COMPONENT_LABELS: Record<string, string> = {
  FAQ: 'FAQ (питання та відповіді)',
  ImagesGridVer1: 'Сітка зображень',
  ImagesGridVer2: 'Сітка зображень',
  PopularDestinationsTheme1: 'Популярні напрямки',
  PopularDestinationsTheme2: 'Популярні напрямки',
  PopularDestinationsTheme3: 'Популярні напрямки',
  CardWithHover: 'Картки з ефектом наведення',
  FeedbackCard: 'Картка зворотного зв’язку',
  FeedbackForm: 'Форма зворотного зв’язку',
  FooterIcons: 'Іконки соцмереж',
  FooterVisaLogo: 'Логотип Visa/Mastercard',
}

function typeLabel (block: TemplateBlockModel): string {
  if (block.type === 'component') {
    const name = typeof block.content === 'string' ? block.content : ''
    return COMPONENT_LABELS[name] || name || 'Компонент'
  }
  return TYPE_LABELS[block.type] || block.type
}

/**
 * Human-readable label for a top-level page block, for the "scroll to this
 * block" picker. A client picking a target needs to recognize the block by
 * what it IS, not by its (often absent) id.
 *
 * Four tiers, most specific first: the name someone gave it, its own visible
 * text, its title, and finally what kind of block it is plus its position.
 */
export function getBlockLabel (block: TemplateBlockModel, index: number, locale: LocaleModel): string {
  // A name someone gave it stands alone - it was chosen to be recognised.
  if (block.editorLabel?.trim()) {
    return block.editorLabel.trim()
  }
  // Everything else is a GUESS at what the block is, and guesses collide: a
  // heading that reads "Популярні напрямки" and the component of the same
  // name are two different blocks with one description. The position
  // separates them, and gives something to count to on the page.
  return `${index + 1}. ${describe(block, locale)}`
}

function describe (block: TemplateBlockModel, locale: LocaleModel): string {
  if (CONTENT_LABEL_TYPES.has(block.type)) {
    const text = resolveLocaleText(block.content, locale)
    if (text) {
      return text
    }
  }
  if (block.title) {
    const text = resolveLocaleText(block.title, locale)
    if (text) {
      return text
    }
  }
  return typeLabel(block)
}
