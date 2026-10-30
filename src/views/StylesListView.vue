<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import { siteStyles, WIZARD_STYLES } from '@/configs/card-style'
  import { styleFileTitle } from '@/configs/style-file-titles'
  import { useAjaxStore } from '@/stores/ajax'

  // The site's stylesheets - only the ones the site actually loads (see
  // siteStyles: global.json's list, plus the UI Kit's, minus the booking
  // wizard's), as tiles in two to four columns by the window's width. Each
  // tile: what the file is for, and the file's own name under it - the
  // name is what a stylesheet is looked up by, the title says what it does.
  // The Vuetify component sheets are a group of their own.
  const ajaxStore = useAjaxStore()

  const allFiles = ref<string[]>([])
  const used = ref<Set<string> | null>(null)
  const loading = ref(true)

  onMounted(async () => {
    const [files, settings] = await Promise.all([
      ajaxStore.listStyleFiles(),
      ajaxStore.getGlobalSettings().catch(() => null),
    ])
    allFiles.value = files
    const styles = (settings as { styles?: string[] } | null)?.styles
    used.value = styles ? new Set(siteStyles(styles)) : null
    loading.value = false
  })

  type StyleFile = { name: string, file: string, title: string | null }
  const byTitle = (a: StyleFile, b: StyleFile) => (a.title ?? a.name).localeCompare(b.title ?? b.name, 'uk')

  const files = computed<StyleFile[]>(() => allFiles.value.map(file => {
    const name = file.replace(/\.css$/, '')
    const title = styleFileTitle(file)
    return { name, file, title: title === file ? null : title }
  }))

  const isVuetify = (file: StyleFile) => file.name.startsWith('vuetify-')
  // Without global.json's list (it failed to load) everything but the
  // wizard's is shown rather than nothing.
  const isUsed = (file: StyleFile) => used.value ? used.value.has(file.name) : !WIZARD_STYLES.includes(file.name)

  const groups = computed(() => [
    { title: 'Стилі сайту', files: files.value.filter(file => !isVuetify(file) && isUsed(file)).toSorted(byTitle) },
    { title: 'Компоненти Vuetify', files: files.value.filter(file => isVuetify(file)).toSorted(byTitle) },
  ].filter(group => group.files.length > 0))
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" detail="Файли CSS, які використовує сайт" title="Стилі" />

      <v-progress-linear v-if="loading" color="primary" indeterminate />

      <div v-else class="sve-ui styles-list">
        <section v-for="group of groups" :key="group.title">
          <h2 class="styles-list__heading">
            {{ group.title }}
            <span class="styles-list__count">{{ group.files.length }}</span>
          </h2>
          <div class="styles-list__grid">
            <RouterLink
              v-for="file of group.files"
              :key="file.file"
              class="styles-list__tile"
              :to="`/styles/${file.file}`"
            >
              <span class="styles-list__icon"><i class="sve-icon mdi mdi-language-css3" /></span>
              <span class="styles-list__text">
                <span class="styles-list__title">{{ file.title ?? file.name }}</span>
                <span class="styles-list__file">{{ file.file }}</span>
              </span>
              <i class="sve-icon mdi mdi-chevron-right styles-list__arrow" />
            </RouterLink>
          </div>
        </section>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.styles-list {
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-width: 1200px;
  margin-inline: auto;
}
.styles-list__heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 700;
  color: var(--sve-text);
}
.styles-list__count {
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--sve-surface-sunken);
  color: var(--sve-text-muted);
  font-size: 12px;
}
/* two to four columns, by the window's width */
.styles-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  gap: 10px;
}
.styles-list__tile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px 12px 14px;
  border: solid 1px var(--sve-border);
  border-radius: var(--sve-radius-lg);
  background: var(--sve-surface);
  color: var(--sve-text);
  text-decoration: none;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
.styles-list__tile:hover,
.styles-list__tile:focus-visible {
  outline: none;
  border-color: var(--sve-primary);
  box-shadow: var(--sve-shadow-md);
}
.styles-list__icon {
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
.styles-list__text { display: flex; flex: 1 1 auto; flex-direction: column; min-width: 0; }
.styles-list__title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.styles-list__file {
  overflow: hidden;
  color: var(--sve-text-subtle);
  font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.styles-list__arrow { color: var(--sve-text-subtle); font-size: 18px; }
.styles-list__tile:hover .styles-list__arrow { color: var(--sve-primary); }
</style>
