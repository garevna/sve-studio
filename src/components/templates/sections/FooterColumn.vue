<script setup lang="ts">
  import type { TemplateBlockModel, TranslatedModel } from '@/types/TemplateBlockModel'
  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'
  import EditableBlockWrapper from '@/components/editors/EditableBlockWrapper.vue'
  import TextFormatMenu from '@/components/editors/text/TextFormatMenu.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import TemplateItem from '@/components/templates/TemplateItem.vue'
  import { useSortableList } from '@/composables/useSortableList'
  import { isLegacyLinksSection, isPageLinks, VISA_LOGO_NATURAL_WIDTH, VISA_LOGO_SIZES } from '@/configs/footer-blocks'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { resolveLocaleText } from '@/utils/locale-text'
  import { stableKey } from '@/utils/stable-key'
  import FeedbackCard from './FeedbackCard.vue'
  import FeedbackCardDialog from './FeedbackCardDialog.vue'
  import FooterContacts from './FooterContacts.vue'
  import FooterIcons from './FooterIcons.vue'
  import FooterLinks from './FooterLinks.vue'
  import FooterVisaLogo from './FooterVisaLogo.vue'

  // One footer column, rendering whatever blocks it actually contains.
  //
  // This is what replaces the three hardcoded columns FooterEditor.vue used
  // to draw. Those bound a fixed ROLE to an INDEX - slot 0 was always the
  // callback card, slot 1 always the links - so reordering the array moved
  // the sections without moving their content, and the footer scrambled.
  // Deciding what to draw from the block itself is what makes reordering
  // (and inserting, and deleting) mean anything at all.
  //
  // Dispatch order matters: the ready-made list blocks are recognised
  // first, because both are type:'section' and would otherwise fall into
  // the generic recursion and lose the internal spacing they exist for.
  const props = defineProps<{
    column: TemplateBlockModel
    // False while columns are being dragged or resized: content renders
    // exactly as a visitor sees it, with no editing chrome in the way.
    editing?: boolean
  }>()

  // Reordering the blocks WITHIN this column, toggled from the column's own
  // toolbar (FooterEditor.vue owns the button, this owns the list) - the
  // same toggle convention every other list in this editor uses.
  const dragActive = defineModel<boolean>('dragActive', { default: false })
  const { container } = useSortableList(() => props.column.children, dragActive)
  // While blocks are being dragged, their own chrome is out of the way -
  // what is on screen is what a visitor sees, and a toolbar button under
  // the cursor would swallow the drag gesture.
  const blocksEditing = computed(() => props.editing && !dragActive.value)

  const feedback = useUiFeedbackStore()
  const { locale } = storeToRefs(useCommonStore())

  // Which card's settings dialog is open, by index. Kept here rather than on
  // the block: that object is page CONTENT, saved and published - transient
  // UI state has no business in it.
  const cardDialogIndex = ref<number | null>(null)

  const CONTACTS_ID = 'footer-contacts-list'

  type FooterBlockKind = 'feedback' | 'icons' | 'visa' | 'contacts' | 'links' | 'group' | 'generic'

  // Block kinds that render their own toolbar, with their own delete in it.
  // A floating delete in the column's corner was ambiguous - nothing said
  // whether it removed the block or the column - so every block that has
  // somewhere better to put it does, and only the kinds with no settings of
  // their own still fall back to the corner button.
  const SELF_CHROMED = new Set<FooterBlockKind>(['links', 'contacts', 'icons', 'visa', 'feedback', 'group', 'generic'])

  function kindOf (block: TemplateBlockModel): FooterBlockKind {
    if (block.type === 'component') {
      if (block.content === 'FeedbackCard') return 'feedback'
      if (block.content === 'FooterIcons') return 'icons'
      if (block.content === 'FooterVisaLogo') return 'visa'
    }
    // Its own type now (see configs/footer-blocks.ts). The legacy shape is
    // still recognised so content saved before the type existed opens
    // correctly even if FooterEditor's normalisation hasn't reached it.
    if (isPageLinks(block) || isLegacyLinksSection(block)) return 'links'
    if (block.type === 'section') {
      if (block.id === CONTACTS_ID) return 'contacts'
      return 'group'
    }
    return 'generic'
  }

  // A column's own children array is what everything here edits in place -
  // the live reference convention this editor uses everywhere.
  async function removeBlock (children: TemplateBlockModel[], index: number) {
    if (!await feedback.confirmDelete('block')) return
    children.splice(index, 1)
  }

  // Kept in the block's own `props`, not in its top-level `width` - that is
  // where a type:'component' block's settings belong, and the only place
  // consumers look: both the preview app and production render these blocks
  // by spreading item.props into the component, so a width stored anywhere
  // else would be an editor-only setting that never reaches the page.
  function visaWidth (block: TemplateBlockModel): number {
    return (block.props as { width?: number } | undefined)?.width || VISA_LOGO_NATURAL_WIDTH
  }
  function setVisaWidth (block: TemplateBlockModel, width: number) {
    block.props = { ...block.props, width }
  }

  // Blocks whose text the format menu can act on. Anything else in a
  // column (an image, say) gets a toolbar with only its delete.
  const TEXT_KINDS = new Set(['text', 'header', 'title'])
  function isTextBlock (block: TemplateBlockModel): boolean {
    return TEXT_KINDS.has(block.type)
  }
  function setBlockClass (block: TemplateBlockModel, value: string) {
    block.class = value
  }

  type FeedbackProps = { type?: string, title?: TranslatedModel, text?: TranslatedModel }
  function feedbackProps (block: TemplateBlockModel): FeedbackProps {
    return (block.props ??= {}) as FeedbackProps
  }
  // FeedbackCard is a visual clone that takes already-resolved strings, not
  // TranslatedModels - the locale switch happens here.
  function cardText (block: TemplateBlockModel, field: 'title' | 'text'): string {
    return resolveLocaleText(feedbackProps(block)[field], locale.value)
  }
</script>

<template>
  <div ref="container" class="footer-column-blocks">
    <template v-for="(block, index) of column.children" :key="stableKey(block)">
      <!-- No floating corner buttons any more: every block puts its delete
        in its own settings panel, where it is unambiguous which block it
        acts on. A delete standing on its own above a block was exactly the
        confusion this removes. SELF_CHROMED is what is left of that rule -
        a safety net, not a switch anything currently needs. -->
      <div class="footer-column-block" :class="{ 'sortable-drag-cursor': editing && dragActive }">
        <ToolbarIconButton
          v-if="editing && !SELF_CHROMED.has(kindOf(block))"
          class="footer-column-block-delete"
          icon="mdi-delete"
          :tooltip="t('common.deleteBlock')"
          @click="removeBlock(column.children!, index)"
        />

        <!-- The callback card, with a real toolbar instead of the pencil
          and delete that used to float over its own corner - nothing there
          said whether they acted on the card, the column, or the block
          below it. -->
        <template v-if="kindOf(block) === 'feedback'">
          <EditableBlockWrapper v-if="blocksEditing" type="block">
            <template #actions>
              <ToolbarIconButton
                icon="mdi-playlist-edit"
                :tooltip="t('cards.edit')"
                @click="cardDialogIndex = index"
              />
            </template>
            <template #delete>
              <ToolbarIconButton
                icon="mdi-delete"
                :tooltip="t('common.deleteBlock')"
                @click="removeBlock(column.children!, index)"
              />
            </template>
            <FeedbackCard
              :text="cardText(block, 'text')"
              :title="cardText(block, 'title')"
              :type="feedbackProps(block).type || 'call-request'"
            />
            <FeedbackCardDialog
              :card="feedbackProps(block)"
              :model-value="cardDialogIndex === index"
              @update:model-value="value => cardDialogIndex = value ? index : null"
            />
          </EditableBlockWrapper>
          <FeedbackCard
            v-else
            :text="cardText(block, 'text')"
            :title="cardText(block, 'title')"
            :type="feedbackProps(block).type || 'call-request'"
          />
        </template>

        <!-- The one block type that brings its own toolbar: its actions
          (edit entries, format them all, reorder) are block-level, and it
          renders its own EditableBlockWrapper around them - including the
          delete, which is why the corner button above is suppressed for
          it. -->
        <FooterLinks
          v-else-if="kindOf(block) === 'links'"
          :block="block"
          :preview="!blocksEditing"
          @delete="removeBlock(column.children!, index)"
        />

        <FooterContacts
          v-else-if="kindOf(block) === 'contacts'"
          :preview="!blocksEditing"
          :section="block"
          @delete-section="removeBlock(column.children!, index)"
        />

        <!-- Social icons need no settings of their own - the networks and
          their URLs are a site-wide setting in global.json, not this
          block's business - so its toolbar carries nothing but the delete.
          Wrapped here rather than inside FooterIcons.vue, which is a
          faithful clone of the client-side component and stays free of
          editor chrome. -->
        <template v-else-if="kindOf(block) === 'icons'">
          <EditableBlockWrapper v-if="blocksEditing" type="block">
            <template #delete>
              <ToolbarIconButton
                icon="mdi-delete"
                :tooltip="t('common.deleteBlock')"
                @click="removeBlock(column.children!, index)"
              />
            </template>
            <FooterIcons />
          </EditableBlockWrapper>
          <FooterIcons v-else />
        </template>

        <!-- The logo's one setting is how big it is shown. Named sizes, not
          a pixel field: the artwork has one fixed aspect ratio and the only
          real question is how prominent it should be (see
          configs/footer-blocks.ts). -->
        <template v-else-if="kindOf(block) === 'visa'">
          <EditableBlockWrapper v-if="blocksEditing" type="block">
            <template #actions>
              <v-select
                class="footer-visa-size"
                density="compact"
                hide-details
                item-title="label"
                item-value="width"
                :items="VISA_LOGO_SIZES"
                :label="t('common.size')"
                :model-value="visaWidth(block)"
                variant="outlined"
                @update:model-value="setVisaWidth(block, $event)"
              />
            </template>
            <template #delete>
              <ToolbarIconButton
                icon="mdi-delete"
                :tooltip="t('common.deleteBlock')"
                @click="removeBlock(column.children!, index)"
              />
            </template>
            <FooterVisaLogo :width="visaWidth(block)" />
          </EditableBlockWrapper>
          <FooterVisaLogo v-else :width="visaWidth(block)" />
        </template>

        <!-- A plain grouping section (the right column's own top group, for
          instance) - recurse, so nothing has to be flattened in the data
          just to be rendered. It gets no chrome of its own: it is a layout
          wrapper the migration creates, not a block anyone added, and a
          delete button above it read as an unexplained control over
          something invisible. Its children each carry their own. -->
        <FooterColumn
          v-else-if="kindOf(block) === 'group'"
          :column="block"
          :editing="blocksEditing"
        />

        <!-- Everything else - text, text with icon, image, button - goes
          through the generic renderer, which already knows how to edit each
          of them (including whether its text is formattable at all: see
          configs/text-format-support.ts). No footer-specific copy of any of
          that. -->
        <!-- Format and delete both live on the block's own toolbar, not in a
          panel under the text. A footer column is ~270px wide: the panel
          fits, but the delete at its far right did not, and hung outside
          the panel with nothing to say what it belonged to. The toolbar has
          room for both and already says which block it acts on - the same
          arrangement the links and contacts blocks use. -->
        <EditableBlockWrapper v-else-if="blocksEditing" type="card">
          <template #actions>
            <TextFormatMenu
              v-if="isTextBlock(block)"
              :class="block.class || ''"
              parent-type="usual"
              @update:class="setBlockClass(block, $event)"
            />
          </template>
          <template #delete>
            <ToolbarIconButton
              icon="mdi-delete"
              :tooltip="t('common.deleteBlock')"
              @click="removeBlock(column.children!, index)"
            />
          </template>
          <TemplateItem
            :block-index="index"
            :blocks="column.children as TemplateBlockModel[]"
            :formattable="false"
          />
        </EditableBlockWrapper>
        <TemplateItem
          v-else
          :block-index="index"
          :blocks="column.children as TemplateBlockModel[]"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Wide enough for the longest size name, narrow enough to leave the
   toolbar to the delete button beside it. */
.footer-visa-size {
  max-width: 180px;
}
.footer-column-blocks {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.footer-column-block {
  position: relative;
}
.footer-column-block-delete {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
}
.footer-column-block-edit {
  position: absolute;
  top: 8px;
  right: 40px;
  z-index: 2;
}
</style>
