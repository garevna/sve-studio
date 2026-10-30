<script lang="ts" setup>
  import type { SeoSettingsModel } from '@/types/SeoSettingsModel'
  import { onMounted, ref, watch } from 'vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import { useAjaxStore } from '@/stores/ajax'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { readImageFile } from '@/utils/read-image-file'
  import { t } from '@/i18n'

  const ajaxStore = useAjaxStore()
  const feedback = useUiFeedbackStore()

  const settings = ref<SeoSettingsModel | null>(null)
  const loading = ref(true)
  const saving = ref(false)
  const undoing = ref(false)
  const dirty = ref(false)

  // Same autosave-into-IndexedDB pattern as GeneralSettingsView.vue.
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
      if (settings.value) ajaxStore.saveSeoSettings(settings.value, { publish: false })
    }, 800)
  }, { deep: true })

  onMounted(async () => {
    const loaded = await ajaxStore.getSeoSettings()
    skipNextAutoSave = true
    settings.value = loaded
    dirty.value = await ajaxStore.isSeoSettingsUpdated()
    loading.value = false
  })

  function pickFile (value: File | File[] | null): File | null {
    return Array.isArray(value) ? value[0] ?? null : value
  }

  async function onOgImageChange (value: File | File[] | null) {
    const file = pickFile(value)
    if (!file || !settings.value) return
    try {
      const { dataUrl } = await readImageFile(file)
      settings.value.defaultOgImage = dataUrl
    } catch (error) {
      feedback.notifyError(t('popups.imageUploadFailed'), error instanceof Error ? error.message : String(error))
    }
  }

  async function save () {
    if (!settings.value) return
    saving.value = true
    try {
      // Reported centrally by the store - see ajax.ts's reportSaved /
      // reportSaveFailed. Nothing local to say here.
      await ajaxStore.saveSeoSettings(settings.value, { publish: true })
      dirty.value = false
    } finally {
      saving.value = false
    }
  }

  async function undo () {
    undoing.value = true
    try {
      skipNextAutoSave = true
      settings.value = await ajaxStore.undoSeoSettings()
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
      <EditorPageHeader back-to="/" detail="seo.json" title="SEO" />

      <v-progress-linear v-if="loading" color="primary" indeterminate />

      <template v-else-if="settings">
        <p class="text-body-2 text-medium-emphasis mb-6">
          Ці налаштування — типові значення для всього сайту. Для окремої
          сторінки їх можна перевизначити прямо в її редакторі (кнопка «SEO»
          у верхній панелі).
        </p>

        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="settings.siteName"
              hint="Назва сайту для соцмереж (og:site_name) - як буде підписана сторінка при пересиланні посилання"
              label="Назва сайту"
              persistent-hint
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="settings.titleTemplate"
              hint="%s замінюється на заголовок конкретної сторінки. Наприклад: «%s — Virtual Dimension»"
              label="Шаблон заголовка вкладки (&lt;title&gt;)"
              persistent-hint
              variant="outlined"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="settings.defaultTitle"
              hint="Заголовок для сторінок, у яких немає власного (наприклад, головна)"
              label="Заголовок за замовчуванням"
              persistent-hint
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="settings.defaultDescription"
              :counter="160"
              hint="Опис за замовчуванням для сторінок без власного. Оптимально - до 155-160 символів"
              label="Опис за замовчуванням (meta description)"
              persistent-hint
              variant="outlined"
            />
          </v-col>
        </v-row>

        <h2 class="editor-section-title">Зображення для соцмереж за замовчуванням</h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Показується при пересиланні посилання на сторінку, у якої немає
          власного зображення. Оптимальний розмір - 1200×630px.
        </p>
        <v-row align="center">
          <v-col cols="12" md="5">
            <v-file-upload
              accept="image/*"
              class="upload-dropzone"
              density="compact"
              title="Перетягніть зображення сюди або натисніть"
              @update:model-value="onOgImageChange"
            />
          </v-col>
          <v-col v-if="settings.defaultOgImage" cols="12" md="7">
            <img class="og-image-preview" :src="settings.defaultOgImage">
          </v-col>
        </v-row>

        <h2 class="editor-section-title">Google Search Console</h2>
        <v-row>
          <v-col cols="12" md="8">
            <v-text-field
              v-model="settings.googleSiteVerification"
              hint="Код підтвердження власності сайту з Google Search Console (метод «HTML-тег»). Порожнє поле - тег не додається"
              label="Код підтвердження (google-site-verification)"
              persistent-hint
              variant="outlined"
            />
          </v-col>
        </v-row>

        <EditorSaveBar
          :dirty="dirty"
          :loading="saving"
          :undoing="undoing"
          @click="save"
          @undo="undo"
        />
      </template>

      <v-alert v-else type="error" variant="tonal">
        Не вдалося завантажити налаштування SEO.
      </v-alert>
    </v-main>

  </v-app>
</template>

<style scoped>
  .editor-section-title {
    font-size: 1.05rem;
    font-weight: 600;
    margin: 24px 0 12px;
  }
  .upload-dropzone :deep(.v-file-upload-dropzone) {
    border: dashed 1px rgba(58, 74, 88, 0.3) !important;
    border-radius: 8px;
  }
  .og-image-preview {
    display: block;
    max-width: 100%;
    max-height: 200px;
    object-fit: contain;
    border: solid 1px rgba(58, 74, 88, 0.15);
    border-radius: 8px;
  }
</style>
