<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { t } from '@/i18n'

  // One social-network icon's URL, edited in a small dialog reached by
  // clicking the icon itself (same hover-then-click-opens-a-dialog
  // interaction as IconEditor.vue's own icon picker) rather than a
  // separate gear button crowding the icon row - see FooterEditor.vue.
  const props = defineProps<{
    modelValue: boolean
    iconName: string
    link: string
  }>()
  const emit = defineEmits<{
    'update:modelValue': [boolean]
    'update:link': [string]
  }>()

  const draft = ref('')

  // Re-derive from the current link every time the dialog opens - same
  // reasoning/immediate:true as MenuLinkDialog.vue (this instance is reused
  // across every icon, not remounted per icon).
  watch(() => props.modelValue, open => {
    if (open) draft.value = props.link
  }, { immediate: true })

  function confirm () {
    emit('update:link', draft.value.trim())
    emit('update:modelValue', false)
  }
</script>

<template>
  <v-dialog max-width="420" :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <v-card theme="editorTheme" :title="t('footer.iconLink.title', { iconName })">
      <v-card-text>
        <p class="text-caption text-medium-emphasis mb-3">
          {{ t('footer.iconLink.hint') }}
        </p>
        <v-text-field
          v-model="draft"
          clearable
          hide-details
          label="URL"
          placeholder="https://..."
          variant="outlined"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="elevated" @click="confirm">{{ t('common.ok') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
