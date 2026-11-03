<script setup lang="ts">
  import type { HeaderSettingsModel, TitlePosition, TitleSize } from '@/configs/header-layout'
  import type { ThemeFont } from '@/utils/theme-fonts'
  import { t } from '@/i18n'

  // How the company name looks over the top of the site: shown or not, its
  // font, its corner. One set of controls for both places it is set - the
  // "Верхня частина сторінки" page and the name itself on a page's top
  // parallax in the editor - so the two never drift apart.
  defineProps<{
    header: HeaderSettingsModel
    // The site's own fonts (General settings -> Fonts).
    fonts: ThemeFont[]
    // The corner only means something in the layout with the name over the
    // picture; the split layout places it itself.
    corners?: boolean
    // "Назва компанії" over the switch - off where the name's own field
    // already says it.
    noNameLabel?: boolean
  }>()
  const emit = defineEmits<{ update: [changes: Partial<HeaderSettingsModel>] }>()

  // In the order they sit on screen (2 x 2). Labels: header.corners.<value>.
  const SIZES: TitleSize[] = ['s', 'm', 'l', 'xl', 'xxl']

  const CORNERS: { value: TitlePosition, icon: string }[] = [
    { value: 'top-left', icon: 'mdi-arrow-top-left' },
    { value: 'top-right', icon: 'mdi-arrow-top-right' },
    { value: 'bottom-left', icon: 'mdi-arrow-bottom-left' },
    { value: 'bottom-right', icon: 'mdi-arrow-bottom-right' },
  ]
</script>

<template>
  <div class="header-title-controls">
    <div>
      <p v-if="!noNameLabel" class="header-title-label">{{ t('common.companyName') }}</p>
      <v-switch
        color="primary"
        density="compact"
        hide-details
        inset
        :label="t('header.showTitle')"
        :model-value="header.showTitle"
        @update:model-value="emit('update', { showTitle: !!$event })"
      />
    </div>

    <template v-if="header.showTitle">
      <div v-if="corners">
        <p class="header-title-label">{{ t('header.titleCorner') }}</p>
        <div class="header-title-corners">
          <v-btn
            v-for="corner of CORNERS"
            :key="corner.value"
            :active="header.titlePosition === corner.value"
            :aria-label="t(`header.corners.${corner.value}`)"
            color="primary"
            size="small"
            variant="outlined"
            @click="emit('update', { titlePosition: corner.value })"
          >
            <v-icon>{{ corner.icon }}</v-icon>
            <v-tooltip activator="parent" location="top">{{ t(`header.corners.${corner.value}`) }}</v-tooltip>
          </v-btn>
        </div>
      </div>

      <div>
        <p class="header-title-label">{{ t('header.titleSize') }}</p>
        <v-btn-toggle
          color="primary"
          density="comfortable"
          mandatory
          :model-value="header.titleSize"
          variant="outlined"
          @update:model-value="emit('update', { titleSize: $event })"
        >
          <v-btn v-for="size of SIZES" :key="size" :value="size">{{ size.toUpperCase() }}</v-btn>
        </v-btn-toggle>
      </div>

      <div>
        <p class="header-title-label">{{ t('header.titleFont') }}</p>
        <v-btn-toggle
          color="primary"
          density="comfortable"
          mandatory
          :model-value="header.titleFont"
          variant="outlined"
          @update:model-value="emit('update', { titleFont: $event })"
        >
          <v-btn v-for="font of fonts" :key="font.className" :value="font.className">
            <!-- On the label, not the button: the editor's button style
              sets the font of every .v-btn. -->
            <span :style="{ fontFamily: `var(${font.cssVar})`, textTransform: 'none' }">{{ font.name }}</span>
          </v-btn>
        </v-btn-toggle>
      </div>
    </template>
  </div>
</template>

<style scoped>
.header-title-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 24px 40px;
}
.header-title-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #3A4A58;
  margin-bottom: 8px;
}
.header-title-corners {
  display: grid;
  grid-template-columns: repeat(2, max-content);
  gap: 8px;
}
</style>
