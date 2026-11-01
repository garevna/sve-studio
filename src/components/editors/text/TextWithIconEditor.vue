<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import ToolbarIconButton from '@/components/editors/ToolbarIconButton.vue'
  import { useEditorMode } from '@/composables/useEditorMode'
  import { defaultTextClass } from '@/configs/defaults/default-classes'
  import { resolveLink, SOCIAL_NETWORK_LABELS, SOCIAL_NETWORKS, socialLink, type SocialNetwork, socialNetworkOf } from '@/configs/social-networks'
  import { useAjaxStore } from '@/stores/ajax'
  import { linkHref } from '@/utils/link-href'
  import IconEditor from './IconEditor.vue'
  import TextEditor from './TextEditor.vue'

  defineProps<{
    // See TextFormatMenu.vue - folds block deletion into the icon/text
    // field's own format-menu fab, only when this whole component IS a
    // top-level page block.
    deletable?: boolean
    // The text is a contact's from the general settings (see TextEditor).
    readonly?: boolean
  }>()
  const emit = defineEmits<{ delete: [] }>()

  const icon = defineModel<string>('icon', { default: '' })
  const iconColor = defineModel<string>('iconColor', { default: 'grey' })
  const iconSize = defineModel<number>('iconSize', { default: 24 })
  const iconBackground = defineModel<string>('iconBackground', { default: '' })
  const text = defineModel<string>('text', { default: '' })
  const textClass = defineModel<string>('textClass', { default: defaultTextClass })
  // Where a click on the line leads (a social network, a phone, an email) -
  // set with the link button beside the text, opened by the site.
  const link = defineModel<string>('link', { default: '' })

  const { t } = useI18n()
  const mode = useEditorMode()
  const linkOpen = ref(false)
  const linkDraft = ref('')
  // A social network or messenger is not typed in: it is picked, and the
  // line keeps only a reference ("social:viber") to its address in the
  // general settings - one source, nothing left behind when it changes.
  // See configs/social-networks.ts.
  const networkDraft = ref<SocialNetwork | null>(null)
  const globalLinks = ref<Record<string, string>>({})
  const ajaxStore = useAjaxStore()
  async function loadGlobalLinks () {
    globalLinks.value = (await ajaxStore.getGlobalSettings())?.links || {}
  }
  const networks = computed(() => SOCIAL_NETWORKS.filter(name => globalLinks.value[name]))
  const linkNetwork = computed(() => socialNetworkOf(link.value))
  const linkTooltip = computed(() => {
    if (linkNetwork.value) return t('textWithIcon.networkLink', { network: SOCIAL_NETWORK_LABELS[linkNetwork.value] })
    return link.value || t('textWithIcon.link')
  })
  function openLink () {
    loadGlobalLinks()
    networkDraft.value = socialNetworkOf(link.value)
    linkDraft.value = networkDraft.value ? '' : (link.value || '')
    linkOpen.value = true
  }
  function pickNetwork (name: SocialNetwork) {
    networkDraft.value = networkDraft.value === name ? null : name
    if (networkDraft.value) linkDraft.value = ''
  }
  function onOwnAddress (value: string) {
    linkDraft.value = value
    if (value) networkDraft.value = null
  }
  function saveLink () {
    link.value = networkDraft.value ? socialLink(networkDraft.value) : linkHref(linkDraft.value)
    linkOpen.value = false
  }
  function removeLink () {
    link.value = ''
    linkOpen.value = false
  }

  // Production's own TextWithIcon.vue sizes this column to just the bare
  // icon size (grid-template-columns: v-bind(iconSize) 1fr), but IconEditor
  // (like production's own IconVariant.vue) actually renders a background
  // circle at size+32, not the bare size - so whenever a background is set,
  // production's own grid column is undersized and the circle overflows
  // into the text, crowding it. Reserving the real rendered width here is a
  // deliberate, requested divergence from that (buggy) production spacing,
  // not a fidelity slip - see IconEditor.vue's own "backSize" for the
  // matching +32 formula.
  const iconColumnWidth = computed(() => {
    const size = iconSize.value || 24
    return (iconBackground.value ? size + 32 : size) + 'px'
  })
</script>

<template>
  <div :class="['text-with-icon', { 'text-with-icon--editing': mode === 'edit' }]">
    <!-- Icon color/size/background/glyph are fully self-contained here -
      click the icon to open IconEditor's own dialog. TextEditor's own
      format panel used to also expose an icon-color picker (parentType
      'icon' swapped its color control to write iconColor instead of the
      text's own class) - removed as a real bug, not a design choice: it
      silently repainted the icon whenever someone picked a "text color"
      there, and duplicated a control IconEditor already owns completely. -->
    <IconEditor
      v-model:icon="icon"
      v-model:icon-background="iconBackground"
      v-model:icon-color="iconColor"
      v-model:icon-size="iconSize"
    />

    <TextEditor
      v-model:class="textClass"
      v-model:content="text"
      :deletable="deletable"
      parent-type="icon"
      :readonly="readonly"
      type="text"
      @delete="emit('delete')"
    />
    <template v-if="mode === 'edit'">
      <ToolbarIconButton
        :active="!!link"
        class="text-with-icon-link"
        icon="mdi-link-variant"
        :tooltip="linkTooltip"
        @click="openLink"
      />
      <v-dialog v-model="linkOpen" max-width="460">
        <v-card theme="editorTheme" :title="t('textWithIcon.link')">
          <v-card-text>
            <p class="text-with-icon-link-label">{{ t('textWithIcon.fromSettings') }}</p>
            <div v-if="networks.length > 0" class="text-with-icon-networks">
              <v-chip
                v-for="name of networks"
                :key="name"
                :color="networkDraft === name ? 'primary' : undefined"
                :title="globalLinks[name]"
                :variant="networkDraft === name ? 'flat' : 'tonal'"
                @click="pickNetwork(name)"
              >
                {{ SOCIAL_NETWORK_LABELS[name] }}
              </v-chip>
            </div>
            <p v-else class="text-with-icon-link-note">{{ t('textWithIcon.noNetworks') }}</p>
            <p v-if="networkDraft" class="text-with-icon-link-note">{{ resolveLink(socialLink(networkDraft), globalLinks) }}</p>
            <p class="text-with-icon-link-label mt-4">{{ t('textWithIcon.ownAddress') }}</p>
            <v-text-field
              :hint="t('textWithIcon.linkHint')"
              :model-value="linkDraft"
              persistent-hint
              placeholder="https://…"
              variant="outlined"
              @keyup.enter="saveLink"
              @update:model-value="onOwnAddress"
            />
          </v-card-text>
          <v-card-actions>
            <v-btn v-if="link" color="error" variant="text" @click="removeLink">{{ t('textWithIcon.removeLink') }}</v-btn>
            <v-spacer />
            <v-btn variant="text" @click="linkOpen = false">{{ t('common.cancel') }}</v-btn>
            <v-btn color="primary" variant="flat" @click="saveLink">OK</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </div>
</template>

<style scoped>
.text-with-icon-link-label {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: #3a4a58;
}
.text-with-icon-networks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.text-with-icon-link-note {
  margin: 6px 0 0;
  font-size: 12px;
  color: #7a8699;
  overflow-wrap: anywhere;
}
.text-with-icon {
  display: grid;
  grid-template-columns: v-bind(iconColumnWidth) 1fr;
  column-gap: 16px;
  align-content: center;
}

.text-with-icon--editing {
  grid-template-columns: v-bind(iconColumnWidth) 1fr auto;
}
.text-with-icon img {
  vertical-align: middle;
}
</style>
