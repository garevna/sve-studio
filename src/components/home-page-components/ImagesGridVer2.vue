<script setup lang="ts">
  import type { TranslatedModel } from '@/types/TemplateBlockModel'
  import { computed, onBeforeMount, ref, watch } from 'vue'
  import TextEditor from '@/components/editors/text/TextEditor.vue'
  import { provideBlockActionsTarget } from '@/composables/useEditableBlockActions'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { defaultTextClass } from '@/configs/defaults/default-classes'
  import { useAjaxStore } from '@/stores/ajax'
  import { useCommonStore } from '@/stores/common'
  import { emptyTranslatedModel, isTranslatedModel, resolveLocaleText } from '@/utils/locale-text'
  import ImageEditor from '../editors/ImageEditor.vue'

  // TemplateItem renders these blocks as `v-bind="item.props"` alongside
  // `v-model="item.props"`, because the components disagree on which of the
  // two conventions they use. That spread means every key of the props
  // object this component does NOT declare lands on its root element as an
  // ATTRIBUTE - and `title`, being a {uk,en,de} object, arrived as
  // title="[object Object]", which the browser then showed as a native
  // tooltip on the block. Nothing here wants stray attributes.
  defineOptions({ inheritAttrs: false })

  const commonStore = useCommonStore()
  const ajaxStore = useAjaxStore()
  const mode = useEditorMode()

  // Same reasoning as ImagesGridVer1.vue: several independent images in one
  // block, so Teleporting every ImageEditor's upload button into the
  // block's single ancestor toolbar loses the visual link between "this
  // camera" and "this image". Shadowing the injection back to null makes
  // every nested ImageEditor fall back to its own local floating fab.
  provideBlockActionsTarget(ref(null))

  type PropsModel = {
    // header: string
    // headerClass?: string
    // subheader?: string
    // subheaderClass?: string
    text: TranslatedModel | string
    textClass?: string
    button: string
    images: {
      desktop: string[]
      mobile: string[]
    }
  }

  const model = defineModel<PropsModel>()

  const textType = defineModel<'text' | 'header' | 'title'>('type', { default: 'text' })

  const textClass = defineModel('textClass', { default: defaultTextClass })

  // Same bug/fix as ImagesGridVer1.vue: real page content can store `text`
  // as a full {uk,en,de} TranslatedModel, not just a plain string - a bare
  // `{{ model.text }}` would render the raw object once real translated
  // content reaches this component, same as it did there.
  const localizedText = computed({
    get: () => resolveLocaleText(model.value?.text, commonStore.locale),
    set: (value: string | undefined) => {
      if (!model.value) return
      if (!isTranslatedModel(model.value.text)) {
        model.value.text = emptyTranslatedModel()
      }
      (model.value.text as TranslatedModel)[commonStore.locale] = value || ''
    },
  })

  // Photoshop-style checkerboard for an empty slot or a src that 404s -
  // see .image-placeholder-bg in common.css.
  const failedImages = ref(new Set<string>())
  function onImageError (src: string | undefined) {
    if (src) failedImages.value.add(src)
  }
  function placeholderClass (src: string | undefined) {
    return { 'image-placeholder-bg': !src || failedImages.value.has(src) }
  }

  watch(textClass, (newVal: string) => {
    if (model.value) model.value.textClass = newVal
  })

  onBeforeMount(() => {
    if (model.value) {
      textClass.value = model.value.textClass || defaultTextClass
    }
  })
</script>

<template>
  <v-container v-if="model">
    <div id="galery-2-mobile-mode" class="d-flex flex-column gr-5">
      <template v-if="mode === 'edit'">
        <image-editor v-model:src="model.images.mobile[0]" />
        <image-editor v-model:src="model.images.mobile[1]" />
        <text-editor
          v-if="model.text"
          v-model:class-name="model.textClass"
          v-model:content="localizedText"
          v-model:type="textType"
          parent-type="usual"
        />
      </template>
      <template v-else>
        <img
          class="rounded-border-image"
          :class="placeholderClass(model.images.mobile[0])"
          :src="ajaxStore.getImageURL(model.images.mobile[0] || '')"
          @error="onImageError(model.images.mobile[0])"
        >
        <img
          class="rounded-border-image"
          :class="placeholderClass(model.images.mobile[1])"
          :src="ajaxStore.getImageURL(model.images.mobile[1] || '')"
          @error="onImageError(model.images.mobile[1])"
        >
        <p v-if="model.text" :class="model.textClass || defaultTextClass">
          {{ localizedText }}
        </p>
      </template>
    </div>

    <!-- Desktop Mode -->

    <v-row id="md-variant" class="align-stretch">
      <v-col cols="6">
        <template v-if="mode === 'edit'">
          <image-editor v-model:src="model.images.desktop[0]" :resize="false" />
        </template>
        <template v-else>
          <v-img
            class="rounded-border-image"
            :class="placeholderClass(model.images.desktop[0])"
            cover
            height="624"
            :src="ajaxStore.getImageURL(model.images.desktop[0] || '')"
            @error="onImageError(model.images.desktop[0])"
          />
        </template>
      </v-col>

      <v-col class="d-flex flex-column justify-space-between" cols="6">
        <v-row class="align-stretch" style="height: 300px; overflow-y: auto;">
          <v-col cols="12">
            <template v-if="mode === 'edit'">
              <text-editor
                v-if="model.text"
                v-model:class-name="model.textClass"
                v-model:content="localizedText"
                v-model:type="textType"
                parent-type="usual"
              />
            </template>
            <template v-else>
              <p :class="model.textClass || 'text-16-400 text-dark-grey text-left mt-5 mb-12'">
                {{ localizedText }}
              </p>
            </template>
          </v-col>
        </v-row>
        <v-row style="height: 50%">
          <v-col cols="12">
            <template v-if="mode === 'edit'">
              <image-editor v-model:src="model.images.desktop[3]" :resize="false" />
            </template>
            <template v-else>
              <v-img
                class="rounded-border-image"
                :class="placeholderClass(model.images.desktop[3])"
                cover
                height="300"
                :src="ajaxStore.getImageURL(model.images.desktop[3] || '')"
                @error="onImageError(model.images.desktop[3])"
              />
            </template>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
    <v-row id="below-line" class="align-stretch">
      <v-col cols="8">
        <template v-if="mode === 'edit'">
          <image-editor v-model:src="model.images.desktop[1]" :resize="false" />
        </template>
        <template v-else>
          <v-img
            class="rounded-border-image"
            :class="placeholderClass(model.images.desktop[1])"
            cover
            height="300"
            :src="ajaxStore.getImageURL(model.images.desktop[1] || '')"
            @error="onImageError(model.images.desktop[1])"
          />
        </template>
      </v-col>

      <v-col cols="4">
        <template v-if="mode === 'edit'">
          <image-editor v-model:src="model.images.desktop[2]" :resize="false" />
        </template>
        <template v-else>
          <v-img
            class="rounded-border-image"
            :class="placeholderClass(model.images.desktop[2])"
            cover
            height="300"
            :src="ajaxStore.getImageURL(model.images.desktop[2] || '')"
            @error="onImageError(model.images.desktop[2])"
          />
        </template>
      </v-col>
    </v-row>
    <v-row id="below-line-sm" class="align-stretch">
      <v-col cols="12">
        <template v-if="mode === 'edit'">
          <image-editor v-model:src="model.images.desktop[1]" :resize="false" />
        </template>
        <template v-else>
          <v-img
            class="rounded-border-image"
            :class="placeholderClass(model.images.desktop[1])"
            cover
            :src="ajaxStore.getImageURL(model.images.desktop[1] || '')"
            @error="onImageError(model.images.desktop[1])"
          />
        </template>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.rounded-border-image {
  border-radius: var(--v-default-border-radius);
}

#below-line-sm, #galery-2-mobile-mode {
  display: none !important;
}

 @media screen and (max-width: 1180px) {
   #image-4 {
     display: none;
   }
 }

 @media screen and (max-width: 960px) {
   #image-3, #below-line {
     display: none;
   }
   #below-line-sm {
     display: block !important;
   }
 }

 @media screen and (max-width: 600px) {
   #md-variant, #below-line-sm {
     display: none !important;
   }
   #galery-2-mobile-mode {
     display: flex !important;
   }
 }
</style>
