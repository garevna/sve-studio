<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { ref } from 'vue'
  import ContactLineMenu from '@/components/editors/ContactLineMenu.vue'
  import SocialLinkMenu from '@/components/editors/SocialLinkMenu.vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { cardWithIconRowTemplate } from '@/configs/components/cards/card-with-icon'
  import { tabsTemplate } from '@/configs/components/cards/tabs'
  import { feedbackForm } from '@/configs/components/feedback-form'
  import { button } from '@/configs/components/simple/button'
  import { header } from '@/configs/components/simple/header'
  import { iconButton } from '@/configs/components/simple/icon-button'
  import { image } from '@/configs/components/simple/image'
  import { text } from '@/configs/components/simple/text'
  import { textWithIcon } from '@/configs/components/simple/text-with-icon'
  import { title } from '@/configs/components/simple/title'
  import { swiperWithImagesTemplate } from '@/configs/components/swiper-with-images'
  import { swiperWithThumbnailsTemplate } from '@/configs/components/swiper-with-thumbnails'
  import { t } from '@/i18n'

  // Scoped insert menu for one half of a "Довільний контент" section -
  // deliberately NOT reusing InsertPageBlock.vue (that one is hardwired to
  // the page's own top-level `blocks` array, plus page-menu-specific chrome
  // like the nav-drawer width/parallax-dedup logic that don't apply here).
  // Owns its own id->factory mapping instead of configs/index.ts's
  // `components` map, since that map's keys live in menu-id space
  // ('image-universal', 'carousel-with-images', 'carousel-with-preview'),
  // which diverges from the actual block `type` space this feature cares
  // about ('image', 'slider-with-images', 'swiper') - re-deriving that
  // mapping at every call site would be fragile.
  // configs/components/simple/*.ts factories return plain object literals
  // with no declared return type (matching the existing convention in
  // configs/index.ts, where the cast also happens at the call site - see
  // EditorView.vue's `components[item.id]() as TemplateBlockModel`).
  const menuItems: { title: string, icon: string, factory: () => TemplateBlockModel }[] = [
    { get title () {
      return t('common.header')
    }, icon: 'mdi-page-layout-header', factory: () => header() as TemplateBlockModel },
    { get title () {
      return t('common.subtitle')
    }, icon: 'mdi-subtitles-outline', factory: () => title() as TemplateBlockModel },
    { get title () {
      return t('common.text')
    }, icon: 'mdi-text-long', factory: () => text() as TemplateBlockModel },
    { get title () {
      return t('common.textWithIcon')
    }, icon: 'mdi-image-text', factory: () => textWithIcon() as TemplateBlockModel },
    { get title () {
      return t('elements.image')
    }, icon: 'mdi-image', factory: () => image() as TemplateBlockModel },
    { get title () {
      return t('elements.cardsWithIcon')
    }, icon: 'mdi-card-text-outline', factory: cardWithIconRowTemplate },
    { get title () {
      return t('common.tabs')
    }, icon: 'mdi-tab', factory: tabsTemplate },
    { get title () {
      return t('common.button')
    }, icon: 'mdi-button-pointer', factory: () => button() as TemplateBlockModel },
    { get title () {
      return t('common.iconButton')
    }, icon: 'mdi-gesture-tap-button', factory: () => iconButton() as TemplateBlockModel },
    { get title () {
      return t('elements.imageCarousel')
    }, icon: 'mdi-camera-burst', factory: swiperWithImagesTemplate },
    { get title () {
      return t('elements.thumbsCarousel')
    }, icon: 'mdi-view-gallery', factory: swiperWithThumbnailsTemplate },
    { get title () {
      return t('common.feedbackForm')
    }, icon: 'mdi-email-edit-outline', factory: () => feedbackForm() as TemplateBlockModel },
  ]

  const emit = defineEmits<{ insert: [block: TemplateBlockModel] }>()

  // Stays open while the social-network submenu is picked from.
  const open = ref(false)
  function selectItem (item: typeof menuItems[number]) {
    emit('insert', item.factory())
    open.value = false
  }
  function insertSocial (block: TemplateBlockModel) {
    emit('insert', block)
    open.value = false
  }
</script>

<template>
  <v-menu v-model="open" :close-on-content-click="false" location="bottom center">
    <template #activator="{ props: menuProps }">
      <ToolbarIconButton v-bind="menuProps" icon="mdi-plus" :tooltip="t('elements.add')" />
    </template>
    <v-card theme="editorTheme">
      <v-list>
        <v-list-item
          v-for="(item, index) of menuItems"
          :key="index"
          link
          :title="item.title"
          @click="selectItem(item)"
        >
          <template #append>
            <v-icon :icon="item.icon" size="x-small" />
          </template>
        </v-list-item>
        <!-- A ready line: icon, name and the address from the settings. -->
        <!-- A contact from the general settings. -->
        <ContactLineMenu @insert="insertSocial">
          <template #activator="{ props: contactProps }">
            <v-list-item v-bind="contactProps" link :title="t('contacts.menu')">
              <template #append>
                <v-icon icon="mdi-card-account-phone-outline" size="x-small" />
              </template>
            </v-list-item>
          </template>
        </ContactLineMenu>
        <SocialLinkMenu @insert="insertSocial">
          <template #activator="{ props: socialProps }">
            <v-list-item v-bind="socialProps" link :title="t('socialLinks.menu')">
              <template #append>
                <v-icon icon="mdi-share-variant" size="x-small" />
              </template>
            </v-list-item>
          </template>
        </SocialLinkMenu>
      </v-list>
    </v-card>
  </v-menu>
</template>
