<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { t } from '@/i18n'
  import { fontSpecString, parseFontSpec } from '@/utils/theme-fonts'

  // One font of the site (GeneralSettingsView.vue): its Google Fonts name,
  // a sample line drawn in it and what styles it has. Takes a plain name or
  // whatever Google Fonts gives - a "family=..." part, the whole address,
  // the <link> code - and keeps the tidy form ("Name:axes") once the field
  // is left (see utils/theme-fonts.ts).
  defineProps<{ label: string, removable?: boolean }>()
  const emit = defineEmits<{ remove: [] }>()
  const model = defineModel<string>({ default: '' })

  const text = ref(model.value)
  watch(model, value => {
    if (value !== text.value) text.value = value
  })

  function commit () {
    const spec = parseFontSpec(text.value)
    const tidy = spec ? fontSpecString(spec) : ''
    text.value = tidy
    if (tidy !== model.value) model.value = tidy
  }
  function onPaste () {
    // After the pasted text is in the field.
    setTimeout(commit)
  }

  const spec = computed(() => parseFontSpec(model.value))

  // "ital,wght@0,300..800;1,300..800" -> weights 300–800, italic.
  const summary = computed(() => {
    if (!spec.value) return ''
    if (!spec.value.axes) return t('fonts.defaultSet')
    const [tags = '', tuples = ''] = spec.value.axes.split('@')
    const names = tags.split(',')
    const weightAt = names.indexOf('wght')
    const italAt = names.indexOf('ital')
    const weights = new Set<string>()
    let italic = false
    for (const tuple of tuples.split(';').filter(Boolean)) {
      const values = tuple.split(',')
      if (weightAt !== -1 && values[weightAt]) weights.add(values[weightAt].replace('..', '–'))
      if (italAt !== -1 && values[italAt] === '1') italic = true
    }
    const parts = []
    if (weights.size > 0) parts.push(t('fonts.weights', { weights: [...weights].join(', ') }))
    parts.push(italic ? t('fonts.italic') : t('fonts.noItalic'))
    return parts.join(' · ')
  })
</script>

<template>
  <div class="font-spec-field">
    <div class="font-spec-field-row">
      <v-text-field
        v-model="text"
        hide-details
        :label="label"
        variant="outlined"
        @keydown.enter="commit"
        @paste="onPaste"
        @update:focused="(focused: boolean) => { if (!focused) commit() }"
      />
      <v-btn
        v-if="removable"
        icon="mdi-delete-outline"
        :title="t('fonts.remove')"
        variant="text"
        @click="emit('remove')"
      />
    </div>
    <template v-if="spec">
      <p class="font-spec-field-sample" :style="{ fontFamily: `'${spec.name}', sans-serif` }">
        {{ spec.name }} — {{ t('fonts.sample') }}
      </p>
      <p class="font-spec-field-summary">{{ summary }}</p>
    </template>
  </div>
</template>

<style scoped>
.font-spec-field {
  min-width: 0;
}
.font-spec-field-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.font-spec-field-sample {
  margin: 8px 4px 0;
  font-size: 20px;
  line-height: 1.3;
  color: #3a4a58;
  overflow-wrap: anywhere;
}
.font-spec-field-summary {
  margin: 2px 4px 0;
  font-size: 12px;
  color: #7a8699;
}
</style>
