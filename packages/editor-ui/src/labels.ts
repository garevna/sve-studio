import { reactive } from 'vue'

// The kit's own words (a "Back" button, a "Close" button...). The kit knows
// nothing about the app's translations: the app hands them over with
// setKitLabels() and again on every language switch. Ukrainian until then.
export const kitLabels = reactive({
  back: 'Назад',
  close: 'Закрити',
  look: 'Оформлення редактора',
  pickColor: 'Вибрати колір',
  tools: 'Інструменти',
  systemFont: 'Системний',
})

export type KitLabels = typeof kitLabels

export function setKitLabels (labels: Partial<KitLabels>) {
  Object.assign(kitLabels, labels)
}
