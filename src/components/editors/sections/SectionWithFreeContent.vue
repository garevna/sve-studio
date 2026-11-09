<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, ref } from 'vue'
  import EditableBlockWrapper from '@/components/editors/EditableBlockWrapper.vue'
  import MarginBottomHandle from '@/components/editors/MarginBottomHandle.vue'
  import SortableList from '@/components/editors/SortableList.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import CardEditDialog from '@/components/templates/cards/CardEditDialog.vue'
  import EditableCardsBlock from '@/components/templates/cards/EditableCardsBlock.vue'
  import EditableTabsBlock from '@/components/templates/cards/EditableTabsBlock.vue'
  import TemplateItem from '@/components/templates/TemplateItem.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { cardDefaults, tabCardDefaults } from '@/utils/card-defaults'
  import { stableKey } from '@/utils/stable-key'
  import FreeContentInsertMenu from './FreeContentInsertMenu.vue'

  const commonStore = useCommonStore()
  const mode = useEditorMode()

  // Which column: one half of a page's section (blockIndex/sectionIndex),
  // or a column handed over whole - a popup's content (PopupEditorDialog).
  const props = defineProps<{
    blockIndex?: number
    sectionIndex?: number
    section?: TemplateBlockModel
  }>()

  const record = computed(() => {
    if (props.section) return props.section
    if (!commonStore.dynamicPageContent || props.blockIndex === undefined || props.sectionIndex === undefined) return null
    return (commonStore.dynamicPageContent as { blocks: TemplateBlockModel[] }).blocks[props.blockIndex]?.children?.[props.sectionIndex] || null
  })

  // TemplateItem.vue's own `item` computed setter defaults to
  // commonStore.updateDynamicPageContent, which writes into the page's
  // TOP-LEVEL blocks array - wrong array entirely for a nested half's own
  // children, so it's passed explicitly here (see TemplateItem.vue's own
  // comment on the updateItem prop for why this matters).
  function updateChild (index: number, value: TemplateBlockModel) {
    if (record.value?.children) record.value.children.splice(index, 1, value)
  }

  async function removeChild (index: number) {
    if (!await useUiFeedbackStore().confirmDelete('element')) return
    record.value?.children?.splice(index, 1)
  }

  function insertChild (block: TemplateBlockModel) {
    if (!record.value) return
    record.value.children ??= []
    record.value.children.push(block)
  }

  // Drag-reorder and margin-adjustment are mutually exclusive edit modes -
  // doing both at once doesn't make sense, and each one hides the other's
  // controls (and every item's own delete button) to give its own handles
  // a clean, uncluttered surface to work with. Two independent booleans
  // (not a shared enum) so useSortableList's existing Ref<boolean> wiring
  // stays untouched - each toggle just clears the other on click.
  const dragActive = ref(false)
  const marginActive = ref(false)
  function toggleDrag () {
    dragActive.value = !dragActive.value
    if (dragActive.value) marginActive.value = false
  }
  function toggleMargin () {
    marginActive.value = !marginActive.value
    if (marginActive.value) dragActive.value = false
  }

  // header/title/text (TextEditor.vue's own gear button -> local expand
  // panel, delete folded into that panel via "deletable") and text-with-icon
  // (same TextEditor for its text half, plus IconEditor.vue's own
  // click-to-open dialog for the icon half - also fully self-contained, no
  // Teleport/ancestor-toolbar dependency at all) are the item shapes with a
  // complete, local edit UI of their own. Wrapping one in EditableBlockWrapper
  // too doubles up: an empty toolbar strip (nothing to put in #actions - the
  // gear button/icon click already live inline) plus the dotted border box,
  // just to host a delete button the item's own panel already has room for -
  // extra height and a redundant control surface for no benefit.
  //
  // Every OTHER free-content item type (image, button, swiper...) still
  // needs the wrapper: their own edit controls Teleport into the nearest
  // ancestor toolbar rather than living locally, and that ancestor needs to
  // be THIS per-item wrapper, not the section's own shared one two levels
  // up (which would misroute them into the add/drag/margin toolbar instead).
  function isSelfContainedField (block: TemplateBlockModel): boolean {
    return block.type === 'header' || block.type === 'title' || block.type === 'text' || block.type === 'text-with-icon'
  }

  // A "cards" block brings its own EditableBlockWrapper (with the set's own
  // toolbar: add a card, reorder, icon look, fill, variant), so it is not
  // wrapped a second time here - same reasoning as isSelfContainedField
  // above, only the complete control surface lives in EditableCardsBlock
  // rather than inline in the field.
  //
  // The card dialog is per-column rather than shared with the page's own
  // (DynamicPageTemplate.vue owns that one): a column reaches its cards
  // through its own `record`, and the page-level dialog is handed a concrete
  // children array by whoever opens it. Two independent owners, one dialog
  // component.
  const editingCard = ref<{ cards: TemplateBlockModel[], index: number, defaults?: Partial<TemplateBlockModel>, block?: TemplateBlockModel } | null>(null)
  const editingCardModel = computed(() => (editingCard.value ? editingCard.value.cards[editingCard.value.index] : null) ?? null)
  function openCardEditor (block: TemplateBlockModel, index: number) {
    editingCard.value = {
      cards: block.children as TemplateBlockModel[],
      index,
      // a tab's card is as wide as its block
      defaults: block.type === 'tabs' ? tabCardDefaults(block) : cardDefaults(block),
      // Matches DynamicPageTemplate.vue: with a uniform icon look, edits to
      // any one card's icon land on the block every card reads from.
      block: block.uniformCardIcon === false ? undefined : block,
    }
  }
  async function removeCard (block: TemplateBlockModel, index: number) {
    if (!await useUiFeedbackStore().confirmDelete('card')) return
    block.children?.splice(index, 1)
  }
</script>

<template>
  <EditableBlockWrapper v-if="mode === 'edit'" class="section-with-free-content" type="block">
    <template #actions>
      <FreeContentInsertMenu @insert="insertChild" />
      <ToolbarIconButton
        :active="dragActive"
        icon="mdi-cursor-move"
        :tooltip="t('block.dragElements')"
        @click="toggleDrag"
      />
      <ToolbarIconButton
        :active="marginActive"
        icon="mdi-arrow-split-horizontal"
        :tooltip="t('block.spacingSettings')"
        @click="toggleMargin"
      />
    </template>
    <SortableList v-model:active="dragActive" :items="record?.children">
      <template #item="{ item: child, index: num, dragClass, contentClass }">
        <!-- The item's own OUTER element (what Sortable drags) versus what
          goes inert inside it - see SortableList.vue for why they can never
          be the same element. Self-contained field types keep a bare div
          here rather than EditableBlockWrapper: their edit UI already lives
          inline (TextEditor's own panel, IconEditor's dialog), so the
          wrapper would add an empty toolbar strip and a second border box
          around a control surface that's already complete. -->
        <div v-if="isSelfContainedField(child)" :class="dragClass">
          <template-item
            :block-index="num"
            :blocks="record?.children as TemplateBlockModel[]"
            :class="contentClass"
            :deletable="!dragActive && !marginActive"
            :update-item="updateChild"
            @delete="removeChild(num)"
          />
        </div>
        <EditableCardsBlock
          v-else-if="child.type === 'cards'"
          :block="child"
          :card-defaults="cardDefaults(child)"
          :class="dragClass"
          @delete="removeChild(num)"
          @delete-card="removeCard(child, $event)"
          @edit-card="openCardEditor(child, $event)"
        />
        <!-- Tabs are a set of cards too, with the same toolbar. -->
        <EditableTabsBlock
          v-else-if="child.type === 'tabs'"
          :block="child"
          :card-defaults="tabCardDefaults(child)"
          :class="dragClass"
          @delete-card="removeCard(child, $event)"
          @edit-card="openCardEditor(child, $event)"
        />
        <EditableBlockWrapper v-else :class="dragClass" type="card">
          <template v-if="!dragActive && !marginActive" #delete>
            <ToolbarIconButton icon="mdi-delete" :tooltip="t('block.deleteElement')" @click="removeChild(num)" />
          </template>
          <div :class="contentClass">
            <template-item
              :block-index="num"
              :blocks="record?.children as TemplateBlockModel[]"
              :update-item="updateChild"
              @delete="removeChild(num)"
            />
          </div>
        </EditableBlockWrapper>
      </template>

      <!-- The gap TO the next item, so it only exists between two of them -
        SortableList never renders this slot after the last. Bound to the
        upper item's own class, since mb-N is a property of that element
        wherever the control is drawn. Mutually exclusive with drag mode via
        the toggles above, so Sortable never sees these during a drag. -->
      <template #between="{ item: child }">
        <margin-bottom-handle v-if="marginActive" v-model:class="child.class" />
      </template>
    </SortableList>
    <CardEditDialog
      :block-target="editingCard?.block"
      :card="editingCardModel"
      :defaults="editingCard?.defaults"
      @close="editingCard = null"
    />
  </EditableBlockWrapper>
  <div v-else class="section-with-free-content">
    <template v-for="(child, num) of record?.children" :key="stableKey(child)">
      <template-item :block-index="num" :blocks="record?.children as TemplateBlockModel[]" />
    </template>
  </div>
</template>

<style scoped>
  .section-with-free-content {
    min-height: 240px;
  }

</style>
