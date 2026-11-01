<script setup lang="ts">
  import { t } from '@/i18n'

  // Defaults resolved at render time, so they follow the interface language.
  const props = withDefaults(defineProps<{
    modelValue: boolean
    title?: string
    text?: string
    confirmText?: string
    cancelText?: string
    loading?: boolean
    // A confirmation that is not a deletion (replacing settings, say) is
    // not red.
    confirmColor?: string
  }>(), {
    loading: false,
    confirmColor: 'error',
  })

  const emit = defineEmits<{
    'update:modelValue': [boolean]
    'confirm': []
  }>()

  function cancel () {
    emit('update:modelValue', false)
  }
</script>

<template>
  <v-dialog max-width="420" :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <v-card theme="editorTheme" :title="props.title ?? t('confirm.title')">
      <v-card-text>{{ props.text ?? t('confirm.irreversible') }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="cancel">{{ props.cancelText ?? t('common.cancel') }}</v-btn>
        <v-btn :color="props.confirmColor" :loading="loading" variant="elevated" @click="emit('confirm')">{{ props.confirmText ?? t('common.delete') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
