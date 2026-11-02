<script setup lang="ts">
  import type { TemplateBlockModel, TranslatedModel } from '@/types/TemplateBlockModel'
  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'
  import SortableList from '@/components/editors/SortableList.vue'
  import TextEditor from '@/components/editors/text/TextEditor.vue'
  import { useBlockActionsTarget } from '@/composables/useEditableBlockActions'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { useAjaxStore } from '@/stores/ajax'
  import { useCommonStore } from '@/stores/common'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { CHECKER_STYLE, imageMissing } from '@/utils/image-fallback'
  import { resolveLocaleText, setLocalizedContent } from '@/utils/locale-text'
  import { uploadImage } from '@/utils/upload-image'
  import TemplateBanerActions from './TemplateBanerActions.vue'
  import TemplateParallax from './TemplateParallax.vue'

  const commonStore = useCommonStore()
  const { winSize } = storeToRefs(commonStore)
  const mode = useEditorMode()
  const ajaxStore = useAjaxStore()
  const feedback = useUiFeedbackStore()

  const props = defineProps<{
    blocks: TemplateBlockModel[]
    blockIndex: number
  }>()

  const target = computed(() => props.blocks[props.blockIndex] || null)

  // Was rendering the raw {uk,en,de} object into the page - the banner
  // showed its own JSON instead of a headline. Every other block in this
  // editor goes through resolveLocaleText; this one simply never did.
  function text (value: TranslatedModel | string | undefined): string {
    return resolveLocaleText(value, commonStore.locale)
  }
  function setText (block: TemplateBlockModel, value: string | undefined) {
    setLocalizedContent(block, commonStore.locale, value || '')
  }
  // The headline lives on the banner's own `title` field rather than in a
  // child block, so it needs its own setter - setLocalizedContent writes to
  // `.content`.
  const title = computed({
    get: () => text(target.value?.title),
    set: (value: string) => {
      if (!target.value) return
      // `title` is typed as string | TranslatedModel (older content stored a
      // bare string) - normalise to the object shape before writing, so a
      // legacy banner gains proper per-locale text on first edit instead of
      // staying single-language.
      if (typeof target.value.title !== 'object' || !target.value.title) {
        target.value.title = {} as TranslatedModel
      }
      ;(target.value.title as TranslatedModel)[commonStore.locale] = value
    },
  })

  // The headline's format - its own (titleClass), formatted like any text.
  // Unset: large, bold, white, centred - the look it always had, made of
  // the format menu's own classes so every one of them can be changed.
  // NOTE: the site's TemplateBaner.vue uses the same default.
  const DEFAULT_TITLE_CLASS = 'h2 text-bold text-white text-center'
  const titleClass = computed({
    get: () => target.value?.titleClass || DEFAULT_TITLE_CLASS,
    set: (value: string) => {
      if (target.value) target.value.titleClass = value
    },
  })
  // The plate under it: the colour set on the banner's toolbar.
  const titlePlate = computed(() => `var(--${target.value?.titleBackground || 'primary'})`)

  const dragActive = defineModel<boolean>('dragActive', { default: false })

  async function removeLine (index: number) {
    if (!await feedback.confirmDelete('row')) return
    target.value?.children?.splice(index, 1)
  }

  // Two pictures, not one. Above 926px this renders the wide card and uses
  // `image` for the circle; below it, the block hands over to
  // TemplateParallax, which reads `content` instead - so a banner genuinely
  // has a desktop and a mobile image. They point at the same file in today's
  // content, which is why it looked like one.
  const imageInput = ref<HTMLInputElement | null>(null)
  const pickingFor = ref<'desktop' | 'mobile'>('desktop')

  function pickImage (variant: 'desktop' | 'mobile') {
    pickingFor.value = variant
    imageInput.value?.click()
  }

  async function onImageChange (event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file || !target.value) return
    const block = target.value
    const desktop = pickingFor.value === 'desktop'
    // The parallax half reads a per-locale value, like every other image
    // block - the same picture for every language unless it's changed per
    // language later.
    const previous = desktop ? block.image : resolveLocaleText(block.content, commonStore.locale)
    // While the two pictures are one (the same file, or the other slot still
    // empty), a new picture replaces both - otherwise uploading one left the
    // other on the old file, and the banner showed different (or missing)
    // pictures on a wide and a narrow screen.
    const other = desktop ? resolveLocaleText(block.content, commonStore.locale) : block.image
    const sameFile = (a?: unknown, b?: unknown) => typeof a === 'string' && typeof b === 'string' && a.split('?')[0] === b.split('?')[0]
    const linked = !other || sameFile(other, previous)
    const assign = (value: string) => {
      if (desktop || linked) block.image = value
      if (!desktop || linked) setLocalizedContent(block, commonStore.locale, value)
    }
    // Preview first: it also tells upload-image.ts which slot this is.
    const previewUrl = URL.createObjectURL(file)
    assign(previewUrl)
    try {
      assign(await uploadImage(file, { replaces: typeof previous === 'string' ? previous : undefined, preview: previewUrl }))
    } catch (error) {
      assign(typeof previous === 'string' ? previous : '')
      throw error
    } finally {
      URL.revokeObjectURL(previewUrl)
    }
    // Re-picking the SAME file must still fire a change event.
    input.value = ''
  }

  // The banner has no branch of its own in DynamicPageTemplate, so its
  // toolbar buttons are teleported into the wrapper the generic branch
  // already gives it - the same route FAQ.vue takes.
  const blockActionsTarget = useBlockActionsTarget()

  const picture = computed(() => `url(${ajaxStore.getImageURL(target.value?.image || '')})`)
  // No picture, or not found: the checkerboard (utils/image-fallback.ts).
  const pictureMissing = imageMissing(() => ajaxStore.getImageURL(target.value?.image || ''))

  // const parallaxSection = computed(() => ({
  //   type: 'parallax',
  //   content: target.value?.image,
  //   children: [{ type: 'text', class: 'text-28-600', content: target.value?.title }, ...(target.value?.children || [])],
  // }))
</script>
<template>
  <template v-if="winSize.width > 926">
    <!-- The picture fills the left part, cut by an arc on its right; the
      headline sits on a plate that runs from under that arc to the right
      edge, the text below it. NOTE: the site's TemplateBaner.vue draws the
      same. -->
    <v-card
      :class="['baner-card my-16', { 'baner-card--editing': mode === 'edit' }]"
      :color="target?.background ? undefined : 'light-blue'"
      :style="target?.background ? { background: `var(--${target.background})` } : undefined"
    >
      <div class="baner-picture" :style="pictureMissing ? CHECKER_STYLE : undefined" />
      <div class="baner-body">
        <!-- Edit mode uses the same TextEditor every other text in this
          editor uses, so formatting and per-line delete work here the way
          they do everywhere else. -->
        <v-theme-provider v-if="mode === 'edit'" theme="editorTheme">
          <Teleport :disabled="!blockActionsTarget" :to="blockActionsTarget || 'body'">
            <TemplateBanerActions
              v-if="target"
              v-model:drag-active="dragActive"
              :block="target"
              @pick-image="pickImage"
            />
          </Teleport>
          <input
            ref="imageInput"
            accept="image/*"
            style="display: none"
            type="file"
            @change="onImageChange"
          >
          <div class="baner-title-plate" :style="{ background: titlePlate }">
            <TextEditor
              v-model:class="titleClass"
              :content="title"
              parent-type="usual"
              type="text"
              @update:content="value => title = value || ''"
            />
          </div>
          <div class="baner-lines">
            <SortableList v-model:active="dragActive" :items="target?.children">
              <template #item="{ item: line, index, dragClass, contentClass }">
                <div :class="dragClass">
                  <TextEditor
                    v-model:class="line.class"
                    :class="contentClass"
                    :content="text(line.content)"
                    :deletable="!dragActive"
                    parent-type="usual"
                    type="text"
                    @delete="removeLine(index)"
                    @update:content="value => setText(line, value)"
                  />
                </div>
              </template>
            </SortableList>
          </div>
        </v-theme-provider>

        <template v-else>
          <div class="baner-title-plate" :style="{ background: titlePlate }">
            <p :class="titleClass">{{ title }}</p>
          </div>
          <div class="baner-lines">
            <template v-for="(line, index) of target?.children" :key="index">
              <p :class="line.class">{{ text(line.content) }}</p>
            </template>
          </div>
        </template>
      </div>
    </v-card>
  </template>
  <template v-else>
    <template-parallax :block-index="blockIndex" :blocks="blocks" class="my-16" />
  </template>
</template>

<style scoped>
  /* A fixed height (the editor lets it grow while lines are edited). The
     picture takes the left 45%, its right edge an arc of a circle almost
     twice the card's height across, centred on the card's middle; the text
     column starts a little left of that line, so the headline's plate runs
     on under the arc and its visible left edge follows it. */
  .baner-card {
    --baner-height: 420px;
    --baner-split: 45%;
    --baner-radius: calc(var(--baner-height) * 0.95);
    position: relative;
    display: flex;
    width: 100%;
    height: var(--baner-height);
    overflow: hidden;
  }
  .baner-card--editing {
    height: auto;
    min-height: var(--baner-height);
  }
  .baner-picture {
    position: absolute;
    z-index: 2;
    top: 0;
    bottom: 0;
    left: 0;
    width: var(--baner-split);
    background: v-bind(picture) center / cover no-repeat;
    clip-path: circle(var(--baner-radius) at calc(100% - var(--baner-radius)) 50%);
  }
  .baner-body {
    position: relative;
    z-index: 1;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-width: 0;
    margin-left: calc(var(--baner-split) - 90px);
    padding: 10px 10px 24px 0;
  }
  .baner-title-plate {
    padding: 18px 24px 18px 110px;
    border-radius: var(--v-default-border-radius);
  }
  .baner-title-plate p {
    margin: 0;
  }
  /* The plate is dark: the editor's format icon gets a light halo there. */
  .baner-title-plate :deep(.toolbar-icon-button .v-icon) {
    filter: drop-shadow(0 0 1px #fff) drop-shadow(0 0 2px #fff);
  }
  .baner-title-plate :deep(.text-format-panel .toolbar-icon-button .v-icon) {
    filter: none;
  }
  .baner-lines {
    padding: 32px 48px 0 140px;
  }
</style>
