import { defaultImage } from '../defaults/default-image'

// `text` is typed TranslatedModel | string (see ImagesGridVer2.vue,
// resolved via resolveLocaleText/localizedText) - same reasoning as
// galery-1.ts. header/subheader/button aren't read by ImagesGridVer2.vue
// any more (dead props) - kept here only as inert leftover data, harmless
// either way since nothing reads them.
export function galery2 () {
  return {
    type: 'component',
    class: 'mt-25',
    content: 'ImagesGridVer2',
    props: {
      header: '',
      headerClass: 'mt-25 mb-8',
      subheader: '',
      subheaderClass: 'h5 text-medium mb-8',
      text: '',
      textClass: 'default-text text-medium mb-8',
      button: '',
      buttonClass: 'primary-button',
      images: {
        desktop: [
          defaultImage(),
          defaultImage(),
          defaultImage(),
          defaultImage(),
        ],
        mobile: [
          defaultImage(),
          defaultImage(),
        ],
      },
    },
  }
}
