<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import { FOOTER_CTA_DEFAULTS } from '@/configs/footer-variants'
  import { useCommonStore } from '@/stores/common'
  import { emptyTranslatedModel } from '@/utils/locale-text'

  // "Фінальний кадр" in the footer editor: the big invitation over the
  // columns, the same as the site draws it (site/src/components/
  // FooterFinalFrame.vue). While the footer is being edited the two texts
  // are typed in place, in the language being edited; left empty, the
  // standard words show.
  const props = defineProps<{ block: TemplateBlockModel, editing: boolean }>()
  const commonStore = useCommonStore()

  const defaults = computed(() => FOOTER_CTA_DEFAULTS[commonStore.locale] ?? FOOTER_CTA_DEFAULTS.en!)
  const own = (field: 'ctaTitle' | 'ctaText') => String(props.block[field]?.[commonStore.locale] ?? '')
  const title = computed(() => own('ctaTitle').trim() || defaults.value.title)
  const text = computed(() => own('ctaText').trim() || defaults.value.text)

  function save (field: 'ctaTitle' | 'ctaText', event: Event) {
    const value = (event.target as HTMLElement).textContent?.trim() ?? ''
    // eslint-disable-next-line vue/no-mutating-props -- the footer block is edited in place
    props.block[field] ??= emptyTranslatedModel()
    props.block[field]![commonStore.locale] = value
  }
</script>

<template>
  <div class="footer-final-frame">
    <h2
      :class="['footer-final-frame__title', { 'footer-final-frame__editable': editing }]"
      :contenteditable="editing"
      title="Заголовок футера - клацніть, щоб змінити"
      @blur="save('ctaTitle', $event)"
    >{{ title }}</h2>
    <p class="footer-final-frame__text">
      <span
        :class="{ 'footer-final-frame__editable': editing }"
        :contenteditable="editing"
        title="Текст під заголовком - клацніть, щоб змінити"
        @blur="save('ctaText', $event)"
      >{{ text }}</span>
      <i aria-hidden="true" class="mdi mdi-arrow-down footer-final-frame__arrow" />
    </p>
  </div>
</template>

<style scoped>
.footer-final-frame {
  margin: 8px 0 40px;
  padding: 0 0 32px;
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
.footer-final-frame__arrow { font-size: 1.4em; }
.footer-final-frame__editable {
  outline: dashed 1px color-mix(in srgb, var(--white) 40%, transparent);
  outline-offset: 6px;
  border-radius: 4px;
  cursor: text;
}
.footer-final-frame__editable:focus { outline-style: solid; }
</style>
