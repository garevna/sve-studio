<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  // import TextWithIcon from './TextWithIcon.vue'

  const props = defineProps<{
    width?: number
    height?: number
    ver?: number
    size?: number
    color?: string
    background?: string
    item: TemplateBlockModel
  }>()

  const ver = computed(() => props.ver || props.item.ver || 2)

  const cardWidth = computed(() => {
    if (props.width !== undefined) return props.width + 'px'
    if (props.item.width && props.item.width > 0) return props.item.width + 'px'
    return '100%'
  })

  const cardHeight = computed(() => {
    if (props.height !== undefined) return props.height + 'px'
    if (props.item.height && props.item.height > 0) return props.item.height + 'px'
    return '100%'
  })

  const iconSize = computed(() => {
    if (props.size !== undefined) return props.size
    if (typeof props.item.size === 'number') return Math.max(props.item.size, 24)
    return 48
  })

  const iconColor = computed(() => {
    if (props.color !== undefined) return `var(--${props.color})`
    if (props.item.color !== undefined) return `var(--${props.item.color})`
    return props.background ? 'var(--white)' : 'var(--primary)'
  })

  // const cardWidth = computed(() => props.width || props.item.width ? (props.width || props.item.width) + 'px' : '100%')
  // const cardHeight = computed(() => props.height || props.item.height ? (props.height || props.item.height) + 'px' : '180px')
  const alignClass = computed(() => ver.value === 1 ? 'text-center' : 'text-left')
  const headerClass = computed(() => props.item.class?.includes('header') ? props.item.class : '')
</script>

<template>
  <div :class="`template-card-${ver || 2}`">
    <div style="grid-area: icon; align-content: center;">
      <icon-variant
        v-if="props.item.icon"
        :background="props.background || null"
        :color="iconColor"
        :icon="props.item.icon"
        :size="iconSize"
        :variant="ver === 1 ? 1 : 2"
      />
    </div>
    <p v-if="props.item.title" :class="['text-20-600', props.ver === 1 ? 'mb-4' : 'mb-2', alignClass, headerClass]" style="grid-area: title;">
      {{ props.item.title }}
    </p>
    <template v-if="props.item.content">
      <div v-if="Array.isArray(props.item.content)">
        <template v-for="(line, index) in props.item.content" :key="index">
          <p :class="[props.item.class || 'default-text text-medium text-black', alignClass]" style="grid-area: content">
            • {{ line }}
          </p>
        </template>
      </div>
      <p v-else :class="[props.item.class || 'default-text text-medium text-black', alignClass]" style="grid-area: content">
        {{ props.item.content }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.template-card-1, .template-card-2, .template-card-21, .template-card-3, .template-card-4 {
  display: grid;
  width: v-bind(cardWidth);
  height: v-bind(cardHeight);
  padding: 20px;
}
.template-card-1, .template-card-2, .template-card-4 {
  border-radius: var(--v-default-border-radius);
}
.template-card-1 {
  grid-template-columns: 1fr;
  grid-template-areas:
    "icon"
    "title"
    "content";
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  overflow-y: auto;
  box-shadow: 0 0 12px #00000020
}
.template-card-1 div {
  text-shadow: 0 0 8px #0008;
}

.template-card-2, .template-card-21 {
  grid-template-columns: auto 12px 1fr;
  grid-template-areas:
        "icon . title"
        "content content content";
  align-items: center;
}
.template-card-2 {
  align-content: space-between;
  align-items: center;
  border: var(--light-border);
}
.template-card-21 {
  width: calc(50% - 20px) !important;
  padding: 0 !important;
  border: none !important;
  height: max-content !important;
}
.template-card-21 h4 {
  font-size: 20px;
  font-weight: 600;
}
.template-card-21 p {
  font-size: 18px;
  font-weight: 300;
}

.template-card-3 {
  grid-template-columns: auto 1fr;
  grid-template-areas:
    "icon title"
    "icon content";
  column-gap: 12px;
  justify-items: start;
  border-radius: 80px;
  background: var(--light-grey-2);
  align-content: space-between;
  align-items: center;
  border: var(--light-border);
}
.template-card-3 div {
  display: flex;
  align-items: center;
}

.header-primary {
  color: var(--primary);
}
.header-blue {
  color: var(--blue-dark);
}

@media screen and (max-width: 1200px) {
  .template-card-21 h4 {
    font-size: 18px;
  }
  .template-card-21 p {
    font-size: 16px;
  }
}

@media screen and (max-width: 600px) {
  .template-card-21 {
    width: 100% !important;
    margin-bottom: 20px;
  }
  .template-card-3 {
    height: max-content;
  }
}
</style>
