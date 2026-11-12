<script setup lang="ts">
  import type { DockCall } from '@sve/dock'
  import ClientApiParams from '@/components/editors/client-api/ClientApiParams.vue'
  import { t } from '@/i18n'

  // One call to the client's API: the address, the method, and the values
  // it carries - in the address (query) and, for POST/PUT, in the body.
  const call = defineModel<DockCall>({ required: true })
  defineProps<{
    keys: string[]
    // the methods this call may use: a list or the free days are read (GET),
    // a session is created (POST/PUT)
    methods: DockCall['method'][]
  }>()
</script>

<template>
  <div class="dock-call">
    <div class="dock-call-line">
      <v-select
        v-model="call.method"
        class="dock-call-method"
        density="compact"
        hide-details
        :items="methods"
        variant="outlined"
      />
      <v-text-field
        v-model="call.url"
        class="dock-call-url"
        density="compact"
        hide-details
        :label="t('clientApi.url')"
        placeholder="https://api.example.com/v1/…"
        variant="outlined"
      />
    </div>
    <p class="dock-call-caption">{{ t('clientApi.query') }}</p>
    <ClientApiParams v-model="call.query" :keys="keys" />
    <template v-if="call.method && call.method !== 'GET'">
      <p class="dock-call-caption">{{ t('clientApi.body') }}</p>
      <ClientApiParams v-model="call.body" :keys="keys" nested />
    </template>
  </div>
</template>

<style scoped>
.dock-call {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dock-call-line {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 8px;
}
.dock-call-caption {
  margin: 8px 0 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #3A4A58;
}
</style>
