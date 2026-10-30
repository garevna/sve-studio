<script setup lang="ts">
  import type { GlobalSettingsModel } from '@/types/GlobalSettingsModel'
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, onBeforeMount, ref } from 'vue'
  import EditableBlockWrapper from '@/components/editors/EditableBlockWrapper.vue'
  import SortableList from '@/components/editors/SortableList.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import MenuLinkDialog from '@/components/special/MenuLinkDialog.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { provideFooterBackground } from '@/composables/useFooterBackground'
  import { collectFooterKinds, isLegacyLinksSection, normalisePageLinks } from '@/configs/footer-blocks'
  import { FOOTER_RESPONSIVE_GAP_CLASS } from '@/configs/footer-layout'
  import { FOOTER_FINAL_FRAME, FOOTER_HORIZON, resolveFooterVariant } from '@/configs/footer-variants'
  import { useAjaxStore } from '@/stores/ajax'
  import { useCommonStore } from '@/stores/common'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { emptyTranslatedModel } from '@/utils/locale-text'
  import { stableKey } from '@/utils/stable-key'
  import FooterColumn from './FooterColumn.vue'
  import FooterFinalFrame from './FooterFinalFrame.vue'
  import FooterHorizonSignature from './FooterHorizonSignature.vue'
  import FooterHorizonWave from './FooterHorizonWave.vue'
  import FooterInsertMenu from './FooterInsertMenu.vue'

  const commonStore = useCommonStore()
  const ajaxStore = useAjaxStore()
  const mode = useEditorMode()

  // Stable markers for the right column's three vertically-spaced groups
  // (top: heading+icons, middle: contacts, bottom: visa - see the user's
  // own screenshot of production's real layout) - each is its own
  // type:'section' wrapper so the column can do a genuine 3-way
  // justify-space-between (a flat list of differently-typed siblings can't
  // be grouped that way). Matched by id rather than array position/type
  // alone, since both wrappers share type:'section'.
  const HEADING_ID = 'footer-contacts-heading'
  const TOP_GROUP_ID = 'footer-top-group'
  const CONTACTS_ID = 'footer-contacts-list'
  // Every contact row's icon column uses this exact size, whether or not
  // that row actually has an icon - see migrateRightSectionIfNeeded()'s own
  // comment on why this can't be "match whatever the previous row happens
  // to have" (that only ever worked in this editor, not on the real site).
  // Matches the real flag icons already in this footer's own content.
  const CONTACT_ICON_SIZE = 18

  // `block` is a live reference into the page's own reactive content tree
  // (same convention as DarkFoneSection.vue's `section` prop) - this is the
  // footer-1 root itself (type:'footer-1', children:[feedback,center,right]),
  // reached as the sole top-level block of a footer "pseudo-page" (see
  // ajax.ts's wrap/unwrap shim) or directly in the standalone preview
  // (PreviewView.vue). Fully self-contained - does not delegate to
  // TemplateItem.vue/TemplateFlexSection.vue for its children, same
  // reasoning TemplateCard.vue/DarkFoneSection.vue are self-contained for
  // their own known shape.
  const props = defineProps<{ block: TemplateBlockModel }>()
  const variant = computed(() => resolveFooterVariant(props.block.ver))
  // For the dialogs inside that show the footer's texts (FooterContactsDialog).
  provideFooterBackground(computed(() => props.block.background || 'primary'))

  const dragActive = defineModel<boolean>('dragActive', { default: false })

  // Section widths and the gap between them are plain pixel numbers stored
  // on the content itself, set by whoever builds the footer by dragging the
  // borders - not fixed in this component any more. The numbers below are
  // only what a section starts at before it has ever been dragged. Every
  // value is a multiple of 4 (see useHorizontalResize).
  // Column widths and the gap are the DESIGNER's settings now (UI Kit ->
  // Футер, stored in global.json), not something dragged here. This
  // component only reads the resolved answer.
  const footerLayout = computed(() => commonStore.footerLayout)

  // Vuetify's own column-gap scale: gc-N is N*4px, and every footer size is
  // a multiple of 4 anyway, so the designer's 20px is gc-5. Using the class
  // rather than an inline style keeps the footer speaking the same spacing
  // vocabulary as the rest of the markup.
  //
  // With no explicit setting the gap is responsive (see
  // FOOTER_RESPONSIVE_GAP_CLASS): now that columns are only as wide as
  // their content, the gap is the ONLY thing separating them, and one fixed
  // number cannot be right on both a phone and a 1440px footer.
  const gapClass = computed(() => (footerLayout.value.gapSet
    ? `gc-${Math.min(16, Math.max(0, footerLayout.value.gap / 4))}`
    : FOOTER_RESPONSIVE_GAP_CLASS))

  /* eslint-disable vue/no-mutating-props -- live reference into the page's own content tree, this editor's convention */
  function insertIntoColumn (column: TemplateBlockModel, blockToInsert: TemplateBlockModel) {
    column.children ??= []
    column.children.push(blockToInsert)
  }
  async function removeColumn (index: number) {
    if (!await useUiFeedbackStore().confirmDelete('columnWithContent')) return
    props.block.children?.splice(index, 1)
  }
  /* eslint-enable vue/no-mutating-props */

  function columnStyle (index: number) {
    const width = footerLayout.value.widths[index]
    return width === null || width === undefined
      // No width set - the column is exactly as wide as its own content.
      //
      // It used to share the row equally with the other unset ones
      // (flex: 1 1 0), which looked right in the abstract and wrong on the
      // real footer: a column is far wider than its content, and its
      // content is left-aligned inside it, so the WHITESPACE all collects
      // on one side. Three columns with one identical gap between them
      // ended up looking like a tight gap on the left and a huge one on
      // the right - the gap setting appeared not to work, when what was
      // actually happening was that the column was padding itself out.
      //
      // max-content sizes the box to the longest line in it, so the gap
      // between two columns really is the gap. flex-shrink stays on (0 1)
      // so a narrow viewport can still squeeze them before wrapping.
      ? { flex: '0 1 auto', width: 'max-content', maxWidth: '100%' }
      : { flex: '0 0 auto', width: width + 'px', maxWidth: '100%' }
  }

  // While sections are being rearranged or resized, their CONTENT renders
  // exactly as a visitor will see it - no cogs, no add buttons, no editable
  // fields. Local to this component rather than flipping commonStore.mode:
  // the global switch would also take away the footer's own toolbar, which
  // is where the button to leave the mode lives.
  const sectionEditing = computed(() => mode.value === 'edit' && !dragActive.value)

  /* eslint-disable vue/no-mutating-props */
  function rightSection (): TemplateBlockModel {
    props.block.children ??= []
    props.block.children[2] ??= { type: 'section', width: 350, children: [] }
    props.block.children[2].children ??= []
    return props.block.children[2]
  }
  /* eslint-enable vue/no-mutating-props */

  // Reordering the columns is SortableList's job now (see the template) -
  // and it finally means something, because a column renders whatever it
  // contains rather than whatever its index used to imply.

  // `ml-5` was a manual-margin hack in the old flat-list data, indenting a
  // plain-text row under the icon row above it by hand - obsolete now that
  // every contact row shares one grid with an explicit icon-column width
  // (see CONTACT_ICON_SIZE), and actively wrong once carried over: it adds
  // an EXTRA offset on top of the grid's own alignment instead of the grid
  // replacing it, so text ends up shifted only for rows that happened to
  // have this class (confirmed live). Stripped rather than just ignored,
  // so it can't silently reappear if this class string is ever read again
  // (e.g. from content saved before this fix).
  function stripLegacyIndent (className: string): string {
    return className.split(' ').filter(token => token !== 'ml-5').join(' ').trim()
  }

  function hasRealContent (item: TemplateBlockModel): boolean {
    const content = item.content
    if (!content) return false
    if (typeof content === 'string') return !!content.trim()
    return Object.values(content).some(text => text?.toString().trim())
  }

  // Deep-flattens the whole right section (unwrapping ANY nested type:'section' -
  // a stray/malformed one included) and rebuilds it as exactly [topGroup,
  // contactsGroup?, visa?], every single time - not gated behind an
  // "already migrated" check. That guard used to bail out the instant a
  // top-group marker existed ANYWHERE, even a half-formed one left over
  // from an earlier bug - real content (the actual heading text, real
  // phone numbers) stayed silently stranded outside it, invisible to
  // headingItem()/contactsSection() below, while a blank heading and
  // "Додати блок контактів" showed instead (confirmed live - see the
  // incident this caused). A full flatten+rebuild is idempotent on
  // already-clean content (flattening [topGroup(heading,icons),
  // contactsGroup(items), visa] and rebuilding it produces the exact same
  // shape back), so there's no reason to special-case "already done".
  function migrateRightSectionIfNeeded () {
    const children = rightSection().children!

    const textLikeItems: TemplateBlockModel[] = []
    const iconsCandidates: TemplateBlockModel[] = []
    const visaCandidates: TemplateBlockModel[] = []
    function collect (nodes: TemplateBlockModel[]) {
      for (const node of nodes) {
        if (node.type === 'component' && node.content === 'FooterIcons') {
          iconsCandidates.push(node)
          continue
        }
        if (node.type === 'component' && node.content === 'FooterVisaLogo') {
          visaCandidates.push(node)
          continue
        }
        if (node.type === 'section') {
          if (node.children) collect(node.children)
          continue
        }
        if (node.type === 'text' || node.type === 'text-with-icon') textLikeItems.push(node)
      }
    }
    collect(children)

    // The real heading: prefer one carrying the marker AND real text (the
    // normal case), then any item with real text at all (recovers a
    // heading that lost its marker), then a marked-but-blank one, then
    // just the first text item found - a completely empty footer only
    // reaches the final fallback.
    const textOnly = textLikeItems.filter(item => item.type === 'text')
    const heading = textOnly.find(item => item.id === HEADING_ID && hasRealContent(item))
      || textOnly.find(item => hasRealContent(item))
      || textOnly.find(item => item.id === HEADING_ID)
      || textOnly[0]
      || { type: 'text', class: 'h6 text-medium text-white', content: emptyTranslatedModel() }
    heading.id = HEADING_ID

    // Everything else that has real content is a genuine contact entry -
    // a duplicate blank heading picked up along the way (a leftover from
    // the same bug) has none, so it's dropped rather than resurrected as
    // an empty phone-number-shaped row the user would have to notice and
    // delete by hand.
    //
    // Every contact entry is normalized to type:'text-with-icon' here (icon
    // optional - an empty one just renders a blank icon column, see the
    // template) - older content had a real type:'text'/'text-with-icon'
    // split with two separate add buttons, walked back once it became
    // clear an icon is just an optional attribute of a contact row, not a
    // different kind of row. Also renames a stray legacy `.image` field to
    // `.icon` - confirmed live this was the actual cause of two real
    // entries silently losing their flag icon after an earlier field
    // rename never got applied to already-saved content.
    const contactItems = textLikeItems
      .filter(item => item !== heading && (item.type === 'text-with-icon' || hasRealContent(item)))
      .map((item): TemplateBlockModel => {
        if (item.type === 'text-with-icon') {
          if (!item.icon && item.image) {
            item.icon = item.image
            item.image = undefined
          }
          // Every row - icon or not - carries the SAME explicit size, not a
          // fallback. Production renders each contact row as its own
          // independent TextWithIcon.vue instance with zero awareness of
          // its siblings, so any "match the previous row's icon size"
          // logic (what this editor used to do) only ever works here, not
          // on the real site - confirmed live: rows visibly misaligned
          // there once one had an explicit size and its neighbor didn't.
          // Baking the same value into the data itself is the only fix
          // that produces identical results in both places.
          item.size ??= CONTACT_ICON_SIZE
          if (typeof item.text === 'string') item.text = stripLegacyIndent(item.text)
          return item
        }
        return {
          type: 'text-with-icon',
          icon: '',
          size: CONTACT_ICON_SIZE,
          text: stripLegacyIndent(item.class || 'default-text text-medium text-dark-grey') || 'default-text text-medium text-dark-grey',
          content: item.content,
        }
      })

    const newChildren: TemplateBlockModel[] = [
      { type: 'section', id: TOP_GROUP_ID, children: [heading, iconsCandidates[0] || { type: 'component', content: 'FooterIcons' }] },
    ]
    if (contactItems.length > 0) newChildren.push({ type: 'section', id: CONTACTS_ID, children: contactItems })
    if (visaCandidates[0]) newChildren.push(visaCandidates[0])

    children.splice(0, children.length, ...newChildren)
  }

  // Social icon links live in global.json (GlobalSettingsModel.links),
  // matching production's own always-had-it-there design (FooterIcons.vue
  // reads commonStore.company.links) - NOT on the footer block itself. A
  // per-block copy was tried earlier this session and reverted: these links
  // are a site-wide setting, not something specific to one footer variant.
  const globalSettings = ref<GlobalSettingsModel | null>(null)

  // Every top-level child of the footer is a COLUMN. Historically the first
  // one was a bare component block (the callback card) sitting directly in
  // the row, which only worked while each column's role was hardcoded by
  // index. Wrapping it makes all columns the same kind of thing, which is
  // what lets them be reordered, added to and deleted from uniformly.
  function migrateColumnsIfNeeded () {
    const children = props.block.children
    if (!children) return
    for (const [index, child] of children.entries()) {
      // A links list standing where a column should be. This is the middle
      // column of the footer as it has always been stored, and it is why
      // those links rendered as nothing at all: the list WAS the column, so
      // its type:'route' entries were treated as loose blocks of a column
      // and handed to the generic renderer, which has no case for them.
      // Giving it a real column of its own is what lets it be recognised as
      // one block - with a toolbar, a dialog and a delete of its own.
      if (isLegacyLinksSection(child)) {
        normalisePageLinks(child)
        children.splice(index, 1, { type: 'section', width: child.width, children: [child] })
        continue
      }
      if (child.type !== 'section') {
        children.splice(index, 1, { type: 'section', children: [child] })
        continue
      }
      // A links list already sitting properly inside a column, saved before
      // the type existed.
      for (const block of child.children || []) {
        normalisePageLinks(block)
      }
    }
  }

  onBeforeMount(async () => {
    migrateColumnsIfNeeded()
    migrateRightSectionIfNeeded()
    globalSettings.value = await ajaxStore.getGlobalSettings()
  })

  // Right column: top group (heading + FooterIcons, both fixed presence),
  // an optional "contacts" sub-block (the freely orderable/addable
  // phone-and-address list, edited in its own dialog - see
  // FooterContactsDialog.vue), and an optional FooterVisaLogo component.
  function topGroup (): TemplateBlockModel {
    const children = rightSection().children!
    let group = children.find(child => child.id === TOP_GROUP_ID)
    if (!group) {
      group = { type: 'section', id: TOP_GROUP_ID, children: [] }
      children.unshift(group)
    }
    group.children ??= []
    return group
  }
  function ensureIconsBlock (): void {
    const children = topGroup().children!
    if (!children.some(child => child.type === 'component' && child.content === 'FooterIcons')) {
      children.push({ type: 'component', content: 'FooterIcons' })
    }
  }
  onBeforeMount(() => ensureIconsBlock())

  // Every contact row (icon or not) shares the same two-column grid - a
  // plain text row just leaves its icon column empty instead of getting
  // its own bespoke left-padding, so the text always starts at the exact
  // same x position as the icon rows' own text column. The icon column's
  // width for a non-icon row matches the icon size of the nearest icon row
  // above it (falling back to 48, the same default text-with-icon uses) -
  // purely derived from array order, no per-item setting needed.

  // Which one-off blocks the footer already holds, so the insert menu can
  // stop offering them (see configs/footer-blocks.ts). Computed over the
  // whole footer, not one column: a second contacts list is just as wrong
  // in the column next door.
  const presentKinds = computed(() => [...collectFooterKinds(props.block)])

  // Reordering blocks INSIDE a column, one column at a time. Keyed by the
  // column object rather than by index so the mode follows the column when
  // the columns themselves are rearranged. Only one column can be in this
  // mode at a time - two lists accepting drags at once has no meaning here,
  // and one shared value is simpler than a map that has to be pruned when a
  // column goes away.
  const blockDragColumn = ref<number | null>(null)
  function blockDragActive (column: TemplateBlockModel): boolean {
    return blockDragColumn.value === stableKey(column)
  }
  function toggleBlockDrag (column: TemplateBlockModel) {
    blockDragColumn.value = blockDragActive(column) ? null : stableKey(column)
  }

  const linkDialogOpen = ref(false)
  const linkDialogTarget = ref<TemplateBlockModel | null>(null)
</script>

<template>
  <div
    :class="['footer-editor-root', `footer-editor-root--v${variant}`]"
    :style="{ background: `var(--${block.background || 'primary'})`, '--footer-bg': `var(--${block.background || 'primary'})`, marginTop: `${commonStore.currentBlockSpacing}px` }"
  >
    <!-- The look the footer's `ver` picks (configs/footer-variants.ts) -
      the same pieces the site draws. -->
    <FooterHorizonWave v-if="variant === FOOTER_HORIZON" :color="`var(--${block.background || 'primary'})`" />
    <FooterFinalFrame v-if="variant === FOOTER_FINAL_FRAME" :block="block" :editing="sectionEditing" />
    <!-- justify-center with content-sized columns, NOT justify-space-around.
      space-around would centre things too, but it distributes the LEFTOVER
      room around the columns - so the visible distance between them becomes
      "remainder / n" and never the number the designer set. The two fight
      and space-around wins, which is why the gap setting used to appear to
      do nothing. Sizing each column to its content solves the same problem
      without taking the gap away from the designer: the columns are as wide
      as what is in them, the gap between them is exactly the configured
      one, and the whole group sits centred in the footer.

      align-start ONLY while editing: a column's own chrome (its toolbar, the
      blocks' settings panels) makes the columns wildly different heights,
      and centring them then means nothing lines up with anything. What a
      visitor sees is centred - the footer is designed that way - so preview
      mode here, the preview window and the real site all keep align-center.

      flex-wrap stays, so a narrow screen still wraps the columns and keeps
      them centred. -->
    <SortableList
      v-model:active="dragActive"
      class="footer-columns d-flex flex-wrap justify-center gr-16"
      :class="[gapClass, sectionEditing ? 'align-start' : 'align-center', { 'footer-columns--drag': dragActive }]"
      :items="block.children"
    >
      <template #item="{ item, index, dragClass, contentClass }">
        <!-- Each column is an editable block in its own right, with the same
          chrome every other block in this editor has: its own toolbar for
          inserting into it, and its own delete. Same EditableBlockWrapper
          the "cards"/"free content" blocks use - not a footer-specific
          copy. -->
        <EditableBlockWrapper
          v-if="sectionEditing"
          class="footer-column"
          :class="dragClass"
          :style="columnStyle(index)"
          type="card"
        >
          <template #actions>
            <FooterInsertMenu
              :present-kinds="presentKinds"
              @insert="insertIntoColumn(item, $event)"
            />
            <ToolbarIconButton
              :active="blockDragActive(item)"
              icon="mdi-cursor-move"
              tooltip="Перетягування блоків у колонці"
              @click="toggleBlockDrag(item)"
            />
          </template>
          <template #delete>
            <ToolbarIconButton icon="mdi-delete" tooltip="Видалити колонку" @click="removeColumn(index)" />
          </template>
          <div :class="contentClass">
            <FooterColumn
              :column="item"
              :drag-active="blockDragActive(item)"
              :editing="sectionEditing"
              @update:drag-active="toggleBlockDrag(item)"
            />
          </div>
        </EditableBlockWrapper>
        <div v-else class="footer-column" :class="dragClass" :style="columnStyle(index)">
          <div :class="contentClass">
            <FooterColumn :column="item" :editing="sectionEditing" />
          </div>
        </div>
      </template>
    </SortableList>

    <FooterHorizonSignature v-if="variant === FOOTER_HORIZON" :text="commonStore.companyName" />

    <MenuLinkDialog v-if="linkDialogTarget" v-model="linkDialogOpen" :item="linkDialogTarget" />
  </div>
</template>

<style scoped>
/* This is meant to become the real production footer (see the block-type
   comment in TemplateBlockModel.ts) - matches client-side/App.vue's own
   .v-footer + theme_2/main.css's .app-footer exactly (that's two classes
   on one element there; merged into this single root here since
   FooterEditor.vue owns the whole footer box, not just its inner
   content). PreviewView.vue's own <v-footer> wrapper stays unstyled on
   purpose - this element carries the real sizing, not a nested box inside
   another one. margin-top is set inline (from commonStore.currentBlockSpacing,
   not a fixed value here) - the footer is conceptually the last "block" on
   the page, so the gap above it should be the exact same blockSpacing gap
   used between any two real blocks, not its own independent constant. */
.footer-editor-root {
  color: var(--white);
  border-radius: var(--default-border-radius) var(--default-border-radius) 0 0;
  padding: 40px 40px 16px;
  height: max-content;
  max-width: 1440px;
  width: 100%;
  margin-inline: auto;
}
/* "Bento" - the same tiles the site draws (site/src/App.vue). */
.footer-editor-root--v4 {
  background: transparent !important;
  padding-inline: 0;
}
.footer-editor-root--v4 .footer-columns {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
  gap: 16px !important;
  align-items: stretch !important;
}
.footer-editor-root--v4 .footer-column {
  width: auto !important;
  max-width: none !important;
  padding: clamp(20px, 3vw, 36px);
  border-radius: var(--large-border-radius);
  background: var(--dark);
}
.footer-editor-root--v4 .footer-column:first-child {
  grid-row: span 2;
  background: var(--footer-bg);
}
.footer-editor-root--v4 .footer-column:nth-child(3n) {
  background: var(--secondary);
}
@media (max-width: 760px) {
  .footer-editor-root--v4 .footer-columns { grid-template-columns: minmax(0, 1fr); }
  .footer-editor-root--v4 .footer-column:first-child { grid-row: auto; }
}
.footer-editor-root--v2 {
  position: relative;
  margin-top: calc(clamp(40px, 6vw, 96px) + 24px) !important;
  padding-bottom: 0;
  border-radius: 0;
}
@media screen and (max-width: 390px) {
  .footer-editor-root {
    padding: 20px 12px !important;
  }
}
/* No min-width: that was the other half of the same problem - a floor of
   240px padded out any column whose content was narrower, putting the
   whitespace back on one side. min-width:0 instead, so a flex item is
   allowed to shrink below its content size on a narrow viewport rather than
   forcing the row wider than the footer. */
.footer-column {
  min-width: 0;
}
/* The card's settings pencil, in its own top-right corner rather than under
   it - the card already shows the words, so a control that edits them
   belongs on the card, not as a pair of loose fields below it. */
.footer-card-host {
  position: relative;
}
.footer-card-edit {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
}

/* Both modes make every column's own content inert (ResizableColumn's own
   `inert` prop does that, so the handles stay clickable) - the same
   two-part split EditableCardsBlock.vue documents: pointer-events:none
   stops the gesture being hijacked by a control inside the column, but it
   also stops that element resolving its own cursor, so the cursor has to
   live on the column itself, where the events still land. */
.footer-columns--drag,
.footer-columns--resize {
  --footer-edit-accent: #FFC24B;
}
.footer-columns--drag .footer-column {
  cursor: move;
  outline: dashed 2px var(--footer-edit-accent);
  outline-offset: 4px;
}
/* Resize mode draws ONLY the vertical dividers - no box around each column.
   A border per column drew four lines where there are two real boundaries,
   and boxed the content in a frame that has nothing to do with what's being
   changed. Stretching the row makes every divider run the footer's whole
   height, so a boundary is one continuous line rather than a stub beside
   whichever column happens to be tallest. */
.footer-columns--resize {
  align-items: stretch;
}
.footer-columns--resize .footer-column {
  --resize-accent: var(--footer-edit-accent);
}
.footer-columns--resize :deep(.resizable-column-handle)::before {
  width: 0;
  border-left: dashed 2px var(--footer-edit-accent);
  background: none;
}
/* The draggable gap between two sections. Unlike a section's own border
   handle it has no element to hang off, so it IS the element: a thin strip
   the width of the current gap, sitting in the row's normal flow. */
.footer-item {
  background: #ffffff1a;
  border-radius: var(--v-default-border-radius);
  padding: 8px;
}
.footer-item-caption {
  color: #ffffffb0;
}
.footer-icons-edit {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
}
.footer-icon-img {
  cursor: pointer;
  border-radius: 50%;
  transition: box-shadow 0.15s ease;
}
.footer-icon-img:hover {
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.35);
}
/* Visible marker for an icon with no link configured yet - see
   FooterIconLinkDialog.vue. */
.footer-icon-img--missing {
  border: solid 3px #f50;
  padding: 4px;
}
</style>
