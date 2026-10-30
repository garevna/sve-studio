<script setup lang="ts">
  import { getImageURL } from '../../services/get-image-url'

  type PropsModel = {
    header: string
    headerClass?: string
    subheader?: string
    subheaderClass?: string
    text?: string
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
  <v-container>
    <h2 v-if="props.header" :class="props.headerClass || 'mb-5 text-center'">{{ props.header }}</h2>
    <p v-if="props.subheader" :class="props.subheaderClass || 'h5 text-medium text-special text-center mb-8'">{{ props.subheader }}</p>

    <div id="theme-2-mobile-mode" class="d-flex flex-column gr-5">
      <img class="rounded-border-image" :src="getImageURL(props.images.mobile[0])">
      <img class="rounded-border-image" :src="getImageURL(props.images.mobile[1])">
      <p v-if="props.text" :class="props.textClass || 'default-text text-medium text-black mt-2 text-justify'">
        {{ props.text }}
      </p>
    </div>
    <v-row id="md-variant" class="align-stretch">
      <v-col cols="6">
        <v-img
          class="rounded-border-image"
          cover
          height="624"
          :src="getImageURL(props.images.desktop[0])"
        />
      </v-col>

      <v-col class="d-flex flex-column justify-space-between" cols="6">
        <v-row class="align-stretch" style="height: 300px; overflow-y: auto;">
          <v-col cols="12">
            <div class="default-text text-thin text-special text-justify">
              {{ props.text }}
            </div>
          </v-col>
        </v-row>
        <v-row style="height: 50%">
          <v-col cols="12">
            <v-img
              class="rounded-border-image"
              cover
              height="300"
              :src="getImageURL(props.images.desktop[3])"
            />
          </v-col>
        </v-row>
      </v-col>
    </v-row>
    <v-row id="below-line" class="align-stretch">
      <v-col cols="8">
        <v-img
          class="rounded-border-image"
          cover
          height="300"
          :src="getImageURL(props.images.desktop[1])"
        />
      </v-col>

      <v-col cols="4">
        <v-img
          class="rounded-border-image"
          cover
          height="300"
          :src="getImageURL(props.images.desktop[2])"
        />
      </v-col>
    </v-row>
    <v-row id="below-line-sm" class="align-stretch">
      <v-col cols="12">
        <v-img
          class="rounded-border-image"
          cover
          :src="getImageURL(props.images.desktop[1])"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.rounded-border-image {
  border-radius: var(--default-border-radius);
}

#below-line-sm, #theme-2-mobile-mode {
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
   #theme-2-mobile-mode {
     display: flex !important;
   }
 }
</style>
