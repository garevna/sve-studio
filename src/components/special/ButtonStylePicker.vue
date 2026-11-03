<script setup lang="ts">
  import type { ButtonBorder, ButtonEntry, ButtonState, ButtonStateStyle } from '@/utils/button-style-entry'
  import { computed, ref } from 'vue'
  import { t } from '@/i18n'
  import { resolveCssVarValue } from '@/utils/css-var-value'
  import { BORDER_STYLES, resolveSwatchValue } from '@/utils/palette-entry'
  import PaletteSwatchPicker from './PaletteSwatchPicker.vue'

  // `entry` is a live reference into ButtonPaletteView.vue's own entries
  // array (same "mutate in place" convention as every other editor in this
  // project - EditableCard, HeroParallax, CardContainerActions...).
  const props = defineProps<{
    entry: ButtonEntry
    // A second class that is an extra STATE of the same element rather than
    // a different component: a tab carries .tab-button always and
    // .tab-button--active as well while it is the selected one. Presenting
    // that as a fourth state is what it actually is - offering it as its
    // own row in the class list made the user hunt for a second entry to
    // describe one element.
    activeEntry?: ButtonEntry
    // What to call the states. Buttons keep the CSS words, because that is
    // what they are; tabs name them after what the user sees, because
    // "normal" for a tab means "not the one you are on" and nothing in the
    // CSS vocabulary says that.
    stateLabels?: Partial<Record<'base' | 'hover' | 'disabled' | 'active', string>>
    // A radius this class does not set itself but the element still gets -
    // buttons.css gives every <button> a radius through the bare tag
    // selector, which is not a class and so has no row of its own here.
    // .tab-button is the case that matters: it sets no radius at all, and
    // the field looked empty for something that is visibly rounded on the
    // site. Shown, never written - picking a value writes it onto this
    // class, which is what "changing it" means.
    inheritedRadius?: string
  }>()

  // Deliberately NOT translated - a designer editing these already knows
  // CSS terminology, and "normal"/"hover"/"disabled" IS the terminology.
  // The extra state is the exception: "активна" is not a CSS pseudo-class,
  // it is this project's own idea, so it says so in words.
  type PickerState = ButtonState | 'active'
  const STATES = computed<PickerState[]>(() => (props.activeEntry
    ? ['base', 'hover', 'disabled', 'active']
    : ['base', 'hover', 'disabled']))
  const STATE_LABELS: Record<PickerState, string> = {
    base: 'normal',
    hover: 'hover',
    disabled: 'disabled',
    get active () {
      return t('buttonPalette.style.active')
    },
  }
  const activeState = ref<PickerState>('base')
  // The state object being WRITTEN to - editing a field here always writes
  // an explicit override onto THIS specific state, never onto base. For the
  // extra state that object lives on the OTHER entry, which is what keeps
  // the two classes correct in the stylesheet without the user ever seeing
  // that there are two.
  const activeStyle = computed(() => (activeState.value === 'active'
    ? (props.activeEntry as ButtonEntry).base
    : props.entry[activeState.value as ButtonState]))

  // What's actually DISPLAYED - for hover/disabled, a field this state
  // doesn't explicitly override still effectively applies from the normal
  // state (that's real CSS cascade: :hover doesn't replace the base rule,
  // it only adds to it - a property neither rule sets in common still comes
  // from whichever one does set it). Showing raw "not set" for an inherited
  // field would be misleading (e.g. primary-button's hover genuinely is
  // white text even though only its base rule says so) - the "X" clear
  // buttons below only appear when THIS state has its own explicit
  // override to remove, since there's nothing to clear from an inherited
  // value.
  // The extra state inherits exactly the same way, and for the same reason:
  // .tab-button--active is an ADDITIONAL class on an element that still
  // carries .tab-button, so anything it doesn't set comes from there.
  const effectiveStyle = computed<ButtonStateStyle>(() => {
    if (activeState.value === 'base') return activeStyle.value
    const base = props.entry.base
    const state = activeStyle.value
    return {
      background: state.background ?? base.background,
      color: state.color ?? base.color,
      border: state.border ?? base.border,
      borderRadius: state.borderRadius ?? base.borderRadius,
      boxShadow: state.boxShadow ?? base.boxShadow,
      opacity: state.opacity ?? base.opacity,
      raw: state.raw,
    }
  })

  // Shortened but otherwise literal CSS custom-property names, not
  // translated - same reasoning as the state labels above.
  //
  // The PLAIN spelling, because that is what the stylesheets themselves
  // contain: buttons.css has var(--large-border-radius) and not one
  // var(--v-...) anywhere. These options used to carry the Vuetify-scoped
  // names, which matched nothing in the real file - so every radius in the
  // UI Kit showed as an unrecognised raw value, and picking one WROTE a
  // token the site's own CSS never defines. This panel visualises the
  // stylesheet; it does not get to have a vocabulary of its own.
  const RADIUS_OPTIONS = [
    { title: 'default-border-radius', value: 'var(--default-border-radius)' },
    { title: 'small-border-radius', value: 'var(--small-border-radius)' },
    { title: 'extra-small-border-radius', value: 'var(--extra-small-border-radius)' },
    { title: 'large-border-radius', value: 'var(--large-border-radius)' },
    { title: 'super-border-radius', value: 'var(--super-border-radius)' },
  ]

  // Values this editor wrote while it was using the scoped spelling are
  // still out there, so both are recognised as the same token. Recognising
  // it is all that happens - the stored value is left exactly as it is
  // until the user actually picks something, so merely opening a row never
  // rewrites the stylesheet.
  function radiusOptionFor (value?: string): string | undefined {
    if (!value) {
      return undefined
    }
    const plain = value.replace('var(--v-', 'var(--')
    return RADIUS_OPTIONS.find(option => option.value === plain)?.value
  }
  // A value this editor didn't write itself (a 4-corner shorthand like
  // "0 var(--default-border-radius) var(--default-border-radius) 0", say)
  // matches none of the
  // five tokens. It is offered as an extra entry showing itself, so it is
  // neither guessed at nor silently rewritten the moment the row is opened.
  // What the select shows: the matching token when the stored value is one
  // (in either spelling), otherwise the raw value itself as an extra entry -
  // a four-corner shorthand is a real, valid radius that simply has no
  // name, and must not be guessed at or dropped.
  // A corner radius only shows on something with edges to round. A state
  // with no background and no border has nothing to shape, so the control
  // is closed rather than left to be set to a value that does nothing and
  // then wondered about - an inactive tab is exactly that case, while the
  // active one has a background and genuinely needs it.
  //
  // "transparent" is not a background for this purpose: it is the explicit
  // way of saying there is nothing there.
  const INVISIBLE_FILLS = new Set(['', 'none', 'transparent'])
  const hasVisibleBox = computed(() => {
    const background = (effectiveStyle.value.background || '').trim()
    const border = effectiveStyle.value.border
    return !INVISIBLE_FILLS.has(background)
      || (!!border && border.style !== 'none' && border.width > 0)
  })

  // What this element actually ends up with: its own value if it has one,
  // otherwise whatever it inherits from a selector that isn't a class.
  const shownRadius = computed(() => effectiveStyle.value.borderRadius || props.inheritedRadius || '')
  const radiusIsInherited = computed(() => !effectiveStyle.value.borderRadius && !!props.inheritedRadius)

  const radiusSelectValue = computed(() => radiusOptionFor(shownRadius.value) || shownRadius.value)

  const radiusItems = computed(() => {
    const current = shownRadius.value
    return radiusOptionFor(current) || !current
      ? RADIUS_OPTIONS
      : [...RADIUS_OPTIONS, { title: current, value: current }]
  })

  // The token's real value, read from the live stylesheet - the names alone
  // say nothing about which radius is bigger. Shown, never typed: a free
  // text field next to a named token invited setting the two to disagree,
  // and the tokens themselves belong to the palette, which is where they are
  // changed.
  const radiusValueLabel = computed(() => {
    if (!hasVisibleBox.value) {
      return t('buttonPalette.style.needsFill')
    }
    const value = resolveCssVarValue(shownRadius.value)
    return radiusIsInherited.value && value ? t('buttonPalette.style.inherited', { value }) : value
  })

  function setRadiusOption (value: string) {
    activeStyle.value.borderRadius = value
  }

  function ensureBorder (): ButtonBorder {
    const current = effectiveStyle.value.border
    activeStyle.value.border ??= current ? { ...current } : { style: 'solid', width: 1, color: '' }
    return activeStyle.value.border
  }

  function clearBorder () {
    activeStyle.value.border = undefined
  }
</script>

<template>
  <div class="button-style-picker">
    <v-btn-toggle
      v-model="activeState"
      class="mb-4"
      density="compact"
      mandatory
      variant="outlined"
    >
      <v-btn v-for="state of STATES" :key="state" :value="state">
        {{ stateLabels?.[state] || STATE_LABELS[state] }}
      </v-btn>
    </v-btn-toggle>

    <div class="button-style-picker-row d-flex flex-wrap ga-5">
      <span class="button-style-picker-label">{{ t('common.background') }}</span>
      <PaletteSwatchPicker :model-value="effectiveStyle.background || ''" @update:model-value="(key: string) => activeStyle.background = key">
        <template #activator="{ menuProps }">
          <button class="button-style-picker-swatch" v-bind="menuProps" :style="{ background: effectiveStyle.background ? resolveSwatchValue(effectiveStyle.background) : 'transparent' }" />
        </template>
      </PaletteSwatchPicker>
      <v-btn
        :class="{ 'button-style-picker-clear--hidden': !activeStyle.background }"
        density="comfortable"
        icon="mdi-close"
        size="x-small"
        variant="text"
        @click="activeStyle.background = undefined"
      />
    </div>

    <div class="button-style-picker-row">
      <span class="button-style-picker-label">{{ t('textFormat.color') }}</span>
      <PaletteSwatchPicker :model-value="effectiveStyle.color || ''" @update:model-value="(key: string) => activeStyle.color = key">
        <template #activator="{ menuProps }">
          <button class="button-style-picker-swatch" v-bind="menuProps" :style="{ background: effectiveStyle.color ? resolveSwatchValue(effectiveStyle.color) : 'transparent' }" />
        </template>
      </PaletteSwatchPicker>
      <v-btn
        :class="{ 'button-style-picker-clear--hidden': !activeStyle.color }"
        density="comfortable"
        icon="mdi-close"
        size="x-small"
        variant="text"
        @click="activeStyle.color = undefined"
      />
    </div>

    <div class="button-style-picker-row">
      <span class="button-style-picker-label">{{ t('buttonPalette.style.radius') }}</span>
      <div class="button-style-picker-radius">
        <v-select
          density="compact"
          :disabled="!hasVisibleBox"
          hide-details
          item-title="title"
          item-value="value"
          :items="radiusItems"
          :model-value="hasVisibleBox ? radiusSelectValue : undefined"
          variant="outlined"
          @update:model-value="setRadiusOption"
        />
        <span class="button-style-picker-radius-value">{{ radiusValueLabel }}</span>
      </div>
      <span class="button-style-picker-clear-spacer" />
    </div>

    <div class="button-style-picker-row">
      <span class="button-style-picker-label">{{ t('buttonPalette.style.border') }}</span>
      <div class="button-style-picker-border-row">
        <v-select
          density="compact"
          hide-details
          :items="BORDER_STYLES"
          :model-value="effectiveStyle.border?.style || 'none'"
          style="max-width: 132px"
          variant="outlined"
          @update:model-value="(value: string) => (value === 'none' ? clearBorder() : (ensureBorder().style = value))"
        />
        <v-text-field
          density="compact"
          :disabled="!effectiveStyle.border"
          hide-details
          :model-value="effectiveStyle.border?.width ?? 1"
          style="max-width: 88px"
          suffix="px"
          type="number"
          variant="outlined"
          @update:model-value="(value: string) => (ensureBorder().width = Number(value))"
        />
        <PaletteSwatchPicker :model-value="effectiveStyle.border?.color || ''" @update:model-value="(key: string) => (ensureBorder().color = key)">
          <template #activator="{ menuProps }">
            <button class="button-style-picker-swatch" v-bind="menuProps" :style="{ background: effectiveStyle.border?.color ? resolveSwatchValue(effectiveStyle.border.color) : 'transparent' }" />
          </template>
        </PaletteSwatchPicker>
      </div>
      <span class="button-style-picker-clear-spacer" />
    </div>

    <div class="button-style-picker-row">
      <span class="button-style-picker-label">{{ t('buttonPalette.style.shadow') }}</span>
      <v-text-field
        density="compact"
        hide-details
        :model-value="effectiveStyle.boxShadow"
        placeholder="0 4px 8px rgba(0,0,0,.2)"
        variant="outlined"
        @update:model-value="(value: string) => activeStyle.boxShadow = value || undefined"
      />
      <span class="button-style-picker-clear-spacer" />
    </div>

    <div class="button-style-picker-row">
      <span class="button-style-picker-label">{{ t('buttonPalette.style.opacity', { value: effectiveStyle.opacity ?? 100 }) }}</span>
      <v-slider
        hide-details
        :max="100"
        :min="0"
        :model-value="effectiveStyle.opacity ?? 100"
        step="4"
        @update:model-value="(value: number) => activeStyle.opacity = value"
      />
      <v-btn
        :class="{ 'button-style-picker-clear--hidden': activeStyle.opacity === undefined }"
        density="comfortable"
        icon="mdi-close"
        size="x-small"
        variant="text"
        @click="activeStyle.opacity = undefined"
      />
    </div>

    <div class="button-style-picker-raw" :class="{ 'button-style-picker-raw--hidden': effectiveStyle.raw.length === 0 }">
      {{ t('buttonPalette.style.otherProperties', { list: effectiveStyle.raw.map(item => `${item.property}: ${item.value}`).join('; ') }) }}
    </div>
  </div>
</template>

<style scoped>
/* The chosen token and what it actually resolves to, side by side - the
   value is information, not a field, so it reads as text rather than as
   something half-editable. */
.button-style-picker-radius {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1 1 auto;
  min-width: 0;
}
.button-style-picker-radius-value {
  flex: 0 0 auto;
  min-width: 56px;
  white-space: nowrap;
  font-size: 0.85rem;
  color: #7A8699;
}
.button-style-picker-row {
  display: grid;
  grid-template-columns: 140px 1fr 40px;
  align-items: center;
  gap: 8px 12px;
  margin-bottom: 8px;
}
/* v-show, not v-if, on anything living inside a row above - an omitted
   grid child (rather than one that's merely invisible) shifts every
   subsequent row's own columns out of alignment, since CSS grid auto-flow
   just counts DOM children in order regardless of which row they were
   "meant" for - this bit the button-with-icon-right hover/disabled panels
   specifically, whichever ones happened to have no background/color set. */
.button-style-picker-row--hidden {
  display: none;
}
.button-style-picker-label {
  font-size: 0.85rem;
  color: #3A4A58;
}
.button-style-picker-swatch {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: solid 1px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  padding: 0;
}
.button-style-picker-clear--hidden {
  visibility: hidden;
}
.button-style-picker-clear-spacer {
  width: 40px;
}
.button-style-picker-border-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.button-style-picker-raw {
  margin-top: 12px;
  padding-top: 8px;
  border-top: solid 1px rgba(0, 0, 0, 0.08);
  font-size: 0.8rem;
  color: #7A8699;
}
.button-style-picker-raw--hidden {
  display: none;
}
</style>
