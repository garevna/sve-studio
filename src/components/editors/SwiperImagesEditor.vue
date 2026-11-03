<!-- eslint-disable unicorn/prefer-add-event-listener -->
<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, ref } from 'vue'
  import ResizableColumn from '@/components/editors/ResizableColumn.vue'
  import ResizableWrapper from '@/components/editors/ResizableWrapper.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { useBlockActionsTarget } from '@/composables/useEditableBlockActions'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { uploadImage } from '@/utils/upload-image'

  // Edit-mode host for both swiper variants ("carousel-with-preview" =
  // swiper type; "carousel-with-images" = slider-with-images type) - same
  // upload flow either way. This is edit-mode ONLY: TemplateItem.vue never
  // mounts this component outside mode==='edit', real preview goes straight
  // to SliderWithThumbnails.vue/SliderWithImages.vue instead. Deliberately
  // does NOT render either of those real components here even though images
  // exist - they carry autoplay/loop/centered-slides, which has no business
  // running while editing (same reasoning SliderWithCards.vue already
  // established: its own edit-mode grid is a plain flex-wrap, the real
  // autoplay swiper only ever mounts in its v-else preview branch). A real
  // Swiper instance repeatedly mounting/unmounting as images.length toggles
  // between 0 and 1+, inside a still-reflowing edit-mode layout, is exactly
  // the fragile combination that was causing images to silently fail to
  // render - a plain static thumbnail grid sidesteps that whole class of
  // issue, not just one instance of it.
  const props = defineProps<{ block: TemplateBlockModel }>()

  const ajaxStore = useAjaxStore()
  const blockActionsTarget = useBlockActionsTarget()

  const images = computed(() => {
    const list = props.block.images || []
    return list.map(image => typeof image === 'string' ? { src: image } : image)
  })

  // The plain image slider (slider-with-images) shows its slides at the size
  // the site gives them: block.width x block.height. The first slide carries
  // the handles - its right edge for the width, the bar under it for the
  // height - and every other slide follows it. Width defaults to the height
  // (a square).
  const sized = computed(() => props.block.type === 'slider-with-images')
  const slideHeight = computed({
    get: () => props.block.height || 300,
    set: value => {
      // eslint-disable-next-line vue/no-mutating-props
      props.block.height = value
    },
  })
  const slideWidth = computed({
    get: () => props.block.width || slideHeight.value,
    set: value => {
      // eslint-disable-next-line vue/no-mutating-props
      props.block.width = value
    },
  })

  const fileInput = ref<HTMLInputElement | null>(null)

  function triggerFileDialog () {
    fileInput.value?.click()
  }

  // Loads a whole series of photos at once and replaces the slider's image
  // list wholesale - individual slides aren't edited one by one. Instant
  // blob: previews while the real uploads happen in the background, same
  // "no client-side image storage" pattern as ImageEditor.vue - each
  // upload swaps to its own real server path once it resolves; base64
  // data URIs were never an option here (that's storing the actual image
  // bytes inside the page's own JSON content, bloating every read/write of
  // that page and contradicting the project's own established design:
  // the client only ever holds a URL).
  //
  // If any file fails to upload, that one is dropped rather than rejecting
  // the whole batch (Promise.all would otherwise hang on/fail the entire
  // series over one bad file) - if every file fails, results is empty and
  // block.images ends up [] as well, which is exactly the "no images yet"
  // empty-canvas state the template already falls back to, per the agreed
  // convention.
  function onFilesChange (event: Event) {
    const files = (event.target as HTMLInputElement).files
    if (!files || files.length === 0) return
    const fileList = [...files]

    const blobUrls = fileList.map(file => URL.createObjectURL(file))
    // eslint-disable-next-line vue/no-mutating-props
    props.block.images = blobUrls.map(src => ({ src }))

    Promise.all(fileList.map(file => uploadImage(file).catch(() => null))).then(paths => {
      // eslint-disable-next-line vue/no-mutating-props
      props.block.images = paths.filter((path): path is string => path !== null).map(src => ({ src }))
      for (const blobUrl of blobUrls) URL.revokeObjectURL(blobUrl)
    })
  }
</script>

<template>
  <div class="swiper-images-editor">
    <input
      ref="fileInput"
      accept="image/*"
      multiple
      style="display: none"
      type="file"
      @change="onFilesChange"
    >
    <div v-if="images.length > 0 && sized" class="swiper-images-grid swiper-images-row">
      <template v-for="(image, index) of images" :key="index">
        <ResizableColumn
          v-if="index === 0"
          v-model:width="slideWidth"
          :max="1200"
          :min="120"
          resizable
        >
          <ResizableWrapper v-model:height="slideHeight" :min-height="120" resize>
            <img alt="" class="swiper-images-slide swiper-images-slide--fill" :src="ajaxStore.getImageURL(image.src)">
          </ResizableWrapper>
        </ResizableColumn>
        <img
          v-else
          alt=""
          class="swiper-images-slide"
          :src="ajaxStore.getImageURL(image.src)"
          :style="{ width: `${slideWidth}px`, height: `${slideHeight}px` }"
        >
      </template>
    </div>
    <div v-else-if="images.length > 0" class="swiper-images-grid">
      <img
        v-for="(image, index) of images"
        :key="index"
        alt=""
        class="swiper-images-thumb"
        :src="ajaxStore.getImageURL(image.src)"
      >
    </div>
    <div v-else class="swiper-images-empty">
      {{ t('images.nonePhotos') }}
    </div>
    <Teleport :disabled="!blockActionsTarget" :to="blockActionsTarget">
      <ToolbarIconButton
        :class="{ 'swiper-images-upload-btn': !blockActionsTarget }"
        icon="mdi-image-multiple-outline"
        :tooltip="t('images.uploadSeries')"
        @click="triggerFileDialog"
      />
    </Teleport>
  </div>
</template>

<style scoped>
.swiper-images-editor {
  position: relative;
}

.swiper-images-upload-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 5;
}

.swiper-images-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 300px;
}

.swiper-images-thumb {
  width: 160px;
  height: 160px;
  border-radius: var(--v-default-border-radius);
  flex: 0 0 auto;
}

/* One row, as the site's slider shows it - a long row scrolls. */
.swiper-images-row {
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 16px;
  min-height: 0;
  overflow-x: auto;
  scrollbar-width: thin;
  padding-right: 8px;
}
/* The width badge stays over the next slide while dragging. */
.swiper-images-row :deep(.resizable-column) {
  z-index: 1;
}

/* Plain <img>, not v-img: in the built editor v-img stayed "booting" here
   and never showed its picture. */
.swiper-images-thumb,
.swiper-images-slide {
  display: block;
  object-fit: cover;
}
.swiper-images-slide--fill {
  width: 100%;
  height: 100%;
}
.swiper-images-slide {
  flex: 0 0 auto;
  max-width: 100%;
  border-radius: var(--v-default-border-radius);
}

.swiper-images-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  background: var(--light-grey-2);
  border-radius: var(--v-default-border-radius);
  color: var(--grey);
}
</style>
