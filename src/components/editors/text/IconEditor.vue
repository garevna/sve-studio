<!-- eslint-disable unicorn/prefer-add-event-listener -->
<script setup lang="ts">
  import { computed, nextTick, ref } from 'vue'
  import IconAppearance from '@/components/editors/icon/IconAppearance.vue'
  import IconPicker from '@/components/editors/icon/IconPicker.vue'
  import SocialIconImage from '@/components/editors/icon/SocialIconImage.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { defaultIcon } from '@/configs/defaults/default-icon'
  import { socialIconOf } from '@/configs/social-icons'
  import { useCommonStore } from '@/stores/common'
  import { resolveThemeAssetPath } from '@/utils/theme-asset-path'

  const commonStore = useCommonStore()
  const mode = useEditorMode()

  // Whether this editor also offers the APPEARANCE half (colour, size,
  // background). Off wherever those belong to something bigger than one
  // icon: a block of cards styles all of its icons at once from its own
  // toolbar, so each card is left with the choice of icon and nothing else.
  const props = withDefaults(defineProps<{ appearance?: boolean }>(), { appearance: true })

  const icon = defineModel<string>('icon', { default: defaultIcon })
  const iconColor = defineModel<string>('iconColor', { default: 'grey' })
  const iconSize = defineModel<number>('iconSize', { default: 52 })
  const iconBackground = defineModel<string>('iconBackground', { default: '' })

  // Icon values come in three shapes: an mdi-* name (rendered via the font),
  // a real file path/data URI (uploaded SVG or loaded page content, plain
  // <img>), or raw inline SVG markup (older content / the built-in default -
  // rendered via v-html, no external picker/render component needed).
  const isMdiIcon = computed(() => (icon.value || '').startsWith('mdi-'))
  const isPathIcon = computed(() => /^(\/|data:|https?:|blob:)/.test(icon.value || ''))
  // A social network's icon (configs/social-icons.ts) - drawn by SocialIconImage.
  const socialIcon = computed(() => socialIconOf(icon.value))
  const isRawSvg = computed(() => !isMdiIcon.value && !isPathIcon.value && !socialIcon.value && !!icon.value)
  const iconSrc = computed(() => resolveThemeAssetPath(icon.value, commonStore.activeTheme))
  const resolvedIconColor = computed(() => iconColor.value ? `var(--${iconColor.value})` : undefined)
  const backSize = computed(() => (iconSize.value || 52) + 32)

  const menuOpen = ref(false)

  // The picker loads its 165 kB icon-name list lazily; ask it to start as
  // the dialog opens rather than on first keystroke in the search field.
  const pickerRef = ref<{ loadIconNames: () => void } | null>(null)
  function openMenu () {
    menuOpen.value = true
    nextTick(() => pickerRef.value?.loadIconNames())
  }

</script>

<template>
  <!-- Preview: mirrors production's IconVariant.vue exactly - a bare icon at
       its real size, only wrapped in a background circle when a background
       is actually set. No edit chrome (fab/tooltip/padding) here, since that
       chrome doesn't match production's layout and threw off vertical
       alignment with sibling text when it leaked into preview mode. -->
  <template v-if="mode !== 'edit'">
    <div
      v-if="iconBackground"
      class="icon-editor-back"
      :style="{
        width: `${backSize}px`,
        height: `${backSize}px`,
        background: `var(--${iconBackground})`,
      }"
    >
      <v-icon v-if="isMdiIcon" :color="resolvedIconColor" :size="iconSize">{{ icon }}</v-icon>
      <SocialIconImage v-else-if="socialIcon" :color="iconColor" :icon="icon" :size="iconSize" />
      <img v-else-if="isPathIcon" :src="iconSrc" :style="{ width: `${iconSize}px`, height: `${iconSize}px` }">
      <div v-else-if="isRawSvg" class="icon-editor-raw-svg" :style="{ width: `${iconSize}px`, height: `${iconSize}px` }" v-html="icon" />
    </div>
    <template v-else>
      <v-icon v-if="isMdiIcon" :color="resolvedIconColor" :size="iconSize">{{ icon }}</v-icon>
      <SocialIconImage v-else-if="socialIcon" :color="iconColor" :icon="icon" :size="iconSize" />
      <img v-else-if="isPathIcon" :src="iconSrc" :style="{ width: `${iconSize}px`, height: `${iconSize}px`, display: 'block' }">
      <div v-else-if="isRawSvg" class="icon-editor-raw-svg" :style="{ width: `${iconSize}px`, height: `${iconSize}px` }" v-html="icon" />
    </template>
  </template>

  <div v-else class="icon-editor-wrap">
    <v-tooltip location="top" text="Обрати іконку" theme="editorTheme">
      <template #activator="{ props: tooltipProps }">
        <div
          v-bind="tooltipProps"
          class="icon-editor-back icon-editor-back--clickable"
          :class="{ 'icon-editor-back--empty': !icon }"
          :style="{
            width: `${backSize}px`,
            height: `${backSize}px`,
            background: iconBackground ? `var(--${iconBackground})` : 'transparent',
          }"
          @click="openMenu"
        >
          <v-icon v-if="isMdiIcon" :color="resolvedIconColor" :size="iconSize">{{ icon }}</v-icon>
          <SocialIconImage v-else-if="socialIcon" :color="iconColor" :icon="icon" :size="iconSize" />
          <img v-else-if="isPathIcon" :src="iconSrc" :style="{ width: `${iconSize}px`, height: `${iconSize}px` }">
          <div v-else-if="isRawSvg" class="icon-editor-raw-svg" :style="{ width: `${iconSize}px`, height: `${iconSize}px` }" v-html="icon" />
          <v-icon v-else class="icon-editor-placeholder" color="#A9B4BF" :size="Math.round(iconSize * 0.7)">mdi-image-plus-outline</v-icon>
        </div>
      </template>
    </v-tooltip>

    <v-dialog v-model="menuOpen">
      <!-- The project's own dialog shape: v-card > v-toolbar + scrollable
        v-card-text + actions. The toolbar stays put while the body scrolls,
        so its close button can't drift off the top of a long dialog - which
        is exactly what a free-floating button pinned over the content does.
        A green "Готово" sitting on top of everything also broke the
        editor's own button language; it's an ordinary editor button at the
        bottom now, where every other dialog puts it. -->
      <v-card class="editor-dialog icon-picker-dialog" theme="editorTheme">
        <v-toolbar class="editor-panel" color="transparent" density="compact">
          <v-toolbar-title class="icon-picker-title">Іконка</v-toolbar-title>
          <v-spacer />
          <ToolbarIconButton icon="mdi-close" tooltip="Закрити" @click="menuOpen = false" />
        </v-toolbar>

        <v-card-text class="icon-picker-body">
          <!-- Two panels, two concerns - see IconPicker/IconAppearance for
            why they're separate components. This dialog is simply the host
            that shows both at once, for the case where one icon is being
            edited on its own (text-with-icon). A card block instead puts
            IconAppearance in its own toolbar and IconPicker on each card. -->
          <IconPicker
            ref="pickerRef"
            v-model:icon="icon"
            :preview-background="iconBackground"
            :preview-color="iconColor"
          />

          <v-divider v-if="props.appearance" class="my-5" />

          <IconAppearance
            v-if="props.appearance"
            v-model:icon-background="iconBackground"
            v-model:icon-color="iconColor"
            v-model:icon-size="iconSize"
            :colorable="isMdiIcon || !!socialIcon?.tinted"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="elevated" @click="menuOpen = false">ОК</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.icon-editor-wrap {
  position: relative;
  width: fit-content;
}

.icon-editor-back {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-editor-back--clickable {
  cursor: pointer;
  transition: box-shadow 0.15s ease;
}
.icon-editor-back--clickable:hover {
  box-shadow: 0 0 0 3px rgba(92, 122, 153, 0.25);
}
.icon-editor-back--empty {
  border: dashed 2px #B7C2CC;
  background: #F4F7FA !important;
}

.icon-editor-raw-svg :deep(svg) {
  width: 100%;
  height: 100%;
  fill: v-bind(resolvedIconColor);
}

/* The body scrolls, the toolbar and the actions do not - that's the whole
   point of the shape (see the dialog markup). */
.icon-picker-body {
  overflow-y: auto;
}
.icon-picker-title {
  font-size: 1rem;
  font-weight: 600;
}
.icon-picker-dialog {
  position: relative;
  width: 480px;
  max-width: calc(100vw - 48px);
}

</style>
