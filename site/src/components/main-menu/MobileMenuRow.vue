<script setup lang="ts">
  import type { MobileMenuRow, MobileMenuStyle } from '../../configs/menu-style'
  import type { SocialNetwork } from '../../configs/social-networks'
  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'
  import { useSiteNavigation } from '../../composables/site-navigation'
  import { LOCALE_LABEL, rowStyle, translated } from '../../configs/menu-style'
  import { defaultSocialIcon, socialIconRef } from '../../configs/social-icons'
  import { SOCIAL_NETWORK_LABELS, SOCIAL_NETWORKS } from '../../configs/social-networks'
  import { useCommonStore } from '../../stores/common'
  import SocialIconImage from '../small/SocialIconImage.vue'
  import FeedbackPopup from '../template-components/FeedbackPopup.vue'
  import LocaleSwitcher from './LocaleSwitcher.vue'
  import MobileMenuList from './MobileMenuList.vue'

  // One row of the mobile menu panel (global.json menuStyle.mobile.rows).
  // The editor's UI Kit draws the same rows in its phone preview
  // (src/components/ui-kit/MobileMenuPreview.vue) - keep the two in step.
  const props = defineProps<{ row: MobileMenuRow, look: MobileMenuStyle }>()
  const emit = defineEmits<{ navigate: [] }>()

  const { company, locale, siteLocales } = storeToRefs(useCommonStore())
  const { switchLocale } = useSiteNavigation()

  const textAlign = computed(() => props.row.align === 'end' ? 'right' : (props.row.align === 'center' ? 'center' : 'left'))
  const logoSrc = computed(() => (props.row.lightLogo && company.value?.logoWhite) || company.value?.logo.src)
  const links = computed(() => (company.value?.links ?? {}) as Record<string, string>)
  const networks = computed(() => SOCIAL_NETWORKS.filter(name => links.value[name]))
  function socialIcon (name: SocialNetwork): string {
    return props.row.iconLook ? socialIconRef(name, props.row.iconLook) : defaultSocialIcon(name)
  }

  const formOpen = ref(false)

  // There are no accounts on this site, so the user row never shows here -
  // it is for a site where people sign in (the UI Kit shows a sample).
  const signedInUser = computed<{ name: string, avatar?: string } | null>(() => null)
</script>

<template>
  <div v-if="row.type === 'spacer'" class="mobile-menu-row mobile-menu-row--spacer" :style="rowStyle(row)" />

  <div v-else-if="row.type === 'divider'" class="mobile-menu-row mobile-menu-row--divider" :style="rowStyle(row)">
    <hr :style="{ borderColor: `var(--${row.color || 'light-grey-1'})` }">
  </div>

  <div v-else-if="row.type !== 'user' || signedInUser" class="mobile-menu-row" :style="rowStyle(row)">
    <img
      v-if="row.type === 'logo' && logoSrc"
      :alt="company?.name"
      class="mobile-menu-logo"
      :height="company?.logo.height"
      :src="logoSrc"
      :width="company?.logo.width"
    >

    <template v-else-if="row.type === 'locales'">
      <span v-if="row.localeLabel" :class="look.itemClass">{{ translated(LOCALE_LABEL, locale) }}</span>
      <div v-if="row.localeLook === 'dropdown'" class="mobile-menu-locale-dropdown">
        <LocaleSwitcher />
      </div>
      <div v-else class="mobile-menu-locales">
        <button
          v-for="code of siteLocales"
          :key="code"
          class="mobile-menu-locale"
          type="button"
          @click="switchLocale(code)"
        >
          <span :class="code === locale ? look.activeClass : look.itemClass">{{ code.toUpperCase() }}</span>
        </button>
      </div>
    </template>

    <MobileMenuList v-else-if="row.type === 'menu'" :align="textAlign" :look="look" @navigate="emit('navigate')" />

    <div v-else-if="row.type === 'social'" class="mobile-menu-social">
      <a
        v-for="name of networks"
        :key="name"
        :aria-label="SOCIAL_NETWORK_LABELS[name]"
        :href="links[name]"
        rel="noopener"
        target="_blank"
      >
        <SocialIconImage :color="row.iconColor" :icon="socialIcon(name)" :size="row.iconSize || 32" />
      </a>
    </div>

    <template v-else-if="row.type === 'contact'">
      <v-btn :class="row.buttonClass || 'primary-button'" @click="formOpen = true">
        {{ translated(row.label, locale) }}
      </v-btn>
      <FeedbackPopup v-model="formOpen" :text="row.form?.text" :title="row.form?.title" :type="row.form?.type" />
    </template>

    <div v-else-if="row.type === 'user' && signedInUser" class="mobile-menu-user">
      <v-avatar :image="signedInUser.avatar" size="40" />
      <span :class="look.userNameClass">{{ signedInUser.name }}</span>
    </div>
  </div>
</template>

<style scoped>
.mobile-menu-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: var(--row-align, flex-start);
  gap: 12px;
  padding: 12px 24px;
}
.mobile-menu-row--spacer {
  flex: 1 1 auto;
  min-height: 16px;
  padding: 0;
}
.mobile-menu-row--divider {
  padding: 4px 24px;
}
.mobile-menu-row--divider hr {
  width: 100%;
  margin: 0;
  border: none;
  border-top: solid 1px;
}
.mobile-menu-row span {
  margin: 0;
}
.mobile-menu-locales,
.mobile-menu-social,
.mobile-menu-user {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}
.mobile-menu-locale {
  border: none;
  background: none;
  padding: 4px;
  cursor: pointer;
}
.mobile-menu-locale-dropdown {
  margin-left: auto;
}
/* The theme hides the bar's language switcher on a phone - here it is the
   phone's own. */
.mobile-menu-locale-dropdown :deep(.desktop-lang-switcher) {
  display: block !important;
}
.mobile-menu-logo {
  display: block;
}
</style>
