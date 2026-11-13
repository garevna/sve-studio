<script setup lang="ts">
  import type { DockCountersField, DockFieldLook, DockForm } from '@sve/dock'
  import type { DockFormScope } from '@/components/dock/dock-form-host'
  import { openedLook, presetForm } from '@sve/dock'
  import { computed, provide, reactive, toRaw } from 'vue'
  import { DOCK_FORM_SCOPE } from '@/components/dock/dock-form-host'
  import DockCountersPanel from '@/components/dock/DockCountersPanel.vue'
  import DockFormView from '@/components/dock/DockFormView.vue'
  import { provideEditorDockFormHost } from '@/composables/useEditorDockFormHost'
  import { useSiteForms } from '@/composables/useSiteForms'
  import { t } from '@/i18n'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // A look of the UI Kit's "Елементи форми" on a sample: the first docking
  // form's fields (a list, the dates, the counters), closed, in this look -
  // they open as it says - and next to them the counters opened, so the
  // opened look is seen without a click.
  const props = defineProps<{ look: DockFieldLook }>()
  const siteForms = useSiteForms()
  void siteForms.load()
  const host = provideEditorDockFormHost({ editing: () => false })

  const form = computed<DockForm>(() => {
    // a copy of the plain object (structuredClone refuses a reactive one)
    const found = siteForms.document.value.forms.find(item => item.fields.some(field => field.kind === 'counters'))
    const base: DockForm = found ? structuredClone(toRaw(found)) : presetForm('booking', 'sample', '')
    return {
      ...base,
      id: `look-${props.look.id}`,
      look: props.look.id,
      layout: 'bar',
      fields: base.fields.filter(field => field.kind !== 'cards').map(field => ({ ...field, look: undefined })),
    }
  })
  const counters = computed(() => form.value.fields.find((field): field is DockCountersField => field.kind === 'counters'))
  const panel = computed(() => openedLook(props.look))

  // the counters opened on their own, outside a form: a scope of their own
  const scope: DockFormScope = reactive({
    ...host,
    lists: {},
    labelOf: (key: string) => key,
    fieldOf: () => undefined,
    waitingFor: () => [],
    sampleFor: () => null,
    calendar: () => undefined,
    lookOf: () => props.look,
  })
  provide(DOCK_FORM_SCOPE, scope)
</script>

<template>
  <v-theme-provider :theme="APP_THEME_NAME">
    <div :class="['look-stage', EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME)]">
      <p class="look-stage-caption">{{ t('fieldLooks.sampleClosed') }}</p>
      <DockFormView :key="`${look.id}-${look.opened.variant}`" :form="form" />
      <template v-if="counters">
        <p class="look-stage-caption">{{ t('fieldLooks.sampleOpened') }}</p>
        <div class="look-stage-opened">
          <div :class="panel.class" :style="panel.style">
            <DockCountersPanel :field="counters" :look="look" />
          </div>
        </div>
      </template>
    </div>
  </v-theme-provider>
</template>

<style scoped>
.look-stage {
  padding: 20px 16px 28px;
  border: dashed 1px rgba(58, 74, 88, 0.3);
  border-radius: 8px;
  background: var(--white);
}
.look-stage-caption {
  margin: 0 0 12px;
  font-size: 0.8rem;
  color: #7A8699;
  text-align: center;
}
.look-stage-caption:not(:first-child) {
  margin-top: 24px;
}
.look-stage-opened {
  display: flex;
  justify-content: center;
}
</style>
