import type { PopupModel, TemplateBlockModel } from '@/types/TemplateBlockModel'
import { t } from '@/i18n'

// Where a button leads, in one line under it in the editor: the form, one
// of the page's popups, a page, a block on a page, or nowhere yet. Shared
// by every kind of button.
export function buttonLinkSummary (block: TemplateBlockModel, popups: PopupModel[] = []): string {
  if (block.action === 'form') {
    return t('buttonEditor.opensFeedbackForm')
  }
  if (block.action === 'popup') {
    const popup = popups.find(item => item.id === block.popup)
    return popup ? t('pagePopups.opens', { name: popup.name }) : t('buttonEditor.noTarget')
  }
  if (block.route !== 'dynamic-page') {
    return block.route ? t('buttonEditor.pageRoute', { route: block.route }) : t('buttonEditor.noTarget')
  }
  const pageId = (block.params as { pageId?: string } | undefined)?.pageId
  return block.hash ? t('menuSettings.pageBlock', { pageId, hash: block.hash }) : t('menuSettings.page', { pageId })
}
