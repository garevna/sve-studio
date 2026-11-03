<script setup lang="ts">
  import type { TranslatedModel } from '@/types/TemplateBlockModel'
  import { ref, watch } from 'vue'
  import { t } from '@/i18n'
  import { localeDisplayName, siteLocales } from '@/utils/locale-text'

  // A page's name in every language of the site - the one name it has: the
  // pages list, the editor's top bar and the main menu (unless a menu item
  // has its own text). Opened from the pages list and from the editor.
  const open = defineModel<boolean>({ default: false })
  const props = defineProps<{
    title: TranslatedModel
    loading?: boolean
  }>()
  const emit = defineEmits<{ save: [title: TranslatedModel] }>()

  // Edited on a copy: "Скасувати" leaves the page's name as it was.
  const draft = ref<TranslatedModel>({})
  watch(open, isOpen => {
    if (isOpen) draft.value = { ...props.title }
  }, { immediate: true })
</script>

<template>
  <v-dialog v-model="open" max-width="480">
    <v-card :title="t('pages.name')">
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-4">
          {{ t('pages.nameHint') }}
        </p>
        <v-text-field
          v-for="(code, index) in siteLocales()"
          :key="code"
          v-model="draft[code]"
          :autofocus="index === 0"
          :label="`${localeDisplayName(code)} (${code.toUpperCase()})`"
          variant="outlined"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="open = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" :loading="loading" variant="elevated" @click="emit('save', { ...draft })">{{ t('common.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
