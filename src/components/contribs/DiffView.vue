<script setup>
import { computed } from 'vue'
import { computedAsync } from '@vueuse/core'
import { ofetch } from 'ofetch'
import useAppInfo from '@/composables/useAppInfo'
import diff from 'fast-diff'

const { fields, mainDataset } = useAppInfo()

const props = defineProps({
  item: { type: Object, required: true },
  old: { type: Object, required: true }
})

const original = computedAsync(async () => {
  if (Object.keys(props.old).length > 1) return props.old
  else return (await ofetch(`${(mainDataset).href}/lines?_id_eq=${props.old.id}`)).results.pop()
}, null)

const keys = computed(() => Object.keys(props.item || {}).concat(Object.keys(original.value || {})).filter((k, i, s) => s.indexOf(k) === i && !k.startsWith('_'))
)
</script>

<template>
  <v-card
    v-for="key in keys"
    :key="key"
    class="px-2"
    flat
  >
    <div class="caption grey--text text--darken-1 pt-2">
      {{ fields[key].title ? fields[key].title : (fields[key]['x-originalName'] || key) }}
    </div>
    <span
      v-for="(dif, i) in diff(([original?.[key]].join('')).replace(/\r\n/g, '\n'), ([item?.[key]].join('')).replace(/\r\n/g, '\n'))"
      :key="i"
      :style="'white-space: pre-wrap;' + (dif[0] ? `background:${dif[0] > 0 ? 'lightgreen' : 'lightcoral'}` : '')"
    >{{
      dif[0]
        ? dif[1].replace(/\n/g, '\n&nbsp;') : dif[1] }}</span>
  </v-card>
</template>

<style></style>
