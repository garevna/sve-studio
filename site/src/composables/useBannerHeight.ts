import { computed, type Ref, ref, watch } from 'vue'

// The banner is as tall as its picture. On a screen narrower than the
// picture its sides are cut off (the picture covers the box, centred); on a
// wider one it grows with the screen, keeping its proportions, so nothing is
// cut from the top or the bottom. On a phone (its own picture, usually a
// square-ish one) it keeps the picture's proportions and is never taller
// than the picture itself.
// undefined until the picture is loaded - the caller keeps its old height.
export function useBannerHeight (src: Ref<string>, phone: Ref<boolean>, boxWidth: Ref<number>) {
  const natural = ref<{ width: number, height: number } | null>(null)

  watch(src, value => {
    natural.value = null
    if (!value || typeof Image === 'undefined') {
      return
    }
    const image = new Image()
    image.addEventListener('load', () => {
      if (src.value === value && image.naturalWidth && image.naturalHeight) {
        natural.value = { width: image.naturalWidth, height: image.naturalHeight }
      }
    })
    image.src = value
  }, { immediate: true })

  return computed<number | undefined>(() => {
    if (!natural.value) {
      return undefined
    }
    const { width, height } = natural.value
    const scaled = boxWidth.value * height / width
    return Math.round(phone.value ? Math.min(height, scaled) : Math.max(height, scaled))
  })
}
