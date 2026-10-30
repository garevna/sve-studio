<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  // import { useI18n } from 'vue-i18n'
  import { useCommonStore } from '@/stores/common'

  // const { t } = useI18n()

  type CountryModel = {
    countryCode: string
    countryName: string
    dialCode: string
  }

  const properties = defineProps({
    mode: {
      type: String as () => 'phone' | 'country',
      default: 'phone',
    },
  })

  const countryPropmt = {
    uk: 'Країна проживання',
    en: 'Country of residence',
    de: 'Wohnsitzland',
  }

  const { countries, locale } = storeToRefs(useCommonStore())

  const placeholder = computed(() => properties.mode === 'phone' ? '+380' : countryPropmt[locale.value as keyof typeof countryPropmt])

  const modelValue = defineModel<string>({ default: '' })

  const search = ref('')
  const selected = ref<CountryModel | null>(null)
  const menu = ref(false)
  const activeIndex = ref(0)

  function normalizePhone (code: unknown): string {
    if (!code) return ''

    if (Array.isArray(code)) return code[0]

    if (typeof code === 'object') return ''

    const str = String(code)

    return str.startsWith('+') ? str : `+${str}`
  }

  const filtered = computed(() => {
    if (!search.value) return countries.value

    const q = properties.mode === 'phone' ? search.value : search.value.toLowerCase()
    const list = countries.value.filter(record => {
      const state = properties.mode === 'phone'
        ? (record.dialCode ? record.dialCode.includes(q) : false)
        : record.countryName.toLowerCase().includes(q) || record.countryCode.includes(q)
      return state
    })

    return list
  })

  function select (record: CountryModel) {
    selected.value = record
    const value = properties.mode === 'phone' ? record.dialCode : record.countryName
    modelValue.value = value
    search.value = value
    menu.value = false
  }

  watch(
    modelValue,
    val => {
      if (!val) return

      const propName = properties.mode === 'phone' ? 'dialCode' : 'countryName'

      const found = countries.value.find(record => record[propName] === val)
      if (found) {
        selected.value = found
        search.value = val
      }
    },
    { immediate: true },
  )

  /* ✅ ввод пользователя (без обновления modelValue!) */
  watch(search, val => {
    if (val === modelValue.value) return
    if (!val) {
      menu.value = false
      return
    }

    menu.value = true

    const normalized = normalizePhone(val)

    /* ❗ НЕ перезаписываем search */
    if (normalized !== val) return

    const exact = countries.value.find(c => properties.mode === 'phone' ? c.dialCode === normalized : c.countryName === val)

    if (exact) {
      selected.value = exact
      modelValue.value = exact.dialCode
    }
  })

  /* ⌨️ клавиатура */
  function onKeydown (e: KeyboardEvent) {
    if (!menu.value) return

    if (e.key === 'ArrowDown') {
      activeIndex.value = (activeIndex.value + 1) % filtered.value.length
    }

    if (e.key === 'ArrowUp') {
      activeIndex.value
        = (activeIndex.value - 1 + filtered.value.length) % filtered.value.length
    }

    if (e.key === 'Enter') {
      const item = filtered.value[activeIndex.value]
      if (item) select(item)
    }
  }

  function onMousedown (e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.v-menu__content')) {
      e.preventDefault()
    }
  }

  function getFlag (code: string) {
    return `https://flagcdn.com/${code}.svg`
  }

  function onImgError (e: Event) {
    (e.target as HTMLImageElement).style.visibility = 'hidden'
  }

  function handleScroll () {
    if (menu.value) {
      menu.value = false
    }
  }

  onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })
</script>

<template>
  <div class="country-code-button d-flex align-center">
    <v-menu
      v-model="menu"
      :close-on-content-click="false"
    >
      <!-- ✅ activator -->
      <template #activator="{ props }">
        <div
          class="country-input"
          v-bind="props"
        >
          <img
            v-if="selected?.countryCode"
            class="mr-2"
            height="32"
            :src="getFlag(selected.countryCode)"
            style="border-radius: 50%;"
            width="32"
            @error="onImgError"
          >

          <input
            v-model="search"
            class="country-text"
            :placeholder="placeholder"
            @focus="menu = true"
            @keydown="onKeydown"
            @mousedown="onMousedown"
          >
        </div>
      </template>

      <!-- ✅ dropdown -->
      <v-list style="max-height: 300px; overflow: auto;">
        <v-list-item
          v-for="(item, i) in filtered"
          :key="item.countryCode"
          :class="{ 'active-item': i === activeIndex }"
          @click="select(item)"
        >
          <img
            class="mr-2"
            height="20"
            :src="getFlag(item.countryCode)"
            width="32"
            @error="onImgError"
          >
          {{ properties.mode === 'phone' ? item.dialCode : item.countryName }}
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<style>
.country-input {
  display: flex;
  align-items: center;
  cursor: text;
}

.country-text {
  border: none;
  outline: none;
  width: 240px;
}

.active-item {
  background: rgba(0, 0, 0, 0.08);
}
</style>
