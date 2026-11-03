<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import LocaleSwitcher from '@/components/editors/small/LocaleSwitcher.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { t } from '@/i18n'
  import EditableCard from './EditableCard.vue'

  // Shared card-edit dialog - every card (top-level "cards" blocks and
  // carousel cards alike) opens this same dialog via a pencil fab instead of
  // exposing an inline edit form, so there's one consistent editing UX.
  const props = defineProps<{
    card: TemplateBlockModel | null
    defaults?: Partial<TemplateBlockModel>
    blockTarget?: TemplateBlockModel
  }>()

  const comment = computed<string>(() => {
    return props.blockTarget
      ? t('cards.iconAppliesToAll')
      : ''
  })

  const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <v-dialog
    :model-value="!!card"
    @update:model-value="(val: boolean) => { if (!val) emit('close') }"
  >
    <v-card
      v-if="card"
      class="editor-dialog card-edit-dialog"
      style="width: 520px; max-width: calc(100vw - 48px);"
      theme="editorTheme"
    >
      <!-- The project's dialog shape: a toolbar that stays put while the
        body scrolls, and the confirm button at the BOTTOM with everything
        else. The toolbar carries what belongs to the whole dialog - here
        the note that icon styling is shared by every card in the block. -->
      <v-toolbar class="editor-panel" color="transparent" density="compact">
        <v-toolbar-title class="card-edit-dialog-title">{{ t('common.card') }}</v-toolbar-title>
        <v-spacer />
        <ToolbarIconButton icon="mdi-close" :tooltip="t('common.close')" @click="emit('close')" />
      </v-toolbar>

      <p v-if="comment" class="card-toolbar-comment px-4 pt-2">
        <v-icon color="warning" size="small">mdi-alert</v-icon>
        {{ comment }}
      </p>

      <v-card-text class="card-edit-dialog-body">
        <EditableCard
          :block-target="blockTarget"
          :card="card"
          :defaults="defaults"
        />
      </v-card-text>
      <v-card-actions>
        <LocaleSwitcher :scope="card" />
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="emit('close')">{{ t('common.ok') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.card-edit-dialog-title {
  font-size: 1rem;
  font-weight: 600;
}
/* Only the body scrolls - that's the point of the shape. */
.card-edit-dialog-body {
  overflow-y: auto;
}
.card-toolbar-comment {
  padding: 0 0 0 16px;
  font-size: 14px;
  color: #555;
}
</style>
