<script lang="ts" setup>
  import { onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import EditorPageHeader from '@/components/special/EditorPageHeader.vue'
  import { useAjaxStore } from '@/stores/ajax'

  interface AccountPageVariant {
    number: number
    routeName: string
  }

  interface AccountPage {
    title: string
    routeName: string
    icon: string
    variants: AccountPageVariant[]
  }

  // "Особистий кабінет" pages - each
  // page can have 1+ real implementations, opened for preview in a new tab
  // (no editor chrome there, production's own page design carries its own
  // header). `routeName` (page.routeName) is the page's own production
  // route - not to be confused with variant.routeName, this editor's own
  // router entry used only to resolve the preview href below.
  const pages: AccountPage[] = [
    {
      title: 'Сторінка авторизації',
      routeName: 'auth',
      icon: 'mdi-login-variant',
      variants: [
        { number: 1, routeName: 'auth-page' },
      ],
    },
  ]

  const router = useRouter()
  // Resolved through the router rather than hand-written: an absolute
  // '/auth-page' would ignore the app's base path.
  function variantHref (routeName: string): string {
    return router.resolve({ name: routeName }).href
  }

  const ajaxStore = useAjaxStore()

  // routeName -> selected variant number, stored in account-pages.json.
  const selection = ref<Record<string, number>>({})
  const loading = ref(true)
  const savingRouteName = ref<string | null>(null)

  onMounted(async () => {
    selection.value = await ajaxStore.getAccountPages()
    loading.value = false
  })

  function isSelected (routeName: string, variantNumber: number): boolean {
    return (selection.value[routeName] ?? 1) === variantNumber
  }

  async function selectVariant (routeName: string, variantNumber: number) {
    if (isSelected(routeName, variantNumber)) return
    const next = { ...selection.value, [routeName]: variantNumber }
    selection.value = next
    savingRouteName.value = routeName
    try {
      await ajaxStore.saveAccountPages(next, { publish: true })
    } finally {
      savingRouteName.value = null
    }
  }
</script>

<template>
  <v-app>
    <v-main class="editor-page">
      <EditorPageHeader back-to="/" detail="сторінки особистого кабінету" title="Особистий кабінет" />

      <v-progress-linear v-if="loading" color="primary" indeterminate />

      <div v-else class="wizard-page-list">
        <div v-for="page in pages" :key="page.routeName" class="editor-panel wizard-page-card pa-4">
          <div class="d-flex align-center ga-4 mb-4">
            <v-icon color="primary" :icon="page.icon" size="28" />
            <div>
              <p class="wizard-page-title">{{ page.title }}</p>
              <p class="wizard-page-route">{{ page.routeName }}</p>
            </div>
          </div>

          <div class="d-flex flex-wrap ga-4">
            <div
              v-for="variant in page.variants"
              :key="variant.number"
              class="wizard-variant-block pa-4"
              :class="{ 'wizard-variant-block--selected': isSelected(page.routeName, variant.number) }"
            >
              <p class="wizard-variant-title mb-4">Варіант {{ variant.number }}</p>
              <div class="d-flex ga-4">
                <v-btn
                  :href="variantHref(variant.routeName)"
                  icon="mdi-open-in-new"
                  target="_blank"
                  title="Переглянути в новому вікні"
                  variant="text"
                />
                <v-btn
                  :icon="isSelected(page.routeName, variant.number) ? 'mdi-check-bold' : 'mdi-checkbox-blank-off-outline'"
                  :loading="savingRouteName === page.routeName"
                  title="Обрати цей варіант"
                  variant="text"
                  @click="selectVariant(page.routeName, variant.number)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.wizard-page-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.wizard-page-title {
  font-size: 20px;
  font-weight: 600;
}
.wizard-page-route {
  font-family: monospace;
  font-size: 13px;
  color: #7a8699;
}
.wizard-variant-block {
  border: solid 1px #ddd;
  border-radius: 8px;
  min-width: 160px;
}
.wizard-variant-block--selected {
  border: solid 2px var(--green);
}
.wizard-variant-title {
  font-size: 14px;
  font-weight: 600;
}
</style>
