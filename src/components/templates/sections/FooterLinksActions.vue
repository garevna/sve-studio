<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import TextFormatMenu from '@/components/editors/text/TextFormatMenu.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { t } from '@/i18n'
  import { EDITOR_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // Block-level actions for one footer links list, rendered into the block's
  // own EditableBlockWrapper toolbar (FooterLinks.vue Teleports it there) -
  // same arrangement as FaqBlockActions.vue, which this deliberately
  // mirrors: everything here acts on the block as a whole, everything
  // per-entry lives in the dialog the first button opens. Deleting the whole
  // block stays out of here; the wrapper's own #delete slot owns that
  // uniformly for every block type.
  //
  // `block` is a live reference into the page's own reactive content tree.
  const props = defineProps<{ block: TemplateBlockModel }>()
  const emit = defineEmits<{ edit: [] }>()

  const dragActive = defineModel<boolean>('dragActive', { default: false })

  // One format for every entry. Deliberately NOT stored as a block-level
  // field: production renders each type:'route' entry with its own `class`
  // and knows nothing about this block, so a single shared field would only
  // exist in the editor. Written to every entry instead - the data stays
  // exactly the shape production already reads, and "one format for all"
  // is enforced here, where the user asks for it.
  //
  // Read back from the first entry: they are only ever written together, so
  // any of them answers the question.
  const uniformClass = () => props.block.children?.[0]?.class || ''

  function applyToAll (value: string) {
    for (const link of props.block.children || []) {
      link.class = value
    }
  }
</script>

<template>
  <!-- Teleported content keeps FooterLinks.vue's own component-tree context,
    not the DOM context it lands in - so these buttons would otherwise
    inherit the PREVIEWED page's palette while every other block's toolbar
    buttons sit inside EditableBlockWrapper's editorTheme provider. -->
  <v-theme-provider theme="editorTheme">
    <ToolbarIconButton
      icon="mdi-playlist-edit"
      :tooltip="t('footer.links.edit')"
      @click="emit('edit')"
    />

    <v-menu :close-on-content-click="false" location="bottom start">
      <template #activator="{ props: menuProps }">
        <ToolbarIconButton
          v-bind="menuProps"
          icon="mdi-format-font"
          :tooltip="t('footer.links.textFormatAll')"
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

    <ToolbarIconButton
      :active="dragActive"
      icon="mdi-cursor-move"
      :tooltip="t('footer.links.drag')"
      @click="dragActive = !dragActive"
    />
  </v-theme-provider>
</template>
