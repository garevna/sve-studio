<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { t } from '@/i18n'

  const open = defineModel('open', { default: false })
  const src = defineModel('src')
  const imageData = ref<string | ArrayBuffer | null>(null)
  const updated = ref(false)

  watch(src, val => {
    if (!val) return
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      imageData.value = reader.result
      updated.value = true
    })
    reader.readAsDataURL(val as File)
  })
</script>

<template>
  <v-dialog v-model="open">
    <v-card flat>
      <v-file-upload
        v-model="src as File"
        class="file-upload"
        density="comfortable"
        :title="t('images.choose')"
      >
        <template #item>
          <v-img v-if="imageData" :src="imageData as string" />
        </template>
      </v-file-upload>
      <v-btn class="primary-button mt-5" @click="open = false">
        {{ updated ? t('common.save') : t('common.close') }}
      </v-btn>
    </v-card>
  </v-dialog>
</template>

<style>
  .v-file-upload-dropzone.v-sheet {
    border: solid 1px #dde !important;
    border-radius: var(--v-default-border-radius);
    padding: 8px 16px 24px !important;
  }
  .file-upload {
    width: 360px;
    height: max-content;
    margin-inline: auto;
  }
</style>
