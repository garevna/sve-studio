<script lang="ts" setup>
  import type { Banner, GlobalSettingsModel } from '@/types/GlobalSettingsModel'
  import { computed, onMounted, ref, watch } from 'vue'
  import ImageEditor from '@/components/editors/ImageEditor.vue'
  import BannerTextsEditor from '@/components/special/BannerTextsEditor.vue'
  import ContactsSettings from '@/components/special/ContactsSettings.vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import FontSpecField from '@/components/special/FontSpecField.vue'
  import { provideEditorMode } from '@/composables/useEditorMode'
  import { setSiteContacts } from '@/composables/useSiteContacts'
  import { SOCIAL_NETWORK_LABELS, SOCIAL_NETWORKS } from '@/configs/social-networks'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { useCommonStore } from '@/stores/common'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { defaultSiteLocale, isLocaleCode, localeDisplayName, setSiteLocales, siteLocales } from '@/utils/locale-text'
  import { readImageFile } from '@/utils/read-image-file'
  import { accentFontsOf, applyThemeFonts } from '@/utils/theme-fonts'

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

  // The extra fonts as a list (global.json accentFonts; the older single
  // accentFont is folded into it on the first change).
  const accentFonts = computed(() => accentFontsOf(settings.value))
  function setAccentFonts (list: string[]) {
    if (!settings.value) return
    settings.value.accentFonts = list
    delete settings.value.accentFont
  }
  function setAccentFont (index: number, value: string) {
    setAccentFonts(accentFonts.value.map((font, at) => at === index ? value : font))
  }
  function removeAccentFont (index: number) {
    setAccentFonts(accentFonts.value.filter((_, at) => at !== index))
  }
  function addAccentFont () {
    setAccentFonts([...accentFonts.value, ''])
  }

  watch(() => [settings.value?.font, settings.value?.accentFont, settings.value?.accentFonts], () => {
    if (fontTimer) clearTimeout(fontTimer)
    fontTimer = setTimeout(() => {
      fontTimer = null
      applyThemeFonts(settings.value)
    }, 600)
  }, { deep: true })

  const contactsModel = computed({
    get: () => settings.value?.contacts ?? [],
    set: value => {
      if (settings.value) settings.value.contacts = value
    },
  })
  // Every contact line in the editor follows an edit here at once.
  watch(() => settings.value?.contacts, list => setSiteContacts(list), { deep: true })

  onMounted(async () => {
    const loaded = await ajaxStore.getGlobalSettings()
    skipNextAutoSave = true
    settings.value = loaded
    dirty.value = await ajaxStore.isGlobalSettingsUpdated()
    loading.value = false
  })

  // The pictures here are edited the way pictures are everywhere in the
  // editor (ImageEditor: the picture itself, a camera button to replace it),
  // but kept inside global.json rather than uploaded.
  provideEditorMode(computed(() => 'edit'))
  const logoBox = ref(120)
  const bannerBox = ref(200)
  async function readLogo (file: File): Promise<string> {
    try {
      const { dataUrl, width, height } = await readImageFile(file)
      if (settings.value) settings.value.logo = { src: dataUrl, width, height }
      return dataUrl
    } catch (error) {
      feedback.notifyError(t('popups.logoUploadFailed'), error instanceof Error ? error.message : String(error))
      throw error
    }
  }
  async function readBanner (file: File): Promise<string> {
    try {
      return (await readImageFile(file)).dataUrl
    } catch (error) {
      feedback.notifyError(t('popups.bannerUploadFailed'), error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  // More banners after the main one: with any, layout 1 of the top of the
  // site turns into a carousel (global.json banerSlides).
  const slideInput = ref<HTMLInputElement | null>(null)
  async function addSlide (event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file || !settings.value) return
    try {
      const dataUrl = await readBanner(file)
      settings.value.banerSlides = [...(settings.value.banerSlides ?? []), { desktop: dataUrl, mobile: '' }]
    } catch {
      // Already reported.
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
  // The banner whose texts are being edited (BannerTextsEditor).
  const textsOf = ref<Banner | null>(null)
  const textsOpen = computed({
    get: () => textsOf.value !== null,
    set: value => {
      if (!value) textsOf.value = null
    },
  })

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
      <EditorPageHeader back-to="/" detail="global.json" :title="t('common.generalSettings')" />

      <v-progress-linear v-if="loading" color="primary" indeterminate />

      <template v-else-if="settings">
        <v-row>
          <v-col cols="12">
            <v-text-field
              v-model="settings.provider"
              :label="t('common.companyName')"
              variant="outlined"
            />
          </v-col>
        </v-row>

        <template v-if="advancedFields">
          <h2 class="editor-section-title">{{ t('fonts.title') }}</h2>
          <p class="editor-section-hint">{{ t('fonts.hint') }}</p>
          <v-row>
            <v-col cols="12" md="6">
              <FontSpecField v-model="settings.font" :label="t('fonts.main')" />
            </v-col>
            <v-col v-for="(font, index) of accentFonts" :key="index" cols="12" md="6">
              <FontSpecField
                :label="t('fonts.extra', { n: index + 1 })"
                :model-value="font"
                removable
                @remove="removeAccentFont(index)"
                @update:model-value="(value: string) => setAccentFont(index, value)"
              />
            </v-col>
            <v-col class="d-flex align-start" cols="12" md="6">
              <v-btn prepend-icon="mdi-plus" variant="outlined" @click="addAccentFont">{{ t('fonts.add') }}</v-btn>
            </v-col>
          </v-row>
        </template>

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

        <h2 class="editor-section-title">{{ t('common.logo') }}</h2>
        <v-row align="center">
          <v-col cols="12" md="auto">
            <div class="settings-logo">
              <ImageEditor v-model:height="logoBox" v-model:src="settings.logo.src" fit="contain" :read="readLogo" />
            </div>
          </v-col>
          <v-col v-if="settings.logo.src" class="d-flex flex-wrap align-center ga-4" cols="12" md="auto">
            <v-text-field
              v-model.number="settings.logo.width"
              density="compact"
              hide-details
              :label="t('generalSettings.width')"
              style="max-width: 140px;"
              type="number"
              variant="outlined"
            />
            <v-text-field
              v-model.number="settings.logo.height"
              density="compact"
              hide-details
              :label="t('generalSettings.height')"
              style="max-width: 140px;"
              type="number"
              variant="outlined"
            />
          </v-col>
        </v-row>

        <h2 class="editor-section-title">{{ t('common.contacts') }}</h2>
        <p class="editor-section-hint">{{ t('contacts.hint') }}</p>
        <ContactsSettings v-model="contactsModel" class="mb-4" />

        <h2 class="editor-section-title">{{ t('generalSettings.social') }}</h2>
        <!-- <p class="editor-section-hint">
          {{ t('generalSettings.socialHint') }}
        </p> -->
        <p class="editor-section-hint">
          {{ t('generalSettings.socialHint2') }}
        </p>
        <v-row>
          <v-col v-for="name in SOCIAL_NETWORKS" :key="name" cols="12" md="4">
            <v-text-field
              v-model="settings.links[name]"
              density="compact"
              hide-details
              :label="SOCIAL_NETWORK_LABELS[name]"
              placeholder="https://..."
              variant="outlined"
            />
          </v-col>
        </v-row>

        <h2 class="editor-section-title">{{ t('generalSettings.heroBanner') }}</h2>
        <v-row>
          <v-col cols="12" md="6">
            <p class="settings-image-label">{{ t('generalSettings.bannerDesktop') }}</p>
            <ImageEditor v-model:height="bannerBox" v-model:src="settings.baner.desktop" :read="readBanner" />
          </v-col>
          <v-col cols="12" md="6">
            <p class="settings-image-label">{{ t('generalSettings.bannerMobile') }}</p>
            <ImageEditor v-model:height="bannerBox" v-model:src="settings.baner.mobile" :read="readBanner" />
          </v-col>
        </v-row>
        <v-btn class="mt-2" prepend-icon="mdi-format-text" variant="tonal" @click="textsOf = settings.baner">
          {{ t('generalSettings.bannerTexts', { n: settings.baner.texts?.length ?? 0 }) }}
        </v-btn>

        <h3 class="banner-slides-title">{{ t('generalSettings.slides') }}</h3>
        <p class="text-body-2 text-medium-emphasis mb-3">{{ t('generalSettings.slidesHint') }}</p>
        <div class="banner-slides">
          <div v-for="(slide, index) of settings.banerSlides ?? []" :key="index" class="banner-slide">
            <div class="banner-slide-pictures">
              <label class="banner-slide-picture">
                <img v-if="slide.desktop" alt="" :src="slide.desktop">
                <span class="banner-slide-caption"><v-icon size="16">mdi-monitor</v-icon> {{ t('common.desktop') }}</span>
                <input accept="image/*" hidden type="file" @change="replaceSlide(index, 'desktop', $event)">
              </label>
              <label class="banner-slide-picture banner-slide-picture--phone">
                <img v-if="slide.mobile" alt="" :src="slide.mobile">
                <span class="banner-slide-caption"><v-icon size="16">mdi-cellphone</v-icon> {{ slide.mobile ? t('generalSettings.slidePhone') : t('generalSettings.slidePhoneAdd') }}</span>
                <input accept="image/*" hidden type="file" @change="replaceSlide(index, 'mobile', $event)">
              </label>
            </div>
            <v-btn
              :aria-label="t('generalSettings.bannerTexts', { n: slide.texts?.length ?? 0 })"
              icon="mdi-format-text"
              size="small"
              variant="text"
              @click="textsOf = slide"
            />
            <v-btn
              :aria-label="t('generalSettings.slideRemove')"
              color="error"
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              @click="removeSlide(index)"
            />
          </div>
          <div>
            <v-btn prepend-icon="mdi-plus" variant="outlined" @click="slideInput?.click()">{{ t('generalSettings.slideAdd') }}</v-btn>
            <input
              ref="slideInput"
              accept="image/*"
              hidden
              type="file"
              @change="addSlide"
            >
          </div>
        </div>

        <BannerTextsEditor v-if="textsOf" v-model="textsOpen" v-model:texts="textsOf.texts" :banner="textsOf" />

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
  .settings-logo {
    width: 240px;
    max-width: 100%;
  }
  .settings-image-label {
    margin: 0 0 6px;
    font-size: 0.85rem;
    color: #3a4a58;
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
</style>
