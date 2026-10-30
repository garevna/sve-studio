<script setup lang="ts">
  import type { TemplateBlockModel } from '@/types/TemplateBlockModel'
  import { SveSegmented, SveSheet, SveTextField } from '@sve/editor-ui'
  import { computed, ref, watch } from 'vue'
  import { usePageBlocks } from '@/composables/usePageBlocks'
  import { components } from '@/configs'
  import { BLOCK_DESCRIPTIONS, BLOCK_EXAMPLES } from '@/configs/block-gallery'
  import { image } from '@/configs/components/simple/image'
  import { listOfComponents } from '@/configs/nav-panel-menu'
  import { useCommonStore } from '@/stores/common'
  import { gallerySample } from '@/utils/block-gallery-sample'
  import BlockGalleryThumb from './BlockGalleryThumb.vue'

  // The blocks that can be added to a page, each shown as itself - a live
  // miniature in the site's own colours and fonts, not an icon. Grouped by
  // kind, with a search. On a wide screen it stands beside the page; on a
  // phone it slides up and the blocks are swiped through one by one.
  //
  // Two views, as in a file manager: previews (a picture and a line about
  // each block) or a list (icon, name and that line - many more at a
  // glance). The choice is remembered in this browser.
  //
  // Where the picked block goes is decided before it opens: by the "+"
  // between two blocks of the page, or the end of the page (usePageBlocks).
  const emit = defineEmits<{ select: [id: string] }>()

  const commonStore = useCommonStore()
  const pageBlocks = usePageBlocks()
  const open = pageBlocks.galleryOpen

  type GalleryItem = { id: string, title: string, icon: string, description: string, group: string, groupId: string, implemented?: boolean }
  const ITEMS: GalleryItem[] = listOfComponents.flatMap(group => (group.children ?? []).map(child => ({
    id: String(child.id),
    title: String(child.title ?? ''),
    icon: String(child.icon ?? 'mdi-shape-outline'),
    description: BLOCK_DESCRIPTIONS[String(child.id)] ?? '',
    group: group.title,
    groupId: group.id,
    implemented: (child as { implemented?: boolean }).implemented,
  })))
  const GROUPS = listOfComponents.map(group => ({ value: group.id, label: group.title }))

  type View = 'previews' | 'list'
  const VIEW_KEY = 'sve-block-gallery-view'
  function storedView (): View {
    try {
      return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'previews'
    } catch {
      return 'previews'
    }
  }
  const view = ref<View>(storedView())
  watch(view, value => {
    try {
      localStorage.setItem(VIEW_KEY, value)
    } catch {
      // not remembered - still switched for now
    }
  })

  const query = ref('')
  const group = ref<string | null>(null)
  watch(open, value => {
    if (value) {
      query.value = ''
    }
  })

  const shown = computed(() => {
    const text = query.value.trim().toLowerCase()
    return ITEMS.filter(item => (group.value === null || item.groupId === group.value)
      && (!text || `${item.group} ${item.title} ${item.description}`.toLowerCase().includes(text)))
  })

  // Each block's pictures, made once: the block the picker inserts (or, for
  // a block whose content is up to the user, a few examples of it), with
  // sample texts and photos in place of the empty ones.
  const samples = new Map<string, TemplateBlockModel[]>()
  function sample (id: string): TemplateBlockModel[] {
    if (!samples.has(id)) {
      const examples = BLOCK_EXAMPLES[id]
      const make = id === 'image-desktop-mobile' ? () => image() : components[id as keyof typeof components]
      const blocks = examples ? examples() : (make ? [make() as TemplateBlockModel] : [])
      samples.set(id, blocks.map(block => gallerySample(block)))
    }
    return samples.get(id) ?? []
  }

  // One per page: the hero, the FAQ and "Популярні напрямки" (they are
  // found on the page by kind, a second one would never be drawn).
  function onPage (test: (block: TemplateBlockModel) => boolean): boolean {
    return commonStore.dynamicPageContent?.blocks.some(block => test(block)) ?? false
  }
  function unavailable (item: GalleryItem): string | null {
    if (item.implemented === false) return 'Ще в розробці'
    if (item.id === 'parallax' && onPage(block => block.type === 'parallax')) return 'Вже є на сторінці'
    if (item.id === 'faq' && onPage(block => block.type === 'component' && block.content === 'FAQ')) return 'Вже є на сторінці'
    if (item.id === 'popular-destinations' && onPage(block => block.type === 'component' && block.content === 'PopularDestinationsTheme2')) return 'Вже є на сторінці'
    return null
  }

  function pick (item: GalleryItem) {
    if (!unavailable(item)) {
      emit('select', item.id)
    }
  }

  const where = computed(() => {
    const before = pageBlocks.insertBefore.value
    if (pageBlocks.insertPosition.value === null || !before) return 'У кінець сторінки'
    return `Перед «${before.label.replace(/^\d+\.\s*/, '')}»`
  })
</script>

<template>
  <SveSheet v-model="open" size="lg" :subtitle="where" title="Додати блок">
    <div class="block-gallery">
      <div class="block-gallery__search">
        <SveTextField v-model="query" placeholder="Пошук: картки, галерея, текст…" />
        <SveSegmented
          v-model="view"
          :options="[
            { value: 'previews', icon: 'mdi-view-agenda-outline', title: 'Превʼю' },
            { value: 'list', icon: 'mdi-format-list-bulleted', title: 'Список' },
          ]"
        />
      </div>
      <div class="sve-ui block-gallery__groups" role="tablist">
        <div
          :aria-selected="group === null"
          :class="['block-gallery__group', { 'block-gallery__group--active': group === null }]"
          role="tab"
          tabindex="0"
          @click="group = null"
          @keydown.enter.prevent="group = null"
        >
          Усі
        </div>
        <div
          v-for="item of GROUPS"
          :key="item.value"
          :aria-selected="group === item.value"
          :class="['block-gallery__group', { 'block-gallery__group--active': group === item.value }]"
          role="tab"
          tabindex="0"
          @click="group = item.value"
          @keydown.enter.prevent="group = item.value"
        >
          {{ item.label }}
        </div>
      </div>

      <div v-if="shown.length > 0 && view === 'previews'" class="block-gallery__items">
        <div
          v-for="item of shown"
          :key="item.id"
          :aria-disabled="!!unavailable(item) || undefined"
          :class="['block-gallery__card', { 'block-gallery__card--off': unavailable(item) }]"
          role="button"
          tabindex="0"
          :title="unavailable(item) || `Додати: ${item.group} · ${item.title}`"
          @click="pick(item)"
          @keydown.enter.prevent="pick(item)"
        >
          <BlockGalleryThumb
            v-if="sample(item.id).length > 0"
            :blocks="sample(item.id)"
            class="block-gallery__thumb"
            :page-width="item.groupId === 'simple' ? 560 : 1200"
          />
          <div class="block-gallery__caption">
            <span class="block-gallery__group-name">{{ item.group }}</span>
            <span class="block-gallery__title">{{ item.title }}</span>
            <span v-if="item.description" class="block-gallery__description">{{ item.description }}</span>
            <span v-if="unavailable(item)" class="block-gallery__note">{{ unavailable(item) }}</span>
          </div>
        </div>
      </div>
      <div v-else-if="shown.length > 0" class="block-gallery__list">
        <div
          v-for="item of shown"
          :key="item.id"
          :aria-disabled="!!unavailable(item) || undefined"
          :class="['block-gallery__row', { 'block-gallery__row--off': unavailable(item) }]"
          role="button"
          tabindex="0"
          :title="unavailable(item) || `Додати: ${item.group} · ${item.title}`"
          @click="pick(item)"
          @keydown.enter.prevent="pick(item)"
        >
          <span class="block-gallery__row-icon"><i :class="['sve-icon mdi', item.icon]" /></span>
          <span class="block-gallery__row-text">
            <span class="block-gallery__title">
              {{ item.title }}
              <span class="block-gallery__row-group">· {{ item.group }}</span>
            </span>
            <span class="block-gallery__description">{{ unavailable(item) || item.description }}</span>
          </span>
        </div>
      </div>
      <p v-else class="block-gallery__empty">Нічого не знайдено</p>
    </div>
  </SveSheet>
</template>

<style scoped>
.block-gallery { display: flex; flex-direction: column; gap: 12px; }

/* kinds of blocks: one row of chips, scrolled sideways when it does not fit */
.block-gallery__groups {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  margin: 0 -10px;
  padding: 0 10px 2px;
}
.block-gallery__group {
  flex: none;
  padding: 6px 12px;
  border-radius: 999px;
  border: solid 1px var(--sve-border);
  background: var(--sve-surface);
  color: var(--sve-text-muted);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}
.block-gallery__group:hover { color: var(--sve-text); border-color: var(--sve-border-strong); }
.block-gallery__group--active,
.block-gallery__group--active:hover { background: var(--sve-primary); border-color: var(--sve-primary); color: var(--sve-on-primary); }

.block-gallery__items { display: flex; flex-direction: column; gap: 14px; }
.block-gallery__card {
  display: flex;
  flex-direction: column;
  border: solid 1px var(--sve-border);
  border-radius: var(--sve-radius-lg);
  background: var(--sve-surface);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease;
}
.block-gallery__card:hover,
.block-gallery__card:focus-visible {
  outline: none;
  border-color: var(--sve-primary);
  box-shadow: 0 0 0 3px var(--sve-focus);
}
.block-gallery__card--off { cursor: not-allowed; }
.block-gallery__card--off .block-gallery__thumb { opacity: 0.35; filter: grayscale(1); }
.block-gallery__card--off:hover { border-color: var(--sve-border); box-shadow: none; }
.block-gallery__thumb { height: 170px; border-bottom: solid 1px var(--sve-border); }
.block-gallery__caption { display: flex; flex-direction: column; gap: 2px; padding: 10px 14px 12px; }
.block-gallery__group-name { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sve-text-subtle); }
.block-gallery__title { font-size: 14px; font-weight: 600; color: var(--sve-text); }
.block-gallery__note { font-size: 12px; color: var(--sve-warning); }
.block-gallery__description { font-size: 12.5px; line-height: 1.4; color: var(--sve-text-muted); }

.block-gallery__search { display: flex; align-items: flex-end; gap: 8px; }
.block-gallery__search > :first-child { flex: 1 1 auto; }

/* the list view: one row per block */
.block-gallery__list { display: flex; flex-direction: column; gap: 2px; }
.block-gallery__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: var(--sve-radius-md);
  cursor: pointer;
}
.block-gallery__row:hover,
.block-gallery__row:focus-visible { outline: none; background: var(--sve-surface-muted); }
.block-gallery__row--off { cursor: not-allowed; opacity: 0.5; }
.block-gallery__row--off:hover { background: none; }
.block-gallery__row-icon {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: var(--sve-radius-md);
  background: var(--sve-primary-soft);
  color: var(--sve-primary);
  font-size: 20px;
}
.block-gallery__row-text { display: flex; flex-direction: column; min-width: 0; }
.block-gallery__row-text .block-gallery__description { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.block-gallery__row-group { font-weight: 400; color: var(--sve-text-subtle); }
.block-gallery__empty { margin: 24px 0; text-align: center; color: var(--sve-text-subtle); }

/* A phone: the blocks side by side, swiped through one at a time. */
@media (max-width: 720px) {
  .block-gallery__items {
    flex-direction: row;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    margin: 0 -10px;
    padding: 2px 10px 6px;
    gap: 12px;
  }
  .block-gallery__card { flex: 0 0 84%; scroll-snap-align: center; }
  .block-gallery__thumb { height: 230px; }
}
</style>
