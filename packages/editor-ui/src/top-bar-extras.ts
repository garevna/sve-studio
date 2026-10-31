import type { Component } from 'vue'
import { markRaw, shallowRef } from 'vue'

// Buttons the app adds to every top bar, next to the colour-scheme picker -
// things the kit itself knows nothing about (the editor's interface
// language, for one). Registered once at startup.
export const topBarExtras = shallowRef<Component[]>([])

export function addTopBarItem (component: Component) {
  topBarExtras.value = [...topBarExtras.value, markRaw(component)]
}
