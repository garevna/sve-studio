<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed, onBeforeMount } from 'vue'

  // import type { RouteParams } from 'vue-router'

  // import type { RouteQueryModel } from '@/types/navigation/RouteQueryModel'

  import { footerGapClass, resolveFooterLayout } from '@/configs/footer-layout'
  import { bentoTile } from '@/configs/footer-variants'
  import { useCommonStore } from '@/stores/common'

  import TemplateItem from './TemplateItem.vue'

  const { dynamicFooterContent: footerContent, footerSettings } = storeToRefs(useCommonStore())

  const layout = computed(() => resolveFooterLayout(footerSettings.value))
  const gapClass = computed(() => footerGapClass(layout.value))

  // A column with no width set is exactly as wide as its own content - see
  // the identical function in client-side's own FooterTemplate.vue for why
  // a fixed width put all the whitespace on one side of each column.
  // A list inside a column owns the space between ITS OWN rows - that is the
  // whole reason it is one block and not a handful of loose siblings.
  // Contacts have no margins of their own and need a gap; page links carry
  // their own mb-* and need none.
  // Typed by what it actually reads, not by the whole block model: the
  // footer's own tree uses a narrower recursive type than TemplateBlockModel,
  // and widening the parameter to make one fit the other is how a type stops
  // catching anything.
  function innerListClass (child: { id?: string }): string {
    return child.id === 'footer-contacts-list' ? 'footer-contacts-list' : 'footer-inner-list'
  }

  function columnStyle (index: number) {
    const width = layout.value.widths[index]
    return width === null || width === undefined
      ? { flex: '0 1 auto', width: 'max-content', maxWidth: '100%' }
      : { flex: '0 0 auto', width: width + 'px', maxWidth: '100%' }
  }

  // type CallbackParamsModel = { route: string, params: RouteParams, query: RouteQueryModel }

  // function clickHandler (item: CallbackParamsModel) {

  // }

  onBeforeMount(() => {
    if (!footerContent.value) {
      return
    }
    if ((footerContent.value.type !== 'section' && footerContent.value.type !== 'float' && footerContent.value.type !== 'footer-1') || !footerContent.value.children) {
      console.error('Invalid footer content')
      return
    }
  })
</script>

<template>
  <v-container v-if="footerContent && footerContent.children && footerContent.children.length > 0">
    <!-- Same arrangement as the editor and the real site: columns aligned to
      the top of the row, sized to their content, separated by the gap the
      designer actually set. -->
    <div class="footer-columns d-flex flex-wrap align-center justify-center gr-16" :class="gapClass">
      <template v-for="(block, index) of footerContent.children" :key="index">
        <!-- --tile-bg: the tile's colour in the "Bento" footer, from the
          footer's set of tile colours (configs/footer-variants.ts). -->
        <div class="footer-column" :style="[columnStyle(index), { '--tile-bg': `var(--${bentoTile(footerContent.tiles, index)})` }]">
          <template v-if="block.type === 'section'">
            <div :class="block.class">
              <template v-for="(child, num) of block.children" :key="num">
                <!-- One more level of nesting than a plain child needs -
                  footer-1's own "contacts" sub-block (an addable/removable,
                  freely reorderable list edited in its own dialog in the
                  visual editor - see FooterContactsDialog.vue) is itself a
                  type:'section' block nested inside this one, so its own
                  children need the same generic per-item rendering a
                  top-level section child gets, not a second wrapping div
                  with nothing inside (TemplateItem.vue has no 'section'
                  branch of its own).

                  'page-links' - the footer's list of links to pages - is a
                  container in exactly the same sense and renders the same
                  way: its own children are the type:'route' entries this
                  renderer already knows. It has its own type only so the
                  visual editor can tell what it is (see
                  configs/footer-blocks.ts); nothing here needs to. -->
                <div
                  v-if="child.type === 'section' || child.type === 'page-links'"
                  :class="[innerListClass(child), child.class]"
                >
                  <div
                    v-for="(grandchild, gnum) of child.children"
                    :key="gnum"
                    :class="grandchild.class"
                  >
                    <template-item :item="grandchild as any" />
                  </div>
                </div>
                <div v-else :class="child.class">
                  <template-item :item="child as any" />
                </div>
              </template>
            </div>
          </template>
          <template v-else>
            <template-item :item="block as any" />
          </template>
        </div>
      </template>
    </div>
  </v-container>
</template>

<style scoped>
/* See innerListClass. The margin resets make the gap the only thing deciding
   the spacing - TextWithIcon brings a 12px top margin of its own, and its
   paragraph inherits a bottom one. */
.footer-contacts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.footer-contacts-list :deep(.text-with-icon) {
  margin-top: 0;
}
.footer-contacts-list :deep(.text-with-icon p) {
  margin-bottom: 0;
}
.footer-inner-list {
  display: flex;
  flex-direction: column;
}
</style>
