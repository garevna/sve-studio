<script setup lang="ts" generic="T extends object">
  import { useSortableList } from '@/composables/useSortableList'
  import { stableKey } from '@/utils/stable-key'

  // Drag-to-reorder for any list of blocks, as one component instead of the
  // same fifteen lines copied into every container that has one
  // (SectionWithFreeContent, EditableCardsBlock, TemplateFlexSection,
  // DarkFoneSection, FooterEditor). What was being copied wasn't just the
  // useSortableList call: it was the whole convention around it - the
  // stable-key rule, the two-element interactivity split, and the exit
  // banner - and every copy was a chance to get one of them subtly wrong.
  //
  // It deliberately does NOT wrap each item in an element of its own. The
  // callers style their own item elements (flex widths, card wrappers), and
  // an extra div between the container and them would make THAT the flex
  // item instead. So the caller still renders the item; this component
  // supplies the container, the Sortable wiring, the key, and the two
  // classes the caller puts where they belong.
  const props = defineProps<{
    items: T[] | undefined
  }>()

  // SINGLE ROOT, deliberately. This component used to also render the
  // "done reordering" banner, which made it a fragment - and a fragment
  // costs two things that a layout container cannot do without:
  //   - Vue can't auto-inherit attributes onto a multi-root component, so
  //     every caller's container classes were silently dropped;
  //   - Vue can't apply the parent's scoped-style id either, so the
  //     caller's own `<style scoped>` rules for that container stopped
  //     matching it.
  // Both together turned every migrated list into a single stacked column:
  // the flex row lost its display:flex AND its flex-wrap. The banner is the
  // caller's to render (it always was), and this stays one plain element.

  const active = defineModel<boolean>('active', { default: false })

  const { container } = useSortableList(() => props.items, active)
</script>

<template>
  <div ref="container">
    <template v-for="(item, index) of items" :key="stableKey(item)">
      <!--
        Two classes, two jobs, and they must land on DIFFERENT elements:

        - dragClass (cursor: move) goes on the item's own OUTER element -
          the direct child of this container, which is what Sortable
          actually tracks and drags. It has to keep receiving pointer
          events.
        - contentClass (pointer-events: none) goes on something INSIDE it,
          so a drag can't be hijacked by a control within the item (a
          contenteditable paragraph, an image's camera button). Putting it
          on the outer element instead makes the very item Sortable is
          supposed to drag invisible to the pointer - a real regression this
          project has already shipped once, where dragging grabbed nothing
          and the whole section appeared to move as one lump.

        pointer-events:none also stops that element resolving its own
        cursor, which is exactly why the cursor lives on the outer one.
      -->
      <slot
        :content-class="active ? 'sortable-drag-inert' : ''"
        :drag-class="active ? 'sortable-drag-cursor' : ''"
        :dragging="active"
        :index="index"
        :item="item"
        name="item"
      />
      <!-- Anything that belongs BETWEEN two items rather than inside either
        (SectionWithFreeContent's margin handles). Never after the last one:
        it's the space TO the next item. -->
      <slot
        v-if="$slots.between && index < (items?.length ?? 0) - 1"
        :index="index"
        :item="item"
        name="between"
      />
    </template>
  </div>
</template>
