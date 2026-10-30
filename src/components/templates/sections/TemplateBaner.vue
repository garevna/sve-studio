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

  // Fixed: .title-of-card owns the headline's look, so there is nothing for
  // the format menu to write. A computed with a no-op setter satisfies
  // TextEditor's v-model:class without letting anything change it.
  const titleClass = computed({
    get: () => 'title-of-card text-right',
    set: () => {},
  })

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
    const assign = (value: string) => {
      if (desktop) block.image = value
      else setLocalizedContent(block, commonStore.locale, value)
    }
    const previous = desktop ? block.image : resolveLocaleText(block.content, commonStore.locale)
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

  const containerBackground = computed(() => target.value?.class)
  const picture = computed(() => `url(${ajaxStore.getImageURL(target.value?.image || '')})`)

  const margin = computed(() => {
    if (winSize.value.width >= 1264) {
      return '-240px'
    } else if (winSize.value.width > 1180) {
      return '-280px'
    } else if (winSize.value.width > 1136) {
      return '-300px'
    } else if (winSize.value.width > 1094) {
      return '-340px'
    } else {
      return '-400px'
    }
  })

  // const parallaxSection = computed(() => ({
  //   type: 'parallax',
  //   content: target.value?.image,
  //   children: [{ type: 'text', class: 'text-28-600', content: target.value?.title }, ...(target.value?.children || [])],
  // }))
</script>
<template>
  <template v-if="winSize.width > 926">
    <v-card
      :class="['w-100 d-flex flex-nowrap justify-space-between my-16 overflow-hidden', { 'baner-card--editing': mode === 'edit' }]"
      color="light-blue"
      :height="mode === 'edit' ? undefined : 480"
      min-height="480"
    >
      <div class="picture-fone-circle" />
      <div class="w-50 pa-5">
        <!-- Edit mode uses the same TextEditor every other text in this
          editor uses, so formatting and per-line delete work here the way
          they do everywhere else - rather than a separate dialog listing
          the same lines again. -->
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
          <TextEditor
            v-model:class="titleClass"
            :content="title"
            :formattable="false"
            parent-type="usual"
            type="text"
            @update:content="value => title = value || ''"
          />
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
        </v-theme-provider>

        <template v-else>
          <p class="title-of-card text-right">{{ title }}</p>
          <template v-for="(line, index) of target?.children" :key="index">
            <p :class="line.class">{{ text(line.content) }}</p>
          </template>
        </template>
      </div>
    </v-card>
  </template>
  <template v-else>
    <template-parallax :block-index="blockIndex" :blocks="blocks" class="my-16" />
  </template>
</template>

<style scoped>
  .container {
    border-radius: var(--v-default-border-radius);
    background: v-bind(containerBackground);
    height: 480px;
  }
  .picture-fone-circle {
    border-radius: 50%;
    width: 840px;
    height: 840px;
    margin-left: v-bind(margin);
    margin-top: -180px;
    display:flex;
    justify-items: center;
    align-items: center;
    background: v-bind(picture);
    background-size: 100%;
    background-repeat: no-repeat;
    background-position: center right;
  }

  :deep(.title-of-card) {
    border-radius: var(--v-default-border-radius);
    background: var(--primary);
    padding: 8px 12px;
    font-size: 44px;
    font-weight: 700;
    color: var(--white);
    text-align: center;
    /* -webkit-text-stroke: var(--primary) 2px; */
  }
</style>
