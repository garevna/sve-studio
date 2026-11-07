<script setup lang="ts">
  import type { EditorMode } from '@/composables/useEditorMode'
  import type { TemplateBlockModel, TemplatePageModel } from '@/types/TemplateBlockModel'
  import { computed, reactive, ref, watch } from 'vue'
  import ConfirmDialog from '@/components/special/ConfirmDialog.vue'
  import { usePageBlocks } from '@/composables/usePageBlocks'
  import { faq } from '@/configs/components/faq'
  import { galery1 } from '@/configs/components/galery-1'
  import { galery2 } from '@/configs/components/galery-2'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'
  import { cardDefaults, tabCardDefaults } from '@/utils/card-defaults'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { imageBlockVariant, imagePairSiblingIndex, isSecondHalfOfImagePair } from '@/utils/image-variant'
  import { stableKey } from '@/utils/stable-key'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'
  import ComponentVariantSwitch from '../editors/ComponentVariantSwitch.vue'
  import EditableBlockWrapper from '../editors/EditableBlockWrapper.vue'
  import PageBlockFrame from '../editors/PageBlockFrame.vue'
  import PageInsertGap from '../editors/PageInsertGap.vue'
  import CardEditDialog from './cards/CardEditDialog.vue'
  import CardSet from './cards/CardSet.vue'
  import CardWithHoverGroupActions from './cards/CardWithHoverGroupActions.vue'
  import CardWithToolbarImageGroupActions from './cards/CardWithToolbarImageGroupActions.vue'
  import EditableCardsBlock from './cards/EditableCardsBlock.vue'
  import EditableTabsBlock from './cards/EditableTabsBlock.vue'
  import TabSet from './cards/TabSet.vue'
  import ImageVariantBlock from './ImageVariantBlock.vue'
  import DarkFoneSection from './sections/DarkFoneSection.vue'
  import DarkFoneSectionActions from './sections/DarkFoneSectionActions.vue'
  import FooterEditor from './sections/FooterEditor.vue'
  import FooterEditorActions from './sections/FooterEditorActions.vue'
  import TemplateFlexSection from './sections/TemplateFlexSection.vue'
  import TemplateNestedSection from './sections/TemplateNestedSection.vue'
  import TemplateNestedSectionActions from './sections/TemplateNestedSectionActions.vue'
  import TemplateItem from './TemplateItem.vue'

  const commonStore = useCommonStore()

  const mode = computed(() => commonStore.mode)

  const pageContent = computed<TemplatePageModel | null>(() => commonStore.dynamicPageContent as TemplatePageModel | null)

  // A `type:'component'` block only ever gets its props via configs/components/
  // {faq,galery-1,galery-2}.ts's own generator, called once at insert time
  // (InsertPageBlock.vue/EditorView.vue's selectHandler) - nothing re-applies
  // it afterward, so a block that predates that props shape (or lost its
  // props some other way - confirmed live: home-page.json's own "faq-section"
  // block had none at all) renders permanently empty with no way to recover
  // short of re-inserting it. PopularDestinationsTheme2 isn't here - its own
  // config (popular-destinations.ts) is genuinely props-less by design (reads
  // commonStore.popularRoutes instead), so there's nothing to backfill.
  const DEFAULT_PROPS_BY_CONTENT: Record<string, () => object | undefined> = {
    FAQ: () => faq().props,
    ImagesGridVer1: () => galery1().props,
    ImagesGridVer2: () => galery2().props,
  }
  function healMissingComponentProps (blocks: TemplateBlockModel[] | undefined) {
    if (!blocks) return
    for (const block of blocks) {
      if (block.type === 'component' && typeof block.content === 'string' && !block.props) {
        const defaults = DEFAULT_PROPS_BY_CONTENT[block.content]?.()
        if (defaults) block.props = defaults
      }
      if (block.children) healMissingComponentProps(block.children)
    }
  }
  // immediate + non-deep: runs once whenever the page (re)loads (including a
  // page switch, since pageContent swaps to a whole new object rather than
  // mutating in place) - not on every keystroke of an unrelated edit.
  watch(pageContent, content => healMissingComponentProps(content?.blocks), { immediate: true })

  const showContent = ref(true)

  // Which block is open for editing - one at a time; a newly opened page
  // starts with none.
  const pageBlocks = usePageBlocks()
  watch(() => pageContent.value?.id, () => pageBlocks.finishEditing())

  // New blocks are added right where they should go - from a "+" between
  // two blocks or the place after the last one. Not on a footer page: it
  // has its one block and nothing else.
  const insertingAllowed = computed(() => mode.value === 'edit'
    && !pageContent.value?.blocks.some(block => block.type === 'footer-1'))
  function unitPosition (block: TemplateBlockModel): number | null {
    const position = pageBlocks.units.value.findIndex(unit => unit.block === block)
    return position === -1 ? null : position
  }

  // Types whose editor already renders its own edit-mode MENU that a plain
  // corner delete-fab would collide/overlap with (TextFormatMenu for
  // text/header/title and text-with-icon, SliderWithCards' own
  // CardContainerActions for carousel) - see TemplateItem.vue's "deletable"
  // prop and its "delete" emit. "image" is NOT here on purpose: its upload
  // control is a single fixed camera-fab, not a menu, positioned separately
  // (bottom-start) from the block's own top-right corner - the two don't
  // compete, so it gets the same plain wrapper+corner-fab as any other block
  // without a menu of its own, keeping "where does delete live" consistent
  // instead of merging unrelated actions into one control just because
  // they're both in this component.
  const TYPES_WITH_OWN_MENU = new Set(['header', 'title', 'text', 'text-with-icon', 'button', 'icon-button', 'carousel'])
  function blockHasOwnMenu (type: string): boolean {
    return TYPES_WITH_OWN_MENU.has(type)
  }

  // Vertical alignment of the two halves of a "section" block. Production
  // centres them against each other, which is right for the finished page:
  // a short caption beside a tall photo reads as deliberately centred.
  //
  // In EDIT mode it reads as a bug instead. Every half grows by its own
  // editing chrome - a toolbar, dotted borders, a delete button per item -
  // and the halves almost never grow by the same amount, so the shorter one
  // (usually the text column) floats away from the top and stops lining up
  // with the block it is a half of. Pinning the top edges while editing
  // keeps the two columns visually attached to the same block; preview and
  // production keep the centring untouched.
  //
  // Any align-* the block itself carries is dropped for the same reason the
  // default is: two Vuetify alignment utilities are both !important and
  // equally specific, so which one won would come down to the order Vuetify
  // happens to emit them in, not to what is written here.
  const ALIGN_CLASS = /^align-(start|end|center|baseline|stretch)$/
  function sectionAlignClass (block: TemplateBlockModel, blockMode: EditorMode): string {
    const tokens = (block.class || '').split(/\s+/).filter(Boolean)
    if (blockMode !== 'edit') {
      return tokens.length > 0 ? tokens.join(' ') : 'align-center'
    }
    return [...tokens.filter(token => !ALIGN_CLASS.test(token)), 'align-start'].join(' ')
  }

  const editingCard = ref<{ blocks: TemplateBlockModel[], index: number, defaults?: Partial<TemplateBlockModel>, block?: TemplateBlockModel } | null>(null)
  const editingCardModel = computed(() => (editingCard.value ? editingCard.value.blocks[editingCard.value.index] : null) ?? null)
  function openCardEditor (blocks: TemplateBlockModel[], index: number, defaults?: Partial<TemplateBlockModel>, block?: TemplateBlockModel) {
    editingCard.value = { blocks, index, defaults, block }
  }
  function closeCardEditor () {
    editingCard.value = null
  }
  // One shared confirm dialog for both top-level block deletion and
  // individual card deletion - "what" to delete is just a closure, so
  // adding another delete-able thing later never needs a new dialog/ref pair.
  const deleteDialogOpen = ref(false)
  let pendingDelete: (() => void) | null = null
  function requestDelete (action: () => void) {
    pendingDelete = action
    deleteDialogOpen.value = true
  }
  function confirmDelete () {
    pendingDelete?.()
    pendingDelete = null
    deleteDialogOpen.value = false
  }
  // Singleton `type:'component'` blocks (FAQ, PopularDestinationsTheme2 - see
  // configs/components/faq.ts / popular-destinations.ts and InsertPageBlock.vue's
  // own singleton guards) get their content stashed on delete, keyed by their
  // own `content`, so re-inserting restores it instead of starting from the
  // seed again - see stores/common.ts's deletedSingletonBlocks comment for why
  // this is session-only and never part of the saved page JSON.
  const SINGLETON_COMPONENT_NAMES = new Set(['FAQ', 'PopularDestinationsTheme1', 'PopularDestinationsTheme2', 'PopularDestinationsTheme3'])
  function requestDeleteBlock (index: number) {
    requestDelete(() => {
      const block = pageContent.value?.blocks[index]
      if (block && block.type === 'component' && typeof block.content === 'string' && SINGLETON_COMPONENT_NAMES.has(block.content)) {
        commonStore.deletedSingletonBlocks[block.content] = structuredClone(block)
      }
      if (block && pageBlocks.isActive(block)) pageBlocks.finishEditing()
      pageContent.value?.blocks.splice(index, 1)
    })
  }
  // A desktop/mobile image pair is two real blocks (see image-variant.ts)
  // even though ImageVariantBlock.vue shows/deletes them as one unit - drop
  // both, removing the higher index first so the lower one's position
  // doesn't shift out from under it.
  function requestDeleteImageBlock (index: number) {
    requestDelete(() => {
      const blocks = pageContent.value?.blocks
      if (!blocks) return
      const sibling = imagePairSiblingIndex(blocks, index)
      if (sibling === null) {
        blocks.splice(index, 1)
        return
      }
      const [first, second] = sibling > index ? [sibling, index] : [index, sibling]
      blocks.splice(first, 1)
      blocks.splice(second, 1)
    })
  }
  // Only true for the pair's anchor (lower) index - the two blocks a
  // desktop/mobile pair is made of (see image-variant.ts), so
  // ImageVariantBlock.vue renders once for both, given both real indices.
  function imagePairIndices (blocks: TemplateBlockModel[], index: number): { desktopIndex: number, mobileIndex: number } | null {
    const sibling = imagePairSiblingIndex(blocks, index)
    if (sibling === null || sibling < index) return null
    const ownVariant = imageBlockVariant(blocks[index])
    if (ownVariant === 'desktop') return { desktopIndex: index, mobileIndex: sibling }
    if (ownVariant === 'mobile') return { desktopIndex: sibling, mobileIndex: index }
    return null
  }
  function requestDeleteCard (cards: TemplateBlockModel[], index: number) {
    requestDelete(() => cards.splice(index, 1))
  }

  // A "float" block whose children are all card-with-toolbar-image cards is
  // really a card GROUP (see card-with-toolbar-image.ts's
  // cardWithToolbarImageGroupTemplate) - it gets CardWithToolbarImageGroupActions'
  // add-card/delete-group menu instead of the plain single delete-fab every
  // other "float" section (image-left/right, free-content) keeps.
  function isCardWithToolbarImageGroup (block: TemplateBlockModel): boolean {
    return !!block.children?.length && block.children.every(child => child.type === 'card-with-toolbar-image')
  }

  // Same idea as isCardWithToolbarImageGroup, for a "float" block whose
  // children are all card-with-hover cards (see card-with-hover.ts's
  // cardWithHoverGroupTemplate) - gets CardWithHoverGroupActions' menu instead.
  function isCardWithHoverGroup (block: TemplateBlockModel): boolean {
    return !!block.children?.length && block.children.every(child => child.type === 'component' && child.content === 'CardWithHover')
  }

  // Bridges the drag-to-reorder toggle between a group's own GroupActions
  // component (the fab-menu button, in the block's #actions slot) and
  // TemplateFlexSection (which actually owns the Sortable instance) - two
  // sibling components rendered per top-level "float" block, keyed by index
  // since several such groups can exist on the same page independently.
  const cardGroupDragActive = reactive<Record<number, boolean>>({})

  // Mirrors the edited app's own DynamicPageBlockTemplate.vue: a uniform gap
  // between top-level blocks driven by global.json's blockSpacing, skipped
  // for parallax blocks (they handle their own spacing) and the last block.
  //
  // Inline padding and the first block's top margin used to live on v-main
  // itself - moved here, per-block, when v-main's own padding was dropped to
  // match production's structure (HeroParallax needs v-main free of padding
  // to reach full width - see EditorView.vue/PreviewView.vue). "First
  // block" skips over a leading "parallax" block, since that one renders
  // nothing in this loop (it's drawn separately, full-width, above
  // everything - see HeroParallax.vue) and handles its own top spacing via
  // the theme's own #parallax-placeholder.parallax-placeholder--active rule.
  function blockSpacingStyle (block: TemplateBlockModel, index: number) {
    // A footer pseudo-page's one block (see ajax.ts's wrap/unwrap shim) isn't
    // a real page block in production at all - v-footer is a sibling of
    // v-main, not page content flowing through DynamicPageBlockTemplate.vue
    // (which itself has zero horizontal padding of its own - confirmed by
    // reading it directly). FooterEditor.vue's own root carries the real
    // production footer sizing/spacing (max-width 1440, its own margin-top)
    // - this generic per-block treatment would double up on top of that.
    if (block.type === 'footer-1') return {}
    // Hidden blocks take no room, so "first" and "last" are among the shown ones.
    const blocks = pageContent.value?.blocks ?? []
    const isLastBlock = index === blocks.findLastIndex(item => !item.hidden)
    const isFirstRenderedBlock = index === blocks.findIndex(item => item.type !== 'parallax' && !item.hidden)
    const marginBottom = block.type === 'parallax' || isLastBlock ? 0 : commonStore.currentBlockSpacing
    const marginTop = block.type !== 'parallax' && isFirstRenderedBlock ? commonStore.currentBlockSpacing : 0
    if (block.type === 'parallax') return { marginBottom: `${marginBottom}px` }
    // Production has no per-block inline padding at all - only the page's
    // own v-main regulates horizontal edge spacing (max-width + centering,
    // see vuetify-components.css). This clamp() padding is purely editor
    // breathing room so blocks don't touch the screen edges while editing -
    // confirmed live as a real fidelity bug when it leaked into preview
    // mode too (every block visibly narrower than production).
    if (mode.value !== 'edit') {
      return {
        marginBottom: `${marginBottom}px`,
        marginTop: `${marginTop}px`,
      }
    }
    return {
      marginBottom: `${marginBottom}px`,
      marginTop: `${marginTop}px`,
      paddingLeft: 'clamp(16px, 5vw, 48px)',
      paddingRight: 'clamp(16px, 5vw, 48px)',
    }
  }

</script>

<template>
  <div
    v-if="showContent && pageContent"
    :class="[EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME), `mt-${commonStore.pageContentMarginTop}`]"
  >
    <!--
      The v-theme--appTheme class on THIS element (not just the
      <v-theme-provider> below) is deliberate and load-bearing: Vuetify's
      VThemeProvider, without its own with-background prop, never renders a
      DOM element at all - it's a pure provide()/inject() mechanism, so it
      only reaches actual Vuetify components (v-card, v-btn - anything that
      calls useTheme() itself and applies its own theme class to its own
      root). A plain CSS-styled div like TemplateCard.vue's .template-card-1
      isn't a Vuetify component, so it never picks up any theme class from
      the provider below - it just inherits whatever *real* .v-theme--*
      class is nearest above it in the DOM, which without this was v-app's
      own (editorTheme, the app-wide default) - confirmed by inspecting the
      rendered DOM, var(--v-default-border-radius) was resolving to the
      editor's own 8px instead of the previewed page's real palette value.
      <v-theme-provider> is kept alongside this for what it's actually good
      for: providing the theme context to genuine Vuetify components here.
    -->
    <v-theme-provider :theme="APP_THEME_NAME">
      <template v-for="(block, index) of pageContent.blocks" :key="stableKey(block)">
        <!-- Order is changed in the page structure panel and the blocks'
          own menus (usePageBlocks), never by dragging the blocks here. -->
        <div
          v-if="!(mode === 'edit' && isSecondHalfOfImagePair(pageContent.blocks, index))"
          v-show="!block.hidden"
          class="page-block-slot"
          :data-block-index="index"
          :style="blockSpacingStyle(block, index)"
        >
          <!-- "+" in the space above this block: a new block goes here. -->
          <PageInsertGap
            v-if="insertingAllowed && unitPosition(block) !== null"
            :offset="Math.max(16, commonStore.currentBlockSpacing / 2)"
            :position="unitPosition(block)"
          />
          <template v-if="block.hidden" />
          <template v-else-if="block.type === 'parallax'">
            <!-- The page's one hero parallax - extracted out of the normal
            block flow and rendered full-width by HeroParallax.vue (mounted
            above this component in EditorView.vue/PreviewView.vue), matching
            production's App.vue. Renders nothing here - this branch only
            exists so a "parallax" block doesn't fall through to the generic
            template-item branch below (which no longer recognizes that type). -->
          </template>
          <!-- Every other block: the frame with its settings menu, and the
            block itself in the mode the frame gives it - 'edit' only for the
            one block being edited (see PageBlockFrame.vue). -->
          <PageBlockFrame
            v-else
            v-slot="{ mode: blockMode }"
            :block="block"
            :deletable="block.type !== 'footer-1'"
            @delete="imagePairIndices(pageContent.blocks, index) ? requestDeleteImageBlock(index) : requestDeleteBlock(index)"
          >
            <template v-if="block.type === 'section'">
              <EditableBlockWrapper v-if="blockMode === 'edit'" :block="block" type="block">
                <template #actions>
                  <TemplateNestedSectionActions v-model:drag-active="cardGroupDragActive[index]" :block="block" />
                </template>
                <div
                  :id="block.id || `section-${index}`"
                  :class="['d-flex flex-wrap', sectionAlignClass(block, blockMode)]"
                >
                  <template-nested-section v-model:drag-active="cardGroupDragActive[index]" :block-index="index" />
                </div>
              </EditableBlockWrapper>
              <div
                v-else
                :id="block.id || `section-${index}`"
                :class="['d-flex flex-wrap', sectionAlignClass(block, blockMode)]"
              >
                <template-nested-section :block-index="index" />
              </div>
            </template>
            <template v-else-if="block.type === 'float'">
              <EditableBlockWrapper v-if="blockMode === 'edit'" :block="block" type="block">
                <template v-if="isCardWithToolbarImageGroup(block) || isCardWithHoverGroup(block)" #actions>
                  <CardWithToolbarImageGroupActions
                    v-if="isCardWithToolbarImageGroup(block)"
                    v-model:drag-active="cardGroupDragActive[index]"
                    :block="block"
                  />
                  <CardWithHoverGroupActions
                    v-else-if="isCardWithHoverGroup(block)"
                    v-model:drag-active="cardGroupDragActive[index]"
                    :block="block"
                  />
                </template>
                <template-flex-section v-model:drag-active="cardGroupDragActive[index]" :section="block" />
              </EditableBlockWrapper>
              <template-flex-section v-else :section="block" />
            </template>
            <template v-else-if="block.type === 'cards'">
              <EditableCardsBlock
                v-if="blockMode === 'edit'"
                :block="block"
                :card-defaults="cardDefaults(block)"
                @delete-card="requestDeleteCard(block.children as TemplateBlockModel[], $event)"
                @edit-card="openCardEditor(block.children as TemplateBlockModel[], $event, cardDefaults(block), block.uniformCardIcon !== false ? block : undefined)"
              />
              <CardSet v-else :item="block" />
            </template>
            <template v-else-if="block.type === 'tabs'">
              <EditableTabsBlock
                v-if="blockMode === 'edit'"
                :block="block"
                :card-defaults="tabCardDefaults(block)"
                @delete-card="requestDeleteCard(block.children as TemplateBlockModel[], $event)"
                @edit-card="openCardEditor(block.children as TemplateBlockModel[], $event, tabCardDefaults(block), block.uniformCardIcon !== false ? block : undefined)"
              />
              <TabSet v-else :item="block" />
            </template>
            <template v-else-if="block.type === 'image' && imagePairIndices(pageContent.blocks, index)">
              <!-- A desktop/mobile pair (see image-variant.ts) is two real
              blocks, but shown/edited as one unit with its own Desktop/Mobile
              tab switcher - deleting it drops both halves together
              (requestDeleteImageBlock, above). A plain single "image" block
              (no pair) falls through to the generic branch below. -->
              <EditableBlockWrapper v-if="blockMode === 'edit'" :block="block" type="block">
                <ImageVariantBlock
                  :blocks="pageContent.blocks"
                  :desktop-index="imagePairIndices(pageContent.blocks, index)!.desktopIndex"
                  :mobile-index="imagePairIndices(pageContent.blocks, index)!.mobileIndex"
                />
              </EditableBlockWrapper>
              <template-item
                v-else
                :id="`block-${index}`"
                :block-index="index"
                :blocks="pageContent.blocks"
              />
            </template>
            <template v-else-if="block.type === 'dark-fone-section'">
              <!-- Background swatch/add-card live in DarkFoneSectionActions.vue's
              #actions slot, so in edit mode this renders DarkFoneSection
              directly inside the wrapper; otherwise template-item has its own
              dark-fone-section case. -->
              <EditableBlockWrapper v-if="blockMode === 'edit'" :block="block" type="block">
                <template #actions>
                  <DarkFoneSectionActions v-model:drag-active="cardGroupDragActive[index]" :block="block" />
                </template>
                <DarkFoneSection v-model:drag-active="cardGroupDragActive[index]" :section="block" />
              </EditableBlockWrapper>
              <template-item
                v-else
                :id="`block-${index}`"
                :block-index="index"
                :blocks="pageContent.blocks"
              />
            </template>
            <template v-else-if="block.type === 'footer-1'">
              <!-- The one block a footer "pseudo-page" has (see ajax.ts's
              footer-content wrap/unwrap shim) - FooterEditor.vue renders both
              its edit and view modes itself. Not deletable: a footer page
              with no block would have nothing to save. -->
              <EditableBlockWrapper v-if="blockMode === 'edit'" :block="block" type="block">
                <template #actions>
                  <FooterEditorActions
                    v-model:drag-active="cardGroupDragActive[index]"
                    :block="block"
                  />
                </template>
                <FooterEditor
                  v-model:drag-active="cardGroupDragActive[index]"
                  :block="block"
                />
              </EditableBlockWrapper>
              <FooterEditor v-else :block="block" />
            </template>
            <template v-else>
              <!-- header/title/text, text-with-icon, button and carousel have
              their own edit-mode controls (TextFormatMenu, ButtonEditor,
              SliderWithCards' CardContainerActions) and no wrapper. Everything
              else gets the wrapper's toolbar, with the variant switch for the
              components that have variants (configs/component-variants.ts). -->
              <template-item
                v-if="blockMode === 'edit' && blockHasOwnMenu(block.type)"
                :id="`block-${index}`"
                :block-index="index"
                :blocks="pageContent.blocks"
              />
              <EditableBlockWrapper v-else-if="blockMode === 'edit'" :block="block" type="block">
                <template #actions>
                  <ComponentVariantSwitch :block="block" />
                </template>
                <template-item
                  :id="`block-${index}`"
                  :block-index="index"
                  :blocks="pageContent.blocks"
                />
              </EditableBlockWrapper>
              <template-item
                v-else
                :id="`block-${index}`"
                :block-index="index"
                :blocks="pageContent.blocks"
              />
            </template>
          </PageBlockFrame>
        </div>
      </template>
    </v-theme-provider>
    <PageInsertGap v-if="insertingAllowed" end :position="null" />

    <CardEditDialog :block-target="editingCard?.block" :card="editingCardModel" :defaults="editingCard?.defaults" @close="closeCardEditor" />
    <ConfirmDialog
      v-model="deleteDialogOpen"
      :confirm-text="t('common.delete')"
      :text="t('confirm.irreversible')"
      :title="t('block.deleteTitle')"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
/* the "+" between blocks is placed against its block */
.page-block-slot {
  position: relative;
}
</style>
