<script setup lang="ts">
  // The "Горизонт" footer's top edge: the page flows into the footer over a
  // soft wave in the footer's own colour (two layers, the back one fainter,
  // for depth). Sits above the footer, outside its box.
  defineProps<{ color: string }>()
</script>

<template>
  <svg
    aria-hidden="true"
    class="footer-horizon-wave"
    preserveAspectRatio="none"
    viewBox="0 0 1440 100"
  >
    <path d="M0,58 C220,10 470,4 720,40 C980,78 1210,92 1440,30 L1440,100 L0,100 Z" :fill="color" opacity="0.45" />
    <path d="M0,72 C260,26 520,30 760,62 C1000,94 1230,84 1440,52 L1440,100 L0,100 Z" :fill="color" />
  </svg>
</template>

<style scoped>
.footer-horizon-wave {
  position: absolute;
  left: 0;
  bottom: calc(100% - 1px);
  display: block;
  width: 100%;
  height: clamp(40px, 6vw, 96px);
  pointer-events: none;
}
</style>
