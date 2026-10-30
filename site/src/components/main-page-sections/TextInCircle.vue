<!-- Ported verbatim from production's own client-side
  components/main-page-sections/TextInCircle.vue - only the import path
  differs. This app's whole job is to show what actually ships. -->
<script setup lang="ts">
  import { computed } from 'vue'

  const props = defineProps({
    size: {
      type: Number,
      required: true
    },
    background: {
      type: String,
      default: 'var(--light-blue)'
    },
    fontFamily: {
      type: String,
      default: 'var(--main-font)',
    },
    fontSize: {
      type: Number,
      default: 18
    },
    fontColor: {
      type: String,
      default: 'var(--light-blue)'
    },
    fontWeight: {
      type: Number,
      default: 500
    },
  })
  const size = computed(() => props.size + 'px')
  const fontSize = computed(() => props.fontSize + 'px')
  const fontWeight = computed(() => props.fontWeight)
  const fontColor = computed(() => props.fontColor)
  const background = computed(() => props.background)
</script>

<template>
  <div class="circle-with-text">
    <slot></slot>
  </div>
</template>

<style scoped>
.circle-with-text {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  align-content: center;
  width: v-bind(size);
  height: v-bind(size);
  border-radius: 50%;
  font-size: v-bind(fontSize);
  font-weight: v-bind(fontWeight);
  text-align: center;
  color: v-bind(fontColor);
  background: v-bind(background);
  /* box-sizing: content-box; */
  border: solid 16px v-bind(background);
  padding: 16px;
  box-sizing: border-box;
}
</style>
