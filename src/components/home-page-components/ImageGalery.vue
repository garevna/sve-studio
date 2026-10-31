<script setup lang="ts">
  import type { TranslatedModel } from '@/types/TemplateBlockModel'
  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'
  import { useAjaxStore } from '@/stores/ajax'
  import { useCommonStore } from '@/stores/common'
  import { resolveLocaleText } from '@/utils/locale-text'

  const commonStore = useCommonStore()
  const ajaxStore = useAjaxStore()
  const { winSize } = storeToRefs(commonStore)
  type PropsModel = {
    header: TranslatedModel | string
    headerClass?: string
    subheader?: TranslatedModel | string
    subheaderClass?: string
    text: TranslatedModel | string
    textClass?: string
    button: string
    images: {
      desktop: string[]
      mobile: string[]
    }
  }

  const props = defineProps<PropsModel>()

  // Real page content stores these as {uk,en,de} TranslatedModel objects
  // (see public/files/theme_2/dynamic-pages/home-page.json's own
  // ImagesGridVer1 block) - a bare `{{ props.header }}` used to render the
  // raw object (Vue's toDisplayString JSON-stringifies non-string values),
  // showing literal text like `{ "uk": "...", "en": "...", "de": "..." }`
  // on the page instead of the localized string.
  const headerText = computed(() => resolveLocaleText(props.header, commonStore.locale))
  const subheaderText = computed(() => resolveLocaleText(props.subheader, commonStore.locale))
  const bodyText = computed(() => resolveLocaleText(props.text, commonStore.locale))

  // Photoshop-style checkerboard for an empty slot or a src that 404s -
  // see .image-placeholder-bg in common.css. Tracked by src rather than by
  // slot index since that's all @error handlers naturally have to hand.
  const failedImages = ref(new Set<string>())
  function onImageError (src: string | undefined) {
    if (src) failedImages.value.add(src)
  }
  function placeholderClass (src: string | undefined) {
    return { 'image-placeholder-bg': !src || failedImages.value.has(src) }
  }
</script>

<template>
  <v-container>
    <h2 v-if="headerText" :class="props.headerClass || 'my-8'">{{ headerText }}</h2>
    <h3 v-if="subheaderText" :class="props.subheaderClass || 'my-5'">{{ subheaderText }}</h3>
    <p v-if="bodyText" :class="props.textClass || 'text-16-400-grey mt-5 mb-12'">
      {{ bodyText }}
    </p>
    <template v-if="winSize.width > 800">
      <v-row class="align-stretch">
        <v-col cols="3">
          <v-img
            class="rounded-border-image"
            :class="placeholderClass(props.images.desktop[0])"
            cover
            height="424"
            :src="ajaxStore.getImageURL(props.images.desktop[0] || '')"
            @error="onImageError(props.images.desktop[0])"
          />
        </v-col>
        <v-col class="d-flex flex-column justify-space-between" cols="3">
          <v-img
            class="rounded-border-image mb-3"
            :class="placeholderClass(props.images.desktop[1])"
            cover
            height="200"
            :src="ajaxStore.getImageURL(props.images.desktop[1] || '')"
            @error="onImageError(props.images.desktop[1])"
          />
          <v-img
            class="rounded-border-image mt-3"
            :class="placeholderClass(props.images.desktop[2])"
            cover
            height="200"
            :src="ajaxStore.getImageURL(props.images.desktop[2] || '')"
            @error="onImageError(props.images.desktop[2])"
          />
        </v-col>

        <v-col class="d-flex flex-column justify-space-between" cols="6">
          <v-img
            class="rounded-border-image"
            :class="placeholderClass(props.images.desktop[3])"
            cover
            :src="ajaxStore.getImageURL(props.images.desktop[3] || '')"
            style="height: 424px"
            @error="onImageError(props.images.desktop[3])"
          />
        </v-col>
      </v-row>
    </template>

    <template v-else>
      <v-row>
        <v-col cols="7">
          <v-img
            class="rounded-border-image"
            :class="placeholderClass(props.images.mobile[0] || props.images.desktop[0])"
            cover
            height="344"
            :src="ajaxStore.getImageURL(props.images.mobile[0] || props.images.desktop[0] || '')"
            @error="onImageError(props.images.mobile[0] || props.images.desktop[0])"
          />
        </v-col>
        <v-col cols="5">
          <div class="d-flex flex-column justify-space-between">
            <v-img
              class="rounded-border-image mb-3"
              :class="placeholderClass(props.images.mobile[1] || props.images.desktop[1])"
              cover
              height="160"
              :src="ajaxStore.getImageURL(props.images.mobile[1] || props.images.desktop[1] || '')"
              @error="onImageError(props.images.mobile[1] || props.images.desktop[1])"
            />
            <v-img
              class="rounded-border-image mt-3"
              :class="placeholderClass(props.images.mobile[2] || props.images.desktop[2])"
              cover
              height="160"
              :src="ajaxStore.getImageURL(props.images.mobile[2] || props.images.desktop[2] || '')"
              @error="onImageError(props.images.mobile[2] || props.images.desktop[2])"
            />
          </div>
        </v-col>
      </v-row>
      <v-img
        class="rounded-border-image mt-4"
        :class="placeholderClass(props.images.mobile[3] || props.images.desktop[3])"
        cover
        :src="ajaxStore.getImageURL(props.images.mobile[3] || props.images.desktop[3] || '')"
        style="height: 200px"
        @error="onImageError(props.images.mobile[3] || props.images.desktop[3])"
      />
    </template>
  </v-container>
</template>

<style scoped>
.rounded-border-image {
  border-radius: var(--v-default-border-radius);
}
</style>
