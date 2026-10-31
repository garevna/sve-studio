<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, ref } from 'vue'
  import LocaleSwitcher from '@/components/editors/small/LocaleSwitcher.vue'
  import IconEditor from '@/components/editors/text/IconEditor.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import ButtonVariantSelect from '@/components/special/ButtonVariantSelect.vue'
  import LinkTargetSettings from '@/components/special/LinkTargetSettings.vue'
  import FeedbackCardDialog from '@/components/templates/sections/FeedbackCardDialog.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { feedbackFormTexts } from '@/configs/components/feedback-form'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'

  // A button block: what it says, how it looks, whether it carries an icon,
  // and where it goes. All four were missing except the words - the look was
  // whatever the block was created with, the icon did not exist, and the
  // link was a flat list of pages with no way to reach a section inside one.
  //
  // The look is chosen from the classes the UI Kit actually defines (see
  // useButtonVariants), so this list never disagrees with the palette.
  //
  // `block` is a live reference into the page's own reactive content tree -
  // mutated in place, this editor's convention everywhere. It is what the
  // link settings write route/params/hash onto, the same shape the menu and
  // the footer's links already use.
  const mode = useEditorMode()

  const props = defineProps<{
    block: TemplateBlockModel
    deletable?: boolean
  }>()
  const emit = defineEmits<{ delete: [] }>()

  const content = defineModel<string>('content', { default: '' })
  const className = defineModel<string>('class', { default: '' })

  const panelOpen = ref(false)

  // Empty string, not undefined, so IconEditor's own model has something to
  // bind to - it writes back through the setter either way.
  const icon = computed({
    get: () => props.block.icon || '',
    set: (value: string) => {
      // eslint-disable-next-line vue/no-mutating-props
      props.block.icon = value || undefined
    },
  })

  async function requestDelete () {
    if (!await useUiFeedbackStore().confirmDelete('button')) {
      return
    }
    panelOpen.value = false
    emit('delete')
  }

  // What a click does: go to a page (or a block on it - the form on the
  // contacts page, say), or open the feedback form in a popup. The popup's
  // form has its own texts, set in the same window the footer's card uses.
  const formOpen = ref(false)
  const action = computed({
    get: () => (props.block.action === 'form' ? 'form' : 'link'),
    set: (value: 'link' | 'form') => {
      /* eslint-disable vue/no-mutating-props -- the block is edited in place, see the top comment */
      if (value === 'form') {
        props.block.action = 'form'
        props.block.form ??= feedbackFormTexts()
      } else {
        delete props.block.action
      }
      /* eslint-enable vue/no-mutating-props */
    },
  })

  const linkSummary = computed(() => {
    if (props.block.action === 'form') {
      return 'Відкриває форму зворотного зв’язку'
    }
    if (props.block.route !== 'dynamic-page') {
      return props.block.route ? `Сторінка «${props.block.route}»` : 'Перехід не налаштований'
    }
    const pageId = (props.block.params as { pageId?: string } | undefined)?.pageId
    return props.block.hash ? `Сторінка «${pageId}», блок ${props.block.hash}` : `Сторінка «${pageId}»`
  })
</script>

<template>
  <!-- Rendered whether or not it has a label yet. It used to be hidden in
    preview mode until someone typed something, so a freshly inserted button
    looked like it had not been inserted at all - while production renders
    the (empty) button perfectly happily. The editor's preview has to show
    what the site shows, including when that is an unfinished button. -->
  <div class="button-editor">
    <div class="button-editor-row">
      <!-- A slot that can shrink, so the cog beside it always has room:
        .primary-button is width:100%, which pushed the cog off the edge of
        the page entirely. -->
      <!-- The real button in every mode, never an editable stand-in. The
        label is typed in the settings window instead: a contenteditable
        inside a <button> gets no caret in any browser, so the text could
        never actually be edited in place - and a field next to the icon and
        the link is where the rest of what this button says already lives. -->
      <div class="button-editor-face-slot">
        <v-btn :class="className">
          <v-icon v-if="icon" class="mr-2" :icon="icon" size="20" />
          {{ content }}
        </v-btn>
      </div>
      <ToolbarIconButton
        v-if="mode === 'edit'"
        :active="panelOpen"
        class="button-editor-action"
        icon="mdi-cog"
        tooltip="Налаштування кнопки"
        @click="panelOpen = !panelOpen"
      />
    </div>

    <p v-if="mode === 'edit'" class="text-caption button-editor-summary">{{ linkSummary }}</p>

    <!-- A dialog, not a panel under the button. An inline panel renders
      INSIDE the previewed page, and that page's own stylesheet reaches it -
      it styles by tag and class (inputs.css, buttons.css), which no amount
      of theme-provider wrapping keeps out, so the editor's own fields came
      out wearing the site's clothes. A dialog renders in an overlay outside
      that content, which is why every other settings window in this editor
      is one. -->
    <v-dialog v-model="panelOpen" max-width="560">
      <v-card class="editor-dialog" theme="editorTheme">
        <v-toolbar class="editor-panel" color="transparent" density="compact">
          <v-toolbar-title class="button-editor-dialog-title">Налаштування кнопки</v-toolbar-title>
          <v-spacer />
          <ToolbarIconButton
            v-if="deletable"
            icon="mdi-delete"
            tooltip="Видалити кнопку"
            @click="requestDelete"
          />
          <ToolbarIconButton icon="mdi-close" tooltip="Закрити" @click="panelOpen = false" />
        </v-toolbar>

        <v-card-text>
          <!-- Writes into the block's own TranslatedModel for the CURRENT
            locale only, leaving the other two languages alone - the caller
            hands over exactly that one string (see TemplateItem.vue's
            localizedContent), the same rule every other text field in this
            editor follows. -->
          <v-text-field
            v-model="content"
            class="mb-6"
            density="compact"
            hide-details
            label="Текст кнопки"
            variant="outlined"
          />

          <ButtonVariantSelect v-model:class="className" class="mb-6" />

          <!-- The icon is chosen in the dialog that already exists for it,
            not in a picker inlined here. That picker loads its 7500-name mdi
            list only when its host asks it to (loadIconNames), which nothing
            here was doing - so the search found nothing, every time.
            IconEditor does ask, and gives the same icon window used
            everywhere else.

            appearance=false: a button's icon takes its size and colour from
            the button, so there is nothing of that kind to set. -->
          <div class="button-editor-icon-row mb-6">
            <span class="button-editor-field-label">Іконка</span>
            <IconEditor v-model:icon="icon" :appearance="false" :icon-size="24" />
            <v-btn v-if="icon" size="small" variant="text" @click="icon = ''">Прибрати</v-btn>
          </div>

          <p class="button-editor-field-label mb-2">Що робить кнопка</p>
          <v-btn-toggle
            v-model="action"
            class="mb-6 button-editor-action-toggle"
            color="primary"
            density="compact"
            mandatory
            variant="outlined"
          >
            <v-btn prepend-icon="mdi-link-variant" value="link">Веде на сторінку</v-btn>
            <v-btn prepend-icon="mdi-message-text-outline" value="form">Відкриває форму</v-btn>
          </v-btn-toggle>

          <!-- The same three fields the menu and the footer's links use -
            a page, and optionally one block on it to scroll to. -->
          <LinkTargetSettings v-if="action === 'link'" :active="panelOpen" auto :item="block" />
          <template v-else-if="block.form">
            <p class="text-body-2 mb-3">Форма відкриється у вікні поверх сторінки.</p>
            <v-btn prepend-icon="mdi-playlist-edit" variant="tonal" @click="formOpen = true">Тексти форми</v-btn>
            <FeedbackCardDialog v-model="formOpen" :card="block.form" />
          </template>
        </v-card-text>

        <v-card-actions>
          <LocaleSwitcher />
          <v-spacer />
          <v-btn color="primary" variant="elevated" @click="panelOpen = false">ОК</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.button-editor :deep(.v-btn__content) {
  outline: none;
}
.button-editor-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
}
.button-editor-face-slot {
  flex: 1 1 auto;
  min-width: 0;
}
.button-editor-action {
  flex: 0 0 auto;
}
.button-editor-summary {
  margin: 4px 0 0;
  opacity: 0.7;
}
.button-editor-dialog-title {
  font-size: 1rem;
  font-weight: 600;
}
.button-editor-icon-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.button-editor-action-toggle {
  flex-wrap: wrap;
  height: auto;
}
.button-editor-field-label {
  font-size: 0.85rem;
  color: #7A8699;
}
</style>
