<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, ref } from 'vue'
  import LocaleSwitcher from '@/components/editors/small/LocaleSwitcher.vue'
  import TextEditor from '@/components/editors/text/TextEditor.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'
  import { emptyTranslatedModel, setLocalizedContent } from '@/utils/locale-text'

  // Container-level actions for a "section" block (image + text column, see
  // TemplateNestedSection.vue).
  //
  // This used to open a dialog that listed every text line for adding AND
  // removing - which duplicated the very same fields the block already
  // renders inline, so the same text was editable in two places at once.
  // Now the split follows what each thing actually is:
  //   - adding a NEW line is a structural change with nothing on screen to
  //     act on yet, so it gets this dialog (mdi-playlist-plus);
  //   - editing and DELETING an existing line belong to that line, and live
  //     in its own format panel (TextEditor's `deletable`), the same way
  //     every other text block in this editor already works;
  //   - reordering is a mode, toggled here like every other list's is.
  //
  // `block` is deliberately a live reference into the page's own reactive
  // content tree, same pattern as DarkFoneSectionActions.vue.
  const props = defineProps<{ block: TemplateBlockModel }>()

  const dragActive = defineModel<boolean>('dragActive', { default: false })

  const commonStore = useCommonStore()

  const textSection = computed(() => props.block.children?.find(child => child.type === 'section') ?? null)

  const dialogOpen = ref(false)
  // The line being composed lives outside the page content until it's
  // accepted - an empty paragraph appended to the block first and filled in
  // afterwards would already be saved (and rendered) while still blank.
  const draft = ref<TemplateBlockModel & { type: 'text' | 'header' | 'title' }>(newDraft())

  function newDraft (): TemplateBlockModel & { type: 'text' | 'header' | 'title' } {
    return { type: 'text', content: emptyTranslatedModel(), class: 'default-text text-thin text-black' }
  }

  function openDialog () {
    draft.value = newDraft()
    dialogOpen.value = true
  }

  function addLine () {
    const section = textSection.value
    if (!section) return
    section.children ??= []
    section.children.push(draft.value)
    dialogOpen.value = false
  }
</script>

<template>
  <ToolbarIconButton
    v-if="textSection"
    icon="mdi-playlist-plus"
    :tooltip="t('banner.addTextRow')"
    @click="openDialog"
  />
  <ToolbarIconButton
    v-if="textSection"
    :active="dragActive"
    icon="mdi-cursor-move"
    :tooltip="t('banner.dragTextRows')"
    @click="dragActive = !dragActive"
  />

  <v-dialog v-model="dialogOpen" max-width="640">
    <v-card class="editor-dialog" theme="editorTheme">
      <v-toolbar class="editor-panel" color="transparent" density="compact">
        <v-toolbar-title class="nested-section-dialog-title">{{ t('banner.newTextRow') }}</v-toolbar-title>
        <v-spacer />
        <ToolbarIconButton icon="mdi-close" :tooltip="t('common.close')" @click="dialogOpen = false" />
      </v-toolbar>

      <v-card-text>
        <!-- The same editor the line will be edited with once it exists, so
          what is typed and formatted here is exactly what gets added. -->
        <TextEditor
          v-model:class="draft.class"
          v-model:type="draft.type"
          :content="''"
          parent-type="usual"
          @update:content="value => setLocalizedContent(draft, commonStore.locale, value || '')"
        />
      </v-card-text>

      <v-card-actions>
        <LocaleSwitcher :scope="draft" />
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="addLine">{{ t('common.ok') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.nested-section-dialog-title {
  font-size: 1rem;
  font-weight: 600;
}
</style>
