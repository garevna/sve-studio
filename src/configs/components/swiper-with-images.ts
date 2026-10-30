import type { TemplateBlockModel } from '@/types/TemplateBlockModel'

// This is the "Зображень" (plain carousel, no thumbnail strip) menu entry -
// the "Зображень з ескізами" entry is swiper-with-thumbnails.ts, a separate
// type ('swiper' vs this one's 'slider-with-images'). Renders via
// SwiperImagesEditor.vue (:with-thumbnails="false") in edit mode /
// SliderWithImages.vue in preview - see TemplateItem.vue's dispatch.
export function swiperWithImagesTemplate (): TemplateBlockModel {
  return {
    type: 'slider-with-images',
    images: [],
    height: 300,
  }
}
