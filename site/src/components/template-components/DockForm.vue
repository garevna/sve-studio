<script setup lang="ts">
  import type { DockFieldLook } from '@sve/dock'
  import type { DockFormHost } from '@/components/dock/dock-form-host'
  import type { PopupCalendarModel, TranslatedModel } from '@/types/common/TemplateBlockModel'
  import { fieldLookOf } from '@sve/dock'
  import { storeToRefs } from 'pinia'
  import { computed, provide } from 'vue'
  import { DOCK_FORM_HOST } from '@/components/dock/dock-form-host'
  import DockFormView from '@/components/dock/DockFormView.vue'
  import { calendarProps, newCalendar } from '@/configs/popup-looks'
  import { dock, dockContext, dockValues, reportDock, setDockValue } from '@/services/dock'
  import { useCommonStore } from '@/stores/common'
  import { usePopupsStore } from '@/stores/popups'
  import { sendFeedback } from '@/utils/feedback-transport'

  // "Форма": one of the site's forms (forms.json, set up in the editor's
  // "Форми") under the block's own heading. The values are the visitor's,
  // kept for the tab - a search begun on one page still knows its dates on
  // another (services/dock.ts). A "channel" form sends like a popup's form.
  const props = defineProps<{
    title?: TranslatedModel
    subtitle?: TranslatedModel
    titleClass?: string
    subtitleClass?: string
    // the form's id
    form?: string
  }>()

  const { locale, feedbackEndpoint } = storeToRefs(useCommonStore())
  const lang = computed(() => (['uk', 'en', 'de'].includes(locale.value) ? locale.value : 'uk') as 'uk' | 'en' | 'de')
  const popupsStore = usePopupsStore()
  const form = computed(() => dock.form(props.form))

  const host: DockFormHost = {
    values: dockValues,
    set: setDockValue,
    dock,
    context: (values, month) => {
      const context = dockContext(lang.value, month ? { month } : {})
      return { ...context, values }
    },
    lang: () => lang.value,
    calendarLook: id => {
      const calendars = popupsStore.calendars as PopupCalendarModel[]
      return calendarProps(calendars.find(item => item.id === id) ?? calendars[0] ?? newCalendar('simple', '', 'form'))
    },
    fieldLook: id => fieldLookOf(popupsStore.fieldLooks as DockFieldLook[], id),
    report: reportDock,
    go: url => location.assign(url),
    send: message => sendFeedback(feedbackEndpoint.value, {
      kind: 'form',
      locale: lang.value,
      page: location.pathname,
      fields: { message },
    }),
  }
  provide(DOCK_FORM_HOST, host)
</script>

<template>
  <section class="pw-dock-block">
    <h2 v-if="title?.[lang]" :class="titleClass || 'h2 text-center mb-4'">{{ title[lang] }}</h2>
    <p v-if="subtitle?.[lang]" :class="subtitleClass || 'h3 text-center mb-5'">{{ subtitle[lang] }}</p>
    <DockFormView :form="form" />
  </section>
</template>

<style scoped>
.pw-dock-block {
  padding-block: 32px;
}
</style>
