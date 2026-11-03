<!-- eslint-disable unicorn/prefer-add-event-listener -->
<script setup lang="ts">
  import type { SocialNetwork } from '@/configs/social-networks'
  import { computed, ref, shallowRef } from 'vue'
  import { SOCIAL_ICONS, type SocialIconLook, socialIconOf, socialIconRef } from '@/configs/social-icons'
  import { SOCIAL_NETWORK_LABELS, SOCIAL_NETWORKS } from '@/configs/social-networks'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'
  import { resolveThemeAssetPath } from '@/utils/theme-asset-path'
  import SocialIconImage from './SocialIconImage.vue'

  // WHICH icon - and nothing about how it looks. The other half (colour,
  // size, background) is IconAppearance.vue.
  //
  // They are separate because they belong to different things. A block of
  // cards wants ONE appearance for all of its icons but a DIFFERENT icon on
  // each card, so the appearance panel goes in the block's own toolbar
  // while this one sits on each card. Fused into a single editor, that was
  // impossible to express - hence the blockTarget indirection EditableCard
  // had to carry, which this split removes the need for.
  //
  // A plain panel, not a dialog: the host decides whether to show it in a
  // dialog (IconEditor.vue) or a menu (a block toolbar).
  const icon = defineModel<string>('icon', { default: '' })

  const props = defineProps<{
    // Only for the uploaded-file preview below, so it's shown against the
    // background it will actually sit on.
    previewBackground?: string
    // The colour the one-colour social icons are shown in.
    previewColor?: string
  }>()

  const commonStore = useCommonStore()

  const isMdiIcon = computed(() => (icon.value || '').startsWith('mdi-'))
  const isPathIcon = computed(() => /^(\/|data:|https?:|blob:)/.test(icon.value || ''))
  const iconSrc = computed(() => resolveThemeAssetPath(icon.value, commonStore.activeTheme))

  const source = ref<'mdi' | 'upload' | 'social'>(isMdiIcon.value ? 'mdi' : (socialIconOf(icon.value) ? 'social' : 'upload'))

  // Every look of every network (configs/social-icons.ts).
  const LOOKS: SocialIconLook[] = ['color', 'mono', 'circle']
  function socialCells (network: SocialNetwork) {
    return LOOKS.filter(look => SOCIAL_ICONS[network][look]).map(look => ({ look, ref: socialIconRef(network, look) }))
  }
  const search = ref('')

  // The mdi webfont ships ~7500 icon names - bundled as a flat JSON list
  // (extracted from @mdi/font's own CSS at dev time) instead of depending on
  // a third-party picker widget, which kept breaking on upgrades. Loaded
  // lazily, and only once.
  const allIconNames = shallowRef<string[]>([])
  let namesLoaded = false
  async function loadIconNames () {
    if (namesLoaded) return
    namesLoaded = true
    const mod = await import('@/assets/mdi-icon-names.json')
    allIconNames.value = mod.default as string[]
  }
  // The host calls this when it opens - there's no point paying for 165 kB
  // of icon names until the picker is actually on screen.
  defineExpose({ loadIconNames })

  const filteredNames = computed(() => {
    const query = search.value.trim().toLowerCase()
    if (!query) return []
    return allIconNames.value.filter(name => name.includes(query)).slice(0, 80)
  })

  const fileInput = ref<HTMLInputElement | null>(null)
  // Icons stay inline as data: URIs rather than going through the upload
  // endpoint (see ImageEditor.vue for real photos) - SVGs are small enough
  // that a network round-trip per icon isn't worth it.
  function onFileChange (event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      if (e.target?.result) icon.value = e.target.result as string
    }
    reader.readAsDataURL(file)
  }
</script>

<template>
  <div>
    <v-btn-toggle v-model="source" class="mb-5" density="comfortable" mandatory>
      <v-btn value="mdi">{{ t('icons.library') }}</v-btn>
      <v-btn value="social">{{ t('common.socialMedia') }}</v-btn>
      <v-btn value="upload">{{ t('icons.uploadSvg') }}</v-btn>
    </v-btn-toggle>

    <!-- Social networks: their own colours, or one colour (set below, in
      the icon's colour). -->
    <div v-if="source === 'social'" class="icon-picker-social">
      <template v-for="network of SOCIAL_NETWORKS" :key="network">
        <span class="icon-picker-social-name">{{ SOCIAL_NETWORK_LABELS[network] }}</span>
        <button
          v-for="cell of socialCells(network)"
          :key="cell.ref"
          :class="['icon-picker-cell', { 'icon-picker-cell--active': cell.ref === icon }]"
          :title="t(`socialLinks.look.${cell.look}`)"
          @click="icon = cell.ref"
        >
          <SocialIconImage :color="props.previewColor" :icon="cell.ref" :size="28" />
        </button>
      </template>
    </div>

    <template v-if="source === 'mdi'">
      <v-text-field
        v-model="search"
        clearable
        density="comfortable"
        hide-details
        :label="t('icons.search')"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
      />
      <div v-if="!search.trim()" class="icon-picker-hint">
        Введіть слово для пошуку іконки (наприклад "bus", "phone", "star")
      </div>
      <div v-else-if="filteredNames.length === 0" class="icon-picker-hint">
        {{ t('blockMenu.nothingFound') }}
      </div>
      <div v-else class="icon-picker-grid">
        <button
          v-for="name of filteredNames"
          :key="name"
          :class="['icon-picker-cell', { 'icon-picker-cell--active': name === icon }]"
          :title="name"
          @click="icon = name"
        >
          <v-icon :icon="name" size="28" />
        </button>
      </div>
    </template>

    <template v-else-if="source === 'upload'">
      <v-btn block prepend-icon="mdi-upload" variant="outlined" @click="fileInput?.click()">
        {{ t('icons.uploadSvgFile') }}
      </v-btn>
      <div
        v-if="isPathIcon"
        class="icon-picker-upload-preview-back"
        :style="{ background: props.previewBackground ? `var(--${props.previewBackground})` : 'transparent' }"
      >
        <img class="icon-picker-upload-preview" :src="iconSrc">
      </div>
    </template>

    <input
      ref="fileInput"
      accept=".svg,image/svg+xml"
      style="display: none"
      type="file"
      @change="onFileChange"
    >
  </div>
</template>

<style scoped>
.icon-picker-hint {
  padding: 24px 8px;
  text-align: center;
  color: #7A8699;
  font-size: 0.9rem;
}
.icon-picker-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
  margin-top: 12px;
}
.icon-picker-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-radius: 8px;
  border: solid 1px rgba(0, 0, 0, 0.12);
  background: #fff;
  cursor: pointer;
}
.icon-picker-cell:hover {
  background: #F4F7FA;
}
.icon-picker-cell--active {
  border-color: #5C7A99;
  background: #E3E9EF;
}
.icon-picker-social {
  display: grid;
  grid-template-columns: minmax(0, 1fr) repeat(3, 48px);
  align-items: center;
  gap: 8px;
}
.icon-picker-social-name {
  font-size: 0.9rem;
  color: #3a4a58;
}
.icon-picker-upload-preview-back {
  margin-top: 16px;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  justify-content: center;
}
.icon-picker-upload-preview {
  max-width: 96px;
  max-height: 96px;
}
</style>
