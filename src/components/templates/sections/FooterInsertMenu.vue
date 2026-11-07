<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { computed } from 'vue'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { button } from '@/configs/components/simple/button'
  import { iconButton } from '@/configs/components/simple/icon-button'
  import { image } from '@/configs/components/simple/image'
  import { text } from '@/configs/components/simple/text'
  import { textWithIcon } from '@/configs/components/simple/text-with-icon'
  import { title } from '@/configs/components/simple/title'
  import { PAGE_LINKS_TYPE } from '@/configs/footer-blocks'
  import { t } from '@/i18n'
  import { emptyTranslatedModel } from '@/utils/locale-text'

  // What can go into a footer column. Same shape as FreeContentInsertMenu -
  // an id->factory list and one <v-menu> - because it does the same job; the
  // list differs, not the mechanism. The generic items reuse the very same
  // configs/components/simple/* factories the page-block menu uses, so a
  // text block inserted here is the same kind of thing as one inserted on a
  // page, with the same editors and the same formatting rules.
  //
  // "Відправити повідомлення" is deliberately absent: that component doesn't
  // exist in this editor yet (per the project owner), and FeedbackCard's own
  // call/message switch already covers both roles from one block.
  // Blocks that make no sense twice in one footer: there is one callback
  // card, one list of page links, one set of social icons, one contacts
  // list, one payment logo. `kind` is what marks them - the caller says
  // which kinds the footer already holds, and those disappear from the
  // menu rather than being offered and then quietly duplicating content.
  // The plain building blocks below (text, image...) have no kind: any
  // number of them is perfectly reasonable.
  const menuItems: { title: string, icon: string, kind?: string, factory: () => TemplateBlockModel }[] = [
    {
      get title () {
        return t('footer.insert.feedbackCard')
      },
      kind: 'feedback',
      icon: 'mdi-phone-in-talk',
      factory: () => ({ type: 'component', content: 'FeedbackCard', props: { type: 'call-request', title: emptyTranslatedModel(), text: emptyTranslatedModel() } }) as TemplateBlockModel,
    },
    {
      get title () {
        return t('common.listOfLinks')
      },
      kind: 'links',
      icon: 'mdi-link-variant',
      // Its own type - an empty type:'section' was never recognised as a
      // links list at all (the old shape check needed children to inspect),
      // so this menu item used to insert a block the editor then treated as
      // a plain group.
      factory: () => ({ type: PAGE_LINKS_TYPE, children: [] }) as TemplateBlockModel,
    },
    {
      get title () {
        return t('common.socialMediaIcons')
      },
      kind: 'icons',
      icon: 'mdi-share-variant',
      factory: () => ({ type: 'component', content: 'FooterIcons' }) as TemplateBlockModel,
    },
    {
      get title () {
        return t('footer.insert.contacts')
      },
      kind: 'contacts',
      icon: 'mdi-card-account-phone',
      // The id is what marks this section as the contacts list - see
      // FooterColumn.vue's own dispatch and FooterContacts.vue.
      factory: () => ({ type: 'section', id: 'footer-contacts-list', children: [] }) as TemplateBlockModel,
    },
    {
      get title () {
        return t('common.visaMastercardLogo')
      },
      kind: 'visa',
      icon: 'mdi-credit-card-outline',
      factory: () => ({ type: 'component', content: 'FooterVisaLogo' }) as TemplateBlockModel,
    },
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
    // A button leads to a page (or a block on it - the form on the contacts
    // page, say) or opens the feedback form in a popup (ButtonEditor.vue).
    { get title () {
      return t('common.button')
    }, icon: 'mdi-button-pointer', factory: () => button() as TemplateBlockModel },
    { get title () {
      return t('common.iconButton')
    }, icon: 'mdi-gesture-tap-button', factory: () => iconButton() as TemplateBlockModel },
  ]

  const props = defineProps<{
    // Kinds already present anywhere in this footer - see the menu list's
    // own comment. Whole-footer rather than per-column on purpose: a second
    // contacts list is just as wrong in the next column over.
    presentKinds?: string[]
  }>()

  const emit = defineEmits<{ insert: [block: TemplateBlockModel] }>()

  const availableItems = computed(() => menuItems.filter(
    item => !item.kind || !(props.presentKinds || []).includes(item.kind),
  ))
</script>

<template>
  <v-menu location="bottom center">
    <template #activator="{ props: menuProps }">
      <ToolbarIconButton v-bind="menuProps" icon="mdi-plus" :tooltip="t('footer.insert.addToColumn')" />
    </template>
    <v-card theme="editorTheme">
      <v-list>
        <v-list-item
          v-for="(item, index) of availableItems"
          :key="index"
          link
          :title="item.title"
          @click="emit('insert', item.factory())"
        >
          <template #append>
            <v-icon :icon="item.icon" size="x-small" />
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </v-menu>
</template>
