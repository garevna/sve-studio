<!-- Ported verbatim from production's own client-side
  components/main-page-sections/TransferServicesCircle.vue - only the import path
  differs. This app's whole job is to show what actually ships. -->
<script setup lang="ts">
  import { computed } from 'vue'

  import TextInCircle from './TextInCircle.vue'

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
  }>()

  // The theme's own two variables stay the default, so a caller that passes
  // neither draws exactly what this component always drew.
  const background = computed(() => props.circleColor || 'var(--transfer-services-text-in-circle-background)')
  const numberBackground = computed(() => props.numberColor || 'var(--transfer-services-number-in-circle-background)')
</script>

<template>
  <div class="transfer-services-circle">
    <div class="mobile-mode" :style="{ width: '248px', height: '248px', marginLeft: index % 2 === 0 ? '144px' : '0px', marginTop: index % 2 !== 0 ? '-44px' : '-12px' }">
      <TextInCircle
        :size="220"
        :background="background"
        font-color="var(--black)"
        :font-size="16"
        :font-weight="500"
        style="margin-top: 12px; margin-left: 16px"
      >
        {{ props.text }}
        <template v-if="props.bold">
          <b>{{ props.bold }}</b>
        </template>
      </TextInCircle>
      <TextInCircle
        :size="60"
        :background="numberBackground"
        font-color="var(--white)"
        :font-size="40"
        :font-weight="500"
        :text="(props.index + 1).toString()"
        style="margin-top: -230px !important; margin-left: 16px !important"
      >
        {{ props.index + 1 }}
      </TextInCircle>
    </div>

    <div class="desktop-mode" :style="{ width: '302px', height: '302px' }">
      <TextInCircle
        :size="272"
        :background="background"
        font-color="var(--black)"
        :font-size="18"
        :font-weight="500"
        style="margin-top: 16px; margin-left: 16px"
      >
        {{ props.text }}
        <template v-if="props.bold">
          <b>{{ props.bold }}</b>
        </template>
      </TextInCircle>
      <TextInCircle
        :size="76"
        :background="numberBackground"
        font-color="var(--white)"
        :font-size="64"
        :font-weight="600"
        :text="index.toString()"
        style="margin-top: -300px !important; margin-left: 16px !important"
      >
        {{ props.index + 1 }}
      </TextInCircle>
    </div>
  </div>
</template>
