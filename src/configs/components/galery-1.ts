import { defaultImage } from '../defaults/default-image'

// header/subheader/text are typed TranslatedModel | string (see
// ImagesGridVer1.vue/ImageGalery.vue, both resolved via resolveLocaleText) -
// real page content stores full {uk,en,de} objects here (see
// home-page.json's own ImagesGridVer1 block). Plain empty strings are fine
// as the freshly-inserted default (resolveLocaleText handles the string
// case directly), no need to pre-fill a {uk,en,de} shape just to insert a
// block with nothing typed into it yet.
export function galery1 () {
  return {
    type: 'component',
    class: 'my-25',
    content: 'ImagesGridVer1',
    props: {
      header: '',
      headerClass: 'mt-25 mb-8',
      subheader: '',
      subheaderClass: '',
      text: '',
      textClass: 'default-text text-thin mb-8',
      button: '',
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
          defaultImage(),
          defaultImage(),
        ],
      },
    },
  }
}
