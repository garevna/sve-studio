<script setup lang="ts">
  const props = defineProps<{
    tooltip: string
    text: string
    textClass: string
    icon?: string
  }>()
  const emit = defineEmits(['click'])
</script>

<template>
  <v-tooltip
    location="top"
    :text="props.tooltip"
    theme="editorTheme"
  >
    <template #activator="{ props: tooltipProps }">
      <p
        v-bind="tooltipProps"
        :class="props.textClass"
        @click="emit('click')"
      >
        <v-icon v-if="props.icon" size="small">{{ props.icon }}</v-icon>
        <span class="text-with-tooltip-label">{{ props.text }}</span>
      </p>
    </template>
  </v-tooltip>
</template>

<style scoped>
p {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
/* Phones: icons only - the tooltip still names the action. */
@media (max-width: 599px) {
  .text-with-tooltip-label {
    display: none;
  }
}
</style>
