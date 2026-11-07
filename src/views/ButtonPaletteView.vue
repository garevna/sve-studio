<script lang="ts" setup>
  import type { ButtonEntry } from '@/utils/button-style-entry'
  import type { CssNode } from '@/utils/css-rules'
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import googleIcon from '@/assets/google-icon.svg'
  import ButtonIcon from '@/components/editors/icon/ButtonIcon.vue'
  import ButtonStylePicker from '@/components/special/ButtonStylePicker.vue'
  import EditorSaveBar from '@/components/special/EditorSaveBar.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import TabsPreview from '@/components/special/TabsPreview.vue'
  import { lookNeedsIcon } from '@/composables/useButtonVariants'
  import { isTabClass, TAB_STRIP_CLASS, TAB_STYLE_CLASS } from '@/configs/tab-classes'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { buttonPreviewVars } from '@/utils/button-preview-vars'
  import { extractButtonEntries, serializeButtonEntries } from '@/utils/button-style-entry'
  import { parseCss, serializeCss } from '@/utils/css-rules'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  const FILE_NAME = 'buttons.css'
  const ajaxStore = useAjaxStore()

  const entries = ref<ButtonEntry[]>([])
  const otherNodesRef = ref<ReturnType<typeof extractButtonEntries>['otherNodes']>([])
  const expandedClassName = ref<string | null>(null)
  const loading = ref(true)
  const saving = ref(false)
  const undoing = ref(false)
  const dirty = ref(false)

  const addDialogOpen = ref(false)
  const newClassName = ref('')
  const addError = ref('')

  function loadFrom (cssText: string) {
    const { entries: parsed, otherNodes } = extractButtonEntries(cssText)
    entries.value = parsed
    otherNodesRef.value = otherNodes
  }

  onMounted(async () => {
    try {
      const content = await ajaxStore.getStyleFile(FILE_NAME)
      skipNextAutoSave = true
      loadFrom(content ?? '')
      dirty.value = await ajaxStore.isStyleFileUpdated(FILE_NAME)
    } finally {
      loading.value = false
    }
  })

  // buttons.css styles the bare `button` tag alongside the classes, and that
  // rule is not a class so it gets no row of its own - it stays in the
  // residual nodes. Its radius is what a .tab-button visibly has on the
  // site while setting none itself, so the pickers are told about it rather
  // than showing an empty field for something plainly rounded.
  const inheritedRadius = computed(() => {
    for (const node of otherNodesRef.value) {
      if (node.kind !== 'rule' || !node.selectors.includes('button')) {
        continue
      }
      const declaration = node.declarations.find(item => item.property === 'border-radius')
      if (declaration) {
        return declaration.value.replace('!important', '').trim()
      }
    }
    return ''
  })

  function serializeEntries (): string {
    return serializeButtonEntries(entries.value, otherNodesRef.value)
  }

  // A button that moves (a glare, a wave, a ring...) or arranges what is
  // inside it (the icon to the right of the text) gets that from rules this
  // page has no fields for - pseudo-elements, :active, keyframes, rules on
  // its content - and the colour-only sample below cannot show it. Those are
  // previewed as the real site button with the real class instead.
  function usesRealPreview (entry: ButtonEntry): boolean {
    const own = `.${entry.className}`
    const moves = [...entry.base.raw, ...entry.hover.raw].some(item => item.property === 'animation')
    return moves || otherNodesRef.value.some(node => node.kind === 'rule' && node.selectors.some(selector =>
      selector.startsWith(own) && /^(?::active|::|:hover::|:focus-visible|\s*>)/.test(selector.slice(own.length)),
    ))
  }

  // A page's button may carry an icon (the block's "Іконка" field), and
  // where it goes is the class's business - so the real-class sample can
  // show one. On at first only for a class that is about the icon
  // (button-with-icon-right); the checkbox flips it for any of them.
  const SAMPLE_ICON = 'mdi-arrow-right'
  const previewIconFlipped = ref(new Set<string>())
  function realIconShown (className: string): boolean {
    return lookNeedsIcon(className) !== previewIconFlipped.value.has(className)
  }
  function toggleRealIcon (className: string) {
    const flipped = new Set(previewIconFlipped.value)
    if (flipped.has(className)) {
      flipped.delete(className)
    } else {
      flipped.add(className)
    }
    previewIconFlipped.value = flipped
  }

  // The site's stylesheets were loaded once, when the editor started, so the
  // real-class samples would show buttons.css as it was then. The text being
  // edited is laid over it here, so a colour picked below shows at once.
  const LIVE_STYLE_ID = 'ui-kit-buttons-live'
  //
  // Every :hover rule is repeated there under FORCE_HOVER_CLASS too, so the
  // sample can show its hover look while the hover state is being edited -
  // a real :hover needs the mouse, and the mouse is on the fields.
  const FORCE_HOVER_CLASS = 'ui-kit-force-hover'
  function forcedHoverRules (cssText: string): string {
    const rules: CssNode[] = []
    for (const node of parseCss(cssText)) {
      if (node.kind !== 'rule') continue
      const selectors = node.selectors.filter(selector => selector.includes(':hover'))
      if (selectors.length > 0) {
        rules.push({ ...node, selectors: selectors.map(selector => selector.replaceAll(':hover', `.${FORCE_HOVER_CLASS}`)) })
      }
    }
    return serializeCss(rules)
  }
  function showLiveStyles () {
    let style = document.querySelector<HTMLStyleElement>(`#${LIVE_STYLE_ID}`)
    if (!style) {
      style = document.createElement('style')
      style.id = LIVE_STYLE_ID
      document.head.append(style)
    }
    const cssText = serializeEntries()
    style.textContent = `${cssText}\n\n${forcedHoverRules(cssText)}`
  }

  // The state the open row's settings are on (normal / hover / disabled) -
  // the sample shows that one. The disabled checkbox still works on its own.
  const editedState = ref<{ className: string, state: string } | null>(null)
  function previewState (className: string): 'base' | 'hover' | 'disabled' {
    if (previewDisabled.value.has(className)) return 'disabled'
    const edited = expandedClassName.value === className && editedState.value?.className === className
      ? editedState.value.state
      : 'base'
    return edited === 'hover' || edited === 'disabled' ? edited : 'base'
  }
  watch([entries, otherNodesRef], showLiveStyles, { deep: true })

  async function save () {
    saving.value = true
    try {
      // Reported centrally by the store - see ajax.ts's reportSaved /
      // reportSaveFailed.
      await ajaxStore.saveStyleFile(FILE_NAME, serializeEntries(), { publish: true })
      dirty.value = false
    } finally {
      saving.value = false
    }
  }

  async function undo () {
    undoing.value = true
    try {
      skipNextAutoSave = true
      const content = await ajaxStore.undoStyleFile(FILE_NAME)
      loadFrom(content)
      dirty.value = false
    } finally {
      undoing.value = false
    }
  }

  // Every edit lands in IndexedDB automatically (debounced) - same pattern
  // as PaletteView.vue/StyleFileView.vue.
  // Buttons and tabs are two UI Kit tabs over the same stylesheet
  // (buttons.css): `section` says which part this one shows. Only one of
  // them is mounted at a time (UiKitListView.vue), and a pending draft is
  // written out on leaving, so the other one starts from it.
  const props = withDefaults(defineProps<{ section?: 'buttons' | 'tabs' }>(), { section: 'buttons' })

  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  let skipNextAutoSave = false
  onBeforeUnmount(() => {
    if (!autoSaveTimer) return
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
    void ajaxStore.saveStyleFile(FILE_NAME, serializeEntries(), { publish: false })
  })
  watch(entries, () => {
    if (skipNextAutoSave) {
      skipNextAutoSave = false
      return
    }
    if (loading.value) return
    dirty.value = true
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null
      ajaxStore.saveStyleFile(FILE_NAME, serializeEntries(), { publish: false })
    }, 800)
  }, { deep: true })

  function toggleExpanded (className: string) {
    expandedClassName.value = expandedClassName.value === className ? null : className
    // A row opens on "normal" again.
    editedState.value = null
  }

  // Confirmed like every other deletion in this editor. Undo would bring it
  // back, but a class disappearing from the list the instant a trash icon is
  // brushed past is not something the user asked for - and the classes here
  // are shared by the whole site, so the blast radius is bigger than the one
  // row that vanished.
  async function removeEntry (className: string) {
    if (!await useUiFeedbackStore().confirmDelete('styleClass', { name: className })) {
      return
    }
    entries.value = entries.value.filter(entry => entry.className !== className)
  }

  const CLASS_NAME_RE = /^[a-zA-Z][\w-]*$/
  function openAddDialog () {
    newClassName.value = ''
    addError.value = ''
    addDialogOpen.value = true
  }
  function confirmAdd () {
    const className = newClassName.value.trim()
    if (!CLASS_NAME_RE.test(className)) {
      addError.value = t('buttonPalette.classNameInvalid')
      return
    }
    if (entries.value.some(entry => entry.className === className)) {
      addError.value = t('buttonPalette.classExists')
      return
    }
    entries.value.push({
      className,
      base: { borderRadius: 'var(--default-border-radius)', raw: [] },
      hover: { raw: [] },
      disabled: { raw: [] },
    })
    expandedClassName.value = className
    addDialogOpen.value = false
  }

  // One real, interactive button per entry instead of 3 static swatches -
  // hover shows itself by actually hovering the mouse over it, disabled by
  // the checkbox next to it, matching how a designer would expect to check
  // a button's states. The translation from an edited entry to the CSS
  // custom properties that drive it lives in utils/button-preview-vars.ts,
  // shared with the tabs strip below, which needs the same thing for four
  // elements at once.
  const previewVars = buttonPreviewVars

  // Production stretches these to their container's full width - a small
  // fixed-size preview swatch would misrepresent how the button actually
  // looks, so it gets the wider treatment here too.
  function isWideButton (entry: ButtonEntry): boolean {
    return entry.base.raw.some(item => item.property === 'width' && item.value.trim() === '100%')
  }

  // Some buttons carry an icon in the markup rather than in CSS - the
  // Google sign-in button is an <img> next to its label (see SignIn.vue).
  // The preview shows it, because a button whose whole point is that icon
  // reads as a different button without it; and it can be switched off,
  // because whether the icon is there is the page's decision, not this
  // class's, and its border and colours have to be judged either way.
  const PREVIEW_ICONS: Record<string, string> = {
    'google-button': googleIcon,
  }
  const previewIconHidden = ref(new Set<string>())
  function togglePreviewIcon (className: string, value: boolean) {
    if (value) {
      previewIconHidden.value.delete(className)
    } else {
      previewIconHidden.value.add(className)
    }
    // Same reason as previewDisabled below - a Set mutation is not tracked.
    previewIconHidden.value = new Set(previewIconHidden.value)
  }

  const previewDisabled = ref(new Set<string>())
  function togglePreviewDisabled (className: string, value: boolean) {
    if (value) previewDisabled.value.add(className)
    else previewDisabled.value.delete(className)
    // Set() mutations aren't tracked by Vue's reactivity on their own -
    // reassigning the ref (a new Set with the same contents) is what
    // actually triggers the :disabled binding below to update.
    previewDisabled.value = new Set(previewDisabled.value)
  }

  // eslint-disable-next-line unicorn/no-array-sort -- toSorted() isn't in this project's configured TS lib target
  const sortedEntries = computed(() => [...entries.value].sort((a, b) => a.className.localeCompare(b.className)))

  // Tabs are pulled out of the button list into their own subsection: they
  // are edited the same way, but they cannot be DEMONSTRATED the same way
  // (see TabsPreview.vue), and one of them - the strip's backing plate - is
  // not a button at all.
  const buttonEntries = computed(() => sortedEntries.value.filter(entry => !isTabClass(entry.className)))

  // A tab is ONE thing with four states, not four classes to find and edit
  // separately: .tab-button holds normal/hover/disabled, .tab-button--active
  // is the fourth state. The picker below is given both and writes each
  // state to whichever class owns it, so the stylesheet stays correct while
  // the user never has to know there are two.
  function entryByName (className: string) {
    return entries.value.find(entry => entry.className === className)
  }
  const tabButtonEntry = computed(() => entryByName(TAB_STYLE_CLASS.idle))
  const tabActiveEntry = computed(() => entryByName(TAB_STYLE_CLASS.active))

  // What is left to list by name: the plates are edited in their own block
  // above, and the two state classes are the picker's business. In practice
  // this is the legacy tabs-selected-class and nothing else - listed so it
  // can be deleted, not so it can be styled.
  const HANDLED_TAB_CLASSES = new Set<string>([
    TAB_STRIP_CLASS.auth,
    TAB_STRIP_CLASS.page,
    TAB_STYLE_CLASS.idle,
    TAB_STYLE_CLASS.active,
  ])
  const tabEntries = computed(() => sortedEntries.value.filter(
    entry => isTabClass(entry.className) && !HANDLED_TAB_CLASSES.has(entry.className),
  ))

  // The tab CLASSES are shared by the whole site; the plate under them is
  // the one thing that can differ by place, so both plates are offered
  // side by side rather than behind a switch - two colours is not enough to
  // hide one of them.
  const PLATE_CONTEXTS = computed(() => [
    { className: TAB_STRIP_CLASS.auth, label: t('buttonPalette.authPage') },
    { className: TAB_STRIP_CLASS.page, label: t('buttonPalette.otherPages') },
  ])

  // What the states preview stands on. The login page's plate, because it
  // is the one with something to see - a transparent plate would show the
  // states just as well but say nothing about the plate itself.
  const PREVIEW_PLATE = TAB_STRIP_CLASS.auth
  const PREVIEW_TABS = computed(() => [t('buttonPalette.previewLogin'), t('buttonPalette.previewRegister'), t('buttonPalette.previewProfile')])

  const TAB_STATE_LABELS = computed(() => ({
    base: t('buttonPalette.stateBase'),
    disabled: t('buttonPalette.stateDisabled'),
    active: t('buttonPalette.stateActive'),
  }))

  // Both plates are set the same way, right next to the tabs they sit
  // under - the colour is the one thing a designer will actually reach for
  // here, and hunting for the matching class row below to change it is a
  // detour. The row is still there for everything else.
  //
  // The plate for tabs outside the login page may not exist in an older
  // stylesheet yet; picking a colour creates it. Deliberately not created on
  // load: opening a page must never quietly change what it is showing.
  function plateColor (className: string): string {
    return entries.value.find(entry => entry.className === className)?.base.background || ''
  }
  function setPlateColor (className: string, key: string) {
    const existing = entries.value.find(entry => entry.className === className)
    if (existing) {
      existing.base.background = key
      return
    }
    entries.value.push({
      className,
      base: { background: key, borderRadius: 'var(--large-border-radius)', raw: [] },
      hover: { raw: [] },
      disabled: { raw: [] },
    })
  }
</script>

<template>
  <div class="button-palette">
    <v-progress-linear v-if="loading" color="primary" indeterminate />

    <template v-else>
      <div v-if="props.section === 'buttons'" class="button-palette-list">
        <div v-for="entry of buttonEntries" :key="entry.className" class="button-palette-row">
          <div class="button-palette-row-head" @click="toggleExpanded(entry.className)">
            <!-- --v-default-border-radius etc are Vuetify THEME variables -
                  they only resolve under a real .v-theme--{name} class on an
                  actual DOM element. <v-theme-provider> alone doesn't stamp
                  one onto a plain <button> (it's a provide()/inject()
                  mechanism for genuine Vuetify components, renders no DOM of
                  its own without with-background) - same lesson
                  DynamicPageTemplate.vue already learned the hard way for the
                  previewed page's own content. Without this, the preview was
                  silently reading editorTheme's own radius/palette instead of
                  the real app theme's, which is exactly backwards for a
                  preview of what these buttons look like on the actual site. -->
            <v-theme-provider :theme="APP_THEME_NAME">
              <div
                class="button-palette-preview"
                :class="[themeClass(APP_THEME_NAME), { 'button-palette-preview--wide': isWideButton(entry) }]"
                :style="{ '--btn-inherited-radius': inheritedRadius || '0' }"
              >
                <div v-if="usesRealPreview(entry)" class="button-palette-preview-real" :class="EDITED_APP_SCOPE_CLASS">
                  <!-- The same markup a page's button block renders,
                    icon included (site TemplateItem.vue). -->
                  <v-btn
                    :class="[entry.className, { [FORCE_HOVER_CLASS]: previewState(entry.className) === 'hover' }]"
                    :disabled="previewState(entry.className) === 'disabled'"
                  >
                    <ButtonIcon v-if="realIconShown(entry.className)" :icon="SAMPLE_ICON" />
                    {{ t('common.button') }}
                  </v-btn>
                </div>
                <button
                  v-else
                  class="button-palette-preview-btn"
                  :class="{
                    'button-palette-preview-btn--wide': isWideButton(entry),
                    'button-palette-preview-btn--hover': previewState(entry.className) === 'hover',
                  }"
                  :disabled="previewState(entry.className) === 'disabled'"
                  :style="previewVars(entry)"
                >
                  <img
                    v-if="PREVIEW_ICONS[entry.className] && !previewIconHidden.has(entry.className)"
                    alt=""
                    class="button-palette-preview-icon"
                    :src="PREVIEW_ICONS[entry.className]"
                  >
                  {{ t('common.button') }}
                </button>
                <label class="button-palette-preview-disabled" @click.stop>
                  <input
                    :checked="previewDisabled.has(entry.className)"
                    type="checkbox"
                    @change="togglePreviewDisabled(entry.className, ($event.target as HTMLInputElement).checked)"
                  >
                  disabled
                </label>
                <label
                  v-if="PREVIEW_ICONS[entry.className]"
                  class="button-palette-preview-disabled"
                  @click.stop
                >
                  <input
                    :checked="!previewIconHidden.has(entry.className)"
                    type="checkbox"
                    @change="togglePreviewIcon(entry.className, ($event.target as HTMLInputElement).checked)"
                  >
                  {{ t('buttonPalette.icon') }}
                </label>
                <label v-if="usesRealPreview(entry)" class="button-palette-preview-disabled" @click.stop>
                  <input
                    :checked="realIconShown(entry.className)"
                    type="checkbox"
                    @change="toggleRealIcon(entry.className)"
                  >
                  {{ t('buttonPalette.icon') }}
                </label>
              </div>
            </v-theme-provider>
            <span class="button-palette-class-name">.{{ entry.className }}</span>
            <v-spacer />
            <v-btn density="comfortable" icon="mdi-delete" variant="text" @click.stop="removeEntry(entry.className)" />
            <v-btn
              density="comfortable"
              :icon="expandedClassName === entry.className ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              variant="text"
            />
          </div>
          <v-expand-transition>
            <div v-if="expandedClassName === entry.className" class="button-palette-row-body">
              <ButtonStylePicker
                :entry="entry"
                :inherited-radius="inheritedRadius"
                @state="state => editedState = { className: entry.className, state }"
              />
            </div>
          </v-expand-transition>
        </div>
      </div>

      <!-- Tabs: their classes are in the same stylesheet but they are a
        different thing - an "active tab" and a "backing plate" are not
        buttons somebody could press - so they are a UI Kit tab of their own
        (section="tabs"). -->
      <template v-if="props.section === 'tabs' && tabButtonEntry">
        <h3 class="tabs-subtitle">{{ t('buttonPalette.tabsBackground') }}</h3>
        <p class="tabs-context-hint">
          {{ t('buttonPalette.tabsBackgroundHint') }}
        </p>
        <div class="tabs-plates">
          <div v-for="plate of PLATE_CONTEXTS" :key="plate.className" class="tabs-plate-row">
            <span class="tabs-plate-label">{{ plate.label }}</span>
            <PaletteSwatchPicker
              :model-value="plateColor(plate.className)"
              @update:model-value="(key: string) => setPlateColor(plate.className, key)"
            />
          </div>
        </div>

        <v-divider class="my-8" />

        <h3 class="tabs-subtitle">{{ t('buttonPalette.tabStates') }}</h3>
        <p class="tabs-context-hint">
          {{ t('buttonPalette.tabStatesHint') }}
        </p>

        <TabsPreview
          class="mb-6"
          :entries="entries"
          :plate-class="PREVIEW_PLATE"
          :style="{ '--btn-inherited-radius': inheritedRadius || '0' }"
          :tabs="PREVIEW_TABS"
        />

        <div class="button-palette-row-body">
          <ButtonStylePicker
            :active-entry="tabActiveEntry"
            :entry="tabButtonEntry"
            :inherited-radius="inheritedRadius"
            :state-labels="TAB_STATE_LABELS"
          />
        </div>

        <template v-if="tabEntries.length > 0">
          <h3 class="tabs-subtitle">{{ t('buttonPalette.obsolete') }}</h3>
          <p class="tabs-context-hint">
            {{ t('buttonPalette.obsoleteHint') }}
          </p>
          <div class="button-palette-list">
            <div v-for="entry of tabEntries" :key="entry.className" class="button-palette-row">
              <div class="button-palette-row-head">
                <span class="button-palette-class-name">.{{ entry.className }}</span>
                <v-spacer />
                <v-btn density="comfortable" icon="mdi-delete" variant="text" @click.stop="removeEntry(entry.className)" />
              </div>
            </div>
          </div>
        </template>
      </template>
    </template>

    <EditorSaveBar
      v-if="!loading"
      :dirty="dirty"
      :loading="saving"
      :undoing="undoing"
      @click="save"
      @undo="undo"
    >
      <template v-if="props.section === 'buttons'" #prepend>
        <v-btn
          color="secondary"
          prepend-icon="mdi-plus"
          size="large"
          variant="outlined"
          @click="openAddDialog"
        >
          {{ t('buttonPalette.addButton') }}
        </v-btn>
      </template>
    </EditorSaveBar>

    <v-dialog v-model="addDialogOpen" max-width="420">
      <v-card theme="editorTheme">
        <v-card-title>{{ t('buttonPalette.newButton') }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newClassName"
            autofocus
            :error-messages="addError ? [addError] : []"
            :label="t('buttonPalette.className')"
            placeholder="my-button"
            variant="outlined"
            @keyup.enter="confirmAdd"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="addDialogOpen = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" @click="confirmAdd">{{ t('common.add') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<style scoped>
/* The icon sits inside the button, so the button has to be a flex row for
   the label to line up beside it - production does exactly the same with a
   margin-right utility on the <img>. */
.button-palette-preview-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.button-palette-preview-icon {
  width: 24px;
  height: 24px;
}

.tabs-subtitle {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 32px;
  margin-bottom: 8px;
}
.tabs-plates {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tabs-plate-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.tabs-plate-label {
  min-width: 200px;
  font-size: 0.9rem;
}
.tabs-context-hint {
  font-size: 0.85rem;
  color: #7A8699;
  margin-bottom: 24px;
  max-width: 900px;
}
.tabs-context-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.tabs-context-control-label {
  font-size: 0.85rem;
  color: #7A8699;
}
.button-palette-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.button-palette-row {
  border: solid 1px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}
.button-palette-row-head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  cursor: pointer;
}
.button-palette-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 160px;
}
.button-palette-preview--wide {
  flex: 1 1 auto;
}
/* Room for what grows outside the button: the pulse ring, the key's edge. */
.button-palette-preview-real {
  flex: 1 1 auto;
  min-width: 0;
  padding: 14px;
}
/*
 * Real interactive button, not a static swatch - :hover fires from an
 * actual mouse hover, :disabled from the checkbox below toggling the real
 * HTML attribute. Every color/border/radius/shadow value is a CSS custom
 * property with a fallback chain (--btn-hover-bg falls back to --btn-bg
 * when hover doesn't set its own) - this is what makes an unset hover/
 * disabled field correctly show the normal state's value instead of
 * nothing, the same "inherit from normal" cascade behavior
 * ButtonStylePicker.vue's own effectiveStyle computes for display, done
 * here by the real CSS cascade via var() instead of JS, since a genuine
 * :hover can't be expressed through inline styles at all.
 *
 * The radius is !important: the theme's buttons.css gives every bare
 * <button> one with !important, and this sample is a real <button> - without
 * it every sample showed that radius whatever was picked. A class that sets
 * no radius falls back to that bare-button one (--btn-inherited-radius).
 *
 * The explicit border/box-shadow/outline/background resets below matter:
 * a bare <button> has real browser default styling (most visibly a native
 * border) that would otherwise show through on any class that doesn't
 * define its own border - previously left as `undefined` in an inline
 * style object, which merely OMITS the property rather than resetting it.
 */
.button-palette-preview-btn {
  padding: 8px 16px;
  font-family: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  outline: none;
  background: var(--btn-bg, transparent);
  color: var(--btn-color, inherit);
  border: var(--btn-border, none);
  border-radius: var(--btn-radius, var(--btn-inherited-radius, 0)) !important;
  box-shadow: var(--btn-shadow, none);
  opacity: var(--btn-opacity, 1);
}
.button-palette-preview-btn--wide {
  width: 100%;
  display: block;
}
.button-palette-preview-btn:hover:not(:disabled),
.button-palette-preview-btn--hover:not(:disabled) {
  background: var(--btn-hover-bg, var(--btn-bg, transparent));
  color: var(--btn-hover-color, var(--btn-color, inherit));
  border: var(--btn-hover-border, var(--btn-border, none));
  border-radius: var(--btn-hover-radius, var(--btn-radius, var(--btn-inherited-radius, 0))) !important;
  box-shadow: var(--btn-hover-shadow, var(--btn-shadow, none));
  opacity: var(--btn-hover-opacity, var(--btn-opacity, 1));
}
.button-palette-preview-btn:disabled {
  cursor: not-allowed;
  background: var(--btn-disabled-bg, var(--btn-bg, transparent));
  color: var(--btn-disabled-color, var(--btn-color, inherit));
  border: var(--btn-disabled-border, var(--btn-border, none));
  border-radius: var(--btn-disabled-radius, var(--btn-radius, var(--btn-inherited-radius, 0))) !important;
  box-shadow: var(--btn-disabled-shadow, var(--btn-shadow, none));
  opacity: var(--btn-disabled-opacity, var(--btn-opacity, 1));
}
.button-palette-preview-disabled {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #7A8699;
  cursor: pointer;
  white-space: nowrap;
}
.button-palette-class-name {
  font-family: monospace;
  font-size: 0.9rem;
  color: #3A4A58;
}
.button-palette-row-body {
  padding: 16px;
  border-top: solid 1px rgba(0, 0, 0, 0.08);
  background: transparent;
  /* background: #FAFBFC; */
}
</style>
