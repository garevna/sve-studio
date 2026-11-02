<!-- eslint-disable unicorn/prefer-add-event-listener -->
<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { useBlockActionsTarget } from '@/composables/useEditableBlockActions'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { defaultImage } from '@/configs/defaults/default-image'
  import { useAjaxStore } from '@/stores/ajax'
  import { uploadImage } from '@/utils/upload-image'
  import ResizableWrapper from './ResizableWrapper.vue'

  const mode = useEditorMode()
  const ajaxStore = useAjaxStore()
  const blockActionsTarget = useBlockActionsTarget()

  // Plain "image" blocks (see TemplateNestedSection.vue) have no real height
  // field in production - the image just sizes itself by its own aspect
  // ratio, nothing crops it. The resizable fixed-height box below is a
  // genuinely useful editing affordance (lets you crop-to-fit by dragging),
  // but it has no production equivalent, so callers whose height model isn't
  // backed by a real saved field opt into naturalSize - preview then renders
  // a bare, unconstrained <v-img> matching production exactly. Other callers
  // (parallax banners, image grids) keep the existing boxed behavior by
  // default, since their height often *is* real, meaningful data.
  //
  // No "delete" here - the plain upload camera-fab stays a single, fixed
  // control (bottom-start), same as always. Block deletion for a top-level
  // "image" block lives in its own top-right corner fab instead (see
  // DynamicPageTemplate.vue's generic EditableBlockWrapper branch) - same
  // place every other block without its own content-editing menu gets it,
  // rather than merging two unrelated actions into one menu just because
  // they're both "in this component".
  // fallback: what to show while this slot has no picture of its own - a
  // phone slot shows the desktop picture, as the site does. An upload still
  // fills this slot.
  // fit: 'contain' shows the whole picture (a logo) instead of filling the box.
  // read: where a picked file goes instead of the server upload - returns the
  // value to keep (the general settings keep their pictures inside
  // global.json, see GeneralSettingsView.vue).
  const props = defineProps<{
    naturalSize?: boolean
    fallback?: string
    fit?: 'cover' | 'contain'
    read?: (file: File) => Promise<string>
  }>()

  // Fired with the real uploaded path (not the transient blob: preview) so
  // a caller with access to the block's full {uk,en,de} content (see
  // TemplateItem.vue) can auto-fill any locale that's still empty - a
  // client who forgets to upload a per-locale image would otherwise ship a
  // blank hole on production for that locale, not just a wrong-but-present
  // one. This component only ever sees/writes the single active locale's
  // slot (via src), so it can't do that fill-in itself.
  const emit = defineEmits<{ uploaded: [path: string] }>()

  const src = defineModel<string>('src', { default: defaultImage })
  const height = defineModel<number>('height', { default: 300 })

  const fileInput = ref<HTMLInputElement | null>(null)
  const uploadError = ref('')

  // Covers both halves of "missing or not found": !src for an empty/unset
  // value, imageFailed for a real (non-empty) src that 404s or otherwise
  // fails to load - both should read as the checkerboard placeholder rather
  // than blank space.
  const imageFailed = ref(false)
  watch(() => [src.value, props.fallback], () => {
    imageFailed.value = false
  })

  // A real-API upload can come back as a domain-relative path (see
  // upload-image.ts) rather than an absolute URL - resolve it the same way
  // every other render site in the app does, rather than handing a bare
  // path straight to <v-img>. Passes blob:/data: previews and legacy
  // absolute URLs through untouched (see getImageURL's own first branch).
  const shownSrc = computed(() => src.value || props.fallback || '')
  const resolvedSrc = computed(() => ajaxStore.getImageURL(shownSrc.value))

  function triggerFileDialog () {
    fileInput.value?.click()
  }

  async function onFileChange (event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    uploadError.value = ''
    const previous = src.value
    const previewUrl = URL.createObjectURL(file)
    src.value = previewUrl

    try {
      const path = props.read ? await props.read(file) : await uploadImage(file, { replaces: previous, preview: previewUrl })
      src.value = path
      emit('uploaded', path)
      URL.revokeObjectURL(previewUrl)
    } catch (error) {
      uploadError.value = error instanceof Error ? error.message : 'Не вдалося завантажити зображення.'
      // A file read locally (read) has no upload to retry - the old picture
      // comes back rather than a preview that is gone after a reload.
      if (props.read) {
        src.value = previous
        URL.revokeObjectURL(previewUrl)
      }
      // Keep the blob: preview so editing isn't blocked - the model just
      // won't persist until the upload succeeds (re-pick the file to retry).
    }
  }
</script>

<template>
  <v-img
    v-if="naturalSize && mode !== 'edit'"
    :aspect-ratio="!shownSrc || imageFailed ? 1.6 : undefined"
    class="rounded-border-image"
    :class="{ 'image-placeholder-bg': !shownSrc || imageFailed }"
    cover
    :src="resolvedSrc"
    @error="imageFailed = true"
  />
  <ResizableWrapper v-else v-model:height="height">
    <div :class="['image-editor-wrap', { 'image-placeholder-bg': !shownSrc || imageFailed }]">
      <input
        v-if="mode === 'edit'"
        ref="fileInput"
        accept="image/*"
        style="display: none"
        type="file"
        @change="onFileChange"
      >
      <v-img
        :class="['rounded-border-image', { 'image-editor-contain': fit === 'contain' }]"
        :cover="fit !== 'contain'"
        :src="resolvedSrc"
        @error="imageFailed = true"
      />
      <template v-if="mode === 'edit'">
        <Teleport v-if="blockActionsTarget" :to="blockActionsTarget">
          <ToolbarIconButton icon="mdi-camera" tooltip="Завантажити зображення" @click="triggerFileDialog" />
        </Teleport>
        <v-fab
          v-else
          absolute
          class="ma-2"
          color="#09b"
          icon="mdi-camera"
          location="bottom start"
          size="default"
          @click="triggerFileDialog"
        />
      </template>
      <div v-if="uploadError" class="image-editor-upload-error">{{ uploadError }}</div>
    </div>
  </ResizableWrapper>
</template>

<style scoped>
.image-editor-wrap {
  position: relative;
  width: 100%;
  height: 100%;
}
.image-editor-contain :deep(img) {
  object-fit: contain;
}
.image-editor-upload-error {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  padding: 6px 10px;
  border-radius: 4px;
  background: #C4534A;
  color: #fff;
  font-size: 0.8rem;
}
.v-img, img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: var(--v-default-border-radius);
}
</style>
