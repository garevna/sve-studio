<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/common'
  import { storeToRefs } from 'pinia'

  import { computed } from 'vue'

  import { useCommonStore } from '@/stores/common'

  const { locale } = storeToRefs(useCommonStore())

  const props = defineProps<{ item: TemplateBlockModel }>()

  const type = computed(() => props.item.type as 'header' | 'title' | 'text')
  const id = computed(() => props.item.id || '')
  const className = computed(() => props.item.class)
  const text = computed(() => props.item.content[locale.value as keyof typeof props.item.content])
</script>

<template>
  <template v-if="type === 'header'">
    <h2 :id="id" :class="[className || 'text-center text-md-left my-12']">
      {{ text }}
    </h2>
  </template>
  <template v-else-if="type === 'title'">
    <h3 :id="id" :class="[className || 'text-center text-md-left my-6']">
      {{ text }}
    </h3>
  </template>
  <template v-else-if="type === 'text'">
    <template v-if="Array.isArray(text)">
      <template v-for="(line, index) of text" :key="index">
        <p :class="className || 'default-text text-thin text-grey py-5 py-md-3'">
          {{ line }}
        </p>
      </template>
    </template>
    <template v-else>
      <p :class="className || 'default-text text-thin text-grey py-5 py-md-3'">
        {{ text }}
      </p>
    </template>
  </template>
</template>
