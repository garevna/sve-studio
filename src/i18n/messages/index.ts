// The editor's interface texts, one file per section: every text with its
// three languages side by side - { "uk": ..., "en": ..., "de": ... }.
// An empty "en"/"de" shows the Ukrainian text until it is translated.
// A new section: add its file here.

import cardStyles from './cardStyles.json'
import common from './common.json'
import confirm from './confirm.json'
import home from './home.json'
import images from './images.json'
import kit from './kit.json'
import palette from './palette.json'
import popups from './popups.json'
import saveTargets from './saveTargets.json'
import siteSettings from './siteSettings.json'
import translations from './translations.json'
import ui from './ui.json'

export const MESSAGES = {
  cardStyles,
  common,
  confirm,
  home,
  images,
  kit,
  palette,
  popups,
  saveTargets,
  siteSettings,
  translations,
  ui,
}

// Dev: a text saved on /editor-ui changes these files - the interface has
// already been given the new texts (applyMessages), so no page reload.
if (import.meta.hot) {
  import.meta.hot.accept(() => {})
}
