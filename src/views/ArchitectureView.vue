<script lang="ts" setup>
  import { computed } from 'vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import { editorUiLocale, t } from '@/i18n'

  // "Як це влаштовано": the project in four schemes - what it is made of,
  // how its documents refer to one another, what happens when a visitor
  // answers a popup, how a document lives as a draft. For whoever builds and
  // keeps the site (a developer, a supervisor).
  //
  // The schemes are SVG drawn from Mermaid text - one file per scheme and
  // language, docs/architecture/<scheme>.<uk|en|de>.mmd - by `pnpm diagrams`
  // (scripts/render-diagrams.mjs), in the editor's own colour variables, so
  // they follow the editor's look. Change the text, run the script: the
  // editor shows the new picture, in the interface language (English where a
  // language has none). The explanations around them are i18n
  // "architecture".
  const FILES = import.meta.glob<string>('@/assets/architecture/*.svg', { query: '?raw', import: 'default', eager: true })
  function svgOf (key: string, locale: string): string {
    const pick = (lang: string) => Object.entries(FILES).find(([path]) => path.endsWith(`/${key}.${lang}.svg`))?.[1]
    return pick(locale) ?? pick('en') ?? ''
  }

  const KEYS = ['containers', 'data', 'answer', 'draft'] as const
  const SCHEMES = computed(() => KEYS.map(key => ({ key, svg: svgOf(key, editorUiLocale()) })))

  function go (key: string) {
    // eslint-disable-next-line unicorn/prefer-query-selector -- an id, not a selector
    document.getElementById(`scheme-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" :title="t('architecture.title')" />

      <div class="arch">
        <p class="arch-lead">{{ t('architecture.lead') }}</p>
        <nav :aria-label="t('architecture.title')" class="arch-contents">
          <button
            v-for="scheme of SCHEMES"
            :key="scheme.key"
            class="arch-chip"
            type="button"
            @click="go(scheme.key)"
          >
            {{ t(`architecture.${scheme.key}.title`) }}
          </button>
        </nav>

        <section
          v-for="scheme of SCHEMES"
          :id="`scheme-${scheme.key}`"
          :key="scheme.key"
          :aria-labelledby="`scheme-title-${scheme.key}`"
          class="arch-section"
        >
          <span class="arch-kind">{{ t(`architecture.${scheme.key}.kind`) }}</span>
          <h2 :id="`scheme-title-${scheme.key}`" class="arch-title">{{ t(`architecture.${scheme.key}.title`) }}</h2>
          <div class="arch-body">
            <!-- The SVG is ours (scripts/render-diagrams.mjs), not anyone's
              input. -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="arch-figure" v-html="scheme.svg" />
            <div class="arch-notes">
              <p><strong>{{ t('architecture.howToRead') }}</strong> {{ t(`architecture.${scheme.key}.how`) }}</p>
              <ul>
                <li>{{ t(`architecture.${scheme.key}.p1`) }}</li>
                <li>{{ t(`architecture.${scheme.key}.p2`) }}</li>
                <li>{{ t(`architecture.${scheme.key}.p3`) }}</li>
              </ul>
            </div>
          </div>
        </section>

        <p class="arch-footer">{{ t('architecture.footer') }}</p>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.arch {
  display: flex;
  flex-direction: column;
  gap: 40px;
  max-width: 1200px;
}
.arch-lead {
  margin: 0;
  max-width: 72ch;
  color: var(--sve-text-muted);
}
.arch-contents {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: -16px;
}
.arch-chip {
  padding: 6px 14px;
  border: 1px solid var(--sve-border);
  border-radius: 999px;
  background: var(--sve-surface);
  color: var(--sve-text);
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
}
.arch-chip:hover,
.arch-chip:focus-visible {
  border-color: var(--sve-primary);
  color: var(--sve-primary);
  outline: none;
}
.arch-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  scroll-margin-top: 72px;
}
.arch-kind {
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--sve-text-subtle);
}
.arch-title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 600;
  color: var(--sve-text);
}
.arch-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
}
/* The explanation first, then the scheme across the whole width: the
   schemes are wide, and beside a column of text they had to scroll. */
.arch-body > .arch-notes {
  order: -1;
  max-width: 80ch;
}
/* A scheme keeps a size its words can be read at: on a narrow screen it
   scrolls sideways inside its own frame, the page does not. */
.arch-figure {
  min-width: 0;
  overflow-x: auto;
  padding: 20px;
  border: 1px solid var(--sve-border);
  border-radius: var(--sve-radius-lg);
  background: var(--sve-surface);
}
/* At its own size (scripts/render-diagrams.mjs writes it), centred when it
   is narrower than the frame. */
.arch-figure :deep(svg) {
  display: block;
  max-width: none;
  height: auto;
  margin: 0 auto;
}
.arch-notes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  font-size: 0.9375rem;
  color: var(--sve-text-muted);
}
.arch-notes p {
  margin: 0;
}
.arch-notes strong {
  color: var(--sve-text);
  font-weight: 600;
}
.arch-notes ul {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
}
.arch-footer {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--sve-text-subtle);
}
</style>
