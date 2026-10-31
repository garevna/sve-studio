<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, ref, watch } from 'vue'
  import LocaleSwitcher from '@/components/editors/small/LocaleSwitcher.vue'
  import HoverCardSideEditor from './HoverCardSideEditor.vue'

  // `block` is the whole type:'component' content:'CardWithHover' block
  // (see card-with-hover.ts) - block.props.card.children[0]/[1] hold each
  // side's title/icon/content, while backgroundColor/backgroundImage (base
  // side) and hoverColor/hoverImage (hover side) live as flat sibling
  // fields on block.props, matching CardWithHover.vue's own defineProps
  // shape exactly (not nested under card). `props` is typed as a bare
  // `object` on TemplateBlockModel (it varies per component), so this
  // local shape is cast, not declared on the shared type.
  interface CardWithHoverProps {
    backgroundColor?: string
    backgroundImage?: string
    hoverColor?: string
    hoverImage?: string
    card?: { children?: TemplateBlockModel[] }
    // The card's look (TemplateCard variant); unset = 1.
    ver?: number
  }

  const props = defineProps<{ block: TemplateBlockModel | null }>()
  const emit = defineEmits<{ close: [] }>()

  // Deliberately a live reference into the page's own reactive content tree
  // (same pattern as CardContainerActions.vue etc) - editing it in place is
  // how every editor here works. The mutation lives in a watcher, not the
  // computed below - a computed must stay a pure read, side effects there
  // run at unpredictable times under Vue's caching/scheduling.
  watch(() => props.block, block => {
    if (block) block.props ??= {}
  }, { immediate: true })

  const cardProps = computed<CardWithHoverProps | null>(() => {
    return props.block ? (props.block.props as CardWithHoverProps) : null
  })

  const tab = ref<'base' | 'hover'>('base')
</script>

<template>
  <!-- scrollable: only the settings scroll; the languages, OK and the two
    tabs stay on top however long the card's texts get. -->
  <v-dialog
    :model-value="!!block"
    scrollable
    @update:model-value="(val: boolean) => { if (!val) emit('close') }"
  >
    <v-card
      v-if="cardProps"
      class="card-with-hover-edit-dialog"
      style="width: 560px; max-width: calc(100vw - 48px); max-height: calc(100dvh - 48px);"
      theme="editorTheme"
    >
      <div class="card-with-hover-edit-dialog-head">
        <div class="card-with-hover-edit-dialog-toolbar">
          <LocaleSwitcher :scope="cardProps.card" />
          <v-btn color="primary" variant="elevated" @click="emit('close')">ОК</v-btn>
        </div>

        <v-tabs v-model="tab" color="primary">
          <v-tab value="base">Базова картка</v-tab>
          <v-tab value="hover">Ховер-картка</v-tab>
        </v-tabs>
      </div>

      <v-card-text class="card-with-hover-edit-dialog-body">
        <v-window v-model="tab">
          <v-window-item value="base">
            <HoverCardSideEditor
              v-if="cardProps.card?.children?.[0]"
              v-model:color="cardProps.backgroundColor"
              v-model:image="cardProps.backgroundImage"
              :card="cardProps.card.children[0]"
              :ver="cardProps.ver"
            />
          </v-window-item>
          <v-window-item value="hover">
            <HoverCardSideEditor
              v-if="cardProps.card?.children?.[1]"
              v-model:color="cardProps.hoverColor"
              v-model:image="cardProps.hoverImage"
              :card="cardProps.card.children[1]"
              :ver="cardProps.ver"
            />
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.card-with-hover-edit-dialog-head {
  flex: none;
  border-bottom: solid 1px rgb(0 0 0 / 0.08);
}
.card-with-hover-edit-dialog-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}
.card-with-hover-edit-dialog-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 8px 0;
}
</style>
