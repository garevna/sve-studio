<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import { FOOTER_CTA_DEFAULTS } from '@/configs/footer-variants'
  import { useCommonStore } from '@/stores/common'

  // "Фінальний кадр": the footer opens with a big invitation to get in
  // touch - the page's last word - and the columns line up under it.
  const props = defineProps<{ title?: Record<string, string>, text?: Record<string, string> }>()
  const { locale } = storeToRefs(useCommonStore())

  const defaults = computed(() => FOOTER_CTA_DEFAULTS[locale.value] ?? FOOTER_CTA_DEFAULTS.en!)
  const title = computed(() => props.title?.[locale.value]?.trim() || defaults.value.title)
  const text = computed(() => props.text?.[locale.value]?.trim() || defaults.value.text)
</script>

<template>
  <div class="footer-final-frame">
    <h2 class="footer-final-frame__title">{{ title }}</h2>
    <p class="footer-final-frame__text">
      {{ text }}
      <i aria-hidden="true" class="mdi mdi-arrow-down footer-final-frame__arrow" />
    </p>
  </div>
</template>

<style scoped>
.footer-final-frame {
  flex: 1 0 100%;
  max-width: 1368px;
  margin: 24px auto 40px;
  padding: 0 clamp(16px, 4vw, 48px) 32px;
  border-bottom: solid 1px color-mix(in srgb, var(--white) 20%, transparent);
}
.footer-final-frame__title {
  /* the footer's own text colour - the site's stylesheets colour every h2 */
  color: inherit !important;
  margin: 0;
  font-size: clamp(44px, 9vw, 128px);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.03em;
}
.footer-final-frame__text {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 720px;
  margin: 20px 0 0;
  font-size: clamp(16px, 1.6vw, 20px);
  opacity: 0.8;
}
.footer-final-frame__arrow {
  font-size: 1.4em;
  animation: footer-final-frame-nudge 1.8s ease-in-out infinite;
}
@keyframes footer-final-frame-nudge {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(5px); }
}
@media (prefers-reduced-motion: reduce) {
  .footer-final-frame__arrow { animation: none; }
}
</style>
