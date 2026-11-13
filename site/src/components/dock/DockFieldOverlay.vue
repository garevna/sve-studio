<script setup lang="ts">
  import type { DockFieldLook } from '@sve/dock'
  import { openedLook } from '@sve/dock'
  import { computed } from 'vue'
  import { useDisplay } from 'vuetify'
  import { VBottomSheet, VDialog, VMenu } from 'vuetify/components'
  import { useDockFormScope } from './dock-form-host'

  // What opens from a docking form's element (the calendar, the counters),
  // in the look's "opened" way (UI Kit "Елементи форми"):
  //   dropdown - a panel under the field;
  //   dialog   - a window over the page;
  //   sheet    - from the bottom of a phone's screen (a panel elsewhere);
  //   inline   - right inside the form, under the field, pushing on.
  // The field itself is the activator slot; the panel's content the default.
  //
  // NOTE: the editor's copy is src/components/dock/DockFieldOverlay.vue -
  // keep the two identical.
  const props = defineProps<{ look: DockFieldLook, maxWidth?: number }>()
  const open = defineModel<boolean>({ default: false })
  const scope = useDockFormScope()
  const { smAndDown } = useDisplay()
  const lang = computed(() => scope.lang() as 'uk' | 'en' | 'de')
  const DONE = { uk: 'Готово', en: 'Done', de: 'Fertig' } as const

  const variant = computed(() => props.look.opened.variant)
  const panel = computed(() => openedLook(props.look))
  const shell = computed(() => {
    if (variant.value === 'dialog') {
      return VDialog
    }
    return variant.value === 'sheet' && smAndDown.value ? VBottomSheet : VMenu
  })
  const shellProps = computed(() => {
    if (shell.value === VMenu) {
      return { closeOnContentClick: false, location: 'bottom start' as const, maxWidth: props.maxWidth }
    }
    return shell.value === VDialog ? { maxWidth: props.maxWidth ?? 420 } : {}
  })
  function toggle () {
    open.value = !open.value
  }
</script>

<template>
  <!-- inline: the field and its panel are both the form's own items -->
  <div v-if="variant === 'inline'" class="pw-dock__inline">
    <slot name="activator" :props="{ onClick: toggle, 'aria-expanded': open }" />
    <v-expand-transition>
      <div v-if="open" :class="panel.class" :style="panel.style">
        <slot />
        <div v-if="look.opened.done" class="pw-dock__panel-done">
          <v-btn class="primary-button" @click="open = false">{{ DONE[lang] }}</v-btn>
        </div>
      </div>
    </v-expand-transition>
  </div>
  <component
    :is="shell"
    v-else
    v-model="open"
    :content-class="scope.overlayClass"
    v-bind="shellProps"
  >
    <template #activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps" />
    </template>
    <v-theme-provider :theme="scope.overlayTheme">
      <div :class="panel.class" :style="panel.style">
        <slot />
        <div v-if="look.opened.done" class="pw-dock__panel-done">
          <v-btn class="primary-button" @click="open = false">{{ DONE[lang] }}</v-btn>
        </div>
      </div>
    </v-theme-provider>
  </component>
</template>
