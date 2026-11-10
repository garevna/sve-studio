<script lang="ts" setup>
  import type { EditorMode } from '@/composables/useEditorMode'
  import type { SeoSettingsModel } from '@/types/SeoSettingsModel'
  import { computed, onMounted, ref, watch } from 'vue'
  import ImageEditor from '@/components/editors/ImageEditor.vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import { provideEditorMode } from '@/composables/useEditorMode'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { readImageFile } from '@/utils/read-image-file'

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

  // The same picture control as everywhere else (ImageEditor); the file
  // stays inside seo.json, like the pictures of the general settings.
  provideEditorMode(computed<EditorMode>(() => 'edit'))
  const ogImageBox = ref(200)
  async function readOgImage (file: File): Promise<string> {
    try {
      return (await readImageFile(file)).dataUrl
    } catch (error) {
      feedback.notifyError(t('popups.imageUploadFailed'), error instanceof Error ? error.message : String(error))
      throw error
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
          {{ t('seo.intro') }}
        </p>

        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="settings.siteName"
              :hint="t('seo.siteNameHint')"
              :label="t('seo.siteName')"
              persistent-hint
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="settings.titleTemplate"
              :hint="t('seo.titleTemplateHint')"
              :label="t('seo.titleTemplate')"
              persistent-hint
              variant="outlined"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="settings.defaultTitle"
              :hint="t('seo.defaultTitleHint')"
              :label="t('seo.defaultTitle')"
              persistent-hint
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="settings.defaultDescription"
              :counter="160"
              :hint="t('seo.defaultDescriptionHint')"
              :label="t('seo.defaultDescription')"
              persistent-hint
              variant="outlined"
            />
          </v-col>
        </v-row>

        <h2 class="editor-section-title">{{ t('seo.defaultImage') }}</h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          {{ t('seo.defaultImageHint') }}
        </p>
        <div class="og-image">
          <ImageEditor v-model:height="ogImageBox" v-model:src="settings.defaultOgImage" fit="contain" :read="readOgImage" />
        </div>

        <h2 class="editor-section-title">Google Search Console</h2>
        <v-row>
          <v-col cols="12" md="8">
            <v-text-field
              v-model="settings.googleSiteVerification"
              :hint="t('seo.verificationHint')"
              :label="t('seo.verification')"
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
        {{ t('seo.loadFailed') }}
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
  /* 1200×630 is the shape social networks show. */
  .og-image {
    width: 380px;
    max-width: 100%;
  }
</style>
