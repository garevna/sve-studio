<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import ImageEditor from '@/components/editors/ImageEditor.vue'
  import SectionWithFreeContent from '@/components/editors/sections/SectionWithFreeContent.vue'
  import SortableList from '@/components/editors/SortableList.vue'
  import SwiperImagesEditor from '@/components/editors/SwiperImagesEditor.vue'
  import TextEditor from '@/components/editors/text/TextEditor.vue'
  import TemplateItem from '@/components/templates/TemplateItem.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { useCommonStore } from '@/stores/common'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { resolveLocaleAsset, resolveLocaleText, setLocalizedContent, translationHint } from '@/utils/locale-text'
  import { resolveThemeAssetPath } from '@/utils/theme-asset-path'

  const commonStore = useCommonStore()

  // `block`: a section that is not on the page (the block gallery's
  // previews) - drawn from it directly instead of the page's blocks.
  const props = defineProps<{
    blockIndex: number
    block?: TemplateBlockModel
  }>()

  const block = computed(() => {
    if (props.block) {
      return props.block
    }
    const pageContent = commonStore.dynamicPageContent as { blocks: TemplateBlockModel[] } | null
    return pageContent ? pageContent.blocks[props.blockIndex] : null
  })

  const mode = useEditorMode()
  const sections = computed(() => block.value?.children || [])

  // Owned here but toggled from the block's own toolbar
  // (TemplateNestedSectionActions), like every other reorder mode.
  const dragActive = defineModel<boolean>('dragActive', { default: false })

  async function removeTextItem (section: TemplateBlockModel, index: number) {
    if (!await useUiFeedbackStore().confirmDelete('textRow')) return
    section.children?.splice(index, 1)
  }
  const imageSection = computed(() => sections.value.find(child => child.type === 'image') || null)
  const localizedImageSrc = computed({
    get: () => resolveThemeAssetPath(resolveLocaleAsset(imageSection.value?.content, commonStore.locale), commonStore.activeTheme),
    set: (value: string) => {
      if (imageSection.value) setLocalizedContent(imageSection.value, commonStore.locale, value)
    },
  })

  // The image/text halves are two fields of ONE editable block, not
  // separate editable blocks in their own right - no EditableBlockWrapper
  // (and so no separate toolbar/border) around either side, only around the
  // whole thing (DynamicPageTemplate.vue's own wrapper for this "section"
  // block). ImageEditor's camera button and each text field's own format
  // cog already know how to Teleport into the nearest ancestor toolbar when
  // nothing closer shadows it (see useEditableBlockActions.ts) - removing
  // the inner wrappers here is what lets them actually reach that outer one
  // instead of each other's private (or absent) local target.
  function getText (child: TemplateBlockModel) {
    return resolveLocaleText(child.content, commonStore.locale)
  }
  function setText (child: TemplateBlockModel, value: string | undefined) {
    setLocalizedContent(child, commonStore.locale, value || '')
  }
</script>

<template>
  <template v-if="block">
    <template v-if="mode === 'edit'">
      <template v-for="(child, num) of block.children" :key="num">
        <div :class="[num === 0 ? 'section-left' : 'section-right', child.class, child.switchOrder ? (num === 0 ? 'section-left-switched-order' : 'section-right-switched-order') : '']">
          <template v-if="child.type === 'image' && imageSection">
            <image-editor v-model:src="localizedImageSrc" />
          </template>
          <template v-else-if="child.type === 'section-with-free-content'">
            <section-with-free-content :block-index="props.blockIndex" :section-index="num" />
          </template>
          <template v-else-if="child.type === 'swiper'">
            <swiper-images-editor :block="child" />
          </template>
          <template v-else-if="child.type === 'section'">
            <!-- Deleting a line lives in that line's OWN format panel
              (deletable/@delete), not in a separate dialog listing all of
              them again - the dialog and these fields were editing the same
              texts twice. Reordering is a mode toggled from the block's
              toolbar, same convention as every other list here. -->
            <SortableList v-model:active="dragActive" :items="child.children">
              <template #item="{ item: subchild, index: subchildIndex, dragClass, contentClass }">
                <div :class="dragClass">
                  <TextEditor
                    v-if="subchild.type === 'header' || subchild.type === 'title' || subchild.type === 'text'"
                    v-model:class="subchild.class"
                    v-model:type="subchild.type"
                    :class="contentClass"
                    :content="getText(subchild)"
                    :deletable="!dragActive"
                    :missing-translation="translationHint(subchild.content, commonStore.locale)"
                    parent-type="usual"
                    @delete="removeTextItem(child, subchildIndex)"
                    @update:content="(value) => setText(subchild, value)"
                  />
                  <!-- Anything else in the text half (a button, say) is the
                    page's own block editor - it used to be skipped here, so
                    a button showed in preview but not while editing. -->
                  <template-item
                    v-else
                    v-model:blocks="child.children as TemplateBlockModel[]"
                    :block-index="subchildIndex"
                    :class="contentClass"
                    :deletable="!dragActive"
                    @delete="removeTextItem(child, subchildIndex)"
                  />
                </div>
              </template>
            </SortableList>
          </template>
          <template v-else-if="child.type === 'header' || child.type === 'title' || child.type === 'text'">
            <!-- A section side can be a bare title/text leaf directly (no
              nested "section" wrapper) - not just the two-nested-sections
              image+text shape above. child.children is undefined here, so
              the generic v-else below (which iterates child.children) would
              silently render nothing for this shape - confirmed live: an
              about-company section with exactly this shape rendered as a
              completely empty block despite valid data in both IndexedDB
              and the API response. -->
            <TextEditor
              v-model:class="child.class"
              v-model:type="child.type"
              :content="getText(child)"
              :missing-translation="translationHint(child.content, commonStore.locale)"
              parent-type="usual"
              @update:content="(value) => setText(child, value)"
            />
          </template>
          <template v-else>
            <template v-for="(_, subchildIndex) of child.children" :key="subchildIndex">
              <template-item v-model:blocks="child.children as TemplateBlockModel[]" :block-index="subchildIndex" />
            </template>
          </template>
        </div>
      </template>
    </template>
    <template v-else>
      <template v-for="(child, num) of block.children" :key="num">
        <div :class="[num === 0 ? 'section-left' : 'section-right', child.class, child.switchOrder ? (num === 0 ? 'section-left-switched-order' : 'section-right-switched-order') : '']">
          <template v-if="child.type !== 'section' && child.type !== 'section-with-free-content'">
            <template-item v-model:blocks="block.children as TemplateBlockModel[]" :block-index="num" />
          </template>
          <template v-else>
            <template v-for="(_, subchildIndex) of child.children" :key="subchildIndex">
              <template-item v-model:blocks="child.children as TemplateBlockModel[]" :block-index="subchildIndex" />
            </template>
          </template>
        </div>
      </template>
    </template>
  </template>
</template>

<style scoped>
  .section-left, .section-right {
    width: calc(50% - 20px);
  }
  .section-left {
    margin-right: 20px;
  }
  .section-right {
    margin-left: 20px;
  }

  @media screen and (max-width: 960px) {
    .section-left, .section-right {
      width: 100%;
      margin-left: 0;
      margin-right: 0;
    }
    .mobile-last {
      order: 2;
    }
    .mobile-first {
      order: 1;
    }
  }
</style>
