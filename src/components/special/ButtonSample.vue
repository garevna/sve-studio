<script setup lang="ts">
  import { computed } from 'vue'
  import googleIcon from '@/assets/google-icon.svg'
  import ButtonIcon from '@/components/editors/icon/ButtonIcon.vue'
  import { templateOf } from '@/configs/button-catalog'
  import { t } from '@/i18n'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'
  import { APP_THEME_NAME, themeClass } from '@/utils/vuetify-theme-names'

  // A sample of one of the client's buttons (or of a kind in the catalogue),
  // drawn the way the site draws that kind: a text button, a sign-in button
  // with its logo (site AuthPage.vue), an icon button (site TemplateItem.vue).
  // Under the edited site's own scope and theme, so its CSS is the site's.
  const props = withDefaults(defineProps<{
    className: string
    template: string
    // the class that shows the hover look without the mouse
    extraClass?: string | Record<string, boolean>
    disabled?: boolean
    // a text button carries the sample icon (kinds built around one)
    label?: string
    small?: boolean
  }>(), { label: '' })

  const kind = computed(() => templateOf(props.template))
  const text = computed(() => props.label || t('common.button'))
</script>

<template>
  <v-theme-provider :theme="APP_THEME_NAME">
    <span :class="['button-sample', EDITED_APP_SCOPE_CLASS, themeClass(APP_THEME_NAME), { 'button-sample--small': props.small }]">
      <!-- The sign-in page's buttons are plain <button>s. -->
      <button
        v-if="kind.sample === 'google' || kind.sample === 'github'"
        :class="[props.className, props.extraClass]"
        :disabled="props.disabled"
        tabindex="-1"
        type="button"
      >
        <img
          v-if="kind.sample === 'google'"
          alt=""
          height="22"
          :src="googleIcon"
          width="22"
        >
        <i v-else aria-hidden="true" class="mdi mdi-github" />
        <template v-if="!props.small">{{ t(kind.name) }}</template>
      </button>
      <button
        v-else-if="kind.sample === 'icon'"
        :class="[props.className, props.extraClass]"
        :disabled="props.disabled"
        tabindex="-1"
        type="button"
      >
        <v-icon color="primary" icon="mdi-heart-outline" :size="props.small ? 20 : 32" />
      </button>
      <v-btn
        v-else
        :class="[props.className, props.extraClass]"
        :disabled="props.disabled"
        tabindex="-1"
        tag="span"
      >
        <ButtonIcon v-if="kind.needsIcon" icon="mdi-arrow-right" />
        {{ props.small ? 'Aa' : text }}
      </v-btn>
    </span>
  </v-theme-provider>
</template>

<style scoped>
.button-sample {
  display: block;
  width: 100%;
}
/* The set's own padding is a full-size button's - a sample this small
   would push its label off the middle. */
.button-sample--small :deep(.v-btn),
.button-sample--small :deep(button) {
  height: 26px !important;
  min-height: 0 !important;
  padding: 0 8px !important;
  font-size: 12px !important;
}
.button-sample--small :deep(button) {
  width: auto;
}
</style>
