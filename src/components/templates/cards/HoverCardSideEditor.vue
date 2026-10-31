<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { ref } from 'vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import { uploadImage } from '@/utils/upload-image'
  import EditableCard from './EditableCard.vue'

  // One side (base or hover) of a card-with-hover pair, shown inside its own
  // tab by CardWithHoverEditDialog.vue - no heading needed here, the tab
  // label already says which side this is.
  // ver: the card's look, for the text format defaults.
  // fallbackColor: the side's fill when none is chosen (the hover side's
  // default, the same as on the site).
  defineProps<{ card: TemplateBlockModel, ver?: number, fallbackColor?: string }>()

  const color = defineModel<string>('color', { default: '' })
  const image = defineModel<string>('image', { default: '' })

  // A switch, not a second set of tabs (would duplicate the dialog's own
  // base/hover tabs one level down) - background is either a color or an
  // image, but content (icon/text) is allowed either way now, so this only
  // decides which background control shows, nothing about the content
  // editor below it.
  const useImage = ref(!!image.value)

  function onToggle (value: boolean | null) {
    useImage.value = !!value
    if (!value) image.value = ''
  }

  const fileInput = ref<HTMLInputElement | null>(null)
  const uploadError = ref('')
  function triggerUpload () {
    fileInput.value?.click()
  }
  async function onFileChange (event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    uploadError.value = ''
    const previous = image.value
    const previewUrl = URL.createObjectURL(file)
    image.value = previewUrl
    try {
      const path = await uploadImage(file, { replaces: previous, preview: previewUrl })
      image.value = path
      URL.revokeObjectURL(previewUrl)
    } catch (error) {
      uploadError.value = error instanceof Error ? error.message : 'Не вдалося завантажити зображення.'
      // Keep the blob: preview so editing isn't blocked - matches ImageEditor.vue's own retry convention.
    }
  }
</script>

<template>
  <div class="hover-card-side">
    <div class="hover-card-side-row">
      <span class="hover-card-side-row-label">Фон - зображення</span>
      <v-switch density="compact" hide-details :model-value="useImage" @update:model-value="onToggle" />
    </div>

    <template v-if="!useImage">
      <div class="hover-card-side-row">
        <span class="hover-card-side-row-label">Колір фону</span>
        <PaletteSwatchPicker :model-value="color" @update:model-value="(value: string) => color = value" />
      </div>
    </template>
    <template v-else>
      <input
        ref="fileInput"
        accept="image/*"
        style="display: none"
        type="file"
        @change="onFileChange"
      >
      <v-img v-if="image" class="hover-card-side-image-preview" cover :src="image" />
      <v-btn
        block
        class="mt-2"
        prepend-icon="mdi-upload"
        variant="outlined"
        @click="triggerUpload"
      >
        {{ image ? 'Змінити зображення' : 'Завантажити зображення' }}
      </v-btn>
      <div v-if="uploadError" class="hover-card-side-upload-error">{{ uploadError }}</div>
    </template>

    <!-- Content stays available over an image too (deliberately, per
      product decision - the user can add icon/text on top of a photo
      background if they want, formatting/removing it themselves; only the
      icon gets a dedicated show/hide toggle - text visibility is already
      just "did the user add any" via EditableCard's own add/remove buttons. -->
    <EditableCard
      :background="color || fallbackColor"
      :background-image="image"
      :card="card"
      class="mt-4"
      :format-ver="ver ?? 1"
      show-icon-toggle
    />
  </div>
</template>

<style scoped>
.hover-card-side {
  padding: 12px 0;
}
.hover-card-side-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
}
.hover-card-side-row-label {
  font-size: 0.9rem;
  color: #3A4A58;
}
.hover-card-side-image-preview {
  width: 100%;
  height: 140px;
  border-radius: var(--v-default-border-radius);
}
.hover-card-side-upload-error {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 4px;
  background: #C4534A;
  color: #fff;
  font-size: 0.8rem;
}
</style>
