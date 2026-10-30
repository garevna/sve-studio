<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import type { CardStyleEntry } from '@/utils/card-style-entry'
  import { computed, ref } from 'vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { CARD_STYLE_BY_VARIANT } from '@/configs/card-style'
  import { t } from '@/i18n'
  import { useAjaxStore } from '@/stores/ajax'
  import { cardStyleInline, extractCardStyles } from '@/utils/card-style-entry'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // Picks the block's card style from the UI Kit (content/styles/cards.css).
  // The block stores only the style's class name, so editing the style in
  // the UI Kit restyles every block that refers to it.
  //
  // `block` is a live reference into the page content - same convention as
  // CardContainerActions.vue.
  const props = defineProps<{ block: TemplateBlockModel }>()

  const ajaxStore = useAjaxStore()
  const styles = ref<CardStyleEntry[]>([])
  const open = ref(false)

  // Read on every open: the UI Kit may have changed since.
  async function load () {
    styles.value = extractCardStyles(await ajaxStore.getStyleFile('cards.css') ?? '').entries
  }

  const variantStyle = computed(() => CARD_STYLE_BY_VARIANT[props.block.ver || 2])

  /* eslint-disable vue/no-mutating-props */
  function pick (className: string | undefined) {
    if (className) {
      props.block.cardStyle = className
    } else {
      delete props.block.cardStyle
    }
    // A fill picked on the block would sit on top of the style and keep the
    // UI Kit from deciding it - choosing a style hands the fill back to it.
    delete props.block.cardBackground
    open.value = false
  }
  /* eslint-enable vue/no-mutating-props */
</script>

<template>
  <v-menu v-model="open" :close-on-content-click="false" location="bottom start" @update:model-value="value => value && load()">
    <template #activator="{ props: menuProps }">
      <ToolbarIconButton v-bind="menuProps" icon="mdi-card-outline" :tooltip="t('cardStyles.pick')" />
    </template>
    <v-card class="card-style-menu" theme="editorTheme">
      <v-card-text>
        <div class="card-style-menu-title">{{ t('cardStyles.pick') }}</div>
        <!-- Not <button>: the site theme styles every bare button
          (font, radius, padding) with !important. -->
        <div
          :class="['card-style-menu-item', { 'card-style-menu-item--active': !block.cardStyle }]"
          role="button"
          tabindex="0"
          @click="pick(undefined)"
          @keydown.enter="pick(undefined)"
        >
          {{ t('cardStyles.byVariant') }}
          <span v-if="variantStyle" class="card-style-menu-sub">
            ({{ styles.find(entry => entry.className === variantStyle)?.label || variantStyle }})
          </span>
        </div>
        <div
          v-for="entry of styles"
          :key="entry.className"
          :class="['card-style-menu-item', { 'card-style-menu-item--active': block.cardStyle === entry.className }]"
          role="button"
          tabindex="0"
          @click="pick(entry.className)"
          @keydown.enter="pick(entry.className)"
        >
          <v-theme-provider :theme="APP_THEME_NAME">
            <span :class="['card-style-menu-swatch', themeClass(APP_THEME_NAME)]" :style="cardStyleInline(entry)" />
          </v-theme-provider>
          {{ entry.label }}
        </div>
        <v-btn class="mt-3" size="small" to="/ui-kit" variant="text">UI Kit →</v-btn>
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<style scoped>
.card-style-menu {
  width: 300px;
  max-width: calc(100vw - 32px);
}
.card-style-menu-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.card-style-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  text-align: start;
  cursor: pointer;
}
.card-style-menu-item:hover {
  background: rgba(0, 0, 0, 0.05);
}
.card-style-menu-item--active {
  background: rgba(48, 80, 177, 0.12);
}
.card-style-menu-sub {
  color: #7A8699;
}
.card-style-menu-swatch {
  flex: none;
  width: 48px;
  height: 32px;
  padding: 0 !important;
}
</style>
