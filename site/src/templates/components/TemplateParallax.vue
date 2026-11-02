<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/common'
  import { storeToRefs } from 'pinia'

  import { computed } from 'vue'

  import { getImageURL } from '../../services/get-image-url'
  import { useCommonStore } from '../../stores/common'
  import { localeAsset } from '../../utils/locale-asset'

  import TemplateItem from '../TemplateItem.vue'

  const { locale, defaultLocale } = storeToRefs(useCommonStore())

  const props = defineProps<{ item?: TemplateBlockModel, background?: string | null }>()
  const background = computed(() => props.item && props.item.dark ? '#00000050' : '#ffffff40')
  const imageURL = computed(() => getImageURL(localeAsset(props.item?.content, locale.value, defaultLocale.value)))
</script>

<template>
  <v-parallax :class="props.item?.class || ''" :src="imageURL">
    <template v-if="!props.item">
      <div class="parallax-content-1">
        <slot />
      </div>
    </template>
    <template v-else>
      <div class="parallax-content-2">
        <template v-for="(rec, index) of props.item.children" :key="index">
          <TemplateItem class="text-white" :item="rec" />
        </template>
      </div>
    </template>
  </v-parallax>
</template>

<style lang="css" scoped>
  .parallax-content-1 {
    position: absolute;
    top: 80%;
    left: 20px;
    transform: translateY(-50%);
    height: max-content;
    width: calc(100% - 40px);
  }
  .parallax-content-2 {
    background: v-bind(background);
    border-radius: var(--default-border-radius);
    padding: 16px 28px;
    margin: 20px 20px 20px calc(50% - 20px);
    width: 50%;
    height: calc(100% - 40px);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .parallax-content-2 * {
    color: var(--white) !important;
    text-shadow: 0 0 5px #0009;
  }

  @media screen and (max-width: 960px) {
    .parallax-content-2 {
      width: calc(100% - 40px);
      margin: 20px;
    }
  }

  @media screen and (max-width: 710px) {
    .parallax-content-1 {
      top: 60%;
      border-radius: var(--large-border-radius);
      background: var(--light-grey-2);
    }
  }
</style>
