import type { TemplateBlockModel, TranslatedModel } from '@/types/TemplateBlockModel'
import sample1 from '@/assets/gallery-samples/sample-1.jpg'
import sample2 from '@/assets/gallery-samples/sample-2.jpg'
import sample3 from '@/assets/gallery-samples/sample-3.jpg'
import sample4 from '@/assets/gallery-samples/sample-4.jpg'
import sample5 from '@/assets/gallery-samples/sample-5.jpg'
import sample6 from '@/assets/gallery-samples/sample-6.jpg'
import sample7 from '@/assets/gallery-samples/sample-7.jpg'
import sample8 from '@/assets/gallery-samples/sample-8.jpg'
import { isTranslatedModel } from '@/utils/locale-text'

// A new block as the block gallery shows it: the same block the picker
// inserts, with its empty places filled in - sample texts, and sample photos
// (src/assets/gallery-samples, free Unsplash photos - see CREDITS.md there).
// An empty heading draws nothing and an empty picture is a grey checkerboard,
// so a gallery of fresh blocks would show nothing of what they look like.
//
// Only for the picture: the block actually inserted keeps its empty places,
// for the user to fill.

const PHOTOS = [sample1, sample2, sample3, sample4, sample5, sample6, sample7, sample8]

// A card set with one and the same icon on every card reads as a
// placeholder; a few different ones (from the mdi set the editor already
// has) read as a real set.
const ICONS = ['mdi-map-marker-outline', 'mdi-shield-check-outline', 'mdi-headset', 'mdi-clock-outline', 'mdi-ticket-outline', 'mdi-star-outline']

const SAMPLE_TEXT: Record<string, string> = {
  header: 'Заголовок розділу',
  subheader: 'Підзаголовок',
  title: 'Підзаголовок',
  text: 'Кілька речень про головне - їх легко замінити своїм текстом.',
  button: 'Детальніше',
}

// block types whose `content` is a picture, not a text
const PICTURE_TYPES = new Set(['image', 'parallax', 'parallax-inside', 'baner'])
// fields that hold one picture, or a list of them
const PICTURE_FIELDS = new Set(['image', 'backgroundImage', 'hoverImage', 'src'])
const PICTURE_LISTS = new Set(['images', 'desktop', 'mobile'])

function isBlank (value: unknown): boolean {
  return typeof value === 'string' ? !value.trim() : false
}

function isEmptyTranslated (value: unknown): value is TranslatedModel {
  return isTranslatedModel(value) && Object.values(value).every(text => isBlank(text))
}

function fillTranslated (value: TranslatedModel, text: string) {
  for (const locale of Object.keys(value)) {
    value[locale] = text
  }
}

function makeFiller () {
  let next = 0
  const photo = () => PHOTOS[next++ % PHOTOS.length]!
  let nextIcon = 0
  const icon = () => ICONS[nextIcon++ % ICONS.length]!

  function fillList (list: unknown[]) {
    if (list.length === 0) {
      list.push(photo(), photo(), photo(), photo())
      return
    }
    for (const [index, item] of list.entries()) {
      if (isBlank(item)) {
        list[index] = photo()
      } else if (item && typeof item === 'object') {
        walk(item as Record<string, unknown>)
      }
    }
  }

  function walk (node: Record<string, unknown>) {
    const type = typeof node.type === 'string' ? node.type : ''
    for (const [key, value] of Object.entries(node)) {
      if (key === 'content' && isEmptyTranslated(value)) {
        if (PICTURE_TYPES.has(type)) {
          fillTranslated(value, photo())
        } else if (SAMPLE_TEXT[type]) {
          fillTranslated(value, SAMPLE_TEXT[type])
        }
      } else if ((key === 'title' || key === 'text') && isEmptyTranslated(value)) {
        fillTranslated(value, key === 'title' ? 'Назва' : SAMPLE_TEXT.text!)
      } else if (key === 'icon' && typeof value === 'string' && value.startsWith('mdi-')) {
        node[key] = icon()
      } else if (PICTURE_FIELDS.has(key) && isBlank(value)) {
        node[key] = photo()
      } else if (SAMPLE_TEXT[key] && isBlank(value)) {
        // a component's own text props (header, subheader, text, button)
        node[key] = SAMPLE_TEXT[key]
      } else if (Array.isArray(value)) {
        if (PICTURE_LISTS.has(key)) {
          fillList(value)
        } else {
          for (const item of value) {
            if (item && typeof item === 'object') {
              walk(item as Record<string, unknown>)
            }
          }
        }
      } else if (value && typeof value === 'object' && !isTranslatedModel(value)) {
        walk(value as Record<string, unknown>)
      }
    }
  }
  return walk
}

export function gallerySample (block: TemplateBlockModel): TemplateBlockModel {
  const copy = structuredClone(block)
  makeFiller()(copy as unknown as Record<string, unknown>)
  return copy
}
