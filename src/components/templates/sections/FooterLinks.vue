<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, ref } from 'vue'
  import EditableBlockWrapper from '@/components/editors/EditableBlockWrapper.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { useSortableList } from '@/composables/useSortableList'
  import { useCommonStore } from '@/stores/common'
  import { resolveLocaleText } from '@/utils/locale-text'
  import { stableKey } from '@/utils/stable-key'
  import FooterLinksActions from './FooterLinksActions.vue'
  import FooterLinksDialog from './FooterLinksDialog.vue'

  // The footer's list of links to pages and in-page anchors (see
  // configs/footer-blocks.ts for why it is a type of its own).
  //
  // In edit mode this renders exactly what a visitor sees - the entries are
  // shown, never edited in place. Everything that acts on the block sits on
  // its toolbar, and everything that acts on one entry sits in the dialog
  // that toolbar opens. That split is what fits: the column is 270px wide,
  // and a text field with its own format toolbar inside it left no room for
  // the words themselves.
  //
  // The block renders its OWN EditableBlockWrapper rather than being handed
  // one by the column. The alternative - the column wrapping it and this
  // component Teleporting its buttons into that toolbar, the way FAQ.vue
  // does - left the toolbar empty here, and it buys nothing in this case:
  // FAQ needs it because it is reached through TemplateItem's generic
  // dispatch, with no way for the wrapping component to know what actions
  // the block wants. The column knows exactly what this block is.
  //
  // `block` is a live reference into the page's own reactive content tree.
  const props = defineProps<{
    block: TemplateBlockModel
    // Renders read-only even in edit mode - used while the footer's columns
    // are being rearranged, so what's on screen during those gestures is
    // exactly what a visitor will see.
    preview?: boolean
  }>()

  const emit = defineEmits<{ delete: [] }>()

  const commonStore = useCommonStore()
  const mode = useEditorMode()
  const editing = computed(() => mode.value === 'edit' && !props.preview)

  // Reordering is a deliberate, occasional action rather than something live
  // the whole time - same toggle convention as every other list in this
  // editor (see useSortableList's own comment).
  const dragActive = ref(false)
  const { container } = useSortableList(() => props.block.children, dragActive)

  const dialogOpen = ref(false)

  function getText (link: TemplateBlockModel): string {
    return resolveLocaleText(link.content, commonStore.locale)
  }
</script>

<template>
  <EditableBlockWrapper v-if="editing" type="block">
    <template #actions>
      <FooterLinksActions
        v-model:drag-active="dragActive"
        :block="block"
        @edit="dialogOpen = true"
      />
    </template>
    <template #delete>
      <ToolbarIconButton icon="mdi-delete" tooltip="Видалити блок" @click="emit('delete')" />
    </template>

    <!-- One list, drawn the same way in every mode. The only difference edit
      mode makes is the drag cursor, so what is on screen while editing is
      what production renders - the thing this editor exists to get right. -->
    <div ref="container" class="footer-links-list">
      <p
        v-for="link of block.children"
        :key="stableKey(link)"
        :class="[link.class || 'default-text text-medium text-white', { 'sortable-drag-cursor': dragActive }]"
      >
        {{ getText(link) }}
      </p>
    </div>

    <FooterLinksDialog v-model="dialogOpen" :block="block" />
  </EditableBlockWrapper>

  <div v-else class="footer-links-list">
    <p
      v-for="link of block.children"
      :key="stableKey(link)"
      :class="link.class || 'default-text text-medium text-white'"
    >
      {{ getText(link) }}
    </p>
  </div>
</template>

<style scoped>
/* Spacing between entries is the entries' own mb-* class, exactly as
   production renders it - deliberately not a gap declared here, which would
   make the editor and the real site disagree the moment that class changed. */
.footer-links-list {
  display: flex;
  flex-direction: column;
}
</style>
