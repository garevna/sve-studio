<script setup lang="ts">
  import { computed, onBeforeMount, ref, useSlots } from 'vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { useTextFormatPanel } from '@/composables/useTextFormatPanel'
  import { defaultHeaderClass, defaultIconTextClass, defaultSubheaderClass, defaultTextClass } from '@/configs/defaults/default-classes'
  import { t } from '@/i18n'
  import { EDITOR_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'
  import TextFormatMenu from './TextFormatMenu.vue'

  // One editable text field plus the panel that drops out below it. Both
  // halves of that are the caller's through v-model: the text, its class
  // string, and whether the panel is open.
  //
  // The panel's CONTENT is the caller's too, via the #panel slot: a footer
  // link's panel carries a link button and a delete button instead of the
  // format controls, and that is a different panel, not a different text
  // editor. Without the slot the panel is the format menu, as everywhere
  // else.
  const mode = useEditorMode()
  const panel = useTextFormatPanel()
  const slots = useSlots()

  const emit = defineEmits(['delete', 'configure'])

  const props = withDefaults(defineProps<{
    parentType: 'usual' | 'icon' | 'parallax'
    // See TextFormatMenu.vue - only set when this field IS a whole top-level
    // page block, so "delete" can fold into the existing format-panel button
    // instead of a second, competing one.
    deletable?: boolean
    // See TextFormatMenu.vue's own comment - a caller-specific "configure"
    // action folded into the format panel instead of its own separate icon.
    configurable?: boolean
    configureTooltip?: string
    configureIcon?: string
    // See TextFormatMenu.vue's own comment - stacks the panel's icons in a
    // column instead of a row, for a narrow host with no room to widen into.
    vertical?: boolean
    // False only for contexts where the class this menu writes has no real
    // rendering effect (see src/configs/text-format-support.ts) - the
    // format menu is dropped entirely then, but "delete" (if deletable)
    // still needs a plain button to fall back to, since it no longer has
    // the format menu's fab to fold into. Needs an explicit runtime
    // default: a boolean-typed prop with no default casts an absent value
    // to `false` (not `undefined`), so every caller that didn't pass this
    // explicitly would otherwise silently lose its format menu.
    formattable?: boolean
    // The text comes from elsewhere (a contact from the general settings) -
    // shown, formatted, but not typed into here.
    readonly?: boolean
    // The gap below the text in the format panel (see TextFormatMenu).
    spacing?: boolean
    // Narrows the format panel to these controls only - see
    // TextFormatMenu's own `only`.
    formatControls?: ('size' | 'align' | 'color' | 'weight')[]
    // Icon for the button that opens the panel. Defaults to the format
    // menu's own tune icon; a caller supplying its own #panel usually wants
    // an icon that says what that panel actually holds.
    panelIcon?: string
    panelTooltip?: string
    // This field's text in another site language, when THIS language has
    // none yet - shown as a hint inside the empty field so a missing
    // translation is visible (see utils/locale-text.ts translationHint).
    missingTranslation?: string
  }>(), {
    formattable: true,
  })

  const type = defineModel<'text' | 'header' | 'title'>('type', { default: 'text' })
  const content = defineModel<string>('content')
  const className = defineModel<string>('class', { default: '' })

  // Whether the panel below is open. Left unbound (the usual case) this
  // falls back to the shared single-panel-at-a-time token, so opening one
  // field's panel closes whatever else was open. A caller that binds it
  // takes over completely - useful when the panel's state belongs to a
  // list the parent is already tracking.
  const panelOpen = defineModel<boolean | undefined>('panelOpen', { default: undefined })

  const hasOwnPanel = computed(() => !!slots['panel'])
  // Something to drop down: either the format menu or a panel the caller
  // supplied. Without either there is nothing for the button to open, so
  // the button itself goes away.
  const panelAvailable = computed(() => props.formattable || hasOwnPanel.value)
  const isPanelOpen = computed(() => (panelOpen.value === undefined ? panel.isOpen.value : panelOpen.value))
  function togglePanel () {
    if (panelOpen.value === undefined) {
      panel.toggle()
    } else {
      panelOpen.value = !panelOpen.value
    }
  }

  // Which element this block renders as outside edit mode. Mirrors the
  // standalone preview window's own TemplateText.vue exactly (header -> h2,
  // title -> h3, everything else -> p).
  const previewTag = computed(() => (type.value === 'header' ? 'h2' : (type.value === 'title' ? 'h3' : 'p')))

  const textContainer = ref<HTMLElement | null>(null)
  const edited = ref(false)

  const activeClass = computed(() => content.value ? className.value : 'text-before-edit')

  const missingHint = computed(() => {
    if (mode.value !== 'edit' || content.value || !props.missingTranslation) return undefined
    const text = props.missingTranslation.length > 80 ? `${props.missingTranslation.slice(0, 80)}…` : props.missingTranslation
    return t('translations.missingHint', { text })
  })

  function saveContent () {
    if (textContainer.value) {
      content.value = textContainer.value.textContent
      edited.value = false
    }
  }

  // Paste as PLAIN TEXT. A contenteditable accepts whatever the clipboard
  // carries, markup included - pasting a heading copied from the page above
  // dropped a real <h2> inside this <p>, which is invalid nesting the
  // browser then resolves however it likes. These fields hold a string;
  // anything else in them is a bug waiting to be saved into the page.
  function onPaste (event: ClipboardEvent) {
    event.preventDefault()
    const text = event.clipboardData?.getData('text/plain') || ''
    // execCommand is deprecated but is still the only way to insert text at
    // the caret AND keep it in the browser's own undo stack; the modern
    // alternatives (Range surgery) lose undo entirely.
    document.execCommand('insertText', false, text)
  }

  function onTextInput () {
    edited.value = true
    if (panelOpen.value === undefined) {
      panel.close()
    } else {
      panelOpen.value = false
    }
  }

  onBeforeMount(() => {
    let defaultClass = defaultTextClass
    if (type.value === 'header') defaultClass = defaultHeaderClass
    else if (type.value === 'title') defaultClass = defaultSubheaderClass
    else if (props.parentType === 'icon') defaultClass = defaultIconTextClass

    if (!className.value) {
      className.value = defaultClass
    }
  })
</script>

<template>
  <!-- The two wrappers and the flex row exist purely to seat the text next
    to its own edit-mode chrome (the save check, the format menu / delete
    button below). They are gated on edit mode rather than always rendered:
    in a flex row the text element is an item sized to its own content, so
    text-center inside it centres nothing - which is exactly why a centred
    block looked left-aligned in the editor's preview mode while the
    standalone preview window (which renders the bare element) got it
    right. -->
  <div v-if="mode === 'edit'" class="w-100">
    <!-- text-format-open collapses the text's OWN bottom margin while the
      panel is out. Without it a field carrying an mb-4 (16px, and the
      footer's links carry exactly that) pushes its panel further from the
      text it belongs to than the next item in the list sits - so the panel
      reads as belonging to the row BELOW it. See editor-ui.css, where the
      rule has to live: Vuetify's spacing utilities are !important inside a
      cascade layer, and only a layered !important rule outranks them. -->
    <div class="w-100 d-flex flex-nowrap align-center" :class="{ 'text-format-open': isPanelOpen }">
      <p
        v-if="type === 'text'"
        ref="textContainer"
        :class="[mode === 'edit' ? (content ? 'editing-text' : activeClass) : '', className, { 'missing-translation': missingHint, 'readonly-text': props.readonly }]"
        :contenteditable="mode === 'edit' && !props.readonly"
        :data-hint="missingHint"
        :innerText="content || ''"
        @focus="panel.closeIfForeign()"
        @input="onTextInput"
        @paste="onPaste"
      >
        {{ content }}
      </p>
      <h2
        v-else-if="type === 'header'"
        ref="textContainer"
        :class="[mode === 'edit' ? (content ? 'editing-text' : activeClass) : '', className, { 'missing-translation': missingHint, 'readonly-text': props.readonly }]"
        :contenteditable="mode === 'edit' && !props.readonly"
        :data-hint="missingHint"
        :innerText="content || ''"
        :style="{ width: 'calc(100% - 32px)' }"
        @focus="panel.closeIfForeign()"
        @input="onTextInput"
        @paste="onPaste"
      >
        {{ content }}
      </h2>
      <h3
        v-else-if="type === 'title'"
        ref="textContainer"
        :class="[mode === 'edit' ? (content ? 'editing-text' : activeClass) : '', className, { 'missing-translation': missingHint, 'readonly-text': props.readonly }]"
        :contenteditable="mode === 'edit' && !props.readonly"
        :data-hint="missingHint"
        :innerText="content || ''"
        :style="{ width: 'calc(100% - 32px)' }"
        @focus="panel.closeIfForeign()"
        @input="onTextInput"
        @paste="onPaste"
      >
        {{ content }}
      </h3>
      <template v-if="mode === 'edit'">
        <v-icon v-if="edited" color="green" size="large" @click="saveContent">mdi-check-bold</v-icon>
        <!-- Vertical is a real floating v-menu (overlaid, doesn't push
          layout), not the inline v-expand-transition panel below - that
          one visibly stretched its own host container downward while open
          (fine for a full-width row, awkward for a narrow one like a
          footer link), and needed a whole scroll-closes-it workaround
          (see useTextFormatPanel.ts) specifically because ITS OWN opening
          could nudge the page's scroll position. A floating menu has
          neither problem, so it skips that shared token entirely and just
          uses v-menu's own native open state. -->
        <v-menu v-else-if="panelAvailable && props.vertical" :close-on-content-click="false" location="bottom end">
          <template #activator="{ props: menuProps }">
            <ToolbarIconButton v-bind="menuProps" :icon="props.panelIcon || 'mdi-tune'" :tooltip="props.panelTooltip || 'Налаштування'" />
          </template>
          <div :class="['text-format-panel', 'text-format-panel--vertical', 'editor-panel', themeClass(EDITOR_THEME_NAME)]">
            <v-theme-provider theme="editorTheme">
              <slot name="panel" :vertical="true">
                <TextFormatMenu
                  v-model:class="className"
                  :configurable="props.configurable"
                  :configure-icon="props.configureIcon"
                  :configure-tooltip="props.configureTooltip"
                  :deletable="props.deletable"
                  :only="props.formatControls"
                  :parent-type="props.parentType"
                  :spacing="props.spacing"
                  vertical
                  @configure="emit('configure')"
                  @delete="emit('delete')"
                />
              </slot>
            </v-theme-provider>
          </div>
        </v-menu>
        <ToolbarIconButton
          v-else-if="panelAvailable"
          :icon="props.panelIcon || 'mdi-tune'"
          :tooltip="props.panelTooltip || 'Налаштування'"
          @click="togglePanel"
        />
        <ToolbarIconButton
          v-else-if="props.deletable"
          icon="mdi-delete-outline"
          tooltip="Видалити"
          @click="emit('delete')"
        />
      </template>
    </div>
    <v-expand-transition v-if="mode === 'edit' && panelAvailable && !props.vertical">
      <div v-if="isPanelOpen" :class="['text-format-panel', 'editor-panel', themeClass(EDITOR_THEME_NAME)]">
        <v-theme-provider theme="editorTheme">
          <slot name="panel" :vertical="false">
            <TextFormatMenu
              v-model:class="className"
              :configurable="props.configurable"
              :configure-icon="props.configureIcon"
              :configure-tooltip="props.configureTooltip"
              :deletable="props.deletable"
              :only="props.formatControls"
              :parent-type="props.parentType"
              :spacing="props.spacing"
              @configure="emit('configure')"
              @delete="emit('delete')"
            />
          </slot>
        </v-theme-provider>
      </div>
    </v-expand-transition>
  </div>

  <!-- Preview: the bare element and nothing else, matching what the
    standalone preview window and production both render. No ref/handlers
    (saveContent only ever runs in edit mode) and no width reservation for
    icons that aren't there. -->
  <component :is="previewTag" v-else-if="content" :class="className">{{ content }}</component>
</template>

<style>
/* An empty field whose text exists in another site language: dashed amber
   outline plus that text as a hint, so the gap can't go unnoticed. */
.missing-translation {
  outline: 1px dashed #C79A3A;
  outline-offset: 2px;
}
.missing-translation:empty::before {
  content: attr(data-hint);
  color: #C79A3A;
  font-style: italic;
  font-size: 14px;
  font-weight: 400;
  pointer-events: none;
}
.text-before-edit, .editing-text {
  width: calc(100% - 32px);
  border-radius: 4px;
  padding: 0 8px;
}
/* An empty field (or one typed into but not yet saved): a frame, not a
   fill - it sits on the text's own background, light or dark, and a fill
   hid a light text on a dark card. A mid grey shows on both. */
.text-before-edit {
  min-height: 1.5em;
  border: 1px dashed rgb(128 140 155 / 0.8);
}
.text-before-edit:focus,
.editing-text:focus {
  outline: solid 1px #79a !important;
  padding: 0 8px;
}
/* A contact's text: shown and formatted, typed in the general settings. */
.readonly-text {
  cursor: default;
  outline: 1px dashed #b7c2cc;
  outline-offset: 2px;
}
.text-format-panel {
  margin-top: 6px;
  padding: 8px 12px;
}
/* Stacked icons only need one icon's own width, not the full row width the
   horizontal variant relies on for justify-space-between - fits a narrow
   host column without ever needing to widen past it. */
.text-format-panel--vertical {
  width: fit-content;
}
</style>
