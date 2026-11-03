<script lang="ts" setup>
  import { onMounted, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import CssEditor from '@/components/special/CssEditor.vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import { styleFileTitle } from '@/configs/style-file-titles'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { refreshPreviewIfOpen } from '@/utils/preview-window'

  const route = useRoute()
  const ajaxStore = useAjaxStore()
  const feedback = useUiFeedbackStore()
  const fileName = route.params.name as string

  const content = ref('')
  const loading = ref(true)
  const error = ref(false)
  const saving = ref(false)
  const undoing = ref(false)
  const dirty = ref(false)

  onMounted(async () => {
    try {
      const loaded = await ajaxStore.getStyleFile(fileName)
      skipNextAutoSave = true
      content.value = loaded ?? ''
      dirty.value = await ajaxStore.isStyleFileUpdated(fileName)
    } catch {
      error.value = true
    } finally {
      loading.value = false
    }
  })

  async function save () {
    saving.value = true
    try {
      // Reported centrally by the store - see ajax.ts's reportSaved /
      // reportSaveFailed.
      await ajaxStore.saveStyleFile(fileName, content.value, { publish: true })
      dirty.value = false
      refreshPreviewIfOpen()
    } finally {
      saving.value = false
    }
  }

  async function undo () {
    undoing.value = true
    try {
      skipNextAutoSave = true
      content.value = await ajaxStore.undoStyleFile(fileName)
      dirty.value = false
      refreshPreviewIfOpen()
    } catch (error) {
      // undoStyleFile now rejects instead of silently saving HTML fetched in
      // place of real CSS (see db/worker.ts's own "looksLikeHtml" check) -
      // this needs to actually reach the user, not just the console, since
      // it means the public/ file itself is missing or unreachable.
      feedback.notifyError(
        t('popups.undoFailed'),
        error instanceof Error ? error.message : undefined,
      )
    } finally {
      undoing.value = false
    }
  }

  // Every edit lands in IndexedDB automatically (debounced) - see
  // EditorView.vue for the same pattern applied to page content.
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  let skipNextAutoSave = false
  watch(content, () => {
    if (skipNextAutoSave) {
      skipNextAutoSave = false
      return
    }
    if (loading.value) return
    dirty.value = true
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null
      ajaxStore.saveStyleFile(fileName, content.value, { publish: false })
    }, 800)
  })
</script>

<template>
  <v-app>
    <v-main>
      <EditorPageHeader
        back-to="/styles"
        :detail="styleFileTitle(fileName)"
        standalone
        :title="fileName"
      />
      <v-container class="default-text text-medium">

        <v-progress-linear v-if="loading" color="primary" indeterminate />
        <v-alert v-else-if="error" type="error" variant="tonal">
          {{ t('styleFiles.loadFailed') }}
        </v-alert>
        <CssEditor v-else v-model="content" />

        <EditorSaveBar
          v-if="!loading && !error"
          :dirty="dirty"
          :loading="saving"
          undoable
          :undoing="undoing"
          @click="save"
          @undo="undo"
        />
      </v-container>
    </v-main>

  </v-app>
</template>
