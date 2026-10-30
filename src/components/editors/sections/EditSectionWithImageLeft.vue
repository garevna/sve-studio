<script setup lang="ts">
  import ImageEditor from '@/components/editors/ImageEditor.vue'
  const image = defineModel('image')
  const title = defineModel('title')
  const text = defineModel('text')
  const titleClass = defineModel('titleClass')
  const textClass = defineModel('textClass')
</script>

<template>
  <div class="d-flex">
    <div class="w-100 w-md-50">
      <TextEditor v-model:class="titleClass" v-model:content="title" type="title" />
      <TextEditor v-model:class="textClass" v-model:content="text" type="text" />
    </div>
    <div class="w-100 w-md-50">
      <ImageEditor v-model:content="image" :resize="false" />
    </div>
  </div>
</template>
