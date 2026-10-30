<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import TextFormatMenu from '@/components/editors/text/TextFormatMenu.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { EDITOR_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // Block-level actions for one footer contacts list - the same shape as
  // FooterLinksActions.vue, and for the same reason: what acts on the whole
  // block belongs on its toolbar, what acts on one entry belongs in the
  // dialog this toolbar opens. Deleting the block is the wrapper's own
  // #delete slot, so it isn't here.
  //
  // `block` is a live reference into the page's own reactive content tree.
  const props = defineProps<{ block: TemplateBlockModel }>()
  const emit = defineEmits<{ edit: [] }>()

  // A contact row is a type:'text-with-icon' block, whose TEXT classes live
  // in its own `text` field (not `class`, which belongs to the row as a
  // whole) - see FooterContacts.vue's own rendering. That is the string the
  // format menu drives here.
  //
  // One format for every row, written to each of them rather than kept as a
  // single block-level field: production renders each row independently and
  // knows nothing about this block, so a shared field would exist only in
  // the editor. Read back from the first row - they are only ever written
  // together, so any of them answers the question.
  function uniformClass () {
    const first = props.block.children?.[0]?.text
    return typeof first === 'string' ? first : ''
  }

  function applyToAll (value: string) {
    for (const row of props.block.children || []) {
      row.text = value
    }
  }
</script>

<template>
  <!-- Teleported or not, these buttons keep their own component-tree
    context, so the editor theme is re-declared here rather than inherited
    from whatever the previewed page happens to use. -->
  <v-theme-provider theme="editorTheme">
    <ToolbarIconButton
      icon="mdi-playlist-edit"
      tooltip="Редагувати контакти"
      @click="emit('edit')"
    />

    <v-menu :close-on-content-click="false" location="bottom start">
      <template #activator="{ props: menuProps }">
        <ToolbarIconButton
          v-bind="menuProps"
          icon="mdi-format-font"
          tooltip="Формат тексту всіх контактів"
        />
      </template>
      <div :class="['text-format-panel', 'editor-panel', themeClass(EDITOR_THEME_NAME)]">
        <v-theme-provider theme="editorTheme">
          <TextFormatMenu
            :class="uniformClass()"
            parent-type="usual"
            @update:class="applyToAll($event)"
          />
        </v-theme-provider>
      </div>
    </v-menu>
  </v-theme-provider>
</template>
