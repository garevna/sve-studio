<script setup lang="ts">
  import { SveSwipeRow } from '@sve/editor-ui'
  import { computed, useSlots } from 'vue'
  import MarginBottomMenu from '@/components/editors/MarginBottomMenu.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import { t } from '@/i18n'
  import { NON_COLOR_TEXT_CLASSES, SIZE_PIXELS, SIZE_SCALE, WEIGHT_SCALE } from '@/utils/text-format-scale'
  import { appliedThemeFonts, isFontClass } from '@/utils/theme-fonts'
  import ControlColumn from './ControlColumn.vue'

  // The format controls themselves - size, alignment, colour, weight, plus
  // two optional caller-specific actions. Every multi-choice control shows
  // one icon reflecting the CURRENT value and a dropdown for the
  // alternatives only.
  //
  // The class string is this component's OWN model, not something the host
  // maintains: it reads the current state out of the string and writes the
  // new one back, so anything holding a class string can hand it over and
  // get formatting for free. That is what lets the same component serve a
  // single text field (TextEditor.vue, one class) and a whole block's
  // shared format (FaqBlockActions.vue's questionClass/answerClass,
  // FooterLinksActions.vue's one class for every link) - the block cases
  // previously each kept their own copy of this exact set-manipulation,
  // which is duplication this removes.
  const className = defineModel<string>('class', { default: '' })

  const props = defineProps<{
    parentType: 'usual' | 'icon' | 'parallax'
    // Which controls to offer. Omitted means all of them; a caller narrows
    // it when the rest of the format is genuinely fixed - a FAQ's heading
    // has its size and colour set by the theme, and offering to change them
    // would be offering a setting that does not reach the site.
    only?: ('size' | 'align' | 'color' | 'weight' | 'font')[]
    // Set only when this text field IS a whole top-level page block (not
    // nested inside a card/section/etc, where "delete" would mean something
    // else entirely) - see TemplateItem.vue. Folds block deletion into this
    // panel instead of a second, competing button - one per block, per the
    // project's own rule (see DynamicPageTemplate.vue).
    deletable?: boolean
    deleteTooltip?: string
    // A caller-specific "configure" action (e.g. a footer link opening its
    // link dialog) - folded in alongside the format controls for the same
    // reason `deletable` is: a row with its own separate cog/delete icons
    // next to a compact text field runs out of horizontal room and spills
    // into whatever sits beside it (confirmed live). Grouped with the
    // format icons on the LEFT, not next to delete on the right - delete
    // stays visually separated (justify-space-between) so it's never a
    // stray click away from an everyday action.
    configurable?: boolean
    configureTooltip?: string
    // The action is caller-specific, so its icon is too: a link opens a link
    // dialog (mdi-link-edit), anything else keeps the generic cog.
    configureIcon?: string
    // Stacks every icon in one column instead of a row - for a narrow host
    // column where even a widened horizontal panel still visually spills
    // into whatever sits beside it (confirmed live). Vertical needs no
    // extra width at all - one icon's width is the whole panel's footprint -
    // so it's the fix for "no room to widen into" rather than "widen
    // further".
    vertical?: boolean
    // The gap below the text (MarginBottomMenu) - for texts stacked in a
    // component (a card's lines), where nothing else sets it.
    spacing?: boolean
  }>()

  const emit = defineEmits<{
    configure: []
    delete: []
  }>()

  // --- reading and writing the class string ---
  // A Set rather than string surgery: every control here replaces one
  // member of a fixed vocabulary (one size, one weight, one alignment, one
  // colour) while leaving every other class the caller put there untouched.
  function classSet () {
    return new Set((className.value || '').split(' ').filter(Boolean))
  }
  function applyClass (mutate: (set: Set<string>) => void) {
    const set = classSet()
    mutate(set)
    className.value = [...set].join(' ')
  }

  // Colour is a plain class (text-primary, text-special...), same convention
  // as the app's own real content - not a separate field or inline style, so
  // saved JSON keeps exactly one class per concern like size and weight.
  const colorKey = computed(() => {
    const found = [...classSet()].find(c => c.startsWith('text-') && !NON_COLOR_TEXT_CLASSES.has(c))
    return found ? found.replace('text-', '') : ''
  })
  function toggleColor (key: string) {
    applyClass(set => {
      for (const c of set) {
        if (c.startsWith('text-') && !NON_COLOR_TEXT_CLASSES.has(c)) set.delete(c)
      }
      set.add(`text-${key}`)
    })
  }

  function setFontSize (size: string) {
    if (!SIZE_SCALE.includes(size)) return
    applyClass(set => {
      for (const s of SIZE_SCALE) set.delete(s)
      set.add(size)
    })
  }

  function setWeight (weight: string) {
    if (!WEIGHT_SCALE.includes(weight)) return
    applyClass(set => {
      for (const w of WEIGHT_SCALE) set.delete(w)
      set.add(weight)
    })
  }

  function toggleAlign (align: 'text-left' | 'text-center' | 'text-right') {
    applyClass(set => {
      set.delete('text-left')
      set.delete('text-center')
      set.delete('text-right')
      set.add(align)
    })
  }

  const sizeStepIndex = computed(() => {
    const found = SIZE_SCALE.findIndex(size => (className.value || '').includes(size))
    return found === -1 ? SIZE_SCALE.indexOf('default-text') : found
  })

  const WEIGHT_LABELS: Record<string, string> = {
    'text-thin': 'Тонкий',
    'text-medium': 'Звичайний',
    'text-bold': 'Жирний',
  }
  const weightKey = computed(() => WEIGHT_SCALE.find(weight => (className.value || '').includes(weight)) || 'text-medium')

  const ALIGN_ICONS: Record<'left' | 'center' | 'right', string> = {
    left: 'mdi-format-align-left',
    center: 'mdi-format-align-center',
    right: 'mdi-format-align-right',
  }
  const ALIGN_LABELS: Record<'left' | 'center' | 'right', string> = {
    left: 'Ліворуч',
    center: 'По центру',
    right: 'Праворуч',
  }
  const ALIGN_CLASSES: Record<'left' | 'center' | 'right', 'text-left' | 'text-center' | 'text-right'> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }
  const alignment = computed<'left' | 'center' | 'right'>(() => {
    const current = className.value || ''
    if (current.includes('text-center')) return 'center'
    if (current.includes('text-right')) return 'right'
    return 'left'
  })
  const otherAlignments = computed(() => (['left', 'center', 'right'] as const).filter(key => key !== alignment.value))

  // Which of the site's fonts (global.json font / accentFonts) the text
  // uses: the main one, or an extra one through its class (accent-font,
  // accent-font-2, ...). See utils/theme-fonts.ts.
  const fontClass = computed(() => [...classSet()].find(name => isFontClass(name)) ?? '')
  function setFont (name: string) {
    applyClass(set => {
      for (const cls of set) if (isFontClass(cls)) set.delete(cls)
      if (name) set.add(name)
    })
  }

  function shows (control: 'size' | 'align' | 'color' | 'weight' | 'font'): boolean {
    return !props.only || props.only.includes(control)
  }

  // The controls this panel shows, in order. In a row they sit in a
  // SveSwipeRow: on a narrow screen (a phone) the row is swiped instead of
  // spilling out or wrapping; in a column, one under another.
  const slots = useSlots()
  const controls = computed(() => [
    shows('size') && 'size',
    shows('align') && props.parentType !== 'icon' && 'align',
    shows('color') && 'color',
    shows('weight') && 'weight',
    shows('font') && appliedThemeFonts.value.length > 1 && 'font',
    props.spacing && 'spacing',
    props.configurable && 'configure',
    !!slots.actions && 'actions',
  ].filter((control): control is string => !!control))
</script>

<template>
  <div
    :class="vertical
      ? 'd-flex flex-column align-center ga-2'
      : 'd-flex align-center ga-2 w-100'"
  >
    <component
      :is="vertical ? ControlColumn : SveSwipeRow"
      v-slot="{ item }"
      :class="{ 'text-format-controls': !vertical }"
      :items="controls"
    >
      <template v-if="item === 'size'">
        <v-menu location="bottom center">
          <template #activator="{ props: sizeProps }">
            <ToolbarIconButton v-bind="sizeProps" icon="mdi-format-size" tooltip="Розмір шрифту" />
          </template>
          <v-card theme="editorTheme">
            <v-list density="compact">
              <v-list-item
                v-for="(size, index) of SIZE_SCALE"
                :key="size"
                :active="index === sizeStepIndex"
                :title="`${SIZE_PIXELS[size]}px`"
                @click="setFontSize(size)"
              />
            </v-list>
          </v-card>
        </v-menu>
      </template>

      <template v-if="item === 'align'">
        <v-menu location="bottom center">
          <template #activator="{ props: alignProps }">
            <ToolbarIconButton v-bind="alignProps" :icon="ALIGN_ICONS[alignment]" tooltip="Вирівнювання тексту" />
          </template>
          <v-card theme="editorTheme">
            <v-list density="compact">
              <v-list-item
                v-for="key of otherAlignments"
                :key="key"
                :prepend-icon="ALIGN_ICONS[key]"
                :title="ALIGN_LABELS[key]"
                @click="toggleAlign(ALIGN_CLASSES[key])"
              />
            </v-list>
          </v-card>
        </v-menu>
      </template>

      <!-- Restricted to the app's own configured palette. Always the TEXT's
        own color, regardless of parentType - a text-with-icon field's icon
        has its own entirely separate, already-complete color picker
        (IconEditor.vue's own click-to-open dialog), so this must never
        touch it (a real bug this once was: parentType==='icon' used to
        swap this to an icon-color picker instead, silently repainting the
        icon whenever someone picked a "text color" here). -->
      <template v-if="item === 'color'">
        <PaletteSwatchPicker :model-value="colorKey" @update:model-value="(key: string) => toggleColor(key)">
          <template #activator="{ menuProps }">
            <ToolbarIconButton
              v-bind="menuProps"
              class="text-format-color"
              :color="colorKey ? `var(--${colorKey})` : undefined"
              icon="mdi-format-color-fill"
              tooltip="Колір тексту"
            />
          </template>
        </PaletteSwatchPicker>
      </template>

      <template v-if="item === 'weight'">
        <v-menu location="bottom center">
          <template #activator="{ props: weightProps }">
            <ToolbarIconButton v-bind="weightProps" icon="mdi-format-bold" tooltip="Товщина шрифту" />
          </template>
          <v-card theme="editorTheme">
            <v-list density="compact">
              <v-list-item
                v-for="weight of WEIGHT_SCALE"
                :key="weight"
                :disabled="weight === weightKey"
                :title="WEIGHT_LABELS[weight]"
                @click="setWeight(weight)"
              />
            </v-list>
          </v-card>
        </v-menu>
      </template>

      <template v-if="item === 'font'">
        <v-menu location="bottom center">
          <template #activator="{ props: fontProps }">
            <ToolbarIconButton v-bind="fontProps" :color="fontClass ? 'primary' : undefined" icon="mdi-format-font" :tooltip="t('fonts.menuTitle')" />
          </template>
          <v-card theme="editorTheme">
            <v-list density="compact">
              <!-- Each font named and drawn in itself. -->
              <v-list-item
                v-for="font of appliedThemeFonts"
                :key="font.className"
                :active="font.className === fontClass"
                @click="setFont(font.className)"
              >
                <v-list-item-title :style="{ fontFamily: `'${font.name}', sans-serif`, fontSize: '18px' }">
                  {{ font.name }}
                </v-list-item-title>
                <v-list-item-subtitle v-if="!font.className">{{ t('fonts.menuMain') }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-menu>
      </template>

      <MarginBottomMenu v-if="item === 'spacing'" v-model:class="className" />

      <ToolbarIconButton
        v-if="item === 'configure'"
        :icon="configureIcon || 'mdi-cog'"
        :tooltip="configureTooltip || 'Налаштувати'"
        @click="emit('configure')"
      />

      <!-- Anything a caller needs beyond the standard set, kept on the LEFT
        with the everyday actions - the right-hand side belongs to delete
        alone, deliberately apart from them. -->
      <slot v-if="item === 'actions'" name="actions" />
    </component>

    <ToolbarIconButton
      v-if="deletable"
      :class="vertical ? 'mt-4' : 'ml-auto'"
      icon="mdi-delete"
      :tooltip="deleteTooltip || 'Видалити блок'"
      @click="emit('delete')"
    />
  </div>
</template>

<style scoped>
/* The row of controls takes the room left of delete, and no more. */
.text-format-controls {
  flex: 1 1 auto;
  min-width: 0;
}
/* Icons that fit spread over the whole row instead of hugging its left
   edge; a row too long for its room is swiped and starts at the left.
   Scoped to this panel - tab rows keep their own packing. */
/* The colour icon is drawn in the chosen colour: a thin dark outline keeps
   a white or pale one visible on the light panel. */
.text-format-color :deep(.v-icon) {
  filter: drop-shadow(0 0 1px rgb(0 0 0 / 0.55));
}
.text-format-controls :deep(.swiper-wrapper) {
  justify-content: space-between;
}
</style>
