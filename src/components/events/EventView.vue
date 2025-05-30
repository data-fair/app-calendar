<script setup>
import useAppInfo from '../../composables/useAppInfo'
import { formatField } from '@data-fair/lib-vue/format/field.js'
import Actions from './Actions.vue'

defineProps({
  item: { type: Object, required: true }
})

const { config, labelField, descriptionField, imageField, attachmentField, linkField, fields } = useAppInfo()
</script>

<template>
  <template v-if="imageField">
    <v-img
      v-if="item[imageField]"
      :src="item._thumbnail || item[imageField]"
      :aspect-ratio="config.aspectRatio || 3"
      :cover="config.imageDisplay !== 'contain'"
      :style="`width:${config.imageWidth || 100}%${config.imagePosition !== 'top' ? ';float:' + config.imagePosition :''}`"
    />
  </template>
  <v-card-text class="pt-0">
    <h3
      v-if="labelField && item[labelField]"
      class="my-2"
      v-html="item[labelField]"
    />
    <div
      v-if="descriptionField && item[descriptionField]"
      v-html="item[descriptionField]"
    />
    <v-list
      dense
      class="transparent"
      lines="two"
    >
      <v-list-item
        v-for="field in config.additionalFields.filter(f => !!item[f])"
        :key="field"
        style="min-height:24px;max-width:100%"
      >
        <v-list-item-subtitle class="font-weight-bold">
          {{ fields[field].title ? fields[field].title : (fields[field]['x-originalName'] || field) }}
        </v-list-item-subtitle>
        <div style="white-space: normal;">
          <template v-if="!fields[field].separator">
            <div
              v-if="fields[field]['x-display'] === 'markdown'"
              v-html="item[field]"
            />
            <template v-else>
              {{ (formatField(item, fields[field]) + '') }}
            </template>
          </template>
          <template
            v-for="value in item[field].split(fields[field].separator).sort()"
            v-else-if="item[field]"
            :key="value"
          >
            <v-chip
              small
              style="flex:none"
              class="my-1 mr-1"
              variant="flat"
            >
              {{ (formatField({ [field]: value }, fields[field]) + '') }}
            </v-chip>
          </template>
        </div>
      </v-list-item>
    </v-list>
  </v-card-text>
  <actions
    v-if="attachmentField || linkField"
    :item="item"
  />
</template>
