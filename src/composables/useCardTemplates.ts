import type { Pinia } from 'pinia'
import type { CardTemplate } from '@/configs/card-templates'
import { shallowRef } from 'vue'
import { useAjaxStore } from '@/stores/ajax'

// The UI Kit's card templates (configs/card-templates.ts) in the editor:
// read once from the general settings, shared by every card block (they
// wear them through utils/card-defaults.ts) and edited on the UI Kit's
// «Картки» tab (CardTemplatesPanel.vue), saved at once.

export const cardTemplates = shallowRef<CardTemplate[]>([])
let loading: Promise<void> | null = null

export function useCardTemplates (pinia?: Pinia) {
  const ajaxStore = useAjaxStore(pinia)

  function load () {
    loading ??= ajaxStore.getGlobalSettings()
      .then(settings => {
        cardTemplates.value = Array.isArray(settings?.cardTemplates) ? settings.cardTemplates : []
      })
      .catch(() => {
        loading = null
      })
    return loading
  }

  async function save (templates: CardTemplate[]) {
    cardTemplates.value = templates
    const settings = await ajaxStore.getGlobalSettings()
    if (settings) {
      await ajaxStore.saveGlobalSettings({ ...settings, cardTemplates: templates.length > 0 ? templates : undefined }, { publish: true })
    }
  }

  return { templates: cardTemplates, load, save }
}
