<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { ref } from 'vue'
  import { provideBlockActionsTarget } from '@/composables/useEditableBlockActions'
  import BlockAnchorButton from './BlockAnchorButton.vue'

  // Editable-block chrome: any block the user can act on (a card, a whole
  // carousel, a free-content slot, an added text item) gets the same visual
  // treatment in edit mode - a dotted border, vertical padding so stacked
  // blocks don't visually merge, and a real top toolbar (in normal document
  // flow) instead of an absolutely-positioned corner fab. The old
  // corner-floating convention (position:absolute, ignoring document flow)
  // caused real, recurring overlap bugs whenever a block's own corner chrome
  // floated directly over a child's own controls, or over another
  // component's own internal floating button - a toolbar in normal flow
  // pushes the content slot (and anything absolutely positioned inside it,
  // which sizes relative to ITS OWN box) down and clear of this, with no
  // manual spacing compensation needed anywhere.
  //
  // Two named slots instead of one flat #actions blob: #actions (left-
  // aligned, every non-delete action) and #delete (right-aligned, always
  // last) - matches the project convention that delete always sits apart
  // from and after the rest of a block's own actions.
  //
  // This component is only ever mounted in edit mode - callers gate it with
  // v-if="mode === 'edit'" themselves and render their bare, production-
  // faithful markup directly (no wrapper at all) in the v-else branch,
  // rather than relying on this component to hide its own chrome. Keeps
  // preview mode's DOM/layout identical to what a real user would see, with
  // zero risk of an editor-only element leaking into it.
  //
  // actionsRef is provided so a leaf editor several layers deep in the
  // default slot (TextEditor.vue, SwiperImagesEditor.vue, ImageEditor.vue,
  // ButtonEditor.vue - all reached through TemplateItem.vue's own generic
  // dispatch, which has no toolbar of its own) can Teleport its own action
  // button(s) straight into this toolbar instead of floating separately -
  // see useEditableBlockActions.ts. Only exists while the toolbar itself
  // does (gated on the same $slots check below), so a caller that passes
  // neither #actions nor #delete never grows a toolbar just because
  // something deep inside wants to teleport into it - that's deliberate,
  // matching this component's own "callers opt in explicitly" contract.
  // noInlinePadding: for a block whose own content must span the full
  // width of the page's own container to match production exactly (e.g.
  // "cards" - see EditableCardsBlock.vue) - the horizontal half of pa-5
  // would otherwise inset that content 20px from each edge with nothing in
  // production to match it, on top of the page container's own inline
  // padding. Keeps the vertical padding (breathing room between the
  // toolbar and stacked blocks) - only the inline half is conditional.
  // block: the page block this wrapper is around. Passing it adds the
  // "name this block" control to the toolbar - one place instead of the same
  // button repeated at every call site. Only page-level blocks pass it: a
  // footer's own blocks are not somewhere a link can jump to.
  defineProps<{ type: 'block' | 'card', noInlinePadding?: boolean, block?: TemplateBlockModel }>()

  const actionsRef = ref<HTMLElement | null>(null)
  provideBlockActionsTarget(actionsRef)
</script>

<template>
  <div class="editable-block">
    <!-- This whole wrapper renders inside DynamicPageTemplate.vue's own
      <v-theme-provider theme="appTheme"> (it wraps ALL of that component's
      output, edit-mode chrome included, not just the production-faithful
      content) - without re-declaring the editor's own theme here, every
      button passed through these slots would silently inherit the
      previewed page's own palette/radius instead of the editor's, even
      though it's pure editor UI, not page content. -->
    <v-theme-provider v-if="$slots.actions || $slots.delete || block" theme="editorTheme">
      <v-toolbar class="editable-block-toolbar editor-panel" density="compact">
        <div ref="actionsRef" class="editable-block-toolbar-actions">
          <slot name="actions" />
          <!-- Last among the everyday actions and before the delete: naming
            a block is a rare, structural thing, not something reached for
            while editing content. -->
          <BlockAnchorButton v-if="block" :block="block" />
        </div>
        <v-spacer />
        <slot name="delete" />
      </v-toolbar>
    </v-theme-provider>
    <div class="editable-block-content py-5" :class="noInlinePadding ? '' : 'px-5'">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.editable-block {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  border: dotted 2px #ddd;
  border-radius: 8px;
  padding: 0;
}
/* The panel look, stated here rather than left to .editor-panel. That class
   loses every one of its non-important declarations on a v-toolbar:
   `.v-toolbar { background: rgb(var(--v-theme-surface-light)) }` ties it on
   specificity (0,1,0) and Vuetify's stylesheet is injected later, so only
   the `color: ... !important` survived - confirmed in DevTools, background,
   border and border-radius all struck through. A scoped selector here is
   0,2,0 and wins outright, with no !important anywhere.

   `color="transparent"` came off the toolbar for the same reason: it adds
   Vuetify's own .bg-transparent, whose `background-color: transparent
   !important` no amount of specificity can outrank. */
.editable-block-toolbar {
  margin-bottom: 12px;
  background: #EEF2F6;
  border: solid 1px #ddd;
  border-radius: 8px;
}
/* Vuetify gives a toolbar exactly one row's height and hides whatever does
   not fit (.v-toolbar is overflow:hidden). The actions row below is allowed
   to wrap, and in a narrow column it does - but every wrapped row was then
   clipped out of sight: inside a "Довільний контент" column the card-set
   toolbar's own buttons all sat above and below the 48px strip and none of
   them were visible at all. Letting the toolbar take the height its content
   actually needs is what makes that wrapping do anything. */
.editable-block-toolbar :deep(.v-toolbar__content) {
  padding: 0;
  /* !important because VToolbar writes this height as an INLINE style on
     .v-toolbar__content (`:style="{ height: convertToUnit(contentHeight) }"`),
     not as a stylesheet rule - confirmed over CDP, no other rule matches
     `height` on that element at all. No selector can outrank an inline
     declaration; only an important one can. min-height keeps the ordinary
     single-row toolbar exactly as tall as it has always been. */
  height: auto !important;
  min-height: 48px;
}
/* Vuetify's icon buttons are `--v-btn-height + 12px` tall - 68px under this
   theme - which the 48px toolbar row used to simply clip, top and bottom,
   without anyone noticing: the glyph inside is centred and small. Now that
   the toolbar takes its content's real height (above), that overhang would
   have made every toolbar in the editor 20px taller than it has always
   been. Trimming the buttons to the row's own height keeps single-row
   toolbars pixel-identical and makes a wrapped second row cost exactly one
   more row. Height only - the width is what spaces the icons apart, and
   that spacing is unchanged. */
.editable-block-toolbar :deep(.v-btn--icon.v-btn--density-default) {
  height: 48px;
}
/* Same for the ver/variant toggles. Their 56px comes from the EDITED app's
   own stylesheet (theme_2's vuetify-buttons.css,
   `.v-btn-group--density-compact.v-btn-group--horizontal { height: 56px
   !important }`), which matches by class and so reaches editor chrome too,
   theme="editorTheme" notwithstanding - hence the !important, which here
   only outranks another !important of lower specificity. The buttons inside
   the group are 48px either way; this only removes the group's own padding
   around them. */
.editable-block-toolbar :deep(.v-btn-group) {
  height: 48px !important;
}
.editable-block-toolbar-actions {
  display: flex;
  /* A block with more than two or three actions (FAQ: add/reorder/icon plus
     two format menus) overflows this row at a narrow viewport - wrapping
     keeps every control reachable there instead of clipping the tail of the
     toolbar off-screen. */
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.editable-block-content {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
