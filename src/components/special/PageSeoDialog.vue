<script setup lang="ts">
  /* eslint-disable vue/no-mutating-props -- `seo` is deliberately a live
     reference into the caller's own object, edited in place: that's this
     project's convention for every block/settings editor (see
     FooterEditor.vue, CardContainerActions.vue, FaqBlockActions.vue), and
     it's what lets the page editor's autosave pick these edits up without
     an extra round of emits. */
  import type { EditorMode } from '@/composables/useEditorMode'
  import type { PageSeoModel } from '@/types/TemplateBlockModel'
  import { computed, ref, toRaw, watch } from 'vue'
  import ImageEditor from '@/components/editors/ImageEditor.vue'
  import { provideEditorMode } from '@/composables/useEditorMode'
  import { t } from '@/i18n'

  // One page's own SEO fields, edited in place. Extracted out of
  // EditorView.vue because the SEO role reaches these from the pages list
  // instead - that role has no reason to open the page editor at all (it
  // can't touch content, and none of these fields shows up in the preview
  // window), so the list carries its own "SEO" button per row.
  //
  // `seo` is a live reference into whatever object the caller owns - the
  // block editor's own store content, or a page the list just fetched -
  // mutated in place, same convention as every other editor here. Which of
  // the two save workflows applies is the caller's call, not this
  // component's: see `saveable`.
  const props = defineProps<{
    seo: PageSeoModel
    // true  - this dialog is the only place these edits can be published
    //         from, so it shows "Зберегти" and emits `save`.
    // false - the caller has its own page-level save bar and these fields
    //         ride its autosave/publish flow; "Готово" just closes.
    saveable?: boolean
    saving?: boolean
    // The page's own `id` - its folder under content/images in dev.
    pageId?: string
  }>()
  const emit = defineEmits<{ save: [] }>()

  const open = defineModel<boolean>({ default: false })

  // "Скасувати" has to actually undo, not just close: the fields below are
  // bound straight to the caller's own object, so by the time the dialog is
  // closed the edits are already in it. Snapshotting on open is enough -
  // nothing else writes to this object while the dialog is up.
  let snapshot: PageSeoModel = {}
  watch(open, isOpen => {
    if (isOpen) snapshot = structuredClone(toRaw(props.seo))
  }, { immediate: true })

  function cancel () {
    for (const key of Object.keys(props.seo) as (keyof PageSeoModel)[]) {
      delete props.seo[key]
    }
    Object.assign(props.seo, structuredClone(snapshot))
    open.value = false
  }

  // The same picture control as everywhere else; it uploads into the
  // page's own folder. The dialog can be opened from the pages list, where
  // nothing is in edit mode - here it always is.
  provideEditorMode(computed<EditorMode>(() => 'edit'))
  const ogImageBox = ref(150)
</script>

<template>
  <v-dialog v-model="open" max-width="560">
    <v-card theme="editorTheme" :title="t('pages.seoOfPage')">
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-4">
          {{ t('seo.pageIntro') }}
        </p>
        <v-text-field
          v-model="seo.title"
          class="mb-2"
          :counter="60"
          :hint="t('seo.pageTitleHint')"
          :label="t('seo.pageTitle')"
          persistent-hint
          variant="outlined"
        />
        <v-text-field
          v-model="seo.description"
          class="mt-4 mb-2"
          :counter="160"
          :hint="t('seo.pageDescriptionHint')"
          :label="t('seo.pageDescription')"
          persistent-hint
          variant="outlined"
        />

        <p class="seo-field-label mt-4 mb-2">{{ t('seo.pageImage') }}</p>
        <div class="seo-og-image">
          <ImageEditor v-model:height="ogImageBox" v-model:src="seo.ogImage" fit="contain" :folder="pageId" />
        </div>

        <v-switch
          v-model="seo.noindex"
          class="mt-4"
          color="primary"
          hide-details
          inset
          :label="t('seo.noindex')"
        />
      </v-card-text>

      <!-- Two shapes, one per workflow. Editing page CONTENT is deliberately
        staged: every change autosaves to IndexedDB only, so the result can
        be checked in the preview window before "Зберегти" publishes it - and
        in that context these fields ride the same flow, hence a plain
        "Готово" that only closes.

        SEO metadata has no such staging step to be useful for: none of it
        shows up in the preview window (it's meta tags, not layout), so there
        is nothing to look at between changing a value and publishing it.
        Where this dialog is the only way in (the pages list, for the SEO
        role), it publishes directly. -->
      <v-card-actions>
        <v-spacer />
        <v-btn
          v-if="saveable"
          prepend-icon="mdi-undo"
          variant="text"
          @click="cancel"
        >
          {{ t('common.cancel') }}
        </v-btn>
        <v-btn
          v-if="saveable"
          color="primary"
          :loading="saving"
          prepend-icon="mdi-content-save"
          variant="elevated"
          @click="emit('save')"
        >
          {{ saving ? t('common.saving') : t('common.save') }}
        </v-btn>
        <v-btn v-else color="primary" variant="elevated" @click="open = false">{{ t('common.ok') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.seo-field-label {
  font-size: 0.9rem;
  color: #7A8699;
}
/* 1200×630 is the shape social networks show. */
.seo-og-image {
  width: 286px;
  max-width: 100%;
}
</style>
