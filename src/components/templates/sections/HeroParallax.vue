<script setup lang="ts">
  import type { HeaderSettingsModel } from '@/configs/header-layout'
  import type { GlobalSettingsModel } from '@/types/GlobalSettingsModel'
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { storeToRefs } from 'pinia'
  import { computed, onMounted, ref, watch } from 'vue'
  import EditableBlockWrapper from '@/components/editors/EditableBlockWrapper.vue'
  import EditableTextSection from '@/components/editors/text/EditableTextSection.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import ConfirmDialog from '@/components/special/ConfirmDialog.vue'
  import HeaderTitleControls from '@/components/special/HeaderTitleControls.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { HERO_WITH_TITLE_VARIANT, resolveHeaderSettings, resolveHeroVariant, TITLE_SIZES } from '@/configs/header-layout'
  import { TEXT_FORMAT_SUPPORT } from '@/configs/text-format-support'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { useCommonStore } from '@/stores/common'
  import { fillEmptyLocaleSlots, resolveLocaleAsset, resolveLocaleText, setLocalizedContent } from '@/utils/locale-text'
  import { PARALLAX_TEXT_DEFAULTS, parallaxTextClass } from '@/utils/parallax-text-class'
  import { refreshPreviewIfOpen } from '@/utils/preview-window'
  import { resolveThemeAssetPath } from '@/utils/theme-asset-path'
  import { themeFonts } from '@/utils/theme-fonts'
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
    if (block.value) fillEmptyLocaleSlots(block.value, path)
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
      uploadError.value = error instanceof Error ? error.message : t('images.uploadFailed')
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
  // Their look: the format set in the text dialog, else the panel's own
  // (utils/parallax-text-class.ts - the site reads them the same way).
  const classOf = (type: string) => computed(() => block.value?.children?.find(child => child.type === type)?.class)
  const headerClassStored = classOf('header')
  const titleClassStored = classOf('title')
  const textClassStored = classOf('text')
  const headerClass = computed(() => parallaxTextClass(headerClassStored.value, PARALLAX_TEXT_DEFAULTS.header))
  const titleClass = computed(() => parallaxTextClass(titleClassStored.value, PARALLAX_TEXT_DEFAULTS.title))
  const textClass = computed(() => parallaxTextClass(textClassStored.value, PARALLAX_TEXT_DEFAULTS.text))

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

  // The company name over this picture, as the site shows it in the layout
  // "Паралакс-банер з назвою компанії" - and set right on it: click the name
  // for its text, font, corner, or to hide it; a hidden name leaves a quiet
  // button to bring it back. Site-wide settings (global.json provider and
  // header), the same ones "Верхня частина сторінки" sets.
  const ajaxStore = useAjaxStore()
  const globalSettings = ref<GlobalSettingsModel | null>(null)
  onMounted(async () => {
    try {
      globalSettings.value = await ajaxStore.getGlobalSettings()
    } catch {
      globalSettings.value = null
    }
  })
  const showsName = computed(() => resolveHeroVariant(globalSettings.value?.heroVariant) === HERO_WITH_TITLE_VARIANT)
  const header = computed(() => resolveHeaderSettings(globalSettings.value?.header))
  const titleFonts = computed(() => themeFonts(globalSettings.value))
  const companyName = computed(() => globalSettings.value?.provider || '')
  // Which edge the name takes - the panel keeps to the other one, as on the
  // site (HeroWithTitle.vue).
  const nameSide = computed(() => {
    if (!showsName.value || !header.value.showTitle) {
      return 'none'
    }
    return header.value.titlePosition.startsWith('top') ? 'top' : 'bottom'
  })

  async function saveGlobal () {
    if (!globalSettings.value) return
    await ajaxStore.saveGlobalSettings(globalSettings.value, { publish: true })
    refreshPreviewIfOpen()
  }
  function updateHeader (changes: Partial<HeaderSettingsModel>) {
    if (!globalSettings.value) return
    globalSettings.value.header = { ...header.value, ...changes }
    void saveGlobal()
  }
  // Typed letter by letter: saved once the typing stops.
  let nameTimer: ReturnType<typeof setTimeout> | undefined
  function setCompanyName (value: string) {
    if (!globalSettings.value) return
    globalSettings.value.provider = value
    clearTimeout(nameTimer)
    nameTimer = setTimeout(() => void saveGlobal(), 600)
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
          <ToolbarIconButton :disabled="!isDark" icon="mdi-white-balance-sunny" :tooltip="t('parallax.lightTheme')" @click="isDark = false" />
          <ToolbarIconButton :disabled="isDark" icon="mdi-weather-night" :tooltip="t('parallax.darkTheme')" @click="isDark = true" />
        </template>
        <template #delete>
          <ToolbarIconButton icon="mdi-delete" :tooltip="t('parallax.delete')" @click="deleteDialogOpen = true" />
        </template>
        <div style="position: relative">
          <input
            ref="fileInput"
            accept="image/*"
            style="display: none"
            type="file"
            @change="onFileChange"
          >
          <!-- The picture's own proportions, as the site's top parallax shows
            it - a fixed 400px strip cut the middle out of a wide picture
            and hid what the site shows (a character's head, say). A
            16:9 checkerboard while there is no picture. -->
          <v-img
            :aspect-ratio="!imageContent || imageFailed ? 16 / 9 : undefined"
            class="rounded-border-image"
            :class="{ 'image-placeholder-bg': !imageContent || imageFailed }"
            cover
            :src="imageContent"
            @error="imageFailed = true"
          />
          <div v-if="uploadError" class="hero-parallax-upload-error">{{ uploadError }}</div>
          <div v-if="showsName && globalSettings" class="hero-name-frame" :class="`hero-name-frame--${header.titlePosition}`">
            <button
              v-if="!header.showTitle"
              class="hero-name-ghost"
              type="button"
              @click="updateHeader({ showTitle: true })"
            >
              <i class="mdi mdi-eye-outline" /> {{ t('header.titleShow') }}
            </button>
            <v-menu v-else :close-on-content-click="false" location="top start">
              <template #activator="{ props: menuProps }">
                <h1
                  v-bind="menuProps"
                  :class="['h1 text-white hero-name', header.titleFont, { 'hero-name--own-weight': header.titleFont }]"
                  :style="{ '--title-scale': TITLE_SIZES[header.titleSize] }"
                  :title="t('header.titleEdit')"
                >
                  {{ companyName }}
                </h1>
              </template>
              <v-card class="hero-name-panel" theme="editorTheme">
                <v-text-field
                  class="mb-4"
                  density="compact"
                  hide-details
                  :label="t('common.companyName')"
                  :model-value="companyName"
                  variant="outlined"
                  @update:model-value="setCompanyName"
                />
                <HeaderTitleControls
                  corners
                  :fonts="titleFonts"
                  :header="header"
                  no-name-label
                  @update="updateHeader"
                />
                <p class="hero-name-note">{{ t('header.titleSiteWide') }}</p>
              </v-card>
            </v-menu>
          </div>
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
            :title="t('images.upload')"
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
          <div :class="[overlayClass, 'parallax-panel', `parallax-panel--name-${nameSide}`]">
            <h2 v-if="headerContent" :class="headerClass">{{ headerContent }}</h2>
            <h4 :class="titleClass">{{ titleContent }}</h4>
            <p v-if="textContent" :class="textClass">{{ textContent }}</p>
          </div>
          <v-fab
            class="hero-parallax-text-edit-fab"
            icon="mdi-pencil"
            size="small"
            :title="t('common.editText')"
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
        :confirm-text="t('common.delete')"
        :text="t('confirm.irreversible')"
        :title="t('parallax.deleteTitle')"
        @confirm="removeHero"
      />
    </template>
    <template v-else>
      <v-parallax v-if="imageContent" :src="imageContent" width="100vw">
        <div v-if="headerContent || titleContent" :class="[overlayClass, 'parallax-panel']">
          <h2 v-if="headerContent" :class="headerClass">{{ headerContent }}</h2>
          <h4 :class="titleClass">{{ titleContent }}</h4>
          <p v-if="textContent" :class="textClass">{{ textContent }}</p>
        </div>
      </v-parallax>
    </template>
  </div>
</template>

<style scoped>
/* Same as the site: the panel never runs through the company name. */
.parallax-panel--name-bottom {
  bottom: auto;
  gap: 12px;
}
.parallax-panel--name-top {
  top: auto;
  gap: 12px;
}
/* A formatted panel text (utils/parallax-text-class.ts) may be set big,
   and the panel is narrow on a phone: long words wrap instead of pushing
   the page wider, and the big sizes shrink with the screen. */
.parallax-panel > * {
  max-width: 100%;
  overflow-wrap: anywhere;
}
@media screen and (max-width: 960px) {
  .parallax-panel > .h1 { font-size: clamp(28px, 10vw, 68px); }
  .parallax-panel > .h2 { font-size: clamp(22px, 7vw, 36px); }
  .parallax-panel > .h3 { font-size: clamp(20px, 6vw, 28px); }
}
/* The name sits like the site's (HeroWithTitle.vue): a corner of the
   picture, the same padding, white with a shadow. */
.hero-name-frame {
  position: absolute;
  inset: 0;
  display: flex;
  padding: 48px 36px;
  pointer-events: none;
}
.hero-name-frame--top-left { align-items: flex-start; justify-content: flex-start; }
.hero-name-frame--top-right { align-items: flex-start; justify-content: flex-end; text-align: right; }
.hero-name-frame--bottom-left { align-items: flex-end; justify-content: flex-start; }
.hero-name-frame--bottom-right { align-items: flex-end; justify-content: flex-end; text-align: right; }
.hero-name {
  margin: 0;
  /* The editor's own heading style would make it dark; the site's is white. */
  color: var(--white) !important;
  max-width: 100%;
  line-height: 1.05;
  overflow-wrap: anywhere;
  text-shadow: 0 2px 16px rgb(0 0 0 / 0.45);
  pointer-events: auto;
  cursor: pointer;
  border-radius: 12px;
  outline: 2px dashed transparent;
  outline-offset: 6px;
  transition: outline-color 0.15s ease;
}
.hero-name:hover {
  outline-color: rgb(255 255 255 / 0.7);
}
/* Same size rule as the site - the name's size (header.titleSize): a multiple of the h1's own 96px,
   never wider than the screen allows - a big name wraps, it doesn't spill. */
.hero-name {
  font-size: min(calc(96px * var(--title-scale, 1)), 14vw);
}
@media screen and (max-width: 600px) {
  .hero-name {
    font-size: min(calc(68px * var(--title-scale, 1)), 14vw);
  }
}
/* Same rule as the site: a decorative font keeps its own weight. */
.hero-name--own-weight {
  font-weight: 400;
  font-synthesis: none;
}
.hero-name-ghost {
  pointer-events: auto;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 10px 16px;
  border: 2px dashed rgb(255 255 255 / 0.6);
  border-radius: 12px;
  color: rgb(255 255 255 / 0.85);
  background: rgb(0 0 0 / 0.25);
  font-size: 15px;
}
.hero-name-ghost:hover {
  background: rgb(0 0 0 / 0.4);
}
.hero-name-panel {
  padding: 20px;
  max-width: min(560px, 92vw);
}
.hero-name-note {
  margin-top: 16px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface) / 0.6);
}
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
