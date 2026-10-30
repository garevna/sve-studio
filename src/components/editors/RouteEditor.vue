<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, ref } from 'vue'
  import TextEditor from '@/components/editors/text/TextEditor.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import LinkTargetSettings from '@/components/special/LinkTargetSettings.vue'
  import { useCommonStore } from '@/stores/common'
  import { resolveLocaleText, setLocalizedContent } from '@/utils/locale-text'

  // One type:'route' block: a line of text that leads somewhere. Until now
  // this type had no editor at all - TemplateItem.vue's branch for it was
  // commented out, so a route block anywhere rendered as nothing.
  //
  // The link icon sits where every other text field's panel button sits,
  // and opens the same kind of drop-down panel - carrying the link's own
  // settings (LinkTargetSettings.vue) instead of format controls. Inline
  // rather than a modal specifically because this component is itself used
  // inside a dialog (FooterLinksDialog.vue), and a dialog opening a second
  // dialog over itself is a worse way to answer the same three questions.
  // The menu editor still uses the modal form (MenuLinkDialog.vue) - same
  // fields, same component underneath.
  //
  // `block` is a live reference into the page's own reactive content tree -
  // mutated in place, this editor's convention everywhere.
  const props = withDefaults(defineProps<{
    block: TemplateBlockModel
    // Adds a delete button to the panel, right-hand side, apart from the
    // link settings - the project's own rule that delete never sits among
    // everyday actions.
    deletable?: boolean
    deleteTooltip?: string
    // Off for a list whose format is set for every entry at once (the
    // footer's links - see FooterLinksActions.vue); on for a route block
    // standing on its own, which has nowhere else to be formatted from.
    formattable?: boolean
  }>(), {
    formattable: false,
  })

  const emit = defineEmits<{ delete: [] }>()

  const commonStore = useCommonStore()

  // Left unbound by most callers, in which case TextEditor falls back to the
  // shared one-panel-at-a-time token. A list rendering many of these binds
  // it so it can keep exactly one open itself.
  const panelOpen = defineModel<boolean | undefined>('panelOpen', { default: undefined })
  const localPanelOpen = ref(false)
  const isPanelOpen = computed(() => (panelOpen.value === undefined ? localPanelOpen.value : panelOpen.value))

  const text = computed({
    get: () => resolveLocaleText(props.block.content, commonStore.locale),
    // Writes into the block's own TranslatedModel for the CURRENT locale
    // only, leaving the other two languages alone - the same rule every
    // other text field in this editor follows.
    set: (value: string) => setLocalizedContent(props.block, commonStore.locale, value || ''),
  })

  const className = computed({
    get: () => props.block.class || '',
    set: (value: string) => {
      // eslint-disable-next-line vue/no-mutating-props
      props.block.class = value
    },
  })

  // What this entry currently points at, shown under the field - without it
  // an unconfigured link is indistinguishable from a configured one until
  // the panel is opened.
  const summary = computed(() => {
    if (props.block.route !== 'dynamic-page') {
      return props.block.route ? `Маршрут: ${props.block.route}` : 'Посилання не налаштоване'
    }
    const pageId = (props.block.params as { pageId?: string } | undefined)?.pageId
    return props.block.hash ? `Сторінка «${pageId}», блок ${props.block.hash}` : `Сторінка «${pageId}»`
  })

  function setPanelOpen (value: boolean) {
    if (panelOpen.value === undefined) {
      localPanelOpen.value = value
    } else {
      panelOpen.value = value
    }
  }
</script>

<template>
  <div class="route-editor">
    <TextEditor
      v-model:class="className"
      v-model:content="text"
      :formattable="formattable"
      panel-icon="mdi-link-edit"
      :panel-open="isPanelOpen"
      panel-tooltip="Налаштування переходу"
      parent-type="usual"
      type="text"
      @update:panel-open="setPanelOpen($event ?? false)"
    >
      <template #panel>
        <div class="route-editor-panel">
          <div v-if="deletable" class="d-flex justify-end">
            <ToolbarIconButton
              icon="mdi-delete"
              :tooltip="deleteTooltip || 'Видалити цей пункт'"
              @click="emit('delete')"
            />
          </div>
          <!-- `active` tied to the panel being open: the fields re-read the
            block (and the page list loads) each time it is opened, so a
            panel reopened after the link changed elsewhere never shows a
            stale answer. -->
          <LinkTargetSettings :active="isPanelOpen" auto :item="block" />
        </div>
      </template>
    </TextEditor>
    <p class="text-caption route-editor-summary">{{ summary }}</p>
  </div>
</template>

<style scoped>
.route-editor {
  display: flex;
  flex-direction: column;
}
.route-editor-panel {
  width: 100%;
  padding: 8px 12px 12px;
}
.route-editor-summary {
  margin: 0;
  opacity: 0.7;
}
</style>
