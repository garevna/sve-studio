<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, nextTick, ref, watch } from 'vue'
  import ButtonActionSettings from '@/components/editors/ButtonActionSettings.vue'
  import IconEditor from '@/components/editors/text/IconEditor.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import PaletteSwatchPicker from '@/components/special/PaletteSwatchPicker.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { buttonLinkSummary } from '@/utils/button-link-summary'
  import { emptyTranslatedModel, isTranslatedModel, localeDisplayName, resolveLocaleText, siteLocales } from '@/utils/locale-text'

  // An icon-only button with a tooltip: the icon (from the library, a
  // social network, or an uploaded SVG - with its colour when that applies),
  // what the tooltip says in every language of the site, and what a click
  // does (the same choices as a button with text, ButtonActionSettings).
  //
  // A new one is useless until it has an icon and a tooltip, so it opens its
  // settings by itself, with the icon window on top: icon first, then the
  // tooltip fields, which are all on view at once rather than one language
  // at a time.
  //
  // `block` is a live reference into the page's content, edited in place.
  // The tooltip lives in block.content, as a button's label does.
  const mode = useEditorMode()
  const commonStore = useCommonStore()

  const props = defineProps<{
    block: TemplateBlockModel
    deletable?: boolean
  }>()
  const emit = defineEmits<{ delete: [] }>()

  /* eslint-disable vue/no-mutating-props -- the block is edited in place, see above */
  const icon = computed({
    get: () => props.block.icon || '',
    set: (value: string) => {
      props.block.icon = value || undefined
    },
  })
  const iconColor = computed({
    get: () => props.block.color || 'primary',
    set: (value: string) => {
      props.block.color = value
    },
  })
  const iconSize = computed({
    get: () => props.block.size || 32,
    set: (value: number) => {
      props.block.size = value
    },
  })
  const iconBackground = computed({
    get: () => props.block.background || '',
    set: (value: string) => {
      props.block.background = value || undefined
    },
  })
  // The plate under the icon: always there and always the same size (so
  // nothing around the button moves), transparent until the pointer is on
  // it, then this colour. Empty = no plate at all.
  const hoverBackground = computed({
    get: () => props.block.hoverBackground || '',
    set: (value: string) => {
      props.block.hoverBackground = value || undefined
    },
  })
  const plateStyle = computed(() => ({
    '--icon-button-plate': hoverBackground.value ? `var(--${hoverBackground.value})` : 'transparent',
  }))

  function tooltipIn (locale: string): string {
    const content = props.block.content
    const value = isTranslatedModel(content) ? content[locale] : ''
    return typeof value === 'string' ? value : ''
  }
  function setTooltip (locale: string, value: string) {
    if (!isTranslatedModel(props.block.content)) {
      props.block.content = emptyTranslatedModel()
    }
    (props.block.content as Record<string, string>)[locale] = value
  }
  /* eslint-enable vue/no-mutating-props */

  const tooltip = computed(() => resolveLocaleText(props.block.content, commonStore.locale))
  const missingTooltips = computed(() => siteLocales().filter(locale => !tooltipIn(locale).trim()))
  const linkSummary = computed(() => buttonLinkSummary(props.block))

  const panelOpen = ref(false)
  const iconEditorRef = ref<{ openMenu: () => void } | null>(null)

  // Freshly inserted (no icon yet) and open for editing: ask for everything.
  let askedOnce = false
  watch(mode, now => {
    if (now !== 'edit' || askedOnce || icon.value) return
    askedOnce = true
    panelOpen.value = true
    nextTick(() => iconEditorRef.value?.openMenu())
  }, { immediate: true })

  async function requestDelete () {
    if (!await useUiFeedbackStore().confirmDelete('button')) {
      return
    }
    panelOpen.value = false
    emit('delete')
  }
</script>

<template>
  <div class="icon-button-editor">
    <div class="icon-button-editor-row">
      <!-- The site's look: the icon, its tooltip on hover. While editing,
        the icon itself opens the icon window. -->
      <v-tooltip :disabled="mode === 'edit' || !tooltip" location="top" :text="tooltip">
        <template #activator="{ props: tooltipProps }">
          <span
            v-bind="tooltipProps"
            class="icon-button-editor-face"
            :class="{ 'icon-button-editor-face--plate': mode !== 'edit' }"
            :style="plateStyle"
          >
            <IconEditor
              v-model:icon="icon"
              v-model:icon-background="iconBackground"
              v-model:icon-color="iconColor"
              v-model:icon-size="iconSize"
            />
          </span>
        </template>
      </v-tooltip>
      <ToolbarIconButton
        v-if="mode === 'edit'"
        :active="panelOpen"
        icon="mdi-cog"
        :tooltip="t('iconButton.settings')"
        @click="panelOpen = !panelOpen"
      />
    </div>
    <p v-if="mode === 'edit'" class="text-caption icon-button-editor-summary">{{ linkSummary }}</p>

    <v-dialog v-model="panelOpen" max-width="560">
      <v-card class="editor-dialog" theme="editorTheme">
        <v-toolbar class="editor-panel" color="transparent" density="compact">
          <v-toolbar-title class="icon-button-editor-title">{{ t('iconButton.settings') }}</v-toolbar-title>
          <v-spacer />
          <ToolbarIconButton
            v-if="deletable"
            icon="mdi-delete"
            :tooltip="t('buttonEditor.delete')"
            @click="requestDelete"
          />
          <ToolbarIconButton icon="mdi-close" :tooltip="t('common.close')" @click="panelOpen = false" />
        </v-toolbar>

        <v-card-text>
          <!-- 1-2. The icon and how it looks: the window offers the colour
            only where it can reach the icon (library, one-colour social). -->
          <div class="icon-button-editor-icon-row" :class="icon ? 'mb-6' : 'mb-2'">
            <span class="icon-button-editor-label">{{ t('buttonEditor.icon') }}</span>
            <IconEditor
              ref="iconEditorRef"
              v-model:icon="icon"
              v-model:icon-background="iconBackground"
              v-model:icon-color="iconColor"
              v-model:icon-size="iconSize"
            />
          </div>
          <p v-if="!icon" class="icon-button-editor-needed mb-6">{{ t('iconButton.iconNeeded') }}</p>

          <!-- 3. The tooltip, in every language the site has. -->
          <p class="icon-button-editor-label mb-2">{{ t('iconButton.tooltip') }}</p>
          <v-text-field
            v-for="locale in siteLocales()"
            :key="locale"
            class="mb-2"
            density="compact"
            :error="!tooltipIn(locale).trim()"
            hide-details
            :label="`${localeDisplayName(locale)} (${locale.toUpperCase()})`"
            :model-value="tooltipIn(locale)"
            variant="outlined"
            @update:model-value="(value: string) => setTooltip(locale, value)"
          />
          <div class="icon-button-editor-icon-row mt-4 mb-2">
            <span class="icon-button-editor-label">{{ t('iconButton.hoverPlate') }}</span>
            <PaletteSwatchPicker v-model="hoverBackground" />
            <ToolbarIconButton
              v-if="hoverBackground"
              icon="mdi-close"
              :tooltip="t('iconButton.noPlate')"
              @click="hoverBackground = ''"
            />
          </div>
          <p v-if="missingTooltips.length > 0" class="icon-button-editor-needed mb-6">
            {{ t('iconButton.tooltipNeeded') }}
          </p>
          <div v-else class="mb-6" />

          <ButtonActionSettings :active="panelOpen" :block="block" />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="elevated" @click="panelOpen = false">{{ t('common.ok') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.icon-button-editor-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.icon-button-editor-face {
  display: inline-flex;
}
/* The site's plate (site TemplateItem.vue .icon-button): same padding,
   only its colour changes on hover. */
.icon-button-editor-face--plate {
  padding: 8px;
  border-radius: 50%;
  background: transparent;
  transition: background-color 0.2s ease;
}
.icon-button-editor-face--plate:hover {
  background: var(--icon-button-plate);
}
.icon-button-editor-summary {
  margin: 4px 0 0;
  opacity: 0.7;
}
.icon-button-editor-title {
  font-size: 1rem;
  font-weight: 600;
}
.icon-button-editor-icon-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.icon-button-editor-label {
  font-size: 0.85rem;
  color: #7A8699;
}
.icon-button-editor-needed {
  font-size: 0.85rem;
  color: rgb(var(--v-theme-warning));
}
</style>
