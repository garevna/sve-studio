<script setup lang="ts">
  // The "Горизонт" footer's last line: the company's name, huge and faint,
  // stretched edge to edge whatever its length (an SVG text with a fixed
  // length), its lower part cut off by the footer's edge - a sun going down
  // behind the horizon.
  defineProps<{ text: string }>()
</script>

<template>
  <div v-if="text" aria-hidden="true" class="footer-horizon-signature">
    <svg preserveAspectRatio="xMidYMax meet" viewBox="0 0 1000 150">
      <text
        fill="currentColor"
        font-size="168"
        lengthAdjust="spacingAndGlyphs"
        :textLength="1000"
        x="0"
        y="146"
      >{{ text }}</text>
    </svg>
  </div>
</template>

<style scoped>
.footer-horizon-signature {
  flex: 1 0 100%;
  width: 100%;
  max-width: 1440px;
  margin: 8px auto -3.2%;
  padding: 0 clamp(8px, 2vw, 24px);
  overflow: hidden;
  opacity: 0.12;
  line-height: 0;
  user-select: none;
}
.footer-horizon-signature svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
/* The site's second font ("Додатковий шрифт" in Загальні налаштування),
   in its own weight - a display face like Rubik Dirt has only the one;
   without a second font, the main one. */
.footer-horizon-signature text {
  font-family: var(--accent-font, inherit);
  letter-spacing: -0.02em;
}
</style>
