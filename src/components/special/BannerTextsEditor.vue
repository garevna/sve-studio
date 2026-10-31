<script setup lang="ts">
  import type { Banner, BannerText, BannerTextBox } from '@/types/GlobalSettingsModel'
  import { computed, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useDisplay } from 'vuetify'
  import TextFormatMenu from '@/components/editors/text/TextFormatMenu.vue'
  import { BANNER_ASPECT, bannerTextBox } from '@/utils/banner-text'
  import { EDITED_APP_SCOPE_CLASS } from '@/utils/edited-app-scope'

  // Texts laid over one banner: added here, dragged into place with the
  // mouse (or a finger), resized by the handle on their right edge,
  // formatted with the same bar as every text in the editor, written in
  // every site language. The box has the site's own proportions
  // (utils/banner-text.ts), so a text stands here exactly where the site
  // will show it - on a wide screen and, switched below, on a phone.
  // banner: its pictures; texts: the texts laid over it (v-model:texts).
  const props = defineProps<{ banner: Banner }>()
  const open = defineModel<boolean>({ default: false })
  const model = defineModel<BannerText[]>('texts', { default: () => [] })
  const { t } = useI18n()
  const { smAndDown } = useDisplay()

  const LOCALES = ['uk', 'en', 'de'] as const
  const SIZE_STEP = 0.25

  const device = ref<'desktop' | 'mobile'>('desktop')
  const mobile = computed(() => device.value === 'mobile')
  const selectedId = ref<string | null>(null)
  const textLocale = ref<(typeof LOCALES)[number]>('uk')

  const texts = computed(() => model.value ?? [])
  const selected = computed(() => texts.value.find(text => text.id === selectedId.value) ?? null)
  const picture = computed(() => (mobile.value ? props.banner.mobile || props.banner.desktop : props.banner.desktop || props.banner.mobile))
  const boxStyle = computed(() => ({
    aspectRatio: String(mobile.value ? BANNER_ASPECT.mobile : BANNER_ASPECT.desktop),
    backgroundImage: picture.value ? `url("${picture.value}")` : undefined,
  }))

  function place (text: BannerText) {
    const box = bannerTextBox(text, mobile.value)
    return { left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, fontSize: `${box.size}cqw` }
  }

  // Writes this device's place: the desktop one on the text itself, the
  // phone one in text.mobile (from then on its own, no longer derived).
  function setBox (text: BannerText, patch: Partial<BannerTextBox>) {
    const box = { ...bannerTextBox(text, mobile.value), ...patch }
    if (mobile.value) {
      text.mobile = box
    } else {
      Object.assign(text, box)
    }
  }

  function addText () {
    const text: BannerText = {
      id: `t${Date.now().toString(36)}`,
      text: { uk: t('bannerTexts.sample'), en: '', de: '' },
      x: 6,
      y: 30,
      width: 44,
      size: 4,
      class: 'text-white text-bold text-left',
    }
    model.value = [...texts.value, text]
    selectedId.value = text.id
  }
  function removeSelected () {
    model.value = texts.value.filter(text => text.id !== selectedId.value)
    selectedId.value = null
  }
  function resize (step: number) {
    if (!selected.value) return
    const size = bannerTextBox(selected.value, mobile.value).size + step * SIZE_STEP
    setBox(selected.value, { size: Math.min(20, Math.max(0.75, Math.round(size * 100) / 100)) })
  }
  const sizeLabel = computed(() => (selected.value ? bannerTextBox(selected.value, mobile.value).size.toFixed(2).replace(/\.?0+$/, '') : ''))

  // --- dragging -----------------------------------------------------------

  const boxEl = ref<HTMLElement | null>(null)
  let drag: { text: BannerText, mode: 'move' | 'width', startX: number, startY: number, start: BannerTextBox } | null = null

  function startDrag (event: PointerEvent, text: BannerText, mode: 'move' | 'width') {
    selectedId.value = text.id
    drag = { text, mode, startX: event.clientX, startY: event.clientY, start: bannerTextBox(text, mobile.value) }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    event.preventDefault()
    event.stopPropagation()
  }
  function onDrag (event: PointerEvent) {
    const rect = boxEl.value?.getBoundingClientRect()
    if (!drag || !rect) return
    const dx = (event.clientX - drag.startX) / rect.width * 100
    const dy = (event.clientY - drag.startY) / rect.height * 100
    const round = (value: number) => Math.round(value * 10) / 10
    if (drag.mode === 'move') {
      setBox(drag.text, {
        x: round(Math.min(100 - drag.start.width, Math.max(0, drag.start.x + dx))),
        y: round(Math.min(95, Math.max(0, drag.start.y + dy))),
      })
    } else {
      setBox(drag.text, { width: round(Math.min(100 - drag.start.x, Math.max(8, drag.start.width + dx))) })
    }
  }
  function endDrag () {
    drag = null
  }
</script>

<template>
  <v-dialog v-model="open" :fullscreen="smAndDown" max-width="1100" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center ga-2">
        {{ t('bannerTexts.title') }}
        <v-spacer />
        <v-btn-toggle
          v-model="device"
          color="primary"
          density="compact"
          mandatory
          variant="outlined"
        >
          <v-btn prepend-icon="mdi-monitor" size="small" value="desktop">{{ t('header.desktop') }}</v-btn>
          <v-btn prepend-icon="mdi-cellphone" size="small" value="mobile">{{ t('header.phone') }}</v-btn>
        </v-btn-toggle>
      </v-card-title>

      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-3">{{ t('bannerTexts.hint') }}</p>

        <div class="banner-tools">
          <v-btn color="primary" prepend-icon="mdi-format-text" variant="tonal" @click="addText">{{ t('bannerTexts.add') }}</v-btn>
          <template v-if="selected">
            <TextFormatMenu
              v-model:class="selected.class"
              deletable
              :delete-tooltip="t('bannerTexts.remove')"
              :only="['weight', 'color', 'align', 'font']"
              parent-type="usual"
              @delete="removeSelected"
            />
            <div class="banner-size">
              <v-btn
                :aria-label="t('bannerTexts.smaller')"
                icon="mdi-minus"
                size="small"
                variant="text"
                @click="resize(-1)"
              />
              <span>{{ t('bannerTexts.size') }} {{ sizeLabel }}</span>
              <v-btn
                :aria-label="t('bannerTexts.bigger')"
                icon="mdi-plus"
                size="small"
                variant="text"
                @click="resize(1)"
              />
            </div>
          </template>
        </div>

        <div :class="['banner-stage', { 'banner-stage--phone': mobile }]">
          <div
            ref="boxEl"
            :class="['banner-box', EDITED_APP_SCOPE_CLASS]"
            :style="boxStyle"
            @pointerdown.self="selectedId = null"
          >
            <div
              v-for="text of texts"
              :key="text.id"
              :class="['banner-text', text.class, { 'banner-text--selected': text.id === selectedId }]"
              :style="place(text)"
              @pointercancel="endDrag"
              @pointerdown="startDrag($event, text, 'move')"
              @pointermove="onDrag"
              @pointerup="endDrag"
            >
              {{ text.text[textLocale] || text.text.uk || '…' }}
              <span
                :aria-label="t('bannerTexts.width')"
                class="banner-text-handle"
                @pointercancel="endDrag"
                @pointerdown="startDrag($event, text, 'width')"
                @pointermove="onDrag"
                @pointerup="endDrag"
              />
            </div>
          </div>
        </div>

        <div v-if="selected" class="banner-words">
          <v-textarea
            v-for="locale of LOCALES"
            :key="locale"
            v-model="selected.text[locale]"
            auto-grow
            density="compact"
            hide-details
            :label="locale.toUpperCase()"
            :placeholder="locale === 'uk' ? '' : selected.text.uk"
            rows="1"
            variant="outlined"
            @focus="textLocale = locale"
          />
        </div>
        <p v-else-if="texts.length > 0" class="text-body-2 text-medium-emphasis mt-3">{{ t('bannerTexts.pick') }}</p>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="flat" @click="open = false">{{ t('bannerTexts.done') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.banner-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  min-height: 48px;
  margin-bottom: 12px;
}
.banner-size {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
}
.banner-stage--phone {
  max-width: 360px;
  margin-inline: auto;
}
/* The site's banner box: the picture covers it, the texts sit on it in %
   of its size and cqw of its width - see BannerTexts.vue in the site. */
.banner-box {
  position: relative;
  width: 100%;
  container-type: size;
  background: #d9dee5 center / cover no-repeat;
  border-radius: 8px;
  overflow: hidden;
  touch-action: none;
  user-select: none;
}
.banner-text {
  position: absolute;
  line-height: 1.15;
  white-space: pre-line;
  overflow-wrap: break-word;
  cursor: move;
  outline: 1px dashed rgb(255 255 255 / 0.6);
  outline-offset: 2px;
}
.banner-text--selected {
  outline: 2px solid #4f8cff;
}
.banner-text-handle {
  position: absolute;
  top: 50%;
  right: -9px;
  width: 12px;
  height: 28px;
  transform: translateY(-50%);
  border-radius: 6px;
  background: #4f8cff;
  cursor: ew-resize;
  display: none;
}
.banner-text--selected .banner-text-handle {
  display: block;
}
.banner-words {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}
@media (max-width: 720px) {
  .banner-words { grid-template-columns: minmax(0, 1fr); }
}
</style>
