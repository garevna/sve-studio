<script setup lang="ts">
  import type { TranslatedModel } from '@/types/TemplateBlockModel'
  import { storeToRefs } from 'pinia'
  import { computed, onBeforeMount, ref } from 'vue'
  import TextEditor from '@/components/editors/text/TextEditor.vue'
  import { useBlockActionsTarget } from '@/composables/useEditableBlockActions'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { useSortableList } from '@/composables/useSortableList'
  import { useCommonStore } from '@/stores/common'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { resolveIconPair } from '@/utils/faq-expand-icons'
  import { emptyTranslatedModel, isTranslatedModel, resolveLocaleText } from '@/utils/locale-text'
  import { stableKey } from '@/utils/stable-key'
  import FaqBlockActions from './FaqBlockActions.vue'
  import FaqDialog from './FaqDialog.vue'

  // TemplateItem renders these blocks as `v-bind="item.props"` alongside
  // `v-model="item.props"`, because the components disagree on which of the
  // two conventions they use. That spread means every key of the props
  // object this component does NOT declare lands on its root element as an
  // ATTRIBUTE - and `title`, being a {uk,en,de} object, arrived as
  // title="[object Object]", which the browser then showed as a native
  // tooltip on the block. Nothing here wants stray attributes.
  defineOptions({ inheritAttrs: false })

  // Migrated off production's i18n-driven FAQ (see configs/components/faq.ts
  // for the real seed content, pulled from the original app's locales) - real
  // question/answer text now lives on this block's own props instead.
  // questionClass/answerClass are shared across EVERY pair (one format
  // setting for all questions, a separate one for all answers), not per-pair -
  // see FaqBlockActions.vue, the same "uniform group format" shape as
  // uniformCardFormat elsewhere in this app. title/subtitle aren't editable
  // yet (out of the user's stated scope for this pass).
  //
  // No scoped CSS for the FAQ itself: .faq/.faq-expansion-panels ship in the
  // theme's own faq.css (served from the local DB, with public/files as the
  // API-unavailable fallback), loaded globally the same way it is in
  // production. Only edit-mode chrome is styled below.
  // questionClass/answerClass deliberately use this app's own default-text/
  // SIZE_SCALE vocabulary (see TextFormatMenu.vue) rather than production's
  // fixed .faq-item-title/.faq-item pixel sizes, so they stay editable
  // through the same format controls every other text field in this editor
  // uses.
  //
  // faq-question-text/faq-answer-text are stable marker classes (always
  // present, never touched by the format menu) that faq.css hooks two
  // NON-editable behaviors onto - the active question's primary-color
  // highlight and the answer's margin/white-space - which production's old
  // fixed .faq-item-title/.faq-item classes used to carry bundled in with
  // their (now-superseded) font styling.
  //
  // EDIT-MODE CHROME: everything editor-only here is confined to the panel
  // title's own #actions slot (one extra <i> beside the chevron) plus
  // classes on existing elements - deliberately NOT a wrapper element around
  // each panel, which is the obvious way to hang a per-item button off the
  // side. Vuetify styles the accordion through direct-child selectors
  // (.v-expansion-panels > :first-child/:last-child for the outer radius,
  // .v-expansion-panel:not(:first-child)::after for the dividers), so an
  // extra div per panel would silently change how the block looks in edit
  // mode versus preview - the one thing this editor exists to get right.
  type PropsModel = {
    title: TranslatedModel
    subtitle: TranslatedModel
    // Only the ALIGNMENT is editable in these two (see the format controls
    // below): size, weight and colour come from the theme, and production
    // renders them from these same fields, so what is set here is what the
    // site shows.
    titleClass?: string
    subtitleClass?: string
    questionClass: string
    answerClass: string
    expandIcon: string
    // Blocks saved before the icon picker became a PAIR picker have no
    // collapseIcon at all - derived from expandIcon in that case, see
    // utils/faq-expand-icons.ts.
    collapseIcon?: string
    questions: { question: TranslatedModel, answer: TranslatedModel }[]
  }

  const model = defineModel<PropsModel>()

  const { locale } = storeToRefs(useCommonStore())

  const mode = useEditorMode()
  const blockActionsTarget = useBlockActionsTarget()

  const dragActive = ref(false)
  const { container } = useSortableList(() => model.value?.questions, dragActive)

  // useSortableList needs the real DOM element that directly parents the
  // draggable items - here that's <v-expansion-panels>' own root div, and a
  // plain `ref` on a Vuetify component hands back the component instance
  // instead. A function ref unwraps it to $el, and template refs are already
  // assigned by the time this component's own onMounted (which is where the
  // composable creates the Sortable instance) runs.
  function setPanelsEl (el: unknown) {
    container.value = (el as { $el?: HTMLElement } | null)?.$el ?? null
  }

  // Always a complete pair, derived from the pair table rather than trusted
  // as two independent stored fields - see resolveIconPair's own comment for
  // the several ways expandIcon and collapseIcon can otherwise disagree.
  const iconPair = computed(() => resolveIconPair(model.value?.expandIcon, model.value?.collapseIcon))

  // Write the resolved pair back into the block's own props, so the page
  // JSON that reaches the preview app (and, later, client-side) always
  // carries BOTH icons and those consumers can stay dumb - read two strings,
  // bind two props, no pair table of their own. Only the editor knows the
  // pairs, and this is where that knowledge gets baked into the data.
  // Idempotent: a block already holding a matched pair is left untouched, so
  // this never marks a page dirty on its own.
  onBeforeMount(() => {
    // Only when an icon is actually in play: a block that has never had one
    // set must be left exactly as it is, or merely opening the page would
    // write two empty strings into it and mark it dirty for autosave.
    if (!model.value?.expandIcon) return
    const { collapse } = iconPair.value
    if (model.value.collapseIcon !== collapse) {
      model.value.collapseIcon = collapse
    }
  })

  // The block's own heading and lead line. They were left read-only when
  // this component was migrated off production's i18n-driven FAQ - out of
  // scope for that pass - which left two texts on the page that simply could
  // not be changed from anywhere.
  //
  // Alignment is the one thing worth changing here: size, weight and colour
  // belong to the theme's own .faq-title / .h6 rules, and offering them
  // would be offering settings that do not reach the site.
  // The base classes are the theme's and are always present; the format
  // menu only ever adds or swaps the alignment one. Stored whole rather
  // than as "the alignment on top of a hardcoded base", so production has a
  // single class string to render and no rule to reconstruct.
  const DEFAULT_TITLE_CLASS = 'faq-title h2 my-8'
  const DEFAULT_SUBTITLE_CLASS = 'h6 text-thin text-black subtitle my-6'
  const titleClass = computed({
    get: () => model.value?.titleClass || DEFAULT_TITLE_CLASS,
    set: (value: string) => {
      if (model.value) model.value.titleClass = value
    },
  })
  const subtitleClass = computed({
    get: () => model.value?.subtitleClass || DEFAULT_SUBTITLE_CLASS,
    set: (value: string) => {
      if (model.value) model.value.subtitleClass = value
    },
  })

  function headingText (field: 'title' | 'subtitle'): string {
    return resolveLocaleText(model.value?.[field], locale.value)
  }
  // Writes into the CURRENT locale only, leaving the other two languages
  // alone - the rule every text field in this editor follows.
  function setHeadingText (field: 'title' | 'subtitle', value: string | undefined) {
    if (!model.value) return
    if (!isTranslatedModel(model.value[field])) {
      model.value[field] = emptyTranslatedModel()
    }
    model.value[field][locale.value] = value || ''
  }

  // One dialog reused for whichever pair is being edited, addressed by index
  // rather than by a copy of the item - the dialog mutates the live object in
  // the block's own props array, same convention as every other block editor.
  const editingIndex = ref<number | null>(null)
  const itemDialogOpen = ref(false)
  const editingItem = computed(() => (editingIndex.value === null ? null : model.value?.questions[editingIndex.value] ?? null))

  function openItem (index: number) {
    editingIndex.value = index
    itemDialogOpen.value = true
  }
  // A new pair is empty by definition, so there is nothing to see in the
  // accordion until it's filled in - open its editor straight away rather
  // than leaving a blank row for the user to hunt down.
  function addQuestion () {
    if (!model.value) return
    model.value.questions.push({ question: emptyTranslatedModel(), answer: emptyTranslatedModel() })
    openItem(model.value.questions.length - 1)
  }
  async function deleteEditingItem () {
    if (!model.value || editingIndex.value === null) return
    if (!await useUiFeedbackStore().confirmDelete('question')) return
    model.value.questions.splice(editingIndex.value, 1)
    editingIndex.value = null
  }
</script>

<template>
  <div v-if="model" class="faq">
    <template v-if="mode === 'edit'">
      <TextEditor
        v-model:class="titleClass"
        :content="headingText('title')"
        :format-controls="['align']"
        parent-type="usual"
        type="text"
        @update:content="value => setHeadingText('title', value)"
      />
      <TextEditor
        v-model:class="subtitleClass"
        :content="headingText('subtitle')"
        :format-controls="['align']"
        parent-type="usual"
        type="text"
        @update:content="value => setHeadingText('subtitle', value)"
      />
    </template>
    <template v-else>
      <p :class="titleClass">{{ resolveLocaleText(model.title, locale) }}</p>
      <p :class="subtitleClass">{{ resolveLocaleText(model.subtitle, locale) }}</p>
    </template>

    <template v-if="mode === 'edit'">
      <!-- Teleport falls back to rendering in place when there is no
        ancestor toolbar to reach (see useEditableBlockActions.ts) - in
        practice DynamicPageTemplate.vue always wraps a type:'component'
        block in EditableBlockWrapper, so there always is one. -->
      <Teleport :disabled="!blockActionsTarget" :to="blockActionsTarget || 'body'">
        <FaqBlockActions v-model:drag-active="dragActive" :model="model" @add="addQuestion" />
      </Teleport>
      <FaqDialog v-model="itemDialogOpen" :item="editingItem" @delete="deleteEditingItem" />
    </template>

    <v-expansion-panels :ref="setPanelsEl" class="faq-expansion-panels transparent">
      <v-expansion-panel
        v-for="(item, index) of model.questions"
        :key="stableKey(item)"
        :class="['faq-expansion-panels', 'mb-2', { 'faq-drag-cursor': dragActive }]"
      >
        <v-expansion-panel-title
          :class="{ 'faq-drag-inert': dragActive }"
          :collapse-icon="iconPair.collapse || undefined"
          :expand-icon="iconPair.expand || undefined"
        >
          <p :class="['faq-question-text', model.questionClass]">{{ resolveLocaleText(item.question, locale) }}</p>
          <!-- Rendered into the title's own actions area (right of the
            question, beside the chevron) rather than as a sibling element,
            so the accordion's DOM shape stays exactly as production's.
            A bare <v-icon>, not ToolbarIconButton: the panel title IS a
            <button>, and nesting a second button inside it is invalid HTML
            that browsers resolve by breaking one of the two. The unset
            chevron after it is rendered from the slot's own resolved props
            rather than left bare (Vuetify would fill a bare <v-icon /> in
            through a VDefaultsProvider, but only for as long as it keeps
            doing that - naming the two icons here makes the accordion's
            open/closed glyphs explicit and greppable). -->
          <template v-if="!dragActive" #actions="{ expanded, expandIcon: openIcon, collapseIcon: closeIcon }">
            <v-tooltip location="top" text="Редагувати це питання" theme="editorTheme">
              <template #activator="{ props: tooltipProps }">
                <v-icon
                  v-bind="tooltipProps"
                  class="faq-item-edit"
                  icon="mdi-cog"
                  @click.stop="openItem(index)"
                />
              </template>
            </v-tooltip>
            <v-icon :icon="expanded ? closeIcon : openIcon" />
          </template>
        </v-expansion-panel-title>
        <v-expansion-panel-text :class="{ 'faq-drag-inert': dragActive }">
          <p :class="['faq-answer-text', model.answerClass]">{{ resolveLocaleText(item.answer, locale) }}</p>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

  </div>
</template>

<style scoped>
.faq-item-edit {
  margin-inline-end: 8px;
  cursor: pointer;
  opacity: 0.55;
}
.faq-item-edit:hover {
  opacity: 1;
}
/* Same two-part split EditableCardsBlock.vue documents: pointer-events:none
   stops a drag gesture from being hijacked by the panel's own toggle button,
   but it also stops that element resolving its own cursor - so "move" has to
   sit on the panel itself, one level up. */
.faq-drag-inert {
  pointer-events: none;
}
.faq-drag-cursor {
  cursor: move;
}
</style>
