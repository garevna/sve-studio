<script lang="ts" setup>
  import type { ReadyPalette } from '@/configs/ready-palettes'
  import { computed, onMounted, ref } from 'vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import { useSiteStyle } from '@/composables/useSiteStyle'
  import { READY_GLOW_KEY, READY_PALETTES } from '@/configs/ready-palettes'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { refreshEditedPalette } from '@/utils/edited-palette'

  // Ready palettes (configs/ready-palettes.ts): the client picks a look,
  // nothing to set up. Each card shows the same little page by day and in
  // «Неон», with that palette's own glow. «Своя палітра» is palette.json -
  // the designer's, untouched by a pick. The choice is global.json
  // `readyPalette` (a client may write the general settings, not the
  // palette), saved at once; the page canvas follows.

  const ajaxStore = useAjaxStore()
  const siteStyle = useSiteStyle()

  const current = ref<string | null>(null)
  const own = ref<Record<string, string>>({})
  const loading = ref(true)
  const saving = ref<string | null>(null)

  onMounted(async () => {
    void siteStyle.load()
    const [palette, settings] = await Promise.all([ajaxStore.getPalette(), ajaxStore.getGlobalSettings()])
    own.value = palette ?? {}
    current.value = settings?.readyPalette ?? null
    loading.value = false
  })

  // «Своя палітра» drawn from palette.json's own colours; its night is
  // «Неон»'s own set - shown here by its main colours only.
  const ownCard = computed<ReadyPalette>(() => {
    const p = own.value
    const c = (key: string, fallback: string) => p[key] ?? fallback
    return {
      id: '',
      day: { bg: c('homefone', '#FFFFFF'), text: c('black', '#111827'), heading: c('primary', '#152A68'), muted: c('dark-grey', '#455B99'), primary: c('primary', '#152A68'), secondary: c('secondary', '#3050B1'), tint: c('accent', '#D4DBF0') },
      night: { bg: '#070A18', bg2: '#0B1024', text: '#E8ECFF', muted: '#B8C2EE', primary: '#7C6CFF', secondary: '#22D3EE', glow: c('warning', '#C3840F') },
    }
  })

  const cards = computed(() => [ownCard.value, ...READY_PALETTES])

  // Picked: saved into global.json; the glow of «Неон» becomes the
  // palette's own (the «Стиль сайту» menu can change it after).
  async function choose (id: string) {
    if (saving.value || (current.value ?? '') === id) {
      return
    }
    saving.value = id
    try {
      const settings = await ajaxStore.getGlobalSettings()
      await ajaxStore.saveGlobalSettings({
        ...settings,
        readyPalette: id || undefined,
        neonGlow: id ? READY_GLOW_KEY : undefined,
      }, { publish: true })
      current.value = id || null
      await siteStyle.reloadGlow()
      await refreshEditedPalette()
    } finally {
      saving.value = null
    }
  }

  function mockStyle (palette: ReadyPalette, neon: boolean): Record<string, string> {
    const d = palette.day
    const n = palette.night
    return neon
      ? { '--p-bg': n.bg, '--p-bg2': n.bg2, '--p-text': n.text, '--p-heading': n.text, '--p-muted': n.muted, '--p-primary': n.primary, '--p-secondary': n.secondary, '--p-bar': n.bg, '--p-card': 'transparent', '--p-line': n.glow, '--p-section': 'transparent', '--p-glow': n.glow }
      : { '--p-bg': d.bg, '--p-bg2': d.bg, '--p-text': d.text, '--p-heading': d.heading, '--p-muted': d.muted, '--p-primary': d.primary, '--p-secondary': d.secondary, '--p-bar': '#FFFFFF', '--p-card': '#FFFFFF', '--p-line': d.tint, '--p-section': d.secondary, '--p-glow': d.secondary }
  }

  function nameOf (id: string): string {
    return id ? t(`readyPalettes.palettes.${id}.name`) : t('readyPalettes.own.name')
  }
  function forOf (id: string): string {
    return id ? t(`readyPalettes.palettes.${id}.for`) : t('readyPalettes.own.for')
  }
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" :title="t('readyPalettes.title')" />

      <p class="ready-hint">{{ t('readyPalettes.hint') }}</p>

      <v-progress-linear v-if="loading" color="primary" indeterminate />

      <div v-else class="ready-list">
        <section
          v-for="palette of cards"
          :key="palette.id"
          :class="['ready-card', { 'ready-card--current': (current ?? '') === palette.id }]"
        >
          <div class="ready-card-head">
            <div class="ready-card-title">
              <h2>{{ nameOf(palette.id) }}</h2>
              <p>{{ forOf(palette.id) }}</p>
            </div>
            <v-btn
              v-if="(current ?? '') !== palette.id"
              color="primary"
              :loading="saving === palette.id"
              variant="flat"
              @click="choose(palette.id)"
            >
              {{ t('readyPalettes.choose') }}
            </v-btn>
            <span v-else class="ready-chosen"><v-icon icon="mdi-check" size="18" /> {{ t('readyPalettes.chosen') }}</span>
          </div>

          <div class="ready-pair">
            <div v-for="neon of [false, true]" :key="String(neon)">
              <p class="ready-tag">{{ neon ? t('readyPalettes.night') : t('readyPalettes.day') }}</p>
              <div :class="['ready-mock', { 'ready-mock--neon': neon }]" :style="mockStyle(palette, neon)">
                <div class="ready-mock-bar"><i class="ready-mock-logo" /><span>{{ t('readyPalettes.mock.menu1') }}</span><span>{{ t('readyPalettes.mock.menu2') }}</span></div>
                <div class="ready-mock-body">
                  <p class="ready-mock-h">{{ t('readyPalettes.mock.heading') }}</p>
                  <p class="ready-mock-p">{{ t('readyPalettes.mock.text') }}</p>
                  <div class="ready-mock-btns">
                    <span class="ready-btn ready-btn--main">{{ t('readyPalettes.mock.order') }}</span>
                    <span class="ready-btn ready-btn--line">{{ t('readyPalettes.mock.more') }}</span>
                  </div>
                  <div class="ready-mock-row">
                    <div class="ready-mock-card"><b>{{ t('readyPalettes.mock.card1') }}</b></div>
                    <div class="ready-mock-card"><b>{{ t('readyPalettes.mock.card2') }}</b></div>
                  </div>
                  <div class="ready-mock-section">{{ t('readyPalettes.mock.section') }}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.ready-hint {
  max-width: 900px;
  margin: 0 0 20px;
  font-size: 0.9rem;
  color: #7A8699;
}
.ready-list {
  display: grid;
  gap: 16px;
  padding-bottom: 32px;
}
.ready-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid #DCE4EA;
  border-radius: 16px;
  background: #FFFFFF;
}
.ready-card--current {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}
.ready-card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.ready-card-title {
  min-width: 0;
}
.ready-card-title h2 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}
.ready-card-title p {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: #7A8699;
}
.ready-chosen {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}
.ready-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 720px) {
  .ready-pair {
    grid-template-columns: 1fr;
  }
}
.ready-tag {
  margin: 0 0 6px;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8699;
}

/* the little page - every colour from the card's own variables */
.ready-mock {
  overflow: hidden;
  border: 1px solid #DCE4EA;
  border-radius: 14px;
  background: var(--p-bg);
  color: var(--p-text);
}
.ready-mock-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--p-bar);
  color: var(--p-text);
  font-size: 12px;
}
.ready-mock-logo {
  flex: none;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  background: var(--p-primary);
}
.ready-mock-bar span:last-child {
  margin-left: auto;
}
.ready-mock-body {
  display: grid;
  gap: 10px;
  padding: 16px 14px 18px;
}
.ready-mock-h {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--p-heading);
}
.ready-mock-p {
  margin: 0;
  font-size: 12.5px;
  color: var(--p-muted);
}
.ready-mock-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ready-btn {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
}
.ready-btn--main {
  background: var(--p-primary);
  color: #FFFFFF;
}
.ready-btn--line {
  border: 1px solid var(--p-secondary);
  color: var(--p-secondary);
}
.ready-mock-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.ready-mock-card {
  padding: 10px;
  border: 1px solid var(--p-line);
  border-radius: 10px;
  background: var(--p-card);
  font-size: 12.5px;
  color: var(--p-heading);
}
.ready-mock-section {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--p-section);
  color: #FFFFFF;
  font-size: 12.5px;
}

/* «Неон»: the night, glass and glow instead of fills */
.ready-mock--neon {
  background: linear-gradient(160deg, var(--p-bg) 0%, var(--p-bg2) 100%);
}
.ready-mock--neon .ready-mock-bar {
  border-bottom: 1px solid color-mix(in srgb, var(--p-glow) 70%, transparent);
  box-shadow: 0 0 4px color-mix(in srgb, var(--p-glow) 55%, transparent), 0 6px 18px color-mix(in srgb, var(--p-glow) 20%, transparent);
}
.ready-mock--neon :is(.ready-mock-card, .ready-mock-section, .ready-btn) {
  border: 1px solid color-mix(in srgb, var(--p-glow) 75%, transparent);
  background: linear-gradient(160deg, rgb(255 255 255 / 0.1), transparent 45%), color-mix(in srgb, var(--p-bg) 62%, transparent);
  color: var(--p-text);
  box-shadow: 0 0 4px color-mix(in srgb, var(--p-glow) 70%, transparent), 0 0 16px color-mix(in srgb, var(--p-glow) 32%, transparent), inset 0 0 12px color-mix(in srgb, var(--p-glow) 16%, transparent);
}
</style>
