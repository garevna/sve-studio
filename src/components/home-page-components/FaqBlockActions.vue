<script setup lang="ts">
  import TextFormatMenu from '@/components/editors/text/TextFormatMenu.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { t } from '@/i18n'
  import { FAQ_EXPAND_ICON_PAIRS, type FaqExpandIconPair, toolbarIconFor } from '@/utils/faq-expand-icons'
  import { EDITOR_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // Block-level actions for a FAQ block as a whole (not an individual
  // question) - add a pair, reorder, pick the accordion's expand/collapse
  // icon, and set the shared question/answer text format. Rendered into the
  // block's own EditableBlockWrapper toolbar (FAQ.vue Teleports it there),
  // exactly like CardContainerActions.vue does for a "cards" block - which
  // is also where the naming and the dragActive v-model convention come
  // from. Deleting the whole block stays out of here: the wrapper's own
  // #delete slot owns that uniformly for every block type.
  //
  // Everything this component sets is BLOCK-level, shared by every Q&A pair
  // (one format for all questions, another for all answers, one icon pair
  // for the whole accordion) - per-pair editing lives in FaqDialog.vue,
  // opened from each question's own cog. That split is why these controls
  // belong on the toolbar rather than inside a dialog: they were previously
  // buried in the same modal as the 44-item question list, where two
  // near-identical speech-bubble icons gave no hint that they styled ALL
  // questions/answers at once.
  //
  // `model` is a live reference into the block's own reactive props (see
  // FAQ.vue's defineModel) - mutated in place, same convention as
  // CardContainerActions.vue's own addCard/setVer.
  const props = defineProps<{
    model: {
      questionClass: string
      answerClass: string
      expandIcon: string
      collapseIcon?: string
    }
  }>()
  const emit = defineEmits<{ add: [] }>()

  // Drag-to-reorder is off by default and toggled on here - FAQ.vue owns the
  // actual ref and wires it into useSortableList; this button just flips it.
  // The same button turns it back off - there is no separate "done"
  // affordance, and deliberately so: a second control for leaving a mode
  // that one click already leaves is noise.
  const dragActive = defineModel<boolean>('dragActive', { default: false })

  // Formatting itself lives in TextFormatMenu.vue, which takes the class
  // string as its own v-model - this component used to keep a second copy of
  // that exact set-manipulation, with a comment explaining why duplicating it
  // was cheaper than refactoring. It isn't any more: the footer's links need
  // the same block-level formatting, which would have made three copies.
  /* eslint-disable vue/no-mutating-props -- see this component's own top comment */
  function setClass (key: 'questionClass' | 'answerClass', value: string) {
    props.model[key] = value
  }

  // --- expand/collapse icon (one pair for the whole accordion) ---
  function isCurrentPair (pair: FaqExpandIconPair) {
    return (props.model.expandIcon || FAQ_EXPAND_ICON_PAIRS[0]!.expand) === pair.expand
  }
  function selectPair (pair: FaqExpandIconPair) {
    props.model.expandIcon = pair.expand
    props.model.collapseIcon = pair.collapse
  }
  /* eslint-enable vue/no-mutating-props */
</script>

<template>
  <!-- Teleported content keeps FAQ.vue's own component-tree context, not the
    DOM context it lands in - so these buttons would otherwise inherit the
    PREVIEWED page's palette (DynamicPageTemplate.vue wraps its output in
    appTheme) while every other block's toolbar buttons, rendered normally
    into EditableBlockWrapper's slot, sit inside its editorTheme provider.
    VThemeProvider without with-background renders its slot directly, so
    this re-declaration costs no wrapper element and no layout change. -->
  <v-theme-provider theme="editorTheme">
    <!-- mdi-playlist-plus, not a bare mdi-plus: mdi-plus is also one of the
      expand-icon choices next door, and two plus signs on one toolbar read
      as two ways to add something. -->
    <ToolbarIconButton icon="mdi-playlist-plus" :tooltip="t('faq.add')" @click="emit('add')" />
    <ToolbarIconButton
      :active="dragActive"
      icon="mdi-cursor-move"
      :tooltip="t('faq.drag')"
      @click="dragActive = !dragActive"
    />

    <v-menu location="bottom start">
      <template #activator="{ props: menuProps }">
        <ToolbarIconButton
          v-bind="menuProps"
          :icon="toolbarIconFor(model.expandIcon)"
          :tooltip="t('faq.expandIcon')"
        />
      </template>
      <v-card theme="editorTheme">
        <v-list density="compact">
          <v-list-item
            v-for="pair of FAQ_EXPAND_ICON_PAIRS"
            :key="pair.expand"
            :active="isCurrentPair(pair)"
            @click="selectPair(pair)"
          >
            <template #prepend>
              <span class="faq-icon-pair">
                <v-icon :icon="pair.expand" size="20" />
                <v-icon :icon="pair.collapse" size="20" />
              </span>
            </template>
            <v-list-item-title>{{ pair.label }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </v-menu>

    <!-- Text buttons, not icons: these two set the format of EVERY question /
      EVERY answer, and two near-identical speech-bubble icons (what they used
      to be) read as a per-item action rather than a block-wide one. -->
    <v-menu :close-on-content-click="false" location="bottom start">
      <template #activator="{ props: menuProps }">
        <ToolbarIconButton
          v-bind="menuProps"
          prepend-icon="mdi-format-font"
          size="small"
          :tooltip="t('faq.questionsFormat')"
        >
          {{ t('faq.questions') }}
        </ToolbarIconButton>
      </template>
      <div :class="['text-format-panel', 'editor-panel', themeClass(EDITOR_THEME_NAME)]">
        <v-theme-provider theme="editorTheme">
          <TextFormatMenu
            :class="model.questionClass"
            parent-type="usual"
            @update:class="setClass('questionClass', $event)"
          />
        </v-theme-provider>
      </div>
    </v-menu>

    <v-menu :close-on-content-click="false" location="bottom start">
      <template #activator="{ props: menuProps }">
        <ToolbarIconButton
          v-bind="menuProps"
          prepend-icon="mdi-format-font"
          size="small"
          :tooltip="t('faq.answersFormat')"
        >
          {{ t('faq.answers') }}
        </ToolbarIconButton>
      </template>
      <div :class="['text-format-panel', 'editor-panel', themeClass(EDITOR_THEME_NAME)]">
        <v-theme-provider theme="editorTheme">
          <TextFormatMenu
            :class="model.answerClass"
            parent-type="usual"
            @update:class="setClass('answerClass', $event)"
          />
        </v-theme-provider>
      </div>
    </v-menu>
  </v-theme-provider>
</template>

<style scoped>
.faq-icon-pair {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-inline-end: 12px;
}
</style>
