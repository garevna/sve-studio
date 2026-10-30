<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/common'

  import { storeToRefs } from 'pinia'
  import { getImageURL } from '../../services/get-image-url'
  import { useCommonStore } from '../../stores/common'

  const { locale } = storeToRefs(useCommonStore())

  const props = defineProps<{ item: TemplateBlockModel }>()
</script>

<template>
  <div class="card-with-toolbar-image" :style="{ width: props.item.width || 360, height: '100%' }">
    <v-toolbar
      class="rounded-toolbar"
      color="transparent"
      flat
      :height="props.item.height || 200"
    >
      <v-img
        class="rounded-toolbar"
        cover
        :src="getImageURL(props.item.image)"
      />
    </v-toolbar>
    <v-card-text v-for="(child, index) of props.item.children" :key="index">
      <h3 v-if="child.type === 'title'" :class="['text-center', child.class]">{{ child.content[locale as 'uk' | 'en' | 'de'] }}</h3>
      <p v-if="child.type === 'text'" :class="child.class">{{ child.content[locale as 'uk' | 'en' | 'de'] }}</p>
    </v-card-text>
  </div>
</template>

<style scoped>
  .rounded-toolbar {
    border-radius: var(--default-border-radius) var(--default-border-radius) 0 0 !important;
  }
</style>
