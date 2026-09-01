<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useConfig } from '@/composables/config'

defineProps({
  item: { type: Object, required: true }
})

const { t } = useI18n()
const { linkField, attachmentField, dataset: mainDataset } = useConfig()

const unitKeys = ['byte', 'kilobyte', 'megabyte', 'gigabyte']

function displayBytes (bytes : number) {
  if (bytes === 0) return t('actions.zeroByte')
  const i = parseInt(String(Math.floor(Math.log(bytes) / Math.log(1000))))
  if (i === 0) return `${bytes} ${t(`actions.${unitKeys[i]}`)}`
  return `${(bytes / (1000 ** i)).toFixed(2)} ${t(`actions.${unitKeys[i]}`)}`
}

</script>
<template>
  <v-card-actions>
    <v-spacer />
    <v-btn
      v-if="linkField && item[linkField]"
      :href="(!item[linkField].includes('http') ? 'http://' : '') + item[linkField]"
      variant="text"
      size="small"
      target="_blank"
      class="px-6"
      color="primary"
    >
      {{ t('actions.relatedPage') }}
    </v-btn>
    <v-tooltip
      v-if="attachmentField"
      location="top"
    >
      <template #activator="{ props }">
        <v-btn
          :href="item[attachmentField.key].includes('http') ? item[attachmentField.key] : mainDataset?.href + '/attachments/' + item[attachmentField.key]"
          color="accent"
          icon
          :aria-label="t('actions.downloadSize', { size: displayBytes(item['_file.content_length']) })"
          v-bind="props"
        >
          <v-icon>mdi-download</v-icon>
        </v-btn>
      </template>
      <span>{{ t('actions.downloadSize', { size: displayBytes(item['_file.content_length']) }) }}</span>
    </v-tooltip>
    <v-spacer />
  </v-card-actions>
</template>
