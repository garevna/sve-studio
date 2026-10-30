<script lang="ts" setup>
  import { css } from '@codemirror/lang-css'
  import { EditorState } from '@codemirror/state'
  import { EditorView } from '@codemirror/view'
  import { basicSetup } from 'codemirror'
  import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'

  const props = defineProps<{ modelValue: string }>()
  const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

  const containerRef = shallowRef<HTMLDivElement>()
  let view: EditorView | undefined

  onMounted(() => {
    if (!containerRef.value) return

    view = new EditorView({
      parent: containerRef.value,
      state: EditorState.create({
        doc: props.modelValue,
        extensions: [
          basicSetup,
          css(),
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              emit('update:modelValue', update.state.doc.toString())
            }
          }),
        ],
      }),
    })
  })

  watch(() => props.modelValue, newValue => {
    if (view && newValue !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: newValue },
      })
    }
  })

  onBeforeUnmount(() => {
    view?.destroy()
  })
</script>

<template>
  <div ref="containerRef" class="css-editor" />
</template>

<style scoped>
  .css-editor {
    border: solid 1px rgba(0, 0, 0, 0.12);
    border-radius: 8px;
    overflow: hidden;
  }
  .css-editor :deep(.cm-editor) {
    height: 65vh;
    font-size: 0.85rem;
  }
  .css-editor :deep(.cm-scroller) {
    overflow: auto;
  }
</style>
