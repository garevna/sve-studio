<script setup lang="ts">
  import { ref } from 'vue'
  import IconEditor from '@/components/editors/text/IconEditor.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { t } from '@/i18n'

  // Block-level settings for a "Популярні напрямки" block: the four icons a
  // card draws. Rendered into the block's own EditableBlockWrapper toolbar,
  // the same way FaqBlockActions.vue is (PopularDestinationsTheme2.vue does
  // the Teleport).
  //
  // A dialog rather than four buttons on the toolbar itself: four icon
  // pickers in a row give no hint about WHICH icon each one changes, and
  // that is exactly the confusion the FAQ block's own settings were moved
  // out of. Labelled rows say it once.
  //
  // Each write goes through the parent's own patch(), not a mutation of
  // `icons` in place: this block's JSON has no `props` key at all, so the
  // model falls back to a local default object and mutating it emits
  // nothing - see PopularDestinationsTheme2.vue's own comment on that.
  const props = defineProps<{
    icons: { cityFrom: string, cityTo: string, carrier: string, duration: string }
  }>()

  const emit = defineEmits<{ update: [Partial<typeof props.icons>] }>()

  const open = ref(false)

  // The four rows, in the order they appear on a card: the two city markers,
  // then the two caption icons under them.
  const ROWS = [
    { key: 'cityFrom', get label () {
      return t('popularDestinations.cityFrom')
    } },
    { key: 'cityTo', get label () {
      return t('popularDestinations.cityTo')
    } },
    { key: 'carrier', get label () {
      return t('popularDestinations.carrier')
    } },
    { key: 'duration', get label () {
      return t('popularDestinations.duration')
    } },
  ] as const

  function setIcon (key: keyof typeof props.icons, value: string) {
    if (value !== props.icons[key]) {
      emit('update', { [key]: value })
    }
  }
</script>

<template>
  <ToolbarIconButton icon="mdi-cog" :tooltip="t('popularDestinations.cardIcons')" @click="open = true" />

  <v-dialog v-model="open" max-width="460">
    <v-card class="editor-dialog" theme="editorTheme">
      <v-toolbar class="editor-panel" color="transparent" density="compact">
        <v-toolbar-title class="popular-actions-title">{{ t('popularDestinations.cardIcons') }}</v-toolbar-title>
        <v-spacer />
        <ToolbarIconButton icon="mdi-close" :tooltip="t('common.close')" @click="open = false" />
      </v-toolbar>

      <v-card-text>
        <div v-for="row of ROWS" :key="row.key" class="popular-actions-row">
          <span class="popular-actions-label">{{ row.label }}</span>
          <!-- appearance:false - colour, size and background of these icons
            belong to the card's own stylesheet, not to a per-icon setting;
            the choice of icon is genuinely all there is to decide here. -->
          <IconEditor
            :appearance="false"
            :icon="props.icons[row.key]"
            :icon-size="24"
            @update:icon="value => setIcon(row.key, value)"
          />
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.popular-actions-title {
  font-size: 1rem;
}
.popular-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 56px;
}
.popular-actions-row + .popular-actions-row {
  border-top: solid 1px #e3e9ef;
}
.popular-actions-label {
  font-size: 0.9rem;
  color: #3A4A58;
}
</style>
