import type { TemplateBlockModel } from '@/types/TemplateBlockModel'

// This is the "Зображень з ескізами" (images with thumbnails) menu entry -
// the plain "Зображень" carousel entry (no thumbnail strip) is a separate,
// still-unimplemented block type, not this one - see nav-panel-menu.ts.
// Renders via SwiperImagesEditor.vue in edit mode / SliderWithThumbnails.vue
// in preview (TemplateItem.vue dispatches "swiper" blocks there) - starts
// with no images, matching SwiperImagesEditor's own "Завантажити серію
// фото" button as the only way to populate it, same as every other empty
// block's own first-fill affordance.
export function swiperWithThumbnailsTemplate (): TemplateBlockModel {
  return {
    type: 'swiper',
    images: [],
  }
}
