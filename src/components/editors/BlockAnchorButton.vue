<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, ref } from 'vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'

  // Names this block as a destination for in-page links.
  //
  // It belongs here, on the block, and not in the list of link targets: at
  // the moment that list is open the user is looking for a block, not
  // describing one, and working out which row is which in order to rename it
  // is the very problem the name is supposed to solve. Standing in front of
  // the block, there is no question about what it is.
  //
  // The name is editor-only (see BaseBlock.editorLabel) - it exists so a
  // person can recognise this block among the others when pointing a link at
  // it, and production never reads it.
  //
  // `block` is a live reference into the page's own reactive content tree -
  // mutated in place, this editor's convention everywhere.
  const props = defineProps<{ block: TemplateBlockModel }>()

  const open = ref(false)
  const draft = ref('')

  const hasName = computed(() => !!props.block.editorLabel?.trim())

  function openDialog () {
    draft.value = props.block.editorLabel || ''
    open.value = true
  }

  function confirm () {
    const value = draft.value.trim()
    // eslint-disable-next-line vue/no-mutating-props
    props.block.editorLabel = value || undefined
    open.value = false
  }
</script>

<template>
  <ToolbarIconButton
    :active="hasName"
    icon="mdi-map-marker-outline"
    :tooltip="hasName ? `Точка переходу: ${block.editorLabel}` : 'Дати назву блоку для включення до списку посилань для переходів усередині сторінки'"
    @click="openDialog"
  />

  <v-dialog v-model="open" max-width="520">
    <v-card class="editor-dialog" theme="editorTheme">
      <v-toolbar class="editor-panel" color="transparent" density="compact">
        <v-toolbar-title class="block-anchor-title">Назва блоку</v-toolbar-title>
        <v-spacer />
        <ToolbarIconButton icon="mdi-close" tooltip="Закрити" @click="open = false" />
      </v-toolbar>

      <v-card-text>
        <v-text-field
          v-model="draft"
          autofocus
          density="compact"
          hide-details
          label="Назва блоку"
          placeholder="Наприклад: Питання та відповіді"
          variant="outlined"
          @keyup.enter="confirm"
        />
        <p class="text-caption text-medium-emphasis mt-3">
          Потрібна лише для того, щоб упізнати цей блок у списку переходів
          усередині сторінки. На сайті вона не показується, і якщо переходів
          на цей блок не планується, її можна не вводити.
        </p>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="confirm">ОК</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.block-anchor-title {
  font-size: 1rem;
  font-weight: 600;
}
</style>
