<script setup>
import Vjsf from '@koumoul/vjsf'
import VjsfMarkdown from '@koumoul/vjsf-markdown'
import { v2compat } from '@koumoul/vjsf/compat/v2'
import { ofetch } from 'ofetch'
import OpeningHoursEdit from '../OpeningHours.vue'

import { ref, computed, watch } from 'vue'
import { VDateInput } from 'vuetify/labs/VDateInput'
import useAppInfo from '@/composables/useAppInfo'
import { useDisplay } from 'vuetify'
import { dayjs } from '@data-fair/lib/vue/locale-dayjs-global.js'

const { config, mainDataset, startDateField, endDateField, dateField, openingHoursField, startDateType, endDateType, dateType } = useAppInfo()
const { width } = useDisplay()

const props = defineProps({
  item: { type: Object, required: true }
})

const emit = defineEmits(['cancel', 'validate'])
const data = ref(null)
const form = ref(null)
const startDate = ref(null)
const endDate = ref(null)
const startTime = ref(null)
const endTime = ref(null)
const openingHours = ref(null)

watch(() => props.item, item => {
  data.value = { ...item }
  startDate.value = new Date(props.item[startDateField && endDateField ? startDateField : dateField])
  endDate.value = new Date(props.item[startDateField && endDateField ? endDateField : dateField])
  startTime.value = new Date(props.item[startDateField && endDateField ? startDateField : dateField]).toTimeString().slice(0, 5)
  endTime.value = new Date(props.item[startDateField && endDateField ? endDateField : dateField]).toTimeString().slice(0, 5)
  if (openingHoursField) openingHours.value = props.item[openingHoursField]
}, { immediate: true })

const options = { plugins: [VjsfMarkdown], pluginsOptions: { markdown: { easyMDEOptions: { minHeight: '150px' } } }, density: config.formDensity, titleDepth: 3, locale: 'fr', removeAdditional: true }
const v2Schema = (await ofetch(mainDataset.href + '/safe-schema?mimeType=application%2Fschema%2Bjson'))
const schema = v2compat(v2Schema)
Object.entries(schema.properties).forEach(([key, value]) => {
  if (!value.title) value.title = key
})
if (startDateField && endDateField) {
  delete schema.properties[startDateField]
  delete schema.properties[endDateField]
} else if (dateField) delete schema.properties[dateField]
if (!config.showHelpMessages) Object.values(schema.properties).forEach(p => delete p.description)
if (openingHoursField) delete schema.properties[openingHoursField]

const attachment = Object.values(schema.properties).find(f => f['x-concept']?.id === 'attachment')
if (attachment) {
  attachment.readOnly = true
  schema.properties.__file = {
    title: mainDataset.attachmentsAsImage ? 'Image' : 'Document numérique attaché',
    type: 'object',
    layout: 'file-input'
  }
}

const mergedData = computed(() => {
  const merged = { ...data.value }
  if (startDateField && endDateField) {
    const start = new Date(startDate.value.getTime())
    if (startDateType === 'date-time') {
      start.setHours(startTime.value.slice(0, 2))
      start.setMinutes(startTime.value.slice(3, 5))
    }
    const end = new Date(endDate.value.getTime())
    if (endDateType === 'date-time') {
      end.setHours(endTime.value.slice(0, 2))
      end.setMinutes(endTime.value.slice(3, 5))
    }
    merged[startDateField] = startDateType === 'date' ? dayjs(start).format('YYYY-MM-DD') : start.toISOString()
    merged[endDateField] = endDateType === 'date' ? dayjs(end).format('YYYY-MM-DD') : end.toISOString()
  } else if (dateField) merged[dateField] = dateType === 'date' ? dayjs(startDate.value).format('YYYY-MM-DD') : startDate.value.toISOString()
  if (openingHoursField) merged[openingHoursField] = openingHours.value
  return merged
})

const formWidth = Math.max(200, width.value * config.formWidth / 10)

</script>

<template>
  <v-card-text>
    <v-row
      align="end"
    >
      <v-col
        :cols="(formWidth < 500 ? 6 : 3)*((startDateField && endDateField && startDateType === 'date-time') && !dateField ? 1 : 2)"
        class="pr-0"
      >
        <v-date-input
          v-model="startDate"
          label="Date de début"
          density="compact"
        />
      </v-col>
      <v-col
        v-if="(startDateField && endDateField && startDateType === 'date-time') && !dateField"
        :cols="formWidth < 500 ? 6 : 3"
      >
        <v-text-field
          v-model="startTime"
          label="Horaire de début"
          type="time"
          density="compact"
        />
      </v-col>
      <template v-if="(startDateField && endDateField) && !dateField">
        <v-col
          :cols="(formWidth < 500 ? 6 : 3)*(endDateType === 'date-time' ? 1 : 2)"
          class="pr-0"
        >
          <v-date-input
            v-model="endDate"
            label="Date de fin"
            density="compact"
          />
        </v-col>
        <v-col
          v-if="endDateType === 'date-time'"
          :cols="formWidth < 500 ? 6 : 3"
        >
          <v-text-field
            v-model="endTime"
            label="Horaire de fin"
            type="time"
            density="compact"
          />
        </v-col>
      </template>
    </v-row>
    <opening-hours-edit
      v-if="openingHoursField"
      v-model="openingHours"
    />
    <v-form ref="form">
      <vjsf
        v-model="data"
        :schema="schema"
        :options="options"
      />
    </v-form>
  </v-card-text>
  <v-card-actions
    class="py-0"
  >
    <v-spacer />
    <v-btn
      @click="emit('cancel')"
    >
      Annuler
    </v-btn>
    <v-spacer />
    <v-btn
      color="primary"
      :disabled="!form?.validate()"
      @click="emit('validate', mergedData)"
    >
      Valider
    </v-btn>
    <v-spacer />
  </v-card-actions>
</template>
