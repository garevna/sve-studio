<script setup lang="ts">
  import type { SiteStyle, SiteStylePart } from '@/configs/site-style'
  import { SveIconButton, SveMenu, SveMenuDivider, SveMenuLabel, SveSegmented } from '@sve/editor-ui'
  import { computed, onMounted } from 'vue'
  import SiteStyleIcon from '@/components/special/SiteStyleIcon.vue'
  import { useSiteStyle } from '@/composables/useSiteStyle'
  import { SITE_STYLE_PARTS, SITE_STYLES } from '@/configs/site-style'
  import { t } from '@/i18n'

  // The site's style - «Класика», «Штрих», «Хвиля», «Неон»
  // (configs/site-style.ts) - on the top bar of every screen of the Верф
  // (addTopBarItem, app/plugins/02.editor.client.ts): it is the whole site's,
  // not one page's. One style for all of it, and below, each part either
  // following it or wearing a style of its own (a client who likes the wave
  // footer and the classic cards mixes them). Saved at once (useSiteStyle).
  // Its own icon (SiteStyleIcon, a brush on a page) - the Верф's own look
  // next to it has another (SveLookIcon). Its name and the current style are
  // the button's tooltip, as on every top-bar button.
  //
  // The rows are several choices in a row, so a click inside does not close
  // the menu (SveMenu closes on a click in its content).

  const siteStyle = useSiteStyle()
  onMounted(() => void siteStyle.load())

  const styleOptions = computed(() => SITE_STYLES.map(value => ({ value, label: t(`kit.siteStyles.${value}`) })))
  // 'site': the part follows the site's style
  const partOptions = computed(() => [
    { value: 'site', label: t('kit.siteStyleFollow'), title: t('kit.siteStyleFollowHint', { style: t(`kit.siteStyles.${siteStyle.style.value}`) }) },
    ...styleOptions.value,
  ])

  function partValue (part: SiteStylePart): string {
    return siteStyle.parts.value[part] ?? 'site'
  }
  function setPart (part: SiteStylePart, value: string | undefined) {
    if (!value) return
    void siteStyle.setPart(part, value === 'site' ? null : value as SiteStyle)
  }
  function setSite (value: SiteStyle | undefined) {
    if (!value) return
    void siteStyle.set(value)
  }
</script>

<template>
  <SveMenu location="bottom end" :min-width="320">
    <template #activator="{ props: menuProps }">
      <SveIconButton :label="`${t('kit.siteStyle')}: ${t(`kit.siteStyles.${siteStyle.style.value}`)}`" v-bind="menuProps">
        <SiteStyleIcon />
      </SveIconButton>
    </template>

    <div class="site-style-menu" @click.stop>
      <SveMenuLabel>{{ t('kit.siteStyle') }}</SveMenuLabel>
      <SveSegmented :model-value="siteStyle.style.value" :options="styleOptions" @update:model-value="setSite" />

      <SveMenuDivider />
      <SveMenuLabel>{{ t('kit.siteStyleParts') }}</SveMenuLabel>
      <div v-for="part of SITE_STYLE_PARTS" :key="part" class="site-style-menu-part">
        <span class="site-style-menu-part-name">{{ t(`kit.siteStylePart.${part}`) }}</span>
        <SveSegmented :model-value="partValue(part)" :options="partOptions" @update:model-value="value => setPart(part, value)" />
      </div>
      <p class="site-style-menu-hint">{{ t('kit.siteStyleHint') }}</p>
    </div>
  </SveMenu>
</template>

<style scoped>
.site-style-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 8px 8px;
  max-width: min(400px, calc(100vw - 24px));
}
.site-style-menu-part {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.site-style-menu-part-name {
  font-size: 0.8rem;
  font-weight: 600;
}
.site-style-menu-hint {
  margin: 4px 0 0;
  font-size: 0.75rem;
  color: #7A8699;
}
</style>
