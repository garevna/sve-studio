import { onMounted, onUnmounted, ref, type Ref } from 'vue'

type ParallaxItem = {
  el: HTMLElement
  current: number
  target: number
}

const items = new Set<ParallaxItem>()

let ticking = false
let rafId: number | null = null

function animate () {
  for (const item of items) {
    item.current += (item.target - item.current) * 0.08
    item.el.style.setProperty('--v-parallax-y', `${item.current}px`)
  }

  rafId = requestAnimationFrame(animate)
}

function handleScroll () {
  const windowHeight = window.innerHeight

  for (const item of items) {
    const rect = item.el.getBoundingClientRect()

    if (rect.bottom < 0 || rect.top > windowHeight) {
      continue
    }

    const progress = (rect.top + rect.height) / (windowHeight + rect.height)

    const amplitude = rect.height * 0.3

    let target = Math.sin((progress - 0.5) * Math.PI) * amplitude

    const maxOffset = rect.height * 0.4
    target = Math.max(-maxOffset, Math.min(maxOffset, target))

    item.target = target
  }
}

export function useParallax (): { el: Ref<HTMLElement | null> } {
  const el = ref<HTMLElement | null>(null)

  const item: ParallaxItem = {
    el: null as unknown as HTMLElement,
    current: 0,
    target: 0,
  }

  onMounted(() => {
    if (!el.value) {
      return
    }

    item.el = el.value
    items.add(item)

    if (!ticking) {
      window.addEventListener('scroll', handleScroll)
      animate()
      ticking = true
    }

    handleScroll()
  })

  onUnmounted(() => {
    items.delete(item)

    if (items.size === 0) {
      window.removeEventListener('scroll', handleScroll)

      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }

      ticking = false
    }
  })

  return { el }
}
