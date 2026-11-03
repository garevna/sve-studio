<script setup lang="ts">
  import type { LinkTarget } from '@/types/MenuItemModel'
  import { computed, ref } from 'vue'
  import LinkTargetSettings from '@/components/special/LinkTargetSettings.vue'
  import { t } from '@/i18n'

  // "Налаштування переходу" as a modal - the shell around
  // LinkTargetSettings.vue, which holds the three fields themselves and is
  // shared with the inline panel a type:'route' block drops out
  // (RouteEditor.vue). Everything this component still owns is the modal
  // itself: when it is open, and the Cancel/OK pair.
  //
  // `item` is deliberately a live reference into the caller's own reactive
  // content (same "mutate in place, let the caller's own watcher autosave
  // it" convention as EditableTextSection.vue), so confirming here needs no
  // separate "saved" event.
  defineProps<{
    modelValue: boolean
    item: LinkTarget
  }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

  const settings = ref<InstanceType<typeof LinkTargetSettings> | null>(null)
  // Nothing is written until OK here (unlike the inline panel, which has no
  // OK to press) - so the button's own state has to come from the fields.
  const canApply = computed(() => !!settings.value?.canApply)
  const saving = computed(() => !!settings.value?.saving)

  async function confirm () {
    if (await settings.value?.apply()) {
      emit('update:modelValue', false)
    }
  }
</script>

<template>
  <v-dialog max-width="480" :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <v-card theme="editorTheme" :title="t('linkTarget.settings')">
      <v-card-text>
        <LinkTargetSettings ref="settings" :active="modelValue" :item="item" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">{{ t('common.cancel') }}</v-btn>
        <v-btn
          color="primary"
          :disabled="!canApply"
          :loading="saving"
          variant="elevated"
          @click="confirm"
        >{{ t('common.ok') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
