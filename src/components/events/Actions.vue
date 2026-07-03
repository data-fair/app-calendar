<script setup lang="ts">
import { useConfig } from '@/composables/config'

defineProps({
  item: { type: Object, required: true }
})

const { linkField, attachmentField, dataset: mainDataset } = useConfig()

function displayBytes (bytes : number) {
  const sizes = ['Octets', 'Ko', 'Mo', 'Go']
  if (bytes === 0) return '0 Octet'
  const i = parseInt(String(Math.floor(Math.log(bytes) / Math.log(1000))))
  if (i === 0) return `${bytes} ${sizes[i]}`
  return `${(bytes / (1000 ** i)).toFixed(2)} ${sizes[i]}`
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
      Page associée
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
          v-bind="props"
        >
          <v-icon>mdi-download</v-icon>
        </v-btn>
      </template>
      <span>Télécharger le fichier de {{ displayBytes(item['_file.content_length']) }}</span>
    </v-tooltip>
    <v-spacer />
  </v-card-actions>
</template>
