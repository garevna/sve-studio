<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { ref } from 'vue'
  import RouteEditor from '@/components/editors/RouteEditor.vue'
  import LocaleSwitcher from '@/components/editors/small/LocaleSwitcher.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { t } from '@/i18n'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { emptyTranslatedModel } from '@/utils/locale-text'
  import { stableKey } from '@/utils/stable-key'

  // Every entry of one footer links block, edited in a window of its own.
  //
  // The entries used to be edited inline, in the footer itself, where each
  // one carried a full format menu - which was both cramped (a 270px column
  // holding a text field and its own toolbar) and wrong, since the format
  // is one setting for the whole block, not per entry (see
  // FooterLinksActions.vue). What is genuinely per-entry is exactly three
  // things - the words, where the entry leads, and whether it should exist
  // at all - and all three are what a type:'route' block IS, so each row
  // here is just a RouteEditor. This dialog only decides which rows exist
  // and which one has its panel out.
  //
  // `block` is a live reference into the page's own reactive content tree -
  // mutated in place, this editor's convention everywhere.
  const props = defineProps<{ block: TemplateBlockModel }>()

  const open = defineModel<boolean>({ default: false })

  const feedback = useUiFeedbackStore()

  // Which entry has its settings panel out. One at a time and owned here
  // rather than by each field: the panel is a place, not a per-field
  // preference, and two of them open at once in a list this long reads as
  // two separate things being configured.
  const openPanelKey = ref<number | null>(null)
  function panelOpenFor (link: TemplateBlockModel): boolean {
    return openPanelKey.value === stableKey(link)
  }
  function setPanelOpen (link: TemplateBlockModel, value: boolean) {
    openPanelKey.value = value ? stableKey(link) : null
  }

  /* eslint-disable vue/no-mutating-props -- see this component's own top comment */
  function addLink () {
    props.block.children ??= []
    // Inherits the block's own format (every entry shares one - see
    // FooterLinksActions.vue), so a new entry looks like its neighbours
    // instead of arriving with the editor's generic default and having to
    // be reformatted.
    const sample = props.block.children[0]?.class
    props.block.children.push({
      type: 'route',
      content: emptyTranslatedModel(),
      class: sample || 'default-text text-medium mb-4',
    })
  }
  async function removeLink (index: number) {
    if (!await feedback.confirmDelete('link')) return
    props.block.children?.splice(index, 1)
    openPanelKey.value = null
  }
  /* eslint-enable vue/no-mutating-props */
</script>

<template>
  <v-dialog v-model="open" max-width="720">
    <v-card class="editor-dialog" theme="editorTheme">
      <v-toolbar class="editor-panel" color="transparent" density="compact">
        <v-toolbar-title class="footer-links-dialog-title">{{ t('footer.links.title') }}</v-toolbar-title>
        <v-spacer />
        <ToolbarIconButton icon="mdi-close" :tooltip="t('common.close')" @click="open = false" />
      </v-toolbar>

      <v-card-text>
        <div
          v-for="(link, index) of block.children"
          :key="stableKey(link)"
          class="footer-links-dialog-item"
        >
          <!-- formattable is left off on purpose: the format belongs to the
            block as a whole and is set from its toolbar, so a per-entry
            format menu here would offer a setting that doesn't exist. -->
          <RouteEditor
            :block="link"
            deletable
            :panel-open="panelOpenFor(link)"
            @delete="removeLink(index)"
            @update:panel-open="value => setPanelOpen(link, value ?? false)"
          />
        </div>

        <v-btn
          class="mt-4"
          prepend-icon="mdi-playlist-plus"
          size="small"
          variant="outlined"
          @click="addLink"
        >{{ t('footer.links.add') }}</v-btn>
      </v-card-text>

      <v-card-actions>
        <LocaleSwitcher :scope="block" />
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="open = false">{{ t('common.ok') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.footer-links-dialog-title {
  font-size: 1rem;
  font-weight: 600;
}
.footer-links-dialog-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}
</style>
