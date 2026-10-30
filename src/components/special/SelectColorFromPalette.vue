<script setup lang="ts">
  const show = defineModel<boolean>('open', { default: false })
  const selectedColor = defineModel<string>({ default: '#fff' })
  function onColorSelected (color: string) {
    selectedColor.value = color
    show.value = false
  }

  const swatches = [
    ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'],
    ['#800000', '#008000', '#000080', '#808000', '#800080', '#008080'],
    ['#C0C0C0', '#808080', '#9999FF', '#993366', '#FFFFCC', '#CCFFFF'],
    ['#660066', '#FF8080', '#0066CC', '#CCCCFF'],
  ]
</script>

<template>
  <v-dialog v-model="show" max-width="420" persistent>
    <v-card>
      <v-card-title class="text-h5">Select Color</v-card-title>
      <v-card-text>
        <v-color-picker
          class="ma-2"
          show-swatches
          :swatches="swatches"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="show = false">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
