<script setup lang="ts">
  import { storeToRefs } from 'pinia'

  import { getImageURL } from '../../services/get-image-url'
  import { useCommonStore } from '../../stores/common'

  const { winSize, locale } = storeToRefs(useCommonStore())

  type PropsModel = {
    header: {
      uk: string
      en: string
      de: string
    }
    headerClass?: string
    subheader?: string
    subheaderClass?: string
    text?: {
      uk: string
      en: string
      de: string
    }
    textClass?: string
    button?: string
    images: {
      desktop: string[]
      mobile: string[]
    }
  }

  const props = defineProps<PropsModel>()
</script>

<template>
  <div>
    <h2 v-if="props.header" :class="props.headerClass || 'my-5 ml-lg-12'">{{ props.header[locale as 'uk' | 'en' | 'de'] }}</h2>
    <p v-if="props.text" :class="props.textClass || 'default-text text-thin-grey mt-5 mb-12'">
      {{ props.text[locale as 'uk' | 'en' | 'de'] }}
    </p>
    <template v-if="winSize.width > 800">
      <v-row class="align-stretch">
        <v-col cols="3">
          <v-img class="rounded-border-image" cover height="424" :src="getImageURL(props.images.desktop[0])" />
        </v-col>
        <v-col class="d-flex flex-column justify-space-between" cols="3">
          <v-img class="rounded-border-image mb-3" cover height="200" :src="getImageURL(props.images.desktop[1])" />
          <v-img class="rounded-border-image mt-3" cover height="200" :src="getImageURL(props.images.desktop[2])" />
        </v-col>

        <v-col class="d-flex flex-column justify-space-between" cols="6">
          <v-img class="rounded-border-image" cover :src="getImageURL(props.images.desktop[3])" style="height: 424px" />
        </v-col>
      </v-row>
    </template>

    <template v-else>
      <v-row>
        <v-col cols="7">
          <v-img class="rounded-border-image" cover height="344" :src="getImageURL(props.images.mobile[0] || props.images.desktop[0])" />
        </v-col>
        <v-col cols="5">
          <div class="d-flex flex-column justify-space-between">
            <v-img class="rounded-border-image mb-3" cover height="160" :src="getImageURL(props.images.mobile[1] || props.images.desktop[1])" />
            <v-img class="rounded-border-image mt-3" cover height="160" :src="getImageURL(props.images.mobile[2] || props.images.desktop[2])" />
          </div>
        </v-col>
      </v-row>
      <v-img class="rounded-border-image mt-4" cover :src="getImageURL(props.images.mobile[3] || props.images.desktop[3])" style="height: 200px" />
    </template>
  </div>
</template>

<style scoped>
.rounded-border-image {
  border-radius: var(--default-border-radius);
}
</style>
