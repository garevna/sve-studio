<script setup lang="ts">
  import { onBeforeUnmount, onMounted, ref, useId } from 'vue'

  // «Ватерлінія» (header.heroEffect 'waterline'): the banner's lower part is
  // water - the picture mirrored under a line, dimmed in the page's colour,
  // its surface moving softly (an SVG turbulence that drifts), and rings
  // spreading from the pointer where it crosses the water. The name, in a
  // bottom corner, stands on the line (the banner's own styles).
  //
  // Laid over the picture, never catching the pointer - the rings follow it
  // through the banner beneath. Someone who asked for less motion gets the
  // still reflection.
  //
  // NOTE: site/src/components/hero-section/HeroWaterline.vue and
  // src/components/templates/sections/HeroWaterline.vue are identical -
  // keep them so.
  const props = defineProps<{ src: string }>()

  const filterId = `hero-ripple-${useId()}`
  const root = ref<HTMLElement | null>(null)
  const water = ref<HTMLElement | null>(null)
  const rings = ref<{ id: number, x: number, y: number }[]>([])
  const calm = typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches

  let ringId = 0
  let lastRing = 0

  function onMove (event: PointerEvent) {
    const box = water.value?.getBoundingClientRect()
    const now = performance.now()
    if (calm || !box || now - lastRing < 140) {
      return
    }
    const x = event.clientX - box.left
    const y = event.clientY - box.top
    if (x < 0 || y < 0 || x > box.width || y > box.height) {
      return
    }
    lastRing = now
    rings.value = [...rings.value.slice(-7), { id: ++ringId, x, y }]
  }

  function dropRing (id: number) {
    rings.value = rings.value.filter(ring => ring.id !== id)
  }

  let host: HTMLElement | null = null
  onMounted(() => {
    host = root.value?.parentElement ?? null
    host?.addEventListener('pointermove', onMove, { passive: true })
  })
  onBeforeUnmount(() => {
    host?.removeEventListener('pointermove', onMove)
  })
</script>

<template>
  <div ref="root" aria-hidden="true" class="hero-waterline">
    <svg class="hero-waterline__defs" height="0" width="0">
      <filter
        :id="filterId"
        height="140%"
        width="120%"
        x="-10%"
        y="-20%"
      >
        <feTurbulence baseFrequency="0.006 0.05" numOctaves="2" seed="3" type="fractalNoise">
          <animate
            v-if="!calm"
            attributeName="baseFrequency"
            dur="10s"
            repeatCount="indefinite"
            values="0.006 0.05;0.008 0.065;0.006 0.05"
          />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" scale="16" />
      </filter>
    </svg>
    <div ref="water" class="hero-waterline__water">
      <div class="hero-waterline__mirror" :style="{ backgroundImage: props.src ? `url(${props.src})` : undefined, filter: `url(#${filterId}) blur(1px)` }" />
      <span
        v-for="ring of rings"
        :key="ring.id"
        class="hero-waterline__ring"
        :style="{ left: `${ring.x}px`, top: `${ring.y}px` }"
        @animationend="dropRing(ring.id)"
      />
    </div>
    <div class="hero-waterline__line" />
  </div>
</template>

<style scoped>
/* The water takes the lower 38% of the banner; the mirror is the picture
   as tall as the banner, flipped about the line: its top sits 163% of the
   water's height above it (62/38), and it turns over at 62% of itself. */
.hero-waterline {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  border-radius: inherit;
  overflow: hidden;
}
.hero-waterline__defs {
  position: absolute;
}
.hero-waterline__water {
  position: absolute;
  inset: auto 0 0;
  height: 38%;
  overflow: hidden;
}
.hero-waterline__mirror {
  position: absolute;
  inset: auto 0;
  top: -163.16%;
  height: 263.16%;
  background-size: cover;
  background-position: center;
  transform-origin: 50% 62%;
  transform: scaleY(-1);
}
/* the water's own colour: the page's, deeper towards the bottom */
.hero-waterline__water::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--homefone) 30%, transparent), color-mix(in srgb, var(--homefone) 82%, transparent));
}
.hero-waterline__line {
  position: absolute;
  inset: auto 0 38%;
  height: 1px;
  background: color-mix(in srgb, var(--white) 45%, transparent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--white) 35%, transparent);
}
.hero-waterline__ring {
  position: absolute;
  z-index: 1;
  width: 24px;
  height: 8px;
  margin: -4px 0 0 -12px;
  border: 1.5px solid color-mix(in srgb, var(--white) 60%, transparent);
  border-radius: 50%;
  animation: hero-waterline-ring 1.6s ease-out forwards;
}
@keyframes hero-waterline-ring {
  from { transform: scale(0.4); opacity: 0.9; }
  to { transform: scale(6); opacity: 0; }
}
</style>
