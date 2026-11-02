<!-- eslint-disable unicorn/prefer-add-event-listener -->
<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed, onBeforeMount, ref } from 'vue'
  import ImageEditor from '@/components/editors/ImageEditor.vue'
  import TemplateItem from '@/components/templates/TemplateItem.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { useCommonStore } from '@/stores/common'
  import { emptyTranslatedModel, fillEmptyLocaleSlots, resolveLocaleAsset, setLocalizedContent } from '@/utils/locale-text'
  import { resolveThemeAssetPath } from '@/utils/theme-asset-path'
  import ParallaxComponent from './ParallaxComponent.vue'

  const commonStore = useCommonStore()
  const mode = useEditorMode()

  const props = defineProps<{
    blocks: TemplateBlockModel[]
    blockIndex: number
  }>()
  const target = computed(() => props.blocks[props.blockIndex] || null)
  const background = computed(() => target.value?.dark ? '#0005' : '#fff5')

  const localizedContent = computed({
    get: () => {
      const raw = resolveLocaleAsset(target.value?.content, commonStore.locale)
      return raw ? resolveThemeAssetPath(raw, commonStore.activeTheme) : ''
    },
    set: (value: string) => {
      if (target.value) setLocalizedContent(target.value, commonStore.locale, value)
    },
  })

  // A client who forgets to upload a per-locale banner ships a blank hole
  // on production for that locale, not just a wrong-but-present one - see
  // TemplateItem.vue's matching fillEmptyLocales for the fuller rationale.
  // Only fills EMPTY slots, never overwrites a locale someone already gave
  // its own distinct image.
  function fillEmptyLocales (path: string) {
    if (target.value) fillEmptyLocaleSlots(target.value, path)
  }

  const fileInput = ref<HTMLInputElement | null>(null)

  // const imageHeight = computed({
  //   get: () => (target.value?.height || 400) + 'px',
  //   set: (value: number) => {
  //     console.log('Setting height to', value)
  //     if (target.value) {
  //       target.value.height = value
  //     }
  //   },
  // })

  // function triggerFileDialog () {
  //   fileInput.value?.click()
  // }

  function onFileChange (event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = e => {
        if (target.value && target.value.content) {
          target.value.content = e.target?.result as string
        }
      }
      reader.readAsDataURL(file)
    }
  }

  onBeforeMount(() => {
    if (target.value && !target.value.content) {
      // Same shape as parallax.ts's own template - a bare string here would
      // get silently blown away in the other two locales the moment any one
      // locale's image is edited (see localizedContent's setter above). Empty,
      // not a placeholder photo - see ParallaxComponent.vue's checkerboard.
      target.value.content = emptyTranslatedModel()
    }
  })
</script>

<template>
  <div v-if="target">
    <input
      v-if="mode === 'edit'"
      ref="fileInput"
      accept="image/*"
      style="display: none"
      type="file"
      @change="onFileChange"
    >
    <ParallaxComponent v-if="mode !== 'edit'" :image-height="target.height" :image-src="localizedContent">
      <template v-if="target.children && target.children.length > 0">
        <template v-for="(_, index) of target.children" :key="index">
          <template v-if="target.children[index]?.content">
            <template-item :block-index="index" :blocks="target.children" class="text-white" />
          </template>
        </template>
      </template>
    </ParallaxComponent>

    <div v-else style="position: relative">
      <ImageEditor
        v-model:height="target.height"
        v-model:src="localizedContent"
        :resize="true"
        style="width: 100%; max-width: 1440px"
        @uploaded="fillEmptyLocales"
      />
      <div v-if="target.children && target.children.length > 0" class="parallax-content-edit">
        <template v-for="(_, index) of target.children" :key="index">
          <template v-if="target.children[index]">
            <template-item :block-index="index" :blocks="target.children" class="text-white" />
          </template>
        </template>
      </div>
    </div>

  </div>
</template>

<style lang="css" scoped>
  .parallax-content-edit {
    background: v-bind(background);
    border-radius: var(--v-default-border-radius);
    padding: 16px 28px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .parallax-content-edit {
    position: absolute;
    top: 20px;
    right: 20px;
    bottom: 20px;
    left: 50%;
  }

  .parallax-content-edit * {
    color: var(--white) !important;
    background: transparent;
    text-shadow: 0 0 5px #0009;
  }

  @media screen and (max-width: 960px) {
    .parallax-content-edit {
      width: calc(100% - 80px);
      margin: 40px;
    }
  }
  @media screen and (max-width: 480px) {
    .parallax-content-edit {
      width: calc(100% - 40px);
      margin: 20px;
    }
  }
</style>
