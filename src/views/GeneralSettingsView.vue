<script lang="ts" setup>
  import type { GlobalSettingsModel } from '@/types/GlobalSettingsModel'
  import { computed, onMounted, ref, watch } from 'vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { useCommonStore } from '@/stores/common'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { defaultSiteLocale, isLocaleCode, localeDisplayName, setSiteLocales, siteLocales } from '@/utils/locale-text'
  import { readImageFile } from '@/utils/read-image-file'
  import { applyThemeFonts } from '@/utils/theme-fonts'

  const ajaxStore = useAjaxStore()
  const feedback = useUiFeedbackStore()

  // The content-manager role sees only the parts of global.json that are
  // plainly the site owner's own data - company name, logo, social links,
  // hero banner. The font name (a Google Fonts string that silently falls
  // back to something else when misspelt) and the layout spacings are hidden
  // from it: both need judgement to get right and both are sitewide, so a
  // wrong value there is exactly the kind of damage the role split exists to
  // prevent. See configs/editor-roles.ts.
  const advancedFields = computed(() => useCommonStore().roleConfig.generalSettingsScope === 'full')

  const SOCIAL_NETWORKS = ['facebook', 'instagram', 'tiktok', 'whatsApp', 'viber', 'telegram'] as const

  const settings = ref<GlobalSettingsModel | null>(null)
  const loading = ref(true)
  const saving = ref(false)
  const undoing = ref(false)
  const dirty = ref(false)

  // Every edit lands in IndexedDB automatically (debounced) - see
  // EditorView.vue for the same pattern applied to page content.
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  let skipNextAutoSave = false
  watch(settings, () => {
    if (skipNextAutoSave) {
      skipNextAutoSave = false
      return
    }
    if (!settings.value) return
    dirty.value = true
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null
      if (settings.value) ajaxStore.saveGlobalSettings(settings.value, { publish: false })
    }, 800)
  }, { deep: true })

  // Fonts apply to the page right away (debounced, so typing a name doesn't
  // request every half-typed family from Google Fonts).
  let fontTimer: ReturnType<typeof setTimeout> | null = null
  // --- Site languages (global.json "locales" / "defaultLocale") ---
  // Offered in the picker (plus whatever the site already uses). Extend the
  // list to offer more.
  const COMMON_LOCALES = ['uk', 'en', 'de', 'pl', 'fr', 'es', 'it', 'pt', 'nl', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'sl', 'sr', 'lt', 'lv', 'et', 'fi', 'sv', 'no', 'da', 'el', 'tr', 'ka', 'kk', 'ru']
  const localeItems = computed(() => [...new Set([...COMMON_LOCALES, ...siteLocalesModel.value])]
    .map(code => ({ value: code, title: `${localeDisplayName(code)} (${code})` })))

  const siteLocalesModel = computed<string[]>({
    get: () => settings.value?.locales ?? siteLocales(),
    set: value => {
      if (!settings.value) return
      // Anything that isn't a language code is dropped, and at least one
      // language always stays.
      const clean = [...new Set(value.map(code => String(code).trim().toLowerCase()).filter(code => isLocaleCode(code)))]
      if (clean.length === 0) return
      settings.value.locales = clean
      if (!clean.includes(settings.value.defaultLocale ?? '')) {
        settings.value.defaultLocale = clean[0]
      }
    },
  })
  const defaultLocaleModel = computed<string>({
    get: () => settings.value?.defaultLocale ?? defaultSiteLocale(),
    set: value => {
      if (settings.value) settings.value.defaultLocale = value
    },
  })
  // The whole editor follows the change right away (language buttons,
  // missing-translation counters).
  watch(() => [settings.value?.locales, settings.value?.defaultLocale], () => {
    if (settings.value?.locales) {
      setSiteLocales(settings.value.locales, settings.value.defaultLocale)
    }
  }, { deep: true })

  watch(() => [settings.value?.font, settings.value?.accentFont], () => {
    if (fontTimer) clearTimeout(fontTimer)
    fontTimer = setTimeout(() => {
      fontTimer = null
      applyThemeFonts(settings.value)
    }, 600)
  })

  onMounted(async () => {
    const loaded = await ajaxStore.getGlobalSettings()
    skipNextAutoSave = true
    settings.value = loaded
    dirty.value = await ajaxStore.isGlobalSettingsUpdated()
    loading.value = false
  })

  function pickFile (value: File | File[] | null): File | null {
    return Array.isArray(value) ? value[0] ?? null : value
  }

  async function onLogoChange (value: File | File[] | null) {
    const file = pickFile(value)
    if (!file || !settings.value) return
    try {
      const { dataUrl, width, height } = await readImageFile(file)
      settings.value.logo = { src: dataUrl, width, height }
    } catch (error) {
      feedback.notifyError(t('popups.logoUploadFailed'), error instanceof Error ? error.message : String(error))
    }
  }

  async function onBannerChange (variant: 'desktop' | 'mobile', value: File | File[] | null) {
    const file = pickFile(value)
    if (!file || !settings.value) return
    try {
      const { dataUrl } = await readImageFile(file)
      settings.value.baner[variant] = dataUrl
    } catch (error) {
      feedback.notifyError(t('popups.bannerUploadFailed'), error instanceof Error ? error.message : String(error))
    }
  }

  // More banners after the main one: with any, layout 1 of the top of the
  // site turns into a carousel (global.json banerSlides).
  async function addSlide (value: File | File[] | null) {
    const file = pickFile(value)
    if (!file || !settings.value) return
    try {
      const { dataUrl } = await readImageFile(file)
      settings.value.banerSlides = [...(settings.value.banerSlides ?? []), { desktop: dataUrl, mobile: '' }]
    } catch (error) {
      feedback.notifyError(t('popups.bannerUploadFailed'), error instanceof Error ? error.message : String(error))
    }
  }
  async function replaceSlide (index: number, variant: 'desktop' | 'mobile', event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    const slide = settings.value?.banerSlides?.[index]
    if (!file || !slide) return
    try {
      const { dataUrl } = await readImageFile(file)
      slide[variant] = dataUrl
    } catch (error) {
      feedback.notifyError(t('popups.bannerUploadFailed'), error instanceof Error ? error.message : String(error))
    }
  }
  function removeSlide (index: number) {
    if (!settings.value?.banerSlides) return
    settings.value.banerSlides = settings.value.banerSlides.filter((_, i) => i !== index)
  }

  async function save () {
    if (!settings.value) return
    saving.value = true
    try {
      // Reported centrally by the store - see ajax.ts's reportSaved /
      // reportSaveFailed. Nothing local to say here.
      await ajaxStore.saveGlobalSettings(settings.value, { publish: true })
      dirty.value = false
    } finally {
      saving.value = false
    }
  }

  // Stored as Vuetify's own mt-N spacing unit (N x 4px - see
  // DynamicPageTemplate.vue's `mt-${pageContentMarginTop}` class), but
  // shown/edited here in real pixels - no reason to make the person editing
  // this know Vuetify's spacing scale when the conversion is this trivial.
  async function undo () {
    undoing.value = true
    try {
      skipNextAutoSave = true
      settings.value = await ajaxStore.undoGlobalSettings()
      dirty.value = false
      feedback.notifySuccess(t('popups.undoDone'))
    } catch {
      feedback.notifyError(t('popups.undoFailed'))
    } finally {
      undoing.value = false
    }
  }
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" detail="global.json" title="Загальні налаштування" />

      <v-progress-linear v-if="loading" color="primary" indeterminate />

      <template v-else-if="settings">
        <v-row>
          <v-col cols="12" :md="advancedFields ? 4 : 12">
            <v-text-field
              v-model="settings.provider"
              label="Назва компанії"
              variant="outlined"
            />
          </v-col>
          <v-col v-if="advancedFields" cols="12" md="4">
            <v-text-field
              v-model="settings.font"
              hint="Назва шрифту з Google Fonts. Якщо такого шрифту немає, браузер тихо відкотиться на запасний варіант."
              label="Основний шрифт (Google Fonts)"
              persistent-hint
              variant="outlined"
            />
          </v-col>
          <v-col v-if="advancedFields" cols="12" md="4">
            <v-text-field
              v-model="settings.accentFont"
              clearable
              hint="Для окремих текстів і заголовків: у меню формату тексту оберіть «Додатковий шрифт». Порожньо — скрізь основний."
              label="Додатковий шрифт (Google Fonts)"
              persistent-hint
              variant="outlined"
            />
          </v-col>
        </v-row>

        <h2 class="editor-section-title">{{ t('siteSettings.languages') }}</h2>
        <v-row>
          <v-col cols="12" md="8">
            <v-autocomplete
              v-model="siteLocalesModel"
              chips
              closable-chips
              :hint="t('siteSettings.languagesHint')"
              :items="localeItems"
              :label="t('siteSettings.languages')"
              multiple
              persistent-hint
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="defaultLocaleModel"
              :hint="t('siteSettings.defaultLanguageHint')"
              :items="siteLocalesModel.map(code => ({ value: code, title: localeDisplayName(code) }))"
              :label="t('siteSettings.defaultLanguage')"
              persistent-hint
              variant="outlined"
            />
          </v-col>
          <v-col class="pt-0" cols="12">
            <p class="text-caption text-medium-emphasis">{{ t('siteSettings.removedLanguageKept') }}</p>
          </v-col>
        </v-row>

        <h2 class="editor-section-title">Логотип</h2>
        <v-row align="center">
          <v-col cols="12" md="5">
            <v-file-upload
              accept="image/*"
              class="upload-dropzone"
              density="compact"
              title="Перетягніть логотип сюди або натисніть"
              @update:model-value="onLogoChange"
            />
          </v-col>
          <v-col v-if="settings.logo.src" class="d-flex flex-wrap align-center ga-4" cols="12" md="7">
            <img
              class="logo-preview"
              :height="settings.logo.height"
              :src="settings.logo.src"
              :width="settings.logo.width"
            >
            <v-text-field
              v-model.number="settings.logo.width"
              density="compact"
              hide-details
              label="Ширина, px"
              style="max-width: 140px;"
              type="number"
              variant="outlined"
            />
            <v-text-field
              v-model.number="settings.logo.height"
              density="compact"
              hide-details
              label="Висота, px"
              style="max-width: 140px;"
              type="number"
              variant="outlined"
            />
          </v-col>
        </v-row>

        <h2 class="editor-section-title">Соціальні мережі</h2>
        <!-- <p class="editor-section-hint">
          Посилання показуються в іконках соцмереж у футері (і будь-де ще, де вони використовуються) -
          єдине місце редагування для всього сайту, а не для окремого варіанту футера.
        </p> -->
        <p class="editor-section-hint">
          Посилання використовуються для переходу при натисканні на іконки соціальних мереж або месенджерів
        </p>
        <v-row>
          <v-col v-for="name in SOCIAL_NETWORKS" :key="name" cols="12" md="4">
            <v-text-field
              v-model="settings.links[name]"
              density="compact"
              hide-details
              :label="name"
              placeholder="https://..."
              variant="outlined"
            />
          </v-col>
        </v-row>

        <h2 class="editor-section-title">Банер hero-секції</h2>
        <v-row>
          <v-col cols="12" md="6">
            <v-file-upload
              accept="image/*"
              class="upload-dropzone"
              density="compact"
              title="Банер (десктоп)"
              @update:model-value="onBannerChange('desktop', $event)"
            />
            <img v-if="settings.baner.desktop" class="banner-preview mt-2" :src="settings.baner.desktop">
          </v-col>
          <v-col cols="12" md="6">
            <v-file-upload
              accept="image/*"
              class="upload-dropzone"
              density="compact"
              title="Банер (мобільна версія)"
              @update:model-value="onBannerChange('mobile', $event)"
            />
            <img v-if="settings.baner.mobile" class="banner-preview mt-2" :src="settings.baner.mobile">
          </v-col>
        </v-row>

        <h3 class="banner-slides-title">{{ t('generalSettings.slides') }}</h3>
        <p class="text-body-2 text-medium-emphasis mb-3">{{ t('generalSettings.slidesHint') }}</p>
        <div class="banner-slides">
          <div v-for="(slide, index) of settings.banerSlides ?? []" :key="index" class="banner-slide">
            <div class="banner-slide-pictures">
              <label class="banner-slide-picture">
                <img v-if="slide.desktop" alt="" :src="slide.desktop">
                <span class="banner-slide-caption"><v-icon size="16">mdi-monitor</v-icon> {{ t('generalSettings.slideDesktop') }}</span>
                <input accept="image/*" hidden type="file" @change="replaceSlide(index, 'desktop', $event)">
              </label>
              <label class="banner-slide-picture banner-slide-picture--phone">
                <img v-if="slide.mobile" alt="" :src="slide.mobile">
                <span class="banner-slide-caption"><v-icon size="16">mdi-cellphone</v-icon> {{ slide.mobile ? t('generalSettings.slidePhone') : t('generalSettings.slidePhoneAdd') }}</span>
                <input accept="image/*" hidden type="file" @change="replaceSlide(index, 'mobile', $event)">
              </label>
            </div>
            <v-btn
              :aria-label="t('generalSettings.slideRemove')"
              color="error"
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              @click="removeSlide(index)"
            />
          </div>
          <v-file-upload
            accept="image/*"
            class="upload-dropzone"
            density="compact"
            :title="t('generalSettings.slideAdd')"
            @update:model-value="addSlide($event)"
          />
        </div>

        <EditorSaveBar
          :dirty="dirty"
          :loading="saving"
          :undoing="undoing"
          @click="save"
          @undo="undo"
        />
      </template>
    </v-main>

  </v-app>
</template>

<style scoped>
  .editor-section-title {
    font-size: 1.05rem;
    font-weight: 600;
    margin: 24px 0 12px;
  }
  .editor-section-hint {
    font-size: 0.85rem;
    color: #7A8699;
    margin-bottom: 12px;
  }
  .upload-dropzone :deep(.v-file-upload-dropzone) {
    border: dashed 1px rgba(58, 74, 88, 0.3) !important;
    border-radius: 8px;
  }
  .logo-preview {
    max-width: 100%;
    max-height: 120px;
    object-fit: contain;
    border: solid 1px rgba(58, 74, 88, 0.15);
    border-radius: 8px;
  }
  .banner-slides-title {
    margin: 24px 0 4px;
    font-size: 1rem;
    font-weight: 600;
  }
  .banner-slides {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }
  .banner-slide {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px;
    border: solid 1px rgba(58, 74, 88, 0.15);
    border-radius: 12px;
  }
  .banner-slide-pictures {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
    gap: 8px;
    flex: 1;
    min-width: 0;
  }
  /* Click a picture to replace it. */
  .banner-slide-picture {
    position: relative;
    display: flex;
    align-items: flex-end;
    min-height: 96px;
    border-radius: 8px;
    overflow: hidden;
    background: #f2f5f8;
    cursor: pointer;
  }
  .banner-slide-picture img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .banner-slide-caption {
    position: relative;
    margin: 6px;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.9);
    font-size: 12px;
  }
  @media (max-width: 600px) {
    .banner-slide-pictures { grid-template-columns: minmax(0, 1fr); }
  }
  .banner-preview {
    display: block;
    max-width: 100%;
    max-height: 200px;
    object-fit: contain;
    border: solid 1px rgba(58, 74, 88, 0.15);
    border-radius: 8px;
  }
</style>
