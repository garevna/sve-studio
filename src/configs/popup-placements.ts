import type { PopupModel } from '@/types/TemplateBlockModel'

// Where a popup can appear (site PopupHost.vue), as the editor offers it.
export const POPUP_PLACEMENTS: { value: PopupModel['placement'], icon: string, label: string }[] = [
  { value: 'right', icon: 'mdi-dock-right', label: 'pagePopups.placement.right' },
  { value: 'left', icon: 'mdi-dock-left', label: 'pagePopups.placement.left' },
  { value: 'bottom', icon: 'mdi-dock-bottom', label: 'pagePopups.placement.bottom' },
  { value: 'center', icon: 'mdi-dock-window', label: 'pagePopups.placement.center' },
]
