<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, ref } from 'vue'
  import EditableBlockWrapper from '@/components/editors/EditableBlockWrapper.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import ConfirmDialog from '@/components/special/ConfirmDialog.vue'
  import TemplateItem from '@/components/templates/TemplateItem.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { useSortableList } from '@/composables/useSortableList'
  import { t } from '@/i18n'
  import { readColumnGapPx } from '@/utils/column-gap-class'
  import { stableKey } from '@/utils/stable-key'
  import CardWithHoverEditDialog from '../cards/CardWithHoverEditDialog.vue'
  // import TemplateNestedSection from './TemplateNestedSection.vue'

  const props = defineProps<{ section: TemplateBlockModel }>()

  const mode = useEditorMode()

  // Only meaningful for a card-with-toolbar-image group (see
  // CardWithToolbarImageGroupActions.vue, which is the only thing that
  // toggles this on) - a plain float section (image-left/right,
  // free-content) never gets a way to set it true in the first place, so
  // wiring Sortable here unconditionally is harmless for those.
  const dragActive = defineModel<boolean>('dragActive', { default: false })
  const { container: sectionContainer } = useSortableList(() => props.section.children, dragActive)

  // The column gap lives in the section's own class string as Vuetify's
  // gc-N (see utils/column-gap-class.ts) - a value picked from a finite list
  // in the toolbar, not typed. ga-4 is what this container hardcoded before
  // any of them had one, so an untouched section keeps its current look.
  const gapClass = computed(() => (readColumnGapPx(props.section.class) > 0 ? props.section.class : 'ga-4'))

  // card-with-toolbar-image (self-edits inline - its own image-upload fab +
  // text editors) and card-with-hover (a type:'component' block, content
  // 'CardWithHover' - see card-with-hover.ts) are the two child types this
  // component treats as individually deletable cards, each with its own
  // small delete fab (top-right corner, non-competing with whatever's
  // inside - e.g. the upload fab at bottom-start for the toolbar-image
  // case - same convention as ImageEditor.vue's top-level image blocks).
  // Local to this component since a float section can nest arbitrarily
  // deep and has no reliable path back up to DynamicPageTemplate.vue's
  // shared confirm dialog.
  function isDraggableCard (block: TemplateBlockModel): boolean {
    return block.type === 'card-with-toolbar-image' || (block.type === 'component' && block.content === 'CardWithHover')
  }

  // A card-with-toolbar-image card's own width is a fixed pixel value
  // (card.width, read by CardWithToolbarImage.vue itself) - in edit mode it
  // renders inside EditableBlockWrapper's .editable-block-content, which
  // has its own 20px padding on every side (pa-5). Without compensating,
  // that padding pushes the card's fixed-width box 20px right of where this
  // wrapper thinks its content should end, so the card visibly overflows
  // the dotted block border by 20px. Preview mode never wraps in
  // EditableBlockWrapper at all, so it needs no adjustment - it already
  // matches production's own unpadded width exactly.
  // A card with hover keeps its width in its component props (the group's
  // "Ширина карток"; 240 when unset) - its column is that wide, so the card
  // fills it instead of sitting at the left of a 360px column.
  // NOTE: the site's TemplateFlexSection.vue does the same.
  function hoverCardWidth (block: TemplateBlockModel): number {
    if (block.type !== 'component' || block.content !== 'CardWithHover') return 0
    return Number((block.props as Record<string, unknown> | undefined)?.width) || 240
  }

  function cardWrapperWidth (block: TemplateBlockModel): string {
    const base = block.width || hoverCardWidth(block) || 360
    const padded = mode.value === 'edit' && isDraggableCard(block)
    return (padded ? base + 40 : base) + 'px'
  }

  // card-with-toolbar-image self-edits inline (its own upload fab + text
  // editors right on the card), so it needs no extra pencil here - only
  // card-with-hover, whose two background/content sides have nowhere else
  // to be edited, gets one (see CardWithHoverEditDialog.vue).
  function isCardWithHover (block: TemplateBlockModel): boolean {
    return block.type === 'component' && block.content === 'CardWithHover'
  }
  const editingHoverIndex = ref<number | null>(null)
  const editingHoverCard = computed(() =>
    (editingHoverIndex.value === null ? null : props.section.children?.[editingHoverIndex.value]) ?? null)
  function openHoverCardEditor (index: number) {
    editingHoverIndex.value = index
  }
  function closeHoverCardEditor () {
    editingHoverIndex.value = null
  }

  const deleteDialogOpen = ref(false)
  let pendingDeleteIndex: number | null = null
  function requestDeleteCard (index: number) {
    pendingDeleteIndex = index
    deleteDialogOpen.value = true
  }
  function confirmDeleteCard () {
    // eslint-disable-next-line vue/no-mutating-props
    if (pendingDeleteIndex !== null) props.section.children?.splice(pendingDeleteIndex, 1)
    pendingDeleteIndex = null
    deleteDialogOpen.value = false
  }
</script>

<template>
  <div
    ref="sectionContainer"
    class="d-flex flex-wrap align-stretch justify-space-around"
    :class="gapClass"
  >
    <!-- Keyed on the child object, not its index - see EditableCardsBlock.vue's
      matching comment for why: Sortable physically moves the DOM node
      during a drag, and a positional key makes Vue's own reconciliation
      disagree with where it actually ended up. -->
    <template v-for="(block, index) of props.section.children" :key="stableKey(block)">
      <div
        :class="[block.class, { 'card-drag-cursor': dragActive && isDraggableCard(block) }]"
        :style="{ width: cardWrapperWidth(block) }"
      >
        <template v-if="block.type === 'section'">
          <div v-for="(child, num) of block.children" :key="num">
            <template-item :block-index="num" :blocks="block.children as TemplateBlockModel[]" />
          </div>
        </template>
        <template v-else-if="mode === 'edit' && isDraggableCard(block)">
          <EditableBlockWrapper type="card">
            <!-- card-with-hover gets an edit action alongside delete; card-
              with-toolbar-image self-edits inline and only needs delete. -->
            <template v-if="!dragActive && isCardWithHover(block)" #actions>
              <ToolbarIconButton icon="mdi-pencil" :tooltip="t('cards.edit')" @click="openHoverCardEditor(index)" />
            </template>
            <template v-if="!dragActive" #delete>
              <ToolbarIconButton icon="mdi-delete" :tooltip="t('cards.delete')" @click="requestDeleteCard(index)" />
            </template>
            <template-item
              :block-index="index"
              :blocks="props.section.children as TemplateBlockModel[]"
              :class="{ 'card-drag-active': dragActive }"
              :group="props.section"
            />
          </EditableBlockWrapper>
        </template>
        <template v-else>
          <template-item :block-index="index" :blocks="props.section.children as TemplateBlockModel[]" :group="props.section" />
        </template>
      </div>
    </template>
  </div>

  <ConfirmDialog
    v-model="deleteDialogOpen"
    :confirm-text="t('common.delete')"
    :text="t('confirm.irreversible')"
    :title="t('cards.deleteTitle')"
    @confirm="confirmDeleteCard"
  />

  <CardWithHoverEditDialog :block="editingHoverCard" @close="closeHoverCardEditor" />
</template>

<style scoped>
.card-drag-active {
  /* Blocks clicks/selection on the card's own content while dragging is
     active - critical here specifically, since card-with-toolbar-image
     self-edits inline (image-upload fab, contenteditable text) rather than
     through a menu/dialog, so a drag gesture would otherwise get hijacked
     by whatever's under the pointer. The event falls through to this
     element's parent instead, which is what Sortable actually tracks as
     the draggable item - applied to template-item (the card's own content),
     never to that parent wrapper itself. Note: pointer-events:none also
     means THIS element no longer resolves its own "cursor" - that lives on
     the parent instead (.card-drag-cursor, on the width-styled wrapper div
     above). */
  pointer-events: none;
}
.card-drag-cursor {
  cursor: move;
}
</style>
