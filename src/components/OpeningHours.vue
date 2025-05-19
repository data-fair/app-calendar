<script setup>
import { computed, ref } from 'vue'
import { getDailyOpeningHours, encodeOpeningHours } from '@wojtekmaj/opening-hours-utils'

const model = defineModel({ type: String, default: '' })

const menuOpen = ref(null)
const dayEdit = ref(null)
const rangeEdit = ref(null)
const startTime = ref(null)
const endTime = ref(null)

const days = [
  { id: 'Mo', title: 'Lundi' },
  { id: 'Tu', title: 'Mardi' },
  { id: 'We', title: 'Mercredi' },
  { id: 'Th', title: 'Jeudi' },
  { id: 'Fr', title: 'Vendredi' },
  { id: 'Sa', title: 'Samedi' },
  { id: 'Su', title: 'Dimanche' }
]

const openingHours = computed(() => {
  return Object.assign({}, ...(getDailyOpeningHours(model.value) || []).map(d => ({ [d.day]: d.hours })))
})

function time2Int (time) {
  const [hours, minutes] = time.split(':')
  return Number(hours) * 60 + Number(minutes)
}

function updateOpeningHours (mode) {
  if (!startTime.value || !endTime.value) return
  const currentOH = getDailyOpeningHours(model.value) || []
  let currentDay = currentOH.find(oh => oh.day === dayEdit.value.id)
  if (!currentDay) {
    currentDay = { day: dayEdit.value.id, hours: [] }
    currentOH.push(currentDay)
  }
  if (mode === 'create') {
    currentDay.hours.push({ from: startTime.value, to: endTime.value })
  } else if (mode === 'update') {
    currentDay.hours[rangeEdit.value] = { from: startTime.value, to: endTime.value }
  } else if (mode === 'delete') {
    currentDay.hours.splice(rangeEdit.value, 1)
    if (!currentDay.hours.length) {
      const idx = currentOH.findIndex(oh => oh.day === dayEdit.value.id)
      currentOH.splice(idx, 1)
    }
  }
  const newOH = [].concat(...currentOH.map(d => {
    d.hours.sort((a, b) => a.from.localeCompare(b.from))
    const merged = [d.hours[0]]
    for (let i = 1; i < d.hours.length; i++) {
      const current = d.hours[i]
      const previous = merged[merged.length - 1]

      if (current.from.localeCompare(previous.to) <= 0) {
        previous.to = previous.to.localeCompare(current.to) < 0 ? current.to : previous.to
      } else {
        merged.push(current)
      }
    }
    return { from: d.day, to: d.day, hours: merged }
  }))
  model.value = encodeOpeningHours(newOH)
  startTime.value = null
  endTime.value = null
  dayEdit.value = null
  rangeEdit.value = null
  menuOpen.value = false
}

</script>

<template>
  <!-- Horaires hebdomadaires : {{ model }} -->
  <v-row style="min-width:490px">
    <div
      v-for="day in days"
      :key="day.id"
      style="width:14%;padding-left: 1px;padding-right: 1px;"
      class="text-center"
    >
      {{ day.title }}
      <v-sheet
        :id="`menu-activator-${day.id}`"
        height="240"
        color="grey-lighten-3"
        @click="dayEdit = day;menuOpen = true"
      />
      <v-sheet
        v-for="(range, i) in (openingHours[day.id] || [])"
        :id="`menu-activator-${day.id}-${i}`"
        :key="i"
        position="absolute"
        :style="`width:13%;margin-left: 0.5%;margin-top: ${time2Int(range.from)/6-240}px`"
        :height="(time2Int(range.to)-time2Int(range.from))/6"
        color="primary"
        class="d-flex flex-column"
        @click="dayEdit = day;rangeEdit=i;startTime=range.from;endTime=range.to;menuOpen = true"
      >
        <caption class="text-caption">
          {{ range.from }}
        </caption>
        <v-spacer />
        <caption class="text-caption">
          {{ range.to }}
        </caption>
      </v-sheet>
    </div>
  </v-row>
  <v-menu
    v-model="menuOpen"
    persistent
    :close-on-content-click="false"
    :activator="`#menu-activator-${dayEdit?.id}`+ (rangeEdit != null ? ('-' + rangeEdit): '')"
    location="center"
  >
    <v-card>
      <v-card-title> {{ dayEdit?.title }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="startTime"
          label="Horaire de début"
          type="time"
          density="compact"
        />
        <v-text-field
          v-model="endTime"
          label="Horaire de fin"
          type="time"
          density="compact"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          @click="dayEdit = null;rangeEdit=null;menuOpen = false"
        >
          Annuler
        </v-btn>
        <v-btn
          v-if="rangeEdit != null"
          color="warning"
          @click="updateOpeningHours('delete')"
        >
          Supprimer
        </v-btn>
        <v-btn
          color="primary"
          @click="updateOpeningHours(rangeEdit != null ? 'update' : 'create')"
        >
          Valider
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
