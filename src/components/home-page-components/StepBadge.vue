<!-- The number badge of a step in "Кроки в кружках". A plain disc is the
  component's own look; the other shapes are drawn as one SVG path in a
  100x100 box, the number on top. The same file lives in the site
  (site/src/components/main-page-sections/StepBadge.vue) - keep the two in step. -->
<script setup lang="ts">
  import { computed } from 'vue'

  export type StepBadgeShape = 'circle' | 'gear' | 'hexagon' | 'burst'

  const props = defineProps<{
    shape?: StepBadgeShape
    size: number
    color: string
    number: number
    fontSize: number
    fontWeight: number
  }>()

  function polar (radius: number, angle: number): string {
    return `${(50 + radius * Math.cos(angle)).toFixed(2)} ${(50 + radius * Math.sin(angle)).toFixed(2)}`
  }

  // Teeth with flat tops and sloped flanks - reads as a gear even at 60px.
  function gearPath (teeth = 9, outer = 49, inner = 39): string {
    const step = (Math.PI * 2) / teeth
    const points: string[] = []
    for (let index = 0; index < teeth; index++) {
      const start = index * step - Math.PI / 2
      points.push(
        polar(inner, start),
        polar(outer, start + step * 0.12),
        polar(outer, start + step * 0.43),
        polar(inner, start + step * 0.55),
      )
    }
    return `M ${points.join(' L ')} Z`
  }

  function starPath (rays: number, outer: number, inner: number, turn = -Math.PI / 2): string {
    const points: string[] = []
    for (let index = 0; index < rays * 2; index++) {
      points.push(polar(index % 2 === 0 ? outer : inner, turn + (index * Math.PI) / rays))
    }
    return `M ${points.join(' L ')} Z`
  }

  const PATHS: Record<Exclude<StepBadgeShape, 'circle'>, string> = {
    gear: gearPath(),
    hexagon: starPath(3, 46, 46, 0),
    burst: starPath(12, 49, 40),
  }

  const path = computed(() => (props.shape && props.shape !== 'circle' ? PATHS[props.shape] : ''))
  const box = computed(() => `${props.size}px`)
</script>

<template>
  <div :class="['step-badge', `step-badge--${shape || 'circle'}`]" :style="{ width: box, height: box }">
    <svg v-if="path" aria-hidden="true" class="step-badge__shape" viewBox="0 0 100 100">
      <path
        :d="path"
        :fill="color"
        :stroke="color"
        stroke-linejoin="round"
        stroke-width="5"
      />
      <circle
        v-if="shape === 'gear'"
        cx="50"
        cy="50"
        fill="none"
        r="30"
        stroke="var(--white)"
        stroke-opacity=".35"
        stroke-width="2.5"
      />
    </svg>
    <span
      class="step-badge__number"
      :style="{
        background: path ? 'none' : color,
        fontSize: `${shape && shape !== 'circle' ? fontSize * 0.8 : fontSize}px`,
        fontWeight,
      }"
    >{{ number }}</span>
  </div>
</template>

<style>
/* Not scoped: the hover that turns the gear belongs to the whole step (the
   parent's .transfer-steps-lift), which a scoped rule can't see. Every
   class here is prefixed step-badge, so nothing else is caught. */
.step-badge {
  position: relative;
  display: grid;
  place-items: center;
}
.step-badge__shape {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  transition: transform 0.6s ease;
}
.step-badge__number {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  color: var(--white);
  line-height: 1;
}
.transfer-steps-lift:hover .step-badge--gear .step-badge__shape {
  animation: step-badge-spin 4s linear infinite;
}
.transfer-steps-lift:hover .step-badge--hexagon .step-badge__shape,
.transfer-steps-lift:hover .step-badge--burst .step-badge__shape {
  transform: rotate(30deg) scale(1.08);
}
@keyframes step-badge-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .transfer-steps-lift:hover .step-badge__shape {
    animation: none;
    transform: none;
  }
}
</style>
