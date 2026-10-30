<script setup lang="ts">
  import { computed } from 'vue'
  import { defaultTextClass } from '@/configs/defaults/default-classes'
  import IconEditor from './IconEditor.vue'
  import TextEditor from './TextEditor.vue'

  defineProps<{
    // See TextFormatMenu.vue - folds block deletion into the icon/text
    // field's own format-menu fab, only when this whole component IS a
    // top-level page block.
    deletable?: boolean
  }>()
  const emit = defineEmits<{ delete: [] }>()

  const icon = defineModel<string>('icon', { default: '' })
  const iconColor = defineModel<string>('iconColor', { default: 'grey' })
  const iconSize = defineModel<number>('iconSize', { default: 24 })
  const iconBackground = defineModel<string>('iconBackground', { default: '' })
  const text = defineModel<string>('text', { default: '' })
  const textClass = defineModel<string>('textClass', { default: defaultTextClass })

  // Production's own TextWithIcon.vue sizes this column to just the bare
  // icon size (grid-template-columns: v-bind(iconSize) 1fr), but IconEditor
  // (like production's own IconVariant.vue) actually renders a background
  // circle at size+32, not the bare size - so whenever a background is set,
  // production's own grid column is undersized and the circle overflows
  // into the text, crowding it. Reserving the real rendered width here is a
  // deliberate, requested divergence from that (buggy) production spacing,
  // not a fidelity slip - see IconEditor.vue's own "backSize" for the
  // matching +32 formula.
  const iconColumnWidth = computed(() => {
    const size = iconSize.value || 24
    return (iconBackground.value ? size + 32 : size) + 'px'
  })
</script>

<template>
  <div class="text-with-icon">
    <!-- Icon color/size/background/glyph are fully self-contained here -
      click the icon to open IconEditor's own dialog. TextEditor's own
      format panel used to also expose an icon-color picker (parentType
      'icon' swapped its color control to write iconColor instead of the
      text's own class) - removed as a real bug, not a design choice: it
      silently repainted the icon whenever someone picked a "text color"
      there, and duplicated a control IconEditor already owns completely. -->
    <IconEditor
      v-model:icon="icon"
      v-model:icon-background="iconBackground"
      v-model:icon-color="iconColor"
      v-model:icon-size="iconSize"
    />

    <TextEditor
      v-model:class="textClass"
      v-model:content="text"
      :deletable="deletable"
      parent-type="icon"
      type="text"
      @delete="emit('delete')"
    />
  </div>
</template>

<style scoped>
.text-with-icon {
  display: grid;
  grid-template-columns: v-bind(iconColumnWidth) 1fr;
  column-gap: 16px;
  align-items: center;
}

.text-with-icon img {
  vertical-align: middle;
}
</style>
