<script setup lang="ts">
  import type { TemplateBlockModel } from '../../types/common'

  import { storeToRefs } from 'pinia'

  import { useCommonStore } from '@/stores/common'
  import { getImageURL } from '../../services/get-image-url'

  const props = defineProps<{ items: TemplateBlockModel[] }>()

  const { winSize } = storeToRefs(useCommonStore())
</script>

<template>
  <div class="cards-with-image-in-circle d-flex flex-column">
    <template v-for="(item, index) of props.items" :key="index">
      <template v-if="winSize.width >= 960">
        <div class="card-with-image-in-circle">
          <p class="text-24-700 text-right text-primary" style="width: 120px">
            {{ item.title }}
          </p>
          <div class="d-flex flex-column align-center" style="height: 160px">
            <img :src="getImageURL(item.image)" :style="{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover' }">
            <div v-if="index < props.items.length - 1" style="width: 2px; height: 40px; background-color: var(--grey);" />
          </div>
          <p v-if="item.content" class="h4 text-thin text-grey text-left">{{ item.content }}</p>
        </div>
      </template>
      <template v-else>
        <div class="card-with-image-in-circle-mobile">
          <div class="d-flex flex-column align-center justify-start" style="height: 100%">
            <img :src="getImageURL(item.image)" :style="{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover' }">
            <div v-if="index < props.items.length - 1" style="width: 2px; height: 100%; min-height: 32px; background-color: var(--grey);" />
          </div>
          <div class="mb-10">
            <p class="text-22-700 text-left text-primary mb-3">
              {{ item.title }}
            </p>
            <p v-if="item.content" class="h4 text-thin text-grey text-left">{{ item.content }}</p>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.card-with-image-in-circle {
  display: grid;
  grid-template-columns: 120px 120px 1fr;
  align-items: center;
  column-gap: 28px;
}

.card-with-image-in-circle-mobile {
  display: grid;
  grid-template-columns: 120px 1fr;
  align-items: center;
  column-gap: 40px;
}
</style>
