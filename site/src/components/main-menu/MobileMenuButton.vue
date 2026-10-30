<script setup lang="ts">
  const model = defineModel({ default: false })
</script>

<template>
  <div id="menu-toggle">
    <input type="checkbox" id="menuCheckbox" v-model="model" />
    <span></span>
    <span></span>
    <span></span>
  </div>
</template>
