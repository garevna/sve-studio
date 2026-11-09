<script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import ButtonSample from '@/components/special/ButtonSample.vue'
  import { useButtonVariants } from '@/composables/useButtonVariants'
  import { templateOf } from '@/configs/button-catalog'
  import { t } from '@/i18n'

  // Which of the client's buttons this is - picked by the name the client
  // gave it in the UI Kit, with a sample of it (useButtonVariants). A
  // component of its own because the question comes up wherever content can
  // carry a button - a page block, a menu row, an icon button - and each
  // would otherwise repeat the same two things: reading the button out of a
  // class string that also holds other classes, and putting a new one back
  // without disturbing them.
  //
  // `kind` narrows the list to one kind of the catalogue (an icon button
  // offers icon buttons). Without it: the text buttons - the sign-in and
  // icon buttons are components, not looks for a text button.
  //
  // The model is the WHOLE class string, not just the button: that is what
  // the block stores, and a caller shouldn't have to take it apart to use
  // this.
  const className = defineModel<string>('class', { default: '' })

  const props = withDefaults(defineProps<{
    label?: string
    density?: 'default' | 'comfortable' | 'compact'
    kind?: string
  }>(), {
    density: 'compact',
  })

  const { variants, load } = useButtonVariants()

  onMounted(load)

  const offered = computed(() => variants.value.filter(item => props.kind
    ? item.template === props.kind
    : !templateOf(item.template).component))

  // Matched WITHIN the string rather than assumed to be all of it: a block's
  // class can carry spacing utilities and anything else the page needs, and
  // choosing a button must not throw those away.
  const current = computed(() => {
    const tokens = (className.value || '').split(' ').filter(Boolean)
    return tokens.find(token => offered.value.some(item => item.className === token)) || null
  })

  // Every look's class has "button" in it - one that is not in the set any
  // more goes too, rather than lingering next to the new one.
  function select (variant: string) {
    const kept = (className.value || '').split(' ').filter(token => token && !token.includes('button'))
    className.value = [...kept, variant].join(' ').trim()
  }
</script>

<template>
  <v-select
    :density="density"
    hide-details
    item-title="name"
    item-value="className"
    :items="offered"
    :label="props.label ?? t('buttonEditor.look')"
    :model-value="current"
    :no-data-text="t('buttonSet.noneYet')"
    variant="outlined"
    @update:model-value="select"
  >
    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps">
        <template #prepend>
          <span class="button-variant-sample">
            <ButtonSample :class-name="item.raw.className" small :template="item.raw.template" />
          </span>
        </template>
      </v-list-item>
    </template>
  </v-select>
</template>

<style scoped>
/* A small sample beside each name: the real button, not clickable. */
.button-variant-sample {
  display: inline-flex;
  width: 72px;
  margin-right: 12px;
  pointer-events: none;
}
</style>
