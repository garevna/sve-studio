<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import { useCommonStore } from '@/stores/common'

  // The price calculator, as the editing canvas shows it.
  //
  // The working one lives in the site app
  // (site/src/components/template-components/PriceCalculator.vue): it asks
  // the AI assistant for the sentences beside the figure, and every call is
  // charged to the day's budget. Running it here too would spend that budget
  // on somebody dragging blocks around, and it would need the site's auth and
  // its account - which the editor does not have.
  //
  // So the canvas gets a true picture of the block instead of a second
  // implementation that would drift from the first: its name, what it does,
  // and where to look at it working.

  const { locale } = storeToRefs(useCommonStore())

  const WORDS = {
    uk: {
      title: 'Калькулятор вартості',
      body: 'Шість питань, вилка по грошах і по строку, і пояснення від AI-помічника. Рахує прайс, пояснює помічник.',
      note: 'Працює на опублікованому сайті, для відвідувачів, які увійшли. Тут не запускається, щоб не витрачати денний ліміт помічника на редагування.',
    },
    en: {
      title: 'Price calculator',
      body: 'Six questions, a range in money and in weeks, and a few sentences from the AI assistant. The rate card does the arithmetic; the assistant explains it.',
      note: 'It runs on the published site, for signed-in visitors. Not here - editing a page should not spend the assistant’s daily allowance.',
    },
    de: {
      title: 'Preisrechner',
      body: 'Sechs Fragen, eine Spanne in Geld und Wochen und einige Sätze vom KI-Assistenten. Die Preisliste rechnet, der Assistent erklärt.',
      note: 'Läuft auf der veröffentlichten Website für angemeldete Besucher. Hier nicht - das Bearbeiten einer Seite soll das Tageskontingent des Assistenten nicht verbrauchen.',
    },
  }

  const words = computed(() => WORDS[locale.value as 'uk' | 'en' | 'de'] || WORDS.uk)
</script>

<template>
  <div class="price-calculator-preview">
    <v-icon class="mb-2" color="primary" icon="mdi-calculator-variant-outline" size="36" />
    <p class="h4 text-bold text-primary mb-2">{{ words.title }}</p>
    <p class="default-text text-thin text-black mb-3">{{ words.body }}</p>
    <p class="small-text text-thin text-grey">{{ words.note }}</p>
  </div>
</template>

<style scoped>
.price-calculator-preview {
  background: var(--light-grey-2);
  border: 1px dashed var(--grey);
  border-radius: var(--default-border-radius);
  padding: 32px;
  text-align: center;
  max-width: 760px;
  margin-inline: auto;
}
</style>
