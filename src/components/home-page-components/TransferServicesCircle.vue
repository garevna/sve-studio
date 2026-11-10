<!-- Production's own TransferServicesCircle at heart: the same disc, sizes and
  offsets. Added on top: the number badge's shape (StepBadge) and an optional
  hover effect - waves rolling out of the disc. The same file lives in the
  site (site/src/components/main-page-sections/TransferServicesCircle.vue) -
  keep the two in step. -->
<script setup lang="ts">
  import type { StepBadgeShape } from './StepBadge.vue'
  import { computed } from 'vue'

  import StepBadge from '@/components/home-page-components/StepBadge.vue'
  import TextInCircle from '@/components/home-page-components/TextInCircle.vue'

  const props = defineProps<{
    index: number
    text: string
    bold: string
    // Already-resolved CSS values, not palette keys - the caller wraps, this
    // component uses as-is. Same convention IconVariant settled on, and for
    // the same reason: wrapping in two places produces var(--var(--x)), which
    // is invalid and renders as nothing at all.
    circleColor?: string
    numberColor?: string
    badge?: StepBadgeShape
    waves?: boolean
  }>()

  // The theme's own two variables stay the default, so a caller that passes
  // neither draws exactly what this component always drew.
  const background = computed(() => props.circleColor || 'var(--transfer-services-text-in-circle-background)')
  const numberBackground = computed(() => props.numberColor || 'var(--transfer-services-number-in-circle-background)')
</script>

<template>
  <div :class="['transfer-services-circle', { 'transfer-services-circle--waves': waves }]" :style="{ '--step-wave-color': numberBackground }">
    <!-- The zigzag's step to the right: 144px as designed, less on a narrow
      phone - the disc and its step stay inside the screen with 16px each
      side (248px + 144px was 392px, wider than a 390px phone). -->
    <div class="mobile-mode step-disc-box" :style="{ width: '248px', height: '248px', marginLeft: index % 2 === 0 ? 'min(144px, calc(100vw - 280px))' : '0px', marginTop: index % 2 !== 0 ? '-44px' : '-12px' }">
      <span
        v-for="ring of 3"
        :key="ring"
        aria-hidden="true"
        class="step-wave"
        :style="{ top: '12px', left: '16px', width: '220px', height: '220px', '--step-wave-delay': `${(ring - 1) * 0.6}s` }"
      />
      <TextInCircle
        :background="background"
        class="step-disc"
        font-color="var(--black)"
        :font-size="16"
        :font-weight="500"
        :size="220"
        style="margin-top: 12px; margin-left: 16px"
      >
        {{ props.text }}
        <template v-if="props.bold">
          <b>{{ props.bold }}</b>
        </template>
      </TextInCircle>
      <StepBadge
        class="step-disc"
        :color="numberBackground"
        :font-size="40"
        :font-weight="500"
        :number="props.index + 1"
        :shape="badge"
        :size="60"
        style="margin-top: -230px !important; margin-left: 16px !important"
      />
    </div>

    <div class="desktop-mode step-disc-box" :style="{ width: '302px', height: '302px' }">
      <span
        v-for="ring of 3"
        :key="ring"
        aria-hidden="true"
        class="step-wave"
        :style="{ top: '16px', left: '16px', width: '272px', height: '272px', '--step-wave-delay': `${(ring - 1) * 0.6}s` }"
      />
      <TextInCircle
        :background="background"
        class="step-disc"
        font-color="var(--black)"
        :font-size="18"
        :font-weight="500"
        :size="272"
        style="margin-top: 16px; margin-left: 16px"
      >
        {{ props.text }}
        <template v-if="props.bold">
          <b>{{ props.bold }}</b>
        </template>
      </TextInCircle>
      <StepBadge
        class="step-disc"
        :color="numberBackground"
        :font-size="64"
        :font-weight="600"
        :number="props.index + 1"
        :shape="badge"
        :size="76"
        style="margin-top: -300px !important; margin-left: 16px !important"
      />
    </div>
  </div>
</template>

<style>
/* Not scoped: the hover belongs to the parent's .transfer-steps-lift.
   Every class is step-prefixed, so nothing else is caught. */
.step-disc-box {
  position: relative;
}
.step-disc {
  position: relative;
  z-index: 1;
}
/* Waves: three rings the size of the disc, sitting under it, that grow and
   fade one after another while the step is hovered. */
.step-wave {
  position: absolute;
  z-index: 0;
  box-sizing: border-box;
  border: 3px solid var(--step-wave-color);
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
}
.transfer-services-circle--waves:hover .step-wave,
.transfer-steps-lift:hover .transfer-services-circle--waves .step-wave {
  animation: step-wave 1.8s ease-out infinite;
  animation-delay: var(--step-wave-delay, 0s);
}
@keyframes step-wave {
  from {
    opacity: 0.8;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.45);
  }
}
@media (prefers-reduced-motion: reduce) {
  .transfer-services-circle--waves:hover .step-wave,
  .transfer-steps-lift:hover .transfer-services-circle--waves .step-wave {
    animation: none;
  }
}
</style>
