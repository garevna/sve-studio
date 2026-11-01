<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/common'
  import type { TranslatedModel } from '@/types/common/TemplateBlockModel'

  import { storeToRefs } from 'pinia'

  import { getImageURL } from '@/services/get-image-url'
  import { useCommonStore } from '@/stores/common'

  const { locale } = storeToRefs(useCommonStore())

  const props = defineProps<{ item: TemplateBlockModel }>()
</script>

<template>
  <div
    :class="[props.item.class, 'px-8 py-16']"
    :style="{ background: `var(--${props.item.background || 'primary'})`, color: 'var(--white)', borderRadius: 'var(--default-border-radius)' }"
  >
    <h2 v-if="props.item.title" class="text-white text-center my-10">
      {{ props.item.title[locale as 'uk' | 'en' | 'de'] }}
    </h2>
    <h4 v-if="props.item.text" class="text-dark-grey text-center mt-4">
      {{ (props.item.text as TranslatedModel)[locale as 'uk' | 'en' | 'de'] }}
    </h4>
    <div class="d-flex flex-wrap justify-center gc-7 gr-16 w-100 mt-20">
      <v-card
        v-for="(child, index) of props.item.children"
        :key="index"
        class="d-flex flex-column align-center justify-space-between"
        color="transparent"
        flat
        :style="{ width: `${props.item.cardWidth || 240}px`, maxWidth: '100%' }"
      >
        <div style="justify-items: center">
          <div
            :style="{
              width: ((child.size + 16) || 40) + 'px',
              height: ((child.size + 16) || 40) + 'px',
              background: child.background ? `var(--${child.background})` : '#FFFFFF40',
              borderRadius: '50%',
              padding: '8px'
            }"
          >
            <!-- v-icon only knows mdi-* names; an uploaded SVG (data: URI or
                 path) has to be an <img>, or it renders as nothing. -->
            <v-icon v-if="String(child.icon || '').startsWith('mdi-')" :color="child.color || 'secondary'" :size="child.size || 24">
              {{ child.icon }}
            </v-icon>
            <img
              v-else-if="child.icon"
              alt=""
              :src="getImageURL(child.icon)"
              :style="{ width: (child.size || 24) + 'px', height: (child.size || 24) + 'px', display: 'block' }"
            >
          </div>
          <h4 v-if="child.title" class="text-medium text-white text-center my-10">
            {{ child.title[locale as 'uk' | 'en' | 'de'] }}
          </h4>
        </div>
        <p v-if="child.text" :class="child.class || 'h5 text-medium text-white text-center mt-10'">
          {{ (child.text as TranslatedModel)[locale as 'uk' | 'en' | 'de'] }}
        </p>
      </v-card>
    </div>
  </div>
</template>
