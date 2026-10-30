<script setup lang="ts">
  import type { TemplateBlockModel, TranslatedModel } from '@/types/TemplateBlockModel'
  import { storeToRefs } from 'pinia'
  import { computed, ref, watch } from 'vue'
  import EditableBlockWrapper from '@/components/editors/EditableBlockWrapper.vue'
  import EditableTextSection from '@/components/editors/text/EditableTextSection.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import ConfirmDialog from '@/components/special/ConfirmDialog.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { TEXT_FORMAT_SUPPORT } from '@/configs/text-format-support'
  import { useCommonStore } from '@/stores/common'
  import { isTranslatedModel, resolveLocaleAsset, resolveLocaleText, setLocalizedContent, siteLocales } from '@/utils/locale-text'
  import { resolveThemeAssetPath } from '@/utils/theme-asset-path'
  import { uploadImage } from '@/utils/upload-image'

  // The page's single top-of-page hero parallax - mirrors production's
  // App.vue exactly (see the "parallax" block extracted via .find() there).
  // Unlike parallax-inside (TemplateParallax.vue, inserted anywhere via the
  // block picker, content-width), this is page-level: at most one per page,
  // found by type rather than position, and rendered full width above the
  // normal content flow. Mounted in EditorView.vue/PreviewView.vue, not
  // inside DynamicPageTemplate.vue's own per-block loop (which explicitly
  // skips "parallax" blocks - see there).
  //
  // Edit-mode actions: the block's own toolbar (delete + flat light/dark
  // theme toggle, EditableBlockWrapper's #actions/#delete slots), a single
  // fixed upload camera-fab (bottom-start, same non-competing-position
  // convention as ImageEditor.vue's own - not reusing that component
  // outright since production renders/uploads the image directly, no
  // resize/naturalSize concerns here), and the header/title/text overlay
  // edited through EditableTextSection (its own pencil fab, top-right of
  // the image) - same dialog-based "list of text fields" pattern used
  // everywhere else in the project (see TemplateNestedSection.vue).
  //
  // width="100vw" on <v-parallax> below matches production's App.vue
  // verbatim - it only renders correctly full-width because this component
  // is mounted as a genuine sibling of <v-main> inside a v-layout whose
  // .v-main alone is width-capped/centered (see EditorView.vue/
  // PreviewView.vue's own .v-layout/.v-main overrides, mirroring
  // production's real vuetify-components.css), exactly matching
  // production's own DOM position and CSS - the point of matching the prop
  // exactly is trusting the same markup that's already proven correct in
  // production, rather than re-deriving the CSS here.
  const commonStore = useCommonStore()
  const { locale } = storeToRefs(commonStore)
  const mode = useEditorMode()

  const block = computed<TemplateBlockModel | undefined>(() =>
    commonStore.dynamicPageContent?.blocks.find(item => item.type === 'parallax'))

  // Added via the "Додати компонент" picker (EditorView.vue's selectHandler,
  // configs/index.ts) like any other block - no in-place "add" affordance
  // here.
  const deleteDialogOpen = ref(false)
  function removeHero () {
    const blocks = commonStore.dynamicPageContent?.blocks
    if (!blocks || !block.value) return
    const index = blocks.indexOf(block.value)
    if (index !== -1) blocks.splice(index, 1)
    deleteDialogOpen.value = false
  }

  const imageContent = computed({
    get: () => resolveThemeAssetPath(resolveLocaleAsset(block.value?.content, locale.value), commonStore.activeTheme),
    set: (value: string) => {
      if (block.value) {
        setLocalizedContent(block.value, locale.value, value)
      }
    },
  })

  const imageFailed = ref(false)
  watch(imageContent, () => {
    imageFailed.value = false
  })

  const fileInput = ref<HTMLInputElement | null>(null)
  const uploadError = ref('')
  function triggerFileDialog () {
    fileInput.value?.click()
  }

  // A client who forgets to upload a per-locale hero image ships a blank
  // hole on production for that locale, not just a wrong-but-present one -
  // see TemplateItem.vue's matching fillEmptyLocales for the fuller
  // rationale. Only fills EMPTY slots, never overwrites a locale someone
  // already gave its own distinct image.
  function fillEmptyLocales (path: string) {
    if (!block.value || !isTranslatedModel(block.value.content)) return
    const content = block.value.content as TranslatedModel
    for (const localeKey of siteLocales()) {
      if (localeKey !== locale.value && !content[localeKey]) {
        content[localeKey] = path
      }
    }
  }

  async function onFileChange (event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    uploadError.value = ''
    const previous = imageContent.value
    const previewUrl = URL.createObjectURL(file)
    imageContent.value = previewUrl

    try {
      const path = await uploadImage(file, { replaces: previous, preview: previewUrl })
      imageContent.value = path
      fillEmptyLocales(path)
      URL.revokeObjectURL(previewUrl)
    } catch (error) {
      uploadError.value = error instanceof Error ? error.message : 'Не вдалося завантажити зображення.'
    }
  }

  const isDark = computed({
    get: () => !!block.value?.dark,
    set: (value: boolean) => {
      if (block.value) {
        block.value.dark = value
      }
    },
  })

  // Read-only view of a specific role's current text - searched by type
  // since production's own App.vue reads these as three fixed named roles
  // (parallaxHeader/parallaxTitle/parallaxText), not an arbitrary list.
  // Editing happens through EditableTextSection below (see openTextDialog),
  // which mutates block.children directly, so this stays a plain getter
  // rather than duplicating that write path.
  function childText (type: 'header' | 'title' | 'text') {
    return computed(() => resolveLocaleText(block.value?.children?.find(child => child.type === type)?.content, locale.value))
  }
  const headerContent = childText('header')
  const titleContent = childText('title')
  const textContent = childText('text')

  const overlayClass = computed(() => isDark.value ? 'parallax-content-dark' : 'parallax-content-light')

  // EditableTextSection lets the user freely add/remove text items here
  // (matching every other "list of text fields" editing surface in the
  // project - see TemplateNestedSection.vue's own openTextDialog) - but
  // production only ever reads the FIRST header/title/text child by type
  // (childText above). A second item of a type already present would be
  // silently ignored on the real site, not an editor bug so much as a
  // production constraint this dialog doesn't enforce.
  const textDialogOpen = ref(false)
  const activeTextChildren = ref<TemplateBlockModel[] | null>(null)
  function openTextDialog () {
    if (!block.value) return
    block.value.children ??= []
    activeTextChildren.value = block.value.children
    textDialogOpen.value = true
  }
</script>

<template>
  <div
    v-if="block"
    id="parallax-placeholder"
    :class="{ 'parallax-placeholder--active': !!imageContent, 'hero-parallax-edit-spacing': mode === 'edit' }"
  >
    <template v-if="mode === 'edit'">
      <EditableBlockWrapper type="block">
        <template #actions>
          <ToolbarIconButton :disabled="!isDark" icon="mdi-white-balance-sunny" tooltip="Світла тема" @click="isDark = false" />
          <ToolbarIconButton :disabled="isDark" icon="mdi-weather-night" tooltip="Темна тема" @click="isDark = true" />
        </template>
        <template #delete>
          <ToolbarIconButton icon="mdi-delete" tooltip="Видалити паралакс" @click="deleteDialogOpen = true" />
        </template>
        <div style="position: relative">
          <input
            ref="fileInput"
            accept="image/*"
            style="display: none"
            type="file"
            @change="onFileChange"
          >
          <v-img
            class="rounded-border-image"
            :class="{ 'image-placeholder-bg': !imageContent || imageFailed }"
            cover
            height="400"
            :src="imageContent"
            @error="imageFailed = true"
          />
          <div v-if="uploadError" class="hero-parallax-upload-error">{{ uploadError }}</div>
          <!-- A single, fixed upload control (bottom-start) - same
            non-competing-position convention as ImageEditor.vue's own
            camera-fab, separate from the cog's delete/theme menu above. -->
          <v-fab
            absolute
            class="ma-2"
            color="#09b"
            icon="mdi-camera"
            location="bottom start"
            size="default"
            title="Завантажити зображення"
            @click="triggerFileDialog"
          />
          <!-- Not wrapped in EditableBlockWrapper: its own "position:
            relative" box has no intrinsic size, and .parallax-content-*
            (parallax.css) is ALSO "position: absolute" - nested inside that
            empty box, the overlay collapsed to nothing and ended up
            rendering below the image instead of on it. A directly
            positioned fab, sibling to the image, keeps it correctly
            anchored to the image's own box - and always visible (no more
            v-if gating on having text already), so there's always a way in
            even on a still-empty canvas. -->
          <div :class="overlayClass">
            <h2 v-if="headerContent" class="parallax-header">{{ headerContent }}</h2>
            <h4 class="parallax-title text-bold text-left">{{ titleContent }}</h4>
            <p v-if="textContent" class="parallax-text text-left">{{ textContent }}</p>
          </div>
          <v-fab
            class="hero-parallax-text-edit-fab"
            icon="mdi-pencil"
            size="small"
            title="Редагувати текст"
            @click="openTextDialog"
          />
        </div>
      </EditableBlockWrapper>
      <EditableTextSection
        v-if="activeTextChildren"
        v-model="textDialogOpen"
        :children="activeTextChildren"
        :formattable="TEXT_FORMAT_SUPPORT['hero-parallax']"
      />
      <ConfirmDialog
        v-model="deleteDialogOpen"
        confirm-text="Видалити"
        text="Цю дію не можна скасувати."
        title="Видалити паралакс у шапці сторінки?"
        @confirm="removeHero"
      />
    </template>
    <template v-else>
      <v-parallax v-if="imageContent" :src="imageContent" width="100vw">
        <div v-if="headerContent || titleContent" :class="overlayClass">
          <h2 v-if="headerContent" class="parallax-header">{{ headerContent }}</h2>
          <h4 class="parallax-title text-bold text-left">{{ titleContent }}</h4>
          <p v-if="textContent" class="parallax-text text-left">{{ textContent }}</p>
        </div>
      </v-parallax>
    </template>
  </div>
</template>

<style scoped>
.rounded-border-image {
  border-radius: var(--v-default-border-radius);
}

/*
 * Editor-only: HeroParallax mounts as a sibling of v-main (see
 * EditorView.vue), starting right at the top of the layout - but the
 * editor's own fixed v-system-bar (36px, position:fixed) sits on top of
 * that same y=0 origin, so the block's corner speed-dial fab (which floats
 * further UP, outside the block's own box - see EditableBlockWrapper.vue)
 * ended up rendering underneath the toolbar instead of below it. Matches
 * #parallax-placeholder's own ID specificity (see main.css's
 * "--active" rule) so this reliably wins regardless of whether an image is
 * set yet. Preview/production never gets this class (no such fixed bar
 * there), so their spacing stays untouched.
 */
#parallax-placeholder.hero-parallax-edit-spacing {
  margin-top: 48px;
}

.hero-parallax-upload-error {
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

.hero-parallax-text-edit-fab {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 5;
}

/* Same responsive sizing as production's App.vue (the only place these
   classes are styled there - no non-media base rule exists, they inherit
   plain h2/h4/p sizing from the theme's own typography CSS otherwise). */
@media screen and (max-width: 960px) {
  .parallax-title {
    font-size: 24px;
  }
}
@media screen and (max-width: 820px) {
  .parallax-header {
    font-size: 24px;
  }
  .parallax-title {
    font-size: 20px;
  }
}
@media screen and (max-width: 600px) {
  .parallax-header {
    font-size: 22px;
  }
  .parallax-title {
    font-size: 16px;
  }
}
</style>
