<script setup lang="ts">
  import type { FormFieldModel, TemplateBlockModel, TranslatedModel } from '@/types/TemplateBlockModel'
  import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import PhoneNumberPreview from '@/components/inputs/PhoneNumberPreview.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { t } from '@/i18n'
  import { useCommonStore } from '@/stores/common'
  import { useUiFeedbackStore } from '@/stores/ui-feedback'
  import { defaultSiteLocale, emptyTranslatedModel, isTranslatedModel, localeDisplayName, resolveLocaleText, siteLocales } from '@/utils/locale-text'
  import { formFieldKey, isEmptyAnswer, POPUP_FORM } from '@/utils/popup-form'

  // One field of a client's own form (a "form-field" block in a 'form'
  // popup), drawn as the site draws it (site FormField.vue) - and its
  // settings under the cog: what kind of field, its name in every language
  // of the site, whether it must be filled in, a list's choices.
  //
  // `block` is a live reference into the popup, edited in place.
  const props = defineProps<{ block: TemplateBlockModel, deletable?: boolean }>()
  const emit = defineEmits<{ delete: [] }>()
  const mode = useEditorMode()
  const commonStore = useCommonStore()
  const form = inject(POPUP_FORM, null)

  // A field from before it had settings starts as a text field.
  // eslint-disable-next-line vue/no-mutating-props -- the block is edited in place, see above
  props.block.formField ??= { input: 'text', label: emptyTranslatedModel() as TranslatedModel }
  const field = computed<FormFieldModel>(() => props.block.formField ?? { input: 'text' })

  const INPUTS: FormFieldModel['input'][] = ['text', 'textarea', 'email', 'phone', 'number', 'date', 'select', 'checkbox']
  const ICONS: Record<FormFieldModel['input'], string> = {
    text: 'mdi-form-textbox',
    textarea: 'mdi-text-long',
    email: 'mdi-email-outline',
    phone: 'mdi-phone-outline',
    number: 'mdi-numeric',
    date: 'mdi-calendar-outline',
    select: 'mdi-format-list-bulleted',
    checkbox: 'mdi-checkbox-marked-outline',
  }

  const label = computed(() => resolveLocaleText(field.value.label, commonStore.locale))
  const shownLabel = computed(() => (field.value.required ? `${label.value} *` : label.value))
  const options = computed(() => (field.value.options ?? []).map(option => ({ value: option.value, title: resolveLocaleText(option.label, commonStore.locale) || option.value })))

  function labelIn (owner: { label?: TranslatedModel }, locale: string): string {
    const value = isTranslatedModel(owner.label) ? owner.label[locale] : ''
    return typeof value === 'string' ? value : ''
  }
  function setLabel (owner: { label?: TranslatedModel }, locale: string, value: string) {
    if (!isTranslatedModel(owner.label)) owner.label = emptyTranslatedModel() as TranslatedModel
    ;(owner.label as Record<string, string>)[locale] = value
  }
  const missingLabels = computed(() => siteLocales().filter(locale => !labelIn(field.value, locale).trim()))

  function setInput (input: FormFieldModel['input']) {
    field.value.input = input
    if (input === 'select' && !field.value.options?.length) {
      field.value.options = [
        { value: 'one', label: { ...emptyTranslatedModel(), [commonStore.locale]: '1' } as TranslatedModel },
        { value: 'two', label: { ...emptyTranslatedModel(), [commonStore.locale]: '2' } as TranslatedModel },
      ]
    }
  }
  function addOption () {
    field.value.options ??= []
    const taken = new Set(field.value.options.map(option => option.value))
    let n = field.value.options.length + 1
    while (taken.has(`option-${n}`)) n++
    field.value.options.push({ value: `option-${n}`, label: emptyTranslatedModel() as TranslatedModel })
  }

  // In a preview the field takes what is typed and reports to the form
  // around it, as on the site; nothing is sent from the editor.
  const value = ref<unknown>(field.value.input === 'checkbox' ? false : (field.value.input === 'select' ? null : ''))
  const key = computed(() => formFieldKey(field.value, resolveLocaleText(field.value.label, defaultSiteLocale())))
  const missing = computed(() => !!form?.checked.value && !!field.value.required && isEmptyAnswer(value.value))
  watch([key, value], ([now], [before]) => {
    if (!form) return
    if (before && before !== now) {
      delete form.values[before]
      delete form.fields[before]
    }
    form.values[now] = value.value
    form.fields[now] = { label: label.value || now, required: !!field.value.required }
  }, { immediate: true })
  onBeforeUnmount(() => {
    if (!form) return
    delete form.values[key.value]
    delete form.fields[key.value]
  })

  const panelOpen = ref(false)
  // A new field (no name yet) opens its settings by itself.
  let askedOnce = false
  watch(mode, now => {
    if (now !== 'edit' || askedOnce || label.value) return
    askedOnce = true
    nextTick(() => {
      panelOpen.value = true
    })
  }, { immediate: true })

  async function requestDelete () {
    if (!await useUiFeedbackStore().confirmDelete('element')) return
    panelOpen.value = false
    emit('delete')
  }
</script>

<template>
  <!-- block.class: the gap below it (the column's spacing handles, mb-N). -->
  <div :class="['form-field-editor', props.block.class]">
    <div :class="['pw-form-field', { 'pw-form-field--missing': missing }]">
      <v-textarea
        v-if="field.input === 'textarea'"
        v-model="value as string"
        auto-grow
        :error="missing"
        hide-details
        :placeholder="shownLabel"
        :readonly="mode === 'edit'"
        rows="3"
        variant="plain"
      />
      <v-select
        v-else-if="field.input === 'select'"
        v-model="value"
        :error="missing"
        hide-details
        icon-color="primary"
        :items="options"
        persistent-placeholder
        :placeholder="shownLabel"
        prepend-icon="mdi-format-list-bulleted"
        :readonly="mode === 'edit'"
        variant="plain"
      />
      <v-checkbox
        v-else-if="field.input === 'checkbox'"
        v-model="value"
        color="primary"
        :error="missing"
        hide-details
        :label="shownLabel"
        :readonly="mode === 'edit'"
      />
      <!-- the site's phone field (PhoneNumberPreview.vue) -->
      <div v-else-if="field.input === 'phone'" class="pw-form-field__phone">
        <PhoneNumberPreview v-model="value as string" :readonly="mode === 'edit'" />
        <span v-if="label" class="pw-form-field__label">{{ shownLabel }}</span>
      </div>
      <v-text-field
        v-else
        v-model="value as string"
        :error="missing"
        hide-details
        icon-color="primary"
        :placeholder="shownLabel"
        :prepend-icon="ICONS[field.input]"
        :readonly="mode === 'edit'"
        :type="field.input"
        variant="plain"
      />
    </div>
    <ToolbarIconButton
      v-if="mode === 'edit'"
      :active="panelOpen"
      class="form-field-editor-cog"
      icon="mdi-cog"
      :tooltip="t('pagePopups.fieldSettings')"
      @click="panelOpen = !panelOpen"
    />

    <v-dialog v-model="panelOpen" max-width="560">
      <v-card class="editor-dialog" theme="editorTheme">
        <v-toolbar class="editor-panel" color="transparent" density="compact">
          <v-toolbar-title class="form-field-editor-title">{{ t('pagePopups.fieldSettings') }}</v-toolbar-title>
          <v-spacer />
          <ToolbarIconButton v-if="deletable" icon="mdi-delete" :tooltip="t('pagePopups.fieldDelete')" @click="requestDelete" />
          <ToolbarIconButton icon="mdi-close" :tooltip="t('common.close')" @click="panelOpen = false" />
        </v-toolbar>
        <v-card-text>
          <p class="form-field-editor-label mb-2">{{ t('pagePopups.fieldType') }}</p>
          <div class="form-field-editor-inputs mb-6">
            <v-chip
              v-for="input of INPUTS"
              :key="input"
              :color="field.input === input ? 'primary' : undefined"
              :prepend-icon="ICONS[input]"
              size="small"
              :variant="field.input === input ? 'flat' : 'outlined'"
              @click="setInput(input)"
            >
              {{ t(`pagePopups.fieldKinds.${input}`) }}
            </v-chip>
          </div>

          <p class="form-field-editor-label mb-2">{{ t('pagePopups.fieldLabel') }}</p>
          <v-text-field
            v-for="locale in siteLocales()"
            :key="locale"
            class="mb-2"
            density="compact"
            :error="!labelIn(field, locale).trim()"
            hide-details
            :label="`${localeDisplayName(locale)} (${locale.toUpperCase()})`"
            :model-value="labelIn(field, locale)"
            variant="outlined"
            @update:model-value="(text: string) => setLabel(field, locale, text)"
          />
          <p v-if="missingLabels.length > 0" class="form-field-editor-needed mb-2">{{ t('pagePopups.fieldLabelNeeded') }}</p>

          <v-switch
            v-model="field.required"
            class="mt-2 mb-4"
            color="primary"
            density="compact"
            hide-details
            inset
            :label="t('pagePopups.required')"
          />

          <template v-if="field.input === 'select'">
            <p class="form-field-editor-label mb-2">{{ t('pagePopups.options') }}</p>
            <div v-for="(option, index) of field.options ?? []" :key="index" class="form-field-editor-option mb-2">
              <v-text-field
                density="compact"
                hide-details
                :model-value="labelIn(option, commonStore.locale)"
                variant="outlined"
                @update:model-value="(text: string) => setLabel(option, commonStore.locale, text)"
              />
              <ToolbarIconButton icon="mdi-delete-outline" :tooltip="t('common.delete')" @click="field.options?.splice(index, 1)" />
            </div>
            <v-btn prepend-icon="mdi-plus" size="small" variant="text" @click="addOption">{{ t('pagePopups.optionAdd') }}</v-btn>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="elevated" @click="panelOpen = false">{{ t('common.ok') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.form-field-editor {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pw-form-field {
  flex: 1 1 auto;
  min-width: 0;
}
.pw-form-field__phone {
  display: flex;
  flex-direction: column-reverse;
  gap: 4px;
}
.pw-form-field__label {
  font-size: 14px;
  color: var(--grey);
}
.pw-form-field--missing .pw-form-field__label {
  color: var(--error);
}
.form-field-editor-cog {
  flex: 0 0 auto;
}
.form-field-editor-title {
  font-size: 1rem;
  font-weight: 600;
}
.form-field-editor-label {
  font-size: 0.85rem;
  color: #7A8699;
}
.form-field-editor-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.form-field-editor-option {
  display: flex;
  align-items: center;
  gap: 8px;
}
.form-field-editor-needed {
  font-size: 0.85rem;
  color: rgb(var(--v-theme-warning));
}
/* A field that must be filled in and was not, once "Send" was pressed. */
.pw-form-field--missing :deep(.v-input:not(.v-checkbox)) {
  border-radius: var(--large-border-radius);
  box-shadow: inset 0 0 0 1px var(--error);
}
.pw-form-field--missing :deep(.phone-number-input) {
  border-radius: var(--large-border-radius);
  box-shadow: inset 0 0 0 1px var(--error);
}
</style>
