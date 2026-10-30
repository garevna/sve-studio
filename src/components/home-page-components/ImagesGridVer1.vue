<script setup lang="ts">
  import type { TranslatedModel } from '@/types/TemplateBlockModel'
  import { storeToRefs } from 'pinia'
  import { computed, onBeforeMount, ref } from 'vue'
  import TextEditor from '@/components/editors/text/TextEditor.vue'
  import { provideBlockActionsTarget } from '@/composables/useEditableBlockActions'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { defaultHeaderClass, defaultSubheaderClass, defaultTextClass } from '@/configs/defaults/default-classes'
  import { useCommonStore } from '@/stores/common'
  import { emptyTranslatedModel, isTranslatedModel, resolveLocaleText } from '@/utils/locale-text'
  import ImageEditor from '../editors/ImageEditor.vue'
  import ImageGalery from './ImageGalery.vue'

  // TemplateItem renders these blocks as `v-bind="item.props"` alongside
  // `v-model="item.props"`, because the components disagree on which of the
  // two conventions they use. That spread means every key of the props
  // object this component does NOT declare lands on its root element as an
  // ATTRIBUTE - and `title`, being a {uk,en,de} object, arrived as
  // title="[object Object]", which the browser then showed as a native
  // tooltip on the block. Nothing here wants stray attributes.
  defineOptions({ inheritAttrs: false })

  const commonStore = useCommonStore()
  const { winSize } = storeToRefs(commonStore)
  const mode = useEditorMode()

  // This block carries several independent images (4-6, arranged in a CSS
  // grid, not stacked cards) - Teleporting every one of their upload
  // buttons into the block's own single ancestor toolbar (the default
  // ImageEditor.vue behavior) put 4+ identical camera icons in one row with
  // no visual link to which image each one uploads to. Shadowing the
  // injection back to null here makes every nested ImageEditor fall back to
  // its own local floating fab instead, regardless of the real
  // EditableBlockWrapper toolbar above this component - the association
  // between "this camera" and "this image" only reads clearly in place.
  provideBlockActionsTarget(ref(null))
  type PropsModel = {
    header: TranslatedModel | string
    headerClass?: string
    subheader?: TranslatedModel | string
    subheaderClass?: string
    text: TranslatedModel | string
    textClass?: string
    button: string
    buttonClass?: string
    images: {
      desktop: string[]
      mobile: string[]
    }
  }

  const model = defineModel<PropsModel>()

  // get/set bridge between TextEditor.vue's plain-string content model and
  // the real {uk,en,de} TranslatedModel stored on the block - same pattern
  // TemplateItem.vue's own localizedContent computed uses for a generic
  // header/title/text block. One computed per field since this component
  // (unlike TemplateItem's single "item") has three independent text fields
  // on the same model object.
  function localizedField (key: 'header' | 'subheader' | 'text') {
    return computed({
      get: () => resolveLocaleText(model.value?.[key], commonStore.locale),
      set: (value: string | undefined) => {
        if (!model.value) return
        if (!isTranslatedModel(model.value[key])) {
          model.value[key] = emptyTranslatedModel()
        }
        (model.value[key] as TranslatedModel)[commonStore.locale] = value || ''
      },
    })
  }
  const localizedHeader = localizedField('header')
  const localizedSubheader = localizedField('subheader')
  const localizedText = localizedField('text')
  const desktopHeight1 = defineModel<number>('desktopHeight1', { default: 424 })
  const desktopHeight2 = defineModel<number>('desktopHeight2', { default: 200 })
  const mobileHeight1 = defineModel<number>('mobileHeight1', { default: 344 })
  const mobileHeight2 = defineModel<number>('mobileHeight2', { default: 160 })
  const mobileHeight3 = defineModel<number>('mobileHeight3', { default: 200 })

  const headerClass = defineModel('headerClass', { default: defaultHeaderClass })
  const subheaderClass = defineModel('subheaderClass', { default: defaultSubheaderClass })
  const textClass = defineModel('textClass', { default: defaultTextClass })

  // watch(headerClass, (newVal: string) => {
  //   if (model.value) model.value.headerClass = newVal
  // })

  // watch(subheaderClass, (newVal: string) => {
  //   if (model.value) model.value.subheaderClass = newVal
  // })

  // watch(textClass, (newVal: string) => {
  //   if (model.value) model.value.textClass = newVal
  // })

  onBeforeMount(() => {
    if (model.value) {
      headerClass.value = model.value.headerClass || 'mb-5 text-center'
      subheaderClass.value = model.value.subheaderClass || 'my-6'
      textClass.value = model.value.textClass || 'default-text text-medium my-4'
    }
  })
</script>

<template>
  <v-container v-if="model">
    <template v-if="mode === 'edit'">
      <text-editor
        v-if="model.header"
        v-model:class="headerClass"
        v-model:content="localizedHeader"
        parent-type="usual"
        type="header"
      />
      <text-editor
        v-if="model.subheader"
        v-model:class="subheaderClass"
        v-model:content="localizedSubheader"
        parent-type="usual"
        type="title"
      />
      <text-editor
        v-if="model.text"
        v-model:class="textClass"
        v-model:content="localizedText"
        parent-type="usual"
        type="text"
      />

      <template v-if="winSize.width > 800">
        <v-row class="align-stretch">
          <v-col cols="3">
            <image-editor
              v-model:height="desktopHeight1"
              v-model:src="model.images.desktop[0]"
              :resize="false"
            />
          </v-col>
          <v-col class="d-flex flex-column justify-space-between gr-6" cols="3">
            <image-editor
              v-model:height="desktopHeight2"
              v-model:src="model.images.desktop[1]"
              :resize="false"
            />
            <image-editor
              v-model:height="desktopHeight2"
              v-model:src="model.images.desktop[2]"
              :resize="false"
            />
          </v-col>

          <v-col class="d-flex flex-column justify-space-between" cols="6">
            <image-editor
              v-model:height="desktopHeight1"
              v-model:src="model.images.desktop[3]"
              :resize="false"
            />
          </v-col>
        </v-row>
      </template>

      <template v-else>
        <v-row>
          <v-col cols="7">
            <image-editor
              v-model:height="mobileHeight1"
              v-model:src="model.images.mobile[0]"
              :resize="false"
            />
          </v-col>
          <v-col cols="5">
            <div class="d-flex flex-column justify-space-between">
              <image-editor
                v-model:height="mobileHeight2"
                v-model:src="model.images.mobile[1]"
                :resize="false"
              />
              <image-editor
                v-model:height="mobileHeight2"
                v-model:src="model.images.mobile[2]"
                :resize="false"
              />
            </div>
          </v-col>
        </v-row>
        <image-editor
          v-model:height="mobileHeight3"
          v-model:src="model.images.mobile[3]"
          :resize="false"
        />
      </template>
    </template>
    <template v-else>
      <image-galery
        :button="model.button"
        :header="model.header"
        :header-class="headerClass"
        :images="model.images"
        :subheader="model.subheader"
        :subheader-class="subheaderClass"
        :text="model.text"
        :text-class="textClass"
      />
    </template>
  </v-container>
</template>

<style scoped>
.rounded-border-image {
  border-radius: var(--v-default-border-radius);
}
</style>
