<script setup lang="ts">
  import type { EditorMode } from '@/composables/useEditorMode'
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { SveIconButton, SveMenu, SveMenuDivider, SveMenuItem } from '@sve/editor-ui'
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import { provideEditorMode } from '@/composables/useEditorMode'
  import { usePageBlocks } from '@/composables/usePageBlocks'
  import { useCommonStore } from '@/stores/common'

  // One top-level block of the page being edited.
  //
  // In edit mode only one block at a time is open for editing; every other
  // block is drawn exactly as the site shows it, with a frame on hover and
  // the settings button (⚙) in its top right corner: Редагувати / Вище /
  // Нижче / Приховати / Видалити. A click on a closed block opens it, too.
  //
  // The mode it gives its content (provideEditorMode) is what makes the
  // components inside show or leave out their editing controls - and the
  // default slot gets the same mode, for the page template's own choices.
  const props = withDefaults(defineProps<{
    block: TemplateBlockModel
    deletable?: boolean
  }>(), { deletable: true })

  const emit = defineEmits<{ delete: [] }>()

  const commonStore = useCommonStore()
  const pageBlocks = usePageBlocks()

  const editingPage = computed(() => commonStore.mode === 'edit')
  const active = computed(() => pageBlocks.isActive(props.block))
  const mode = computed<EditorMode>(() => editingPage.value && !active.value ? 'preview' : commonStore.mode)
  provideEditorMode(mode)

  const menuOpen = ref(false)

  // A block with nothing in it yet (empty texts, no picture) draws nothing
  // on the site - here it would be a 0px strip nobody can click. Its body is
  // measured; while it is (almost) flat the frame keeps a visible, clickable
  // place of its own with an edit button, so no block is ever out of reach.
  const body = ref<HTMLElement | null>(null)
  const empty = ref(false)
  let observer: ResizeObserver | undefined
  watch(body, element => {
    observer?.disconnect()
    if (!element) return
    observer = new ResizeObserver(() => {
      empty.value = element.offsetHeight < 24
    })
    observer.observe(element)
  })
  onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div
    v-if="editingPage"
    :class="['sve-block', { 'sve-block--active': active, 'sve-block--empty': empty, 'sve-block--flash': pageBlocks.isFlashing(block) }]"
  >
    <div :class="['sve-ui sve-block__settings', { 'sve-block__settings--open': menuOpen }]">
      <SveMenu v-model="menuOpen">
        <template #activator="{ props: activator }">
          <SveIconButton icon="mdi-cog-outline" label="Налаштування блоку" variant="soft" v-bind="activator" />
        </template>
        <SveMenuItem v-if="active" icon="mdi-check" @click="pageBlocks.finishEditing()">Завершити редагування</SveMenuItem>
        <SveMenuItem v-else icon="mdi-pencil-outline" @click="pageBlocks.edit(block)">Редагувати</SveMenuItem>
        <SveMenuItem :disabled="!pageBlocks.canMove(block, -1)" icon="mdi-arrow-up" @click="pageBlocks.move(block, -1)">Вище</SveMenuItem>
        <SveMenuItem :disabled="!pageBlocks.canMove(block, 1)" icon="mdi-arrow-down" @click="pageBlocks.move(block, 1)">Нижче</SveMenuItem>
        <SveMenuItem icon="mdi-eye-off-outline" @click="pageBlocks.hide(block)">Приховати</SveMenuItem>
        <template v-if="deletable">
          <SveMenuDivider />
          <SveMenuItem danger icon="mdi-delete-outline" @click="emit('delete')">Видалити</SveMenuItem>
        </template>
      </SveMenu>
    </div>
    <div ref="body" class="sve-block__body">
      <slot :mode="mode" />
    </div>
    <div v-if="empty && !active" class="sve-ui sve-block__empty">
      <i class="sve-icon mdi mdi-pencil-outline" />
      <span>Порожній блок — натисніть, щоб наповнити</span>
    </div>
    <div v-if="!active" class="sve-block__shield" title="Редагувати блок" @click="pageBlocks.edit(block)" />
  </div>
  <slot v-else :mode="mode" />
</template>
