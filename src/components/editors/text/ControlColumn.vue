<script setup lang="ts" generic="T">
  // A column of controls, one per item, drawn by the default slot
  // ({ item, index }) - the vertical counterpart of SveSwipeRow, so a panel
  // can hand the same list and slot to either.
  defineProps<{ items: T[] }>()
</script>

<template>
  <div class="d-flex flex-column align-center ga-2">
    <template v-for="(item, index) of items" :key="index">
      <slot :index="index" :item="item" />
    </template>
  </div>
</template>
