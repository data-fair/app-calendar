<script setup>
import Vjsf from '@koumoul/vjsf'
import VjsfMarkdown from '@koumoul/vjsf-markdown'
import { v2compat } from '@koumoul/vjsf/compat/v2'
import { ofetch } from 'ofetch'

import { ref, computed } from 'vue'
import { VDateInput } from 'vuetify/labs/VDateInput'
import useAppInfo from '@/composables/useAppInfo'
import { useDisplay } from 'vuetify'

const { config, mainDataset, startDateField, endDateField, dateField } = useAppInfo()
const { width } = useDisplay()

const props = defineProps({
  item: { type: Object, required: true }
})

const emit = defineEmits(['cancel', 'validate'])
const data = ref({ ...props.item })
const form = ref(null)

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

const attachment = Object.values(schema.properties).find(f => f['x-concept']?.id === 'attachment')
if (attachment) {
  attachment.readOnly = true
  schema.properties.__file = {
    title: mainDataset.attachmentsAsImage ? 'Image' : 'Document numérique attaché',
    type: 'object',
    layout: 'file-input'
  }
}

const startDate = ref(new Date(props.item[startDateField && endDateField ? startDateField : dateField]))
const endDate = ref(new Date(props.item[startDateField && endDateField ? endDateField : dateField]))
const startTime = ref(new Date(props.item[startDateField && endDateField ? startDateField : dateField]).toTimeString().slice(0, 5))
const endTime = ref(new Date(props.item[startDateField && endDateField ? endDateField : dateField]).toTimeString().slice(0, 5))

const mergedData = computed(() => {
  const merged = { ...data.value }
  if (startDateField && endDateField) {
    const start = new Date(startDate.value.getTime())
    start.setHours(startTime.value.slice(0, 2))
    start.setMinutes(startTime.value.slice(3, 5))
    const end = new Date(endDate.value.getTime())
    end.setHours(endTime.value.slice(0, 2))
    end.setMinutes(endTime.value.slice(3, 5))
    merged[startDateField] = start.toISOString()
    merged[endDateField] = end.toISOString()
  } else if (dateField) merged[dateField] = startDate.value.toISOString()
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
        :cols="formWidth < 500 ? 6 : 3"
        class="pr-0"
      >
        <v-date-input
          v-model="startDate"
          label="Date de début"
          density="compact"
        />
      </v-col>
      <v-col
        v-if="(startDateField && endDateField) && !dateField"
        :cols="formWidth < 500 ? 6 : 3"
      >
        <v-text-field
          v-model="startTime"
          label="Horaire de début"
          type="time"
          density="compact"
        />
      </v-col>
      <v-col
        :cols="formWidth < 500 ? 6 : 3"
        class="pr-0"
      >
        <v-date-input
          v-model="endDate"
          label="Date de fin"
          density="compact"
        />
      </v-col>
      <v-col
        :cols="formWidth < 500 ? 6 : 3"
      >
        <v-text-field
          v-model="endTime"
          label="Horaire de fin"
          type="time"
          density="compact"
        />
      </v-col>
    </v-row>
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
      color="warning"
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
