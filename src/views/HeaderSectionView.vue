<script lang="ts" setup>
  import type { MenuTheme, TitlePosition } from '@/configs/header-layout'
  import type { GlobalSettingsModel } from '@/types/GlobalSettingsModel'
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import { resolveHeaderSettings } from '@/configs/header-layout'
  import { HERO_VARIANTS, resolveHeroVariant } from '@/configs/hero-variants'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { useCommonStore } from '@/stores/common'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { openPreview, pagePreviewUrl, refreshPreviewIfOpen } from '@/utils/preview-window'

  // "Верхня частина сторінки": which layout the top of the site uses
  // (global.json heroVariant), that layout's own settings (global.json
  // header - see configs/header-layout.ts), and a live preview.
  //
  // The preview is the preview app itself in a frame, showing the home page:
  // the menu bar is part of the layout, and only that app draws it as the
  // site does. Every choice is sent into the frame as it is made, and also
  // kept as a draft in the local database - which is what the preview tab
  // ("Відкрити превʼю") reads - so the chosen layout shows there too before
  // "Зберегти", the same way page edits do.
  const ajaxStore = useAjaxStore()
  const commonStore = useCommonStore()
  const feedback = useUiFeedbackStore()

  const settings = ref<GlobalSettingsModel | null>(null)
  const loading = ref(true)
  const saving = ref(false)
  const dirty = ref(false)

  const selected = computed(() => resolveHeroVariant(settings.value?.heroVariant))
  const header = computed(() => resolveHeaderSettings(settings.value?.header))
  const selectedVariant = computed(() => HERO_VARIANTS.find(variant => variant.id === selected.value))

  onMounted(async () => {
    const [stored, hasDraft] = await Promise.all([
      ajaxStore.getGlobalSettings(),
      ajaxStore.isGlobalSettingsUpdated(),
    ])
    settings.value = stored
    dirty.value = hasDraft
    loading.value = false
  })

  // A draft, not a publish: what "Зберегти" does is still separate.
  async function saveDraft () {
    if (!settings.value) return
    dirty.value = true
    await ajaxStore.saveGlobalSettings(settings.value, { publish: false })
    refreshPreviewIfOpen()
  }

  function openPreviewTab () {
    openPreview(previewUrl.value)
  }

  function select (id: number) {
    if (!settings.value || selected.value === id) {
      return
    }
    settings.value.heroVariant = id
    void saveDraft()
  }

  function setTitlePosition (value: TitlePosition) {
    if (!settings.value || header.value.titlePosition === value) return
    settings.value.header = { ...header.value, titlePosition: value }
    void saveDraft()
  }
  function setMenuTheme (value: MenuTheme) {
    if (!settings.value || header.value.menuTheme === value) return
    settings.value.header = { ...header.value, menuTheme: value }
    void saveDraft()
  }

  async function save () {
    if (!settings.value) return
    saving.value = true
    try {
      await ajaxStore.saveGlobalSettings(settings.value, { publish: true })
      dirty.value = false
      refreshPreviewIfOpen()
    } finally {
      saving.value = false
    }
  }

  async function undo () {
    settings.value = await ajaxStore.undoGlobalSettings()
    dirty.value = false
    refreshPreviewIfOpen()
    feedback.notifySuccess(t('popups.undoDone'))
  }

  // Corners of the banner, in the order they sit on screen (2 x 2 grid).
  const CORNERS: { value: TitlePosition, icon: string, label: string }[] = [
    { value: 'top-left', icon: 'mdi-arrow-top-left', label: 'Вгорі ліворуч' },
    { value: 'top-right', icon: 'mdi-arrow-top-right', label: 'Вгорі праворуч' },
    { value: 'bottom-left', icon: 'mdi-arrow-bottom-left', label: 'Внизу ліворуч' },
    { value: 'bottom-right', icon: 'mdi-arrow-bottom-right', label: 'Внизу праворуч' },
  ]
  const MENU_THEMES: { value: MenuTheme, label: string }[] = [
    { value: 'dark', label: 'Чорна' },
    { value: 'light', label: 'Біла' },
  ]

  // --- live preview -------------------------------------------------------

  const frame = ref<HTMLIFrameElement | null>(null)
  const frameBox = ref<HTMLElement | null>(null)
  const device = ref<'desktop' | 'phone'>('desktop')
  const previewUrl = computed(() => pagePreviewUrl('home-page', commonStore.locale))

  // The site is drawn at a real screen width and scaled down to fit: a
  // desktop drawn at the editor's own column width would already be the
  // narrow, hamburger-menu version of the site.
  const FRAME_SIZES = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 760 } }
  const boxWidth = ref(0)
  const frameSize = computed(() => FRAME_SIZES[device.value])
  const scale = computed(() => (boxWidth.value > 0 ? Math.min(1, boxWidth.value / frameSize.value.width) : 1))
  const frameStyle = computed(() => ({
    width: `${frameSize.value.width}px`,
    height: `${frameSize.value.height}px`,
    transform: `scale(${scale.value})`,
  }))
  const stageStyle = computed(() => ({
    width: `${Math.round(frameSize.value.width * scale.value)}px`,
    height: `${Math.round(frameSize.value.height * scale.value)}px`,
  }))

  let resizeObserver: ResizeObserver | null = null
  watch(frameBox, element => {
    resizeObserver?.disconnect()
    if (!element) return
    resizeObserver = new ResizeObserver(([entry]) => {
      boxWidth.value = entry?.contentRect.width ?? 0
    })
    resizeObserver.observe(element)
  })

  // Plain values only: a reactive proxy cannot be posted to another window.
  function sendToPreview () {
    frame.value?.contentWindow?.postMessage({
      type: 'sve:header-settings',
      settings: { heroVariant: selected.value, header: { ...header.value } },
    }, location.origin)
  }
  watch([selected, header], sendToPreview)

  // The frame says when its own (saved) settings are in; the unsaved ones
  // go over them from here.
  function onPreviewMessage (event: MessageEvent) {
    if (event.origin === location.origin && event.source === frame.value?.contentWindow && event.data?.type === 'sve:preview-ready') {
      sendToPreview()
    }
  }
  window.addEventListener('message', onPreviewMessage)
  onBeforeUnmount(() => {
    window.removeEventListener('message', onPreviewMessage)
    resizeObserver?.disconnect()
  })
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" title="Верхня частина сторінки" />

      <p class="text-body-2 text-medium-emphasis mb-6">
        Макет верхньої частини сторінок, для яких її увімкнено в налаштуваннях
        сторінки. Назва компанії, логотип і банер беруться із загальних
        налаштувань, кольори й шрифти — з UI Kit.
      </p>

      <v-progress-linear v-if="loading" color="primary" indeterminate />

      <template v-else-if="settings">
        <div class="hero-variants">
          <button
            v-for="variant of HERO_VARIANTS"
            :key="variant.id"
            class="hero-variant"
            :class="{ 'hero-variant--selected': selected === variant.id }"
            type="button"
            @click="select(variant.id)"
          >
            <span class="hero-variant-title">
              <v-icon :color="selected === variant.id ? 'primary' : undefined" size="20">
                {{ selected === variant.id ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}
              </v-icon>
              {{ variant.title }}
            </span>
            <span class="hero-variant-hint">{{ variant.description }}</span>
          </button>
        </div>

        <!-- Settings of the chosen layout, when it has any. -->
        <div v-if="selectedVariant?.configurable" class="hero-settings">
          <div>
            <p class="hero-setting-label">Назва компанії</p>
            <div class="corner-picker">
              <v-btn
                v-for="corner of CORNERS"
                :key="corner.value"
                :active="header.titlePosition === corner.value"
                :aria-label="corner.label"
                color="primary"
                size="small"
                variant="outlined"
                @click="setTitlePosition(corner.value)"
              >
                <v-icon>{{ corner.icon }}</v-icon>
                <v-tooltip activator="parent" location="top">{{ corner.label }}</v-tooltip>
              </v-btn>
            </div>
          </div>

          <div>
            <p class="hero-setting-label">Смуга меню</p>
            <v-btn-toggle
              color="primary"
              density="comfortable"
              mandatory
              :model-value="header.menuTheme"
              variant="outlined"
              @update:model-value="setMenuTheme"
            >
              <v-btn v-for="theme of MENU_THEMES" :key="theme.value" :value="theme.value">
                <span class="menu-theme-swatch" :class="`menu-theme-swatch--${theme.value}`" />
                {{ theme.label }}
              </v-btn>
            </v-btn-toggle>
            <p class="hero-setting-hint">Тексти, рамки й іконки на смузі змінюють колір разом із нею.</p>
          </div>
        </div>

        <div class="hero-preview-head">
          <p class="hero-setting-label mb-0">Превʼю головної сторінки</p>
          <v-btn-toggle v-model="device" color="primary" density="compact" mandatory variant="outlined">
            <v-btn prepend-icon="mdi-monitor" size="small" value="desktop">Десктоп</v-btn>
            <v-btn prepend-icon="mdi-cellphone" size="small" value="phone">Телефон</v-btn>
          </v-btn-toggle>
        </div>
        <div ref="frameBox" class="hero-preview">
          <div class="hero-preview-stage" :style="stageStyle">
            <iframe
              ref="frame"
              class="hero-preview-frame"
              :src="previewUrl"
              :style="frameStyle"
              title="Превʼю головної сторінки"
            />
          </div>
        </div>

        <EditorSaveBar :dirty="dirty" :loading="saving" @click="save" @undo="undo">
          <template #prepend>
            <v-btn
              color="secondary"
              prepend-icon="mdi-open-in-new"
              size="large"
              variant="outlined"
              @click="openPreviewTab"
            >
              Відкрити превʼю
            </v-btn>
          </template>
        </EditorSaveBar>
      </template>
    </v-main>
  </v-app>
</template>

<style scoped>
.hero-variants {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.hero-variant {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: start;
  border: solid 2px transparent;
  border-radius: 12px;
  padding: 16px;
  background: #f7f9fb;
  cursor: pointer;
}
/* The chosen one is stated, not implied. */
.hero-variant--selected {
  border-color: #5C7A99;
}
.hero-variant-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.hero-variant-hint {
  font-size: 0.85rem;
  color: #7A8699;
  padding-inline-start: 28px;
}

.hero-settings {
  display: flex;
  flex-wrap: wrap;
  gap: 24px 48px;
  margin-bottom: 24px;
}
.hero-setting-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #3A4A58;
  margin-bottom: 8px;
}
.hero-setting-hint {
  font-size: 0.8rem;
  color: #7A8699;
  margin: 6px 0 0;
  max-width: 320px;
}
.corner-picker {
  display: grid;
  grid-template-columns: repeat(2, max-content);
  gap: 8px;
}
.menu-theme-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  margin-inline-end: 8px;
  border: solid 1px #A3ACC8;
}
/* The site palette's own --black and --white, which the menu bar uses. */
.menu-theme-swatch--dark {
  background: var(--black, #111827);
}
.menu-theme-swatch--light {
  background: var(--white, #FFFFFF);
}

.hero-preview-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.hero-preview {
  display: flex;
  justify-content: center;
  border-radius: 12px;
  background: #f7f9fb;
  margin-bottom: 24px;
  overflow: hidden;
}
.hero-preview-stage {
  overflow: hidden;
}
.hero-preview-frame {
  display: block;
  border: 0;
  transform-origin: top left;
  background: #fff;
}
</style>
