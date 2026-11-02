// A picture that is not set, or not found, shows an empty "canvas" - the
// Photoshop-style checkerboard - instead of a broken icon or a stand-in
// picture, so it is plain which pictures still need uploading.
//
// - <img> of the content (the content API's pictures, or an empty src):
//   installImageFallback() catches its load error anywhere on the page, so
//   no block has to handle it itself. A v-img gets the checkerboard on its
//   box; a plain <img> keeps its box (a transparent picture of the same
//   proportions) with the checkerboard behind it.
// - A picture painted as a CSS background (a banner circle, a hover card):
//   imageMissing() tells whether it loads, and the block adds the class.
//
// NOTE: site/src/utils/image-fallback.ts is an exact copy - keep the two
// identical.
import type { Ref } from 'vue'
import { ref, watchEffect } from 'vue'

export const IMAGE_PLACEHOLDER_CLASS = 'image-placeholder-bg'

const CHECKER = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 40 40"><rect width="20" height="20" fill="#ddd"/><rect x="20" width="20" height="20" fill="#fff"/><rect y="20" width="20" height="20" fill="#fff"/><rect x="20" y="20" width="20" height="20" fill="#ddd"/></svg>')}")`

// Stands in for a picture that failed: transparent, 16:10, so a box sized
// by its picture keeps a picture's shape.
const EMPTY_PICTURE = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="10"/>')}`

// The checkerboard as CSS background properties, for a style binding.
export const CHECKER_STYLE = {
  backgroundColor: '#fff',
  backgroundImage: CHECKER,
  backgroundRepeat: 'repeat',
  backgroundSize: '20px 20px',
}

// A content picture: one the editor uploaded, or the published copy.
function isContentPicture (src: string | null): boolean {
  return src === '' || (!!src && /\/(api\/content|_seed)\/images\//.test(src))
}

let installed = false

export function installImageFallback () {
  if (installed || typeof document === 'undefined') {
    return
  }
  installed = true

  const style = document.createElement('style')
  style.textContent = `.${IMAGE_PLACEHOLDER_CLASS} { background-color: #fff; background-image: ${CHECKER}; background-repeat: repeat; background-size: 20px 20px; }`
  document.head.append(style)

  // load/error do not bubble - caught on the way down instead.
  document.addEventListener('error', event => {
    const image = event.target
    if (!(image instanceof HTMLImageElement) || image.src === EMPTY_PICTURE || !isContentPicture(image.getAttribute('src'))) {
      return
    }
    const box = image.closest('.v-img')
    if (box) {
      box.classList.add(IMAGE_PLACEHOLDER_CLASS)
      return
    }
    image.classList.add(IMAGE_PLACEHOLDER_CLASS)
    image.src = EMPTY_PICTURE
  }, true)

  // The same element given a picture that loads (a new upload).
  document.addEventListener('load', event => {
    const image = event.target
    if (!(image instanceof HTMLImageElement) || image.src === EMPTY_PICTURE) {
      return
    }
    image.classList.remove(IMAGE_PLACEHOLDER_CLASS)
    image.closest('.v-img')?.classList.remove(IMAGE_PLACEHOLDER_CLASS)
  }, true)
}

// true while the picture is not set or does not load.
export function imageMissing (url: () => string | null | undefined): Ref<boolean> {
  const missing = ref(!url())
  watchEffect(onCleanup => {
    const src = url()
    if (!src) {
      missing.value = true
      return
    }
    if (typeof Image === 'undefined') {
      missing.value = false
      return
    }
    let current = true
    onCleanup(() => {
      current = false
    })
    const probe = new Image()
    probe.addEventListener('load', () => {
      if (current) {
        missing.value = false
      }
    })
    probe.addEventListener('error', () => {
      if (current) {
        missing.value = true
      }
    })
    probe.src = src
  })
  return missing
}
