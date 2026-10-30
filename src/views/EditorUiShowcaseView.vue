<script setup lang="ts">
  import type { Look, LookColors, LooksFile } from '@sve/editor-ui'
  import {
    applyLook,
    DEFAULT_LOOK,
    FONTS,
    LOOKS,
    lookVariables,
    SveBadge,
    SveButton,
    SveColorField,
    SveIconButton,
    SveMenu,
    SveMenuDivider,
    SveMenuItem,
    SveMenuLabel,
    SveNumberField,
    SvePage,
    SvePanel,
    SveSegmented,
    SveTextField,
    useLook,
  } from '@sve/editor-ui'
  import { computed, onBeforeUnmount, ref, toRaw, watch } from 'vue'

  // The editor's interface kit on one page (dev only - see router/routes.ts):
  // its colour schemes, edited here and saved into the kit
  // (packages/editor-ui/src/looks.json), a sample editor screen, and every
  // control in every state. Users of the editor only switch between the
  // schemes (the palette button on the top bar).

  const { look, setLook } = useLook()

  // --- the schemes, being edited ---------------------------------------------

  function clone<T> (value: T): T {
    return structuredClone(toRaw(value))
  }
  const saved = ref<LooksFile>(clone({ default: DEFAULT_LOOK, looks: LOOKS }))
  const draft = ref<LooksFile>(clone(saved.value))
  const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value))

  const selectedId = ref(look.value.id)
  const editing = computed<Look>(() => draft.value.looks.find(item => item.id === selectedId.value) ?? draft.value.looks[0]!)
  // Every change is seen at once, on the whole editor.
  watch(editing, value => applyLook(value), { deep: true, immediate: true })
  // A scheme picked on the top bar is the one edited here, too.
  watch(() => look.value.id, id => {
    selectedId.value = id
    applyLook(editing.value)
  })

  function select (id: string) {
    selectedId.value = id
    // A scheme already in the kit also becomes this browser's choice.
    if (saved.value.looks.some(item => item.id === id)) {
      setLook(id)
    }
  }

  function addLook () {
    let n = 1
    while (draft.value.looks.some(item => item.id === `scheme-${n}`)) n++
    draft.value.looks.push({ ...clone(editing.value), id: `scheme-${n}`, name: `Нова схема ${n}`, description: '' })
    selectedId.value = `scheme-${n}`
  }
  function removeLook () {
    if (draft.value.looks.length < 2) return
    draft.value.looks = draft.value.looks.filter(item => item.id !== editing.value.id)
    if (!draft.value.looks.some(item => item.id === draft.value.default)) {
      draft.value.default = draft.value.looks[0]!.id
    }
    selectedId.value = draft.value.default
  }
  function resetDraft () {
    draft.value = clone(saved.value)
    if (!draft.value.looks.some(item => item.id === selectedId.value)) {
      selectedId.value = draft.value.default
    }
  }

  const saving = ref(false)
  const saveMessage = ref('')
  async function saveLooks () {
    saving.value = true
    saveMessage.value = ''
    try {
      const response = await fetch(`${location.origin}/__editor-api__/editor-looks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft.value),
      })
      if (!response.ok) {
        throw new Error(response.statusText || `HTTP ${response.status}`)
      }
      saved.value = clone(draft.value)
      saveMessage.value = 'Збережено в packages/editor-ui/src/looks.json'
    } catch (error) {
      saveMessage.value = `Не вдалося зберегти: ${error instanceof Error ? error.message : String(error)}`
    } finally {
      saving.value = false
    }
  }

  // Leaving with unsaved changes: the editor goes back to the chosen scheme
  // as it is saved.
  onBeforeUnmount(() => applyLook(look.value))

  const fontOptions = Object.entries(FONTS).map(([value, font]) => ({ value: value as Look['font'], label: font.name }))

  const COLOR_GROUPS: { title: string, colors: [keyof LookColors, string][] }[] = [
    { title: 'Поверхні', colors: [['bg', 'Фон екрана'], ['surface', 'Панелі, меню'], ['surface-muted', 'Приглушена'], ['surface-sunken', 'Заглиблена'], ['border', 'Лінії'], ['border-strong', 'Виразні лінії']] },
    { title: 'Текст', colors: [['text', 'Основний'], ['text-muted', 'Другорядний'], ['text-subtle', 'Підказки']] },
    { title: 'Акцент', colors: [['primary', 'Акцент'], ['primary-hover', 'Під курсором'], ['primary-soft', 'М’який фон'], ['on-primary', 'Текст на акценті'], ['focus', 'Рамка фокусу']] },
    { title: 'Стани', colors: [['danger', 'Небезпека'], ['danger-soft', 'Фон небезпеки'], ['success', 'Успіх'], ['warning', 'Попередження']] },
    { title: 'Верхня панель', colors: [['topbar-bg', 'Фон'], ['topbar-text', 'Текст'], ['topbar-muted', 'Іконки, підписи'], ['topbar-border', 'Нижня лінія'], ['topbar-hover', 'Під курсором']] },
    { title: 'Редагування сторінки', colors: [['block-outline', 'Рамка блоку'], ['backdrop', 'Затемнення під вікнами']] },
  ]

  // --- the sample page ---------------------------------------------------------

  const mode = ref<'preview' | 'edit' | 'drag'>('edit')
  const locale = ref('uk')
  const hidden = ref([
    { id: 'faq', label: 'Часті питання' },
    { id: 'gallery', label: 'Галерея' },
  ])
  const activeBlock = ref<string | null>('about')
  const flashing = ref<string | null>(null)
  const lastAction = ref('')

  function restore (id: string) {
    hidden.value = hidden.value.filter(item => item.id !== id)
    flashing.value = id
    lastAction.value = `Блок «${id}» повернуто на сторінку`
    setTimeout(() => {
      flashing.value = null
    }, 1600)
  }
</script>

<template>
  <SvePage back="/" subtitle="Набір елементів редактора · тільки під час розробки" title="Editor UI">
    <template #center>
      <SveSegmented
        v-model="mode"
        :options="[
          { value: 'preview', icon: 'mdi-eye-outline', title: 'Перегляд' },
          { value: 'edit', icon: 'mdi-pencil-outline', title: 'Редагування' },
          { value: 'drag', icon: 'mdi-cursor-move', title: 'Переміщення' },
        ]"
      />
    </template>

    <div class="sve-ui showcase">
      <!-- The looks -->
      <section>
        <div class="showcase-heading">Схеми оформлення редактора</div>
        <p class="showcase-text">
          Користувачі перемикаються між ними кнопкою з палітрою у верхній панелі. Тут їх налаштовують: оберіть схему - зміни одразу видно на всьому редакторі, а «Зберегти» записує їх у пакет.
        </p>
        <div class="showcase-looks">
          <div
            v-for="item of draft.looks"
            :key="item.id"
            :aria-checked="editing.id === item.id"
            :class="['showcase-look', { 'showcase-look--active': editing.id === item.id }]"
            role="radio"
            :style="lookVariables(item)"
            tabindex="0"
            @click="select(item.id)"
            @keydown.enter.prevent="select(item.id)"
          >
            <div class="showcase-look__bar">
              <span class="showcase-look__dot" />
              <span class="showcase-look__line" />
              <span class="showcase-look__btn" />
            </div>
            <div class="showcase-look__body">
              <div class="showcase-look__card">
                <span class="showcase-look__line showcase-look__line--long" />
                <span class="showcase-look__line" />
              </div>
              <div class="showcase-look__swatches">
                <span v-for="key in ['primary', 'text', 'surface-sunken', 'danger']" :key="key" :style="{ background: item.colors[key as 'primary'] }" />
              </div>
            </div>
            <div class="showcase-look__name">
              {{ item.name }}
              <SveBadge v-if="draft.default === item.id">типова</SveBadge>
            </div>
            <div class="showcase-look__text">{{ item.description }}</div>
          </div>
        </div>
      </section>

      <!-- The chosen scheme's settings -->
      <section>
        <div class="showcase-heading">Налаштування схеми «{{ editing.name }}»</div>
        <div class="showcase-row showcase-actions">
          <SveButton
            :disabled="!dirty"
            icon="mdi-content-save-outline"
            :loading="saving"
            variant="primary"
            @click="saveLooks"
          >Зберегти</SveButton>
          <SveButton :disabled="!dirty" icon="mdi-undo-variant" @click="resetDraft">Скасувати зміни</SveButton>
          <SveButton icon="mdi-content-copy" variant="ghost" @click="addLook">Копія як нова схема</SveButton>
          <SveButton :disabled="draft.default === editing.id" icon="mdi-star-outline" variant="ghost" @click="draft.default = editing.id">Зробити типовою</SveButton>
          <SveButton :disabled="draft.looks.length < 2" icon="mdi-delete-outline" variant="danger" @click="removeLook">Видалити схему</SveButton>
          <span class="showcase-text showcase-text--small">{{ saveMessage || (dirty ? 'Є незбережені зміни' : '') }}</span>
        </div>

        <div class="showcase-settings">
          <SvePanel title="Загальне">
            <div class="showcase-fields">
              <SveTextField v-model="editing.name" label="Назва" />
              <SveTextField v-model="editing.description" label="Опис" :rows="2" />
              <div class="sve-field">
                <span class="sve-field__label">Шрифт</span>
                <SveSegmented v-model="editing.font" :options="fontOptions" />
              </div>
            </div>
          </SvePanel>
          <SvePanel title="Форма і розміри">
            <div class="showcase-fields showcase-fields--two">
              <SveNumberField v-model="editing.radius.sm" label="Заокруглення, мале" :max="40" />
              <SveNumberField v-model="editing.radius.md" label="Заокруглення, середнє" :max="40" />
              <SveNumberField v-model="editing.radius.lg" label="Заокруглення, велике" :max="40" />
              <SveNumberField
                v-model="editing.control"
                hint="Висота кнопок і полів"
                label="Елементи"
                :max="64"
                :min="24"
              />
              <SveNumberField v-model="editing.topbarHeight" label="Верхня панель" :max="96" :min="40" />
            </div>
          </SvePanel>
          <SvePanel title="Тіні">
            <div class="showcase-fields">
              <SveTextField v-model="editing.shadow.sm" label="Мала" mono />
              <SveTextField v-model="editing.shadow.md" label="Середня" mono />
              <SveTextField v-model="editing.shadow.lg" label="Велика (меню, вікна)" mono />
            </div>
          </SvePanel>
          <SvePanel v-for="group of COLOR_GROUPS" :key="group.title" :title="group.title">
            <div class="showcase-fields showcase-fields--two">
              <SveColorField v-for="[key, label] of group.colors" :key="key" v-model="editing.colors[key]" :label="label" />
            </div>
          </SvePanel>
        </div>
      </section>

      <!-- A page being edited -->
      <section>
        <div class="showcase-heading">Сторінка в режимі редагування</div>
        <p class="showcase-text">
          Наведіть на блок - з’явиться рамка і кнопка налаштувань у правому верхньому куті. Активний блок обведено.
        </p>
        <div class="showcase-canvas">
          <div class="showcase-canvas__bar">
            <SveMenu v-if="hidden.length > 0">
              <template #activator="{ props }">
                <SveButton icon="mdi-eye-off-outline" size="sm" variant="secondary" v-bind="props">
                  Приховані блоки <SveBadge>{{ hidden.length }}</SveBadge>
                </SveButton>
              </template>
              <SveMenuLabel>Повернути на сторінку</SveMenuLabel>
              <SveMenuItem v-for="item of hidden" :key="item.id" icon="mdi-eye-outline" @click="restore(item.id)">
                {{ item.label }}
              </SveMenuItem>
            </SveMenu>
            <span class="showcase-text showcase-text--small">{{ lastAction }}</span>
          </div>
          <div
            v-for="block of ['about', 'faq', 'gallery']"
            v-show="!hidden.some(item => item.id === block)"
            :key="block"
            :class="['sve-block', 'showcase-block', { 'sve-block--active': activeBlock === block, 'sve-block--flash': flashing === block }]"
          >
            <div class="sve-block__settings">
              <SveMenu>
                <template #activator="{ props }">
                  <SveIconButton icon="mdi-cog-outline" label="Налаштування блоку" variant="soft" v-bind="props" />
                </template>
                <SveMenuItem icon="mdi-pencil-outline" @click="activeBlock = block">Редагувати</SveMenuItem>
                <SveMenuItem icon="mdi-eye-off-outline" @click="hidden.push({ id: block, label: block })">Приховати</SveMenuItem>
                <SveMenuDivider />
                <SveMenuItem danger icon="mdi-delete-outline">Видалити</SveMenuItem>
              </SveMenu>
            </div>
            <div class="showcase-block__title">{{ block === 'about' ? 'Про компанію' : block === 'faq' ? 'Часті питання' : 'Галерея' }}</div>
            <div class="showcase-block__line" />
            <div class="showcase-block__line showcase-block__line--short" />
          </div>
        </div>
      </section>

      <!-- Controls -->
      <section class="showcase-grid">
        <SvePanel title="Кнопки">
          <div class="showcase-row">
            <SveButton variant="primary">Зберегти</SveButton>
            <SveButton>Скасувати</SveButton>
            <SveButton variant="ghost">Детальніше</SveButton>
            <SveButton variant="danger">Видалити</SveButton>
          </div>
          <div class="showcase-row">
            <SveButton icon="mdi-plus" size="sm" variant="primary">Малий</SveButton>
            <SveButton icon="mdi-plus" variant="primary">Звичайний</SveButton>
            <SveButton icon="mdi-plus" size="lg" variant="primary">Великий</SveButton>
          </div>
          <div class="showcase-row">
            <SveButton loading variant="primary">Зберігаю</SveButton>
            <SveButton disabled>Недоступна</SveButton>
            <SveButton icon-end="mdi-chevron-down">З меню</SveButton>
          </div>
        </SvePanel>

        <SvePanel title="Кнопки-іконки">
          <div class="showcase-row">
            <SveIconButton icon="mdi-format-bold" label="Жирний" />
            <SveIconButton active icon="mdi-format-italic" label="Курсив" />
            <SveIconButton icon="mdi-link-variant" label="Посилання" />
            <SveIconButton danger icon="mdi-delete-outline" label="Видалити" />
          </div>
          <div class="showcase-row">
            <SveIconButton icon="mdi-cog-outline" label="Налаштування" variant="soft" />
            <SveIconButton icon="mdi-cog-outline" label="Налаштування" size="sm" variant="soft" />
            <SveIconButton disabled icon="mdi-undo" label="Скасувати" />
          </div>
        </SvePanel>

        <SvePanel title="Перемикачі">
          <div class="showcase-row">
            <SveSegmented v-model="locale" :options="[{ value: 'uk', label: 'UK' }, { value: 'en', label: 'EN' }, { value: 'de', label: 'DE' }]" />
          </div>
          <div class="showcase-row">
            <SveSegmented
              v-model="mode"
              :options="[
                { value: 'preview', icon: 'mdi-eye-outline', label: 'Перегляд' },
                { value: 'edit', icon: 'mdi-pencil-outline', label: 'Редагування' },
                { value: 'drag', icon: 'mdi-cursor-move', label: 'Переміщення' },
              ]"
            />
          </div>
        </SvePanel>

        <SvePanel title="Меню">
          <template #actions>
            <SveBadge>3</SveBadge>
          </template>
          <SveMenu location="bottom start">
            <template #activator="{ props }">
              <SveButton icon-end="mdi-chevron-down" v-bind="props">Відкрити меню</SveButton>
            </template>
            <SveMenuLabel>Блок</SveMenuLabel>
            <SveMenuItem hint="E" icon="mdi-pencil-outline">Редагувати</SveMenuItem>
            <SveMenuItem icon="mdi-content-copy">Дублювати</SveMenuItem>
            <SveMenuItem disabled icon="mdi-arrow-up">Вище</SveMenuItem>
            <SveMenuDivider />
            <SveMenuItem danger icon="mdi-delete-outline">Видалити</SveMenuItem>
          </SveMenu>
        </SvePanel>
      </section>

    </div>
  </SvePage>
</template>

<style scoped>
/* Layout of this page only - every control on it is styled by the kit. */
.showcase {
  display: flex;
  flex-direction: column;
  gap: 40px;
  max-width: 1200px;
}
.showcase-heading {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
}
.showcase-text {
  color: var(--sve-text-muted);
  font-size: 14px;
  margin: 0 0 16px;
}
.showcase-text--small { font-size: 13px; margin: 0; }
.showcase-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.showcase-row + .showcase-row { margin-top: 14px; }
.showcase-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  gap: 20px;
}

/* look cards - each painted with its own look's variables */
.showcase-looks {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 20px;
}
.showcase-look {
  padding: 14px;
  border: solid 2px var(--sve-border);
  border-radius: var(--sve-radius-lg);
  background: var(--sve-surface);
  font-family: var(--sve-font);
  color: var(--sve-text);
  cursor: pointer;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
.showcase-look:hover { box-shadow: var(--sve-shadow-md); }
.showcase-look--active { border-color: var(--sve-primary); box-shadow: 0 0 0 4px var(--sve-focus); }
.showcase-look__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 10px;
  border-radius: var(--sve-radius-sm) var(--sve-radius-sm) 0 0;
  background: var(--sve-topbar-bg);
  border: solid 1px var(--sve-topbar-border);
}
.showcase-look__dot { width: 10px; height: 10px; border-radius: 50%; background: var(--sve-topbar-muted); }
.showcase-look__btn { margin-left: auto; width: 42px; height: 14px; border-radius: var(--sve-radius-sm); background: var(--sve-primary); }
.showcase-look__line { display: block; width: 60px; height: 6px; border-radius: 3px; background: var(--sve-text-subtle); opacity: 0.6; }
.showcase-look__line--long { width: 120px; background: var(--sve-text); opacity: 0.8; margin-bottom: 8px; }
.showcase-look__body {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 14px 10px;
  background: var(--sve-bg);
  border: solid 1px var(--sve-border);
  border-top: none;
  border-radius: 0 0 var(--sve-radius-sm) var(--sve-radius-sm);
}
.showcase-look__card {
  padding: 12px;
  background: var(--sve-surface);
  border: solid 1px var(--sve-border);
  border-radius: var(--sve-radius-md);
  box-shadow: var(--sve-shadow-sm);
}
.showcase-look__swatches { display: flex; gap: 4px; }
.showcase-look__swatches span { width: 16px; height: 16px; border-radius: 50%; border: solid 1px var(--sve-border); }
.showcase-look__name { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 16px; font-weight: 700; }
.showcase-look__text { margin-top: 4px; font-size: 13px; line-height: 1.45; color: var(--sve-text-muted); }

/* the sample page */
.showcase-canvas {
  padding: 20px clamp(12px, 3vw, 32px) 32px;
  background: #FFFFFF;
  border: solid 1px var(--sve-border);
  border-radius: var(--sve-radius-lg);
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.showcase-canvas__bar { display: flex; align-items: center; gap: 12px; min-height: 32px; }
.showcase-block { padding: 20px; background: #FAFAFA; }
.showcase-block__title { font-size: 22px; font-weight: 700; color: #222; margin-bottom: 12px; }
.showcase-block__line { height: 10px; border-radius: 5px; background: #E2E2E2; margin-bottom: 8px; }
.showcase-block__line--short { width: 60%; }

/* scheme settings */
.showcase-actions { margin-bottom: 16px; }
.showcase-settings {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  gap: 20px;
  align-items: start;
}
.showcase-fields { display: flex; flex-direction: column; gap: 14px; }
.showcase-fields--two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 12px; }
@media (max-width: 420px) {
  .showcase-fields--two { grid-template-columns: minmax(0, 1fr); }
}
</style>
