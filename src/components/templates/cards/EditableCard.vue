<script setup lang="ts">
  import type { TemplateBlockModel, TranslatedModel } from '@/types/TemplateBlockModel'
  import { computed, ref } from 'vue'
  import IconEditor from '@/components/editors/text/IconEditor.vue'
  import TextEditor from '@/components/editors/text/TextEditor.vue'
  import TextFormatMenu from '@/components/editors/text/TextFormatMenu.vue'
  import TextOnBackground from '@/components/editors/text/TextOnBackground.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import TemplateItem from '@/components/templates/TemplateItem.vue'
  import { button } from '@/configs/components/simple/button'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { defaultCardContentClass, defaultCardTitleClass } from '@/utils/card-text-defaults'
  import { emptyTranslatedModel, isTranslatedModel, resolveLocaleLines, resolveLocaleText, siteLocales } from '@/utils/locale-text'
  import { EDITOR_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  const commonStore = useCommonStore()

  // showIconToggle: opt-in only (card-with-hover, over an image background,
  // where the user may want to compare with/without an icon) - every other
  // existing caller (plain "cards"/carousel via CardEditDialog.vue) leaves
  // this off and keeps its current always-shown icon behavior unchanged.
  //
  // blockTarget: opt-in only (plain "cards"/carousel again, passed by
  // CardEditDialog.vue) - production never supported per-card icon styling
  // there (CardSet.vue's own render always overwrites every card's
  // color/size/background with the block's own, uniformly), so instead of a
  // separate block-level settings UI, editing any one card's icon
  // style writes straight onto the shared block and every other card in the
  // set picks it up automatically (they all read the same fields). Cards
  // that don't set this (card-with-hover, via HoverCardSideEditor.vue) keep
  // their own independent per-card/per-side icon styling exactly as before.
  const props = defineProps<{
    card: TemplateBlockModel
    defaults?: Partial<TemplateBlockModel>
    showIconToggle?: boolean
    blockTarget?: TemplateBlockModel
    // The card's own title and text format (titleClass/contentClass on the
    // card - TemplateCard reads them, in the editor and on the site). Only
    // a card with hover: each of its two sides has its own background, so
    // each needs its own text colour. Plain "cards" format all their cards
    // at once from the block's toolbar instead. The number is the card's
    // look (ver), for the defaults.
    formatVer?: number
    // The card's fill (a palette key) and picture: with formatVer, its texts
    // are edited on them, so a pale text for a dark card stays visible.
    background?: string
    backgroundImage?: string
  }>()

  const titleFormat = computed({
    get: () => props.card.titleClass || defaultCardTitleClass(props.formatVer ?? 1),
    set: (value: string) => {
      // eslint-disable-next-line vue/no-mutating-props
      props.card.titleClass = value
    },
  })
  const contentFormat = computed({
    get: () => props.card.contentClass || defaultCardContentClass(props.formatVer ?? 1),
    set: (value: string) => {
      // eslint-disable-next-line vue/no-mutating-props
      props.card.contentClass = value
    },
  })

  // Every paragraph shares one format (contentClass): one format button for
  // all of them, next to the "Текст" label, its panel opening below it.
  const contentFormatOpen = ref(false)

  const iconStyleTarget = computed(() => props.blockTarget || props.card)

  const icon = computed({
    get: () => props.card.icon || '',
    set: (value: string) => {
      // eslint-disable-next-line vue/no-mutating-props
      props.card.icon = value
    },
  })
  // Toggling this off hides the icon from the rendered card (see
  // TemplateCard.vue) without touching icon/color/size/background below -
  // switching back on restores exactly what was configured before.
  const iconVisible = computed({
    get: () => !props.card.iconHidden,
    set: (value: boolean) => {
      // eslint-disable-next-line vue/no-mutating-props
      props.card.iconHidden = !value
    },
  })
  // Stored as a bare palette key (e.g. "bright-grey"), matching TemplateCard's
  // reading convention and IconEditor's own expectation (it wraps with
  // var(--...) internally) - passing a pre-wrapped value here made the color
  // swatch picker unable to match the current value against any real
  // palette key, so it always showed as unset.
  const iconColor = computed({
    get: () => iconStyleTarget.value.color || props.defaults?.color || 'grey',
    set: (value: string) => {
      iconStyleTarget.value.color = value
    },
  })
  const iconSize = computed({
    // eslint-disable-next-line unicorn/explicit-length-check -- false positive: card.size is a plain number field, not a Set/Map
    get: () => iconStyleTarget.value.size || props.defaults?.size || 52,
    set: (value: number) => {
      iconStyleTarget.value.size = value
    },
  })
  const iconMobileSize = computed({
    get: () => iconStyleTarget.value.mobileSize,
    set: (value: number | undefined) => {
      iconStyleTarget.value.mobileSize = value
    },
  })
  const iconBackground = computed({
    get: () => iconStyleTarget.value.background || props.defaults?.background || '',
    set: (value: string) => {
      iconStyleTarget.value.background = value
    },
  })

  const title = computed({
    get: () => resolveLocaleText(props.card.title, commonStore.locale),
    set: (value: string) => {
      // eslint-disable-next-line vue/no-mutating-props
      if (!isTranslatedModel(props.card.title)) props.card.title = emptyTranslatedModel()
      ;(props.card.title as TranslatedModel)[commonStore.locale] = value
    },
  })

  // Content is stored per-locale as an array of lines (TemplateCard.vue
  // renders one <p> per line) - edited as separate fields, todo-list style,
  // rather than one textarea split on newlines.
  const lines = computed(() => resolveLocaleLines(props.card.content, commonStore.locale))

  // A "line" is one item in parallel across all three locales - only the
  // text differs per language, but which indices exist must stay in sync,
  // otherwise a fresh/empty card ends up with e.g. uk as an array and en/de
  // still as emptyTranslatedModel()'s plain '' (mismatched row counts,
  // resolveLocaleLines silently drops them). Adding/removing a line touches
  // all three locale arrays at once; only editing text touches one.
  function ensureLineArrays (): TranslatedModel {
    // eslint-disable-next-line vue/no-mutating-props
    if (!isTranslatedModel(props.card.content)) props.card.content = emptyTranslatedModel()
    const model = props.card.content as TranslatedModel
    for (const locale of siteLocales()) {
      if (!Array.isArray(model[locale])) model[locale] = model[locale] ? [model[locale] as string] : []
    }
    return model
  }
  function setLine (index: number, value: string) {
    const model = ensureLineArrays()
    ;(model[commonStore.locale] as string[])[index] = value
  }
  function addLine () {
    const model = ensureLineArrays()
    for (const locale of siteLocales()) (model[locale] as string[]).push('')
  }
  async function removeLine (index: number) {
    if (!await useUiFeedbackStore().confirmDelete('row')) return
    const model = ensureLineArrays()
    for (const locale of siteLocales()) (model[locale] as string[]).splice(index, 1)
  }

  // A card's button starts as a page button does (configs/components/simple).
  function setButton (value: TemplateBlockModel | undefined) {
    // eslint-disable-next-line vue/no-mutating-props -- the card is edited in place
    props.card.button = value
  }
  function addButton () {
    setButton(button() as TemplateBlockModel)
  }
</script>

<template>
  <div class="editable-card pa-4">
    <v-checkbox
      v-if="showIconToggle"
      v-model="iconVisible"
      density="compact"
      hide-details
      :label="t('cards.showIcon')"
    />
    <!-- <div v-if="blockTarget" class="card-icon-shared-hint">
      {{ t('cards.iconAppliesToAll') }}
    </div> -->
    <!-- With a blockTarget, colour/size/background belong to the whole block
      and are set once from its own toolbar (CardContainerActions ->
      IconAppearance) - so this card offers only the choice of icon. Without
      one, this card owns its icon outright and gets both halves. -->
    <!-- With formatVer the icon sits on the card's background too. -->
    <component
      :is="formatVer !== undefined ? TextOnBackground : 'div'"
      :background="formatVer !== undefined ? background : undefined"
      :image="formatVer !== undefined ? backgroundImage : undefined"
    >
      <IconEditor
        v-model:icon="icon"
        v-model:icon-background="iconBackground"
        v-model:icon-color="iconColor"
        v-model:icon-mobile-size="iconMobileSize"
        v-model:icon-size="iconSize"
        :appearance="!blockTarget"
        mobile-sizable
      />
    </component>
    <!-- With its own format (a card with hover): the editor's usual text
      field - the format button on its right, the panel opening under it. -->
    <div v-if="formatVer !== undefined" class="mt-6">
      <span class="card-content-label">{{ t('common.header') }}</span>
      <TextOnBackground :background="background" :image="backgroundImage">
        <TextEditor
          v-model:class="titleFormat"
          v-model:content="title"
          parent-type="usual"
          type="title"
        />
      </TextOnBackground>
    </div>
    <v-textarea
      v-else
      v-model="title"
      auto-grow
      class="mt-6"
      hide-details
      :label="t('common.header')"
      rows="1"
      variant="outlined"
    />
    <v-btn
      v-if="lines.length === 0"
      block
      class="mt-6"
      prepend-icon="mdi-plus"
      variant="outlined"
      @click="addLine"
    >
      {{ t('cards.addText') }}
    </v-btn>
    <div v-else class="card-content-section mt-6">
      <div class="card-content-head">
        <span class="card-content-label">{{ t('common.text') }}</span>
        <ToolbarIconButton
          v-if="formatVer !== undefined"
          :active="contentFormatOpen"
          icon="mdi-tune"
          :tooltip="t('cards.itemsFormat')"
          @click="contentFormatOpen = !contentFormatOpen"
        />
      </div>
      <v-expand-transition v-if="formatVer !== undefined">
        <div v-if="contentFormatOpen" :class="['text-format-panel', 'editor-panel', themeClass(EDITOR_THEME_NAME)]">
          <v-theme-provider theme="editorTheme">
            <TextFormatMenu v-model:class="contentFormat" parent-type="usual" />
          </v-theme-provider>
        </div>
      </v-expand-transition>
      <div class="card-content-list">
        <TextOnBackground v-if="formatVer !== undefined" :background="background" class="card-content-lines" :image="backgroundImage">
          <TextEditor
            v-for="(line, index) of lines"
            :key="index"
            :class="contentFormat"
            :content="line"
            deletable
            :formattable="false"
            parent-type="usual"
            type="text"
            @delete="removeLine(index)"
            @update:content="(value: string | undefined) => setLine(index, value || '')"
          />
        </TextOnBackground>
        <div v-for="(line, index) of lines" v-else :key="index" class="card-content-row">
          <v-textarea
            auto-grow
            hide-details
            :label="t('cards.item', { value: index + 1 })"
            :model-value="line"
            rows="1"
            variant="outlined"
            @update:model-value="(value: string) => setLine(index, value)"
          />
          <v-btn icon="mdi-delete" :title="t('cards.deleteItem')" variant="text" @click="removeLine(index)" />
        </div>
        <v-btn
          block
          class="mt-2"
          prepend-icon="mdi-plus"
          variant="outlined"
          @click="addLine"
        >
          {{ t('cards.addItem') }}
        </v-btn>
      </div>
    </div>

    <!-- The card's own button, under its text: the same button as anywhere
      on a page (its look from the UI Kit, what a click does - a page, a
      popup). Opening a popup, it passes the card's title along. -->
    <div class="card-content-section mt-6">
      <span class="card-content-label">{{ t('cards.button') }}</span>
      <div v-if="card.button" class="card-button-edit mt-2">
        <template-item
          :block-index="0"
          :blocks="[card.button]"
          deletable
          :update-item="(_index: number, value: TemplateBlockModel) => setButton(value)"
          @delete="setButton(undefined)"
        />
      </div>
      <v-btn
        v-else
        block
        class="mt-2"
        prepend-icon="mdi-gesture-tap-button"
        variant="outlined"
        @click="addButton"
      >
        {{ t('cards.addButton') }}
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
  .editable-card {
    width: 100%;
  }

  .card-content-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: solid 1px rgba(58, 74, 88, 0.15);
    border-radius: 4px;
  }

  .card-content-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .card-content-label {
    font-size: 0.75rem;
    color: #3A4A58;
  }

  .card-icon-shared-hint {
    font-size: 0.8rem;
    color: #7A8699;
    margin-bottom: 8px;
  }

  .card-content-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* The paragraphs, one under another with a gap between them. */
  .card-content-lines {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .card-content-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
