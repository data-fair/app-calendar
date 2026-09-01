<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getDailyOpeningHours, encodeOpeningHours } from '@wojtekmaj/opening-hours-utils'
import type { WeekdayName, RecurringOpeningHours } from '@wojtekmaj/opening-hours-utils'

const { t } = useI18n()
const model = defineModel({ type: String, default: '' })

const menuOpen = ref<boolean | undefined>(undefined)
const dayEdit = ref<{ id: string, title: string } | null>(null)
const rangeEdit = ref<number | null>(null)
const startTime = ref<string | null>(null)
const endTime = ref<string | null>(null)

const days = computed(() => [
  { id: 'Mo', title: t('openingHours.days.monday') },
  { id: 'Tu', title: t('openingHours.days.tuesday') },
  { id: 'We', title: t('openingHours.days.wednesday') },
  { id: 'Th', title: t('openingHours.days.thursday') },
  { id: 'Fr', title: t('openingHours.days.friday') },
  { id: 'Sa', title: t('openingHours.days.saturday') },
  { id: 'Su', title: t('openingHours.days.sunday') }
])

const openingHours = computed(() => {
  return Object.assign({}, ...(getDailyOpeningHours(model.value) || []).map(d => ({ [d.day]: d.hours })))
})

function time2Int (time: string) {
  const [hours, minutes] = time.split(':')
  return Number(hours) * 60 + Number(minutes)
}

function updateOpeningHours (mode: 'create' | 'update' | 'delete') {
  if (!startTime.value || !endTime.value || !dayEdit.value || !rangeEdit.value) return
  const dayEditValue = dayEdit.value
  const currentOH = getDailyOpeningHours(model.value) || []
  let currentDay = currentOH.find(oh => oh.day === dayEditValue.id)
  if (!currentDay) {
    currentDay = { day: dayEditValue.id as WeekdayName, hours: [] }
    currentOH.push(currentDay)
  }
  if (mode === 'create') {
    currentDay.hours.push({ from: startTime.value as `${number}:${number}`, to: endTime.value as `${number}:${number}` })
  } else if (mode === 'update') {
    currentDay.hours[rangeEdit.value] = { from: startTime.value as `${number}:${number}`, to: endTime.value as `${number}:${number}` }
  } else if (mode === 'delete') {
    currentDay.hours.splice(rangeEdit.value, 1)
    if (!currentDay.hours.length) {
      const idx = currentOH.findIndex(oh => oh.day === dayEditValue.id)
      currentOH.splice(idx, 1)
    }
  }
  const newOH = ([] as RecurringOpeningHours[]).concat(...currentOH.map(d => {
    d.hours.sort((a, b) => a.from.localeCompare(b.from))
    const merged = [d.hours[0]]
    for (let i = 1; i < d.hours.length; i++) {
      const current = d.hours[i]
      const previous = merged[merged.length - 1]

      if (current.from.localeCompare(previous.to ?? '') <= 0) {
        previous.to = (previous.to ?? '').localeCompare(current.to ?? '') < 0 ? current.to : previous.to
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

function openDay (day: { id: string, title: string }) {
  dayEdit.value = day
  menuOpen.value = true
}

function openRange (day: { id: string, title: string }, index: number, range: { from: string, to?: string }) {
  dayEdit.value = day
  rangeEdit.value = index
  startTime.value = range.from
  endTime.value = range.to ?? null
  menuOpen.value = true
}

function closeMenu () {
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
        class="opening-hours-cell"
        role="button"
        tabindex="0"
        :aria-label="day.title"
        height="240"
        color="grey-lighten-3"
        @click="openDay(day)"
        @keydown.enter.prevent="openDay(day)"
        @keydown.space.prevent="openDay(day)"
      />
      <v-sheet
        v-for="(range, i) in (openingHours[day.id] || [])"
        :id="`menu-activator-${day.id}-${i}`"
        :key="i"
        class="opening-hours-cell d-flex flex-column"
        role="button"
        tabindex="0"
        :aria-label="`${range.from} - ${range.to}`"
        position="absolute"
        :style="`width:13%;margin-left: 0.5%;margin-top: ${time2Int(range.from)/6-240}px`"
        :height="(time2Int(range.to)-time2Int(range.from))/6"
        color="primary"
        @click="openRange(day, i as number, range)"
        @keydown.enter.prevent="openRange(day, i as number, range)"
        @keydown.space.prevent="openRange(day, i as number, range)"
      >
        <span class="text-caption">
          {{ range.from }}
        </span>
        <v-spacer />
        <span class="text-caption">
          {{ range.to }}
        </span>
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
          :label="t('openingHours.startTime')"
          type="time"
          density="compact"
        />
        <v-text-field
          v-model="endTime"
          :label="t('openingHours.endTime')"
          type="time"
          density="compact"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          @click="closeMenu"
        >
          {{ t('openingHours.cancel') }}
        </v-btn>
        <v-btn
          v-if="rangeEdit != null"
          color="warning"
          @click="updateOpeningHours('delete')"
        >
          {{ t('openingHours.delete') }}
        </v-btn>
        <v-btn
          color="primary"
          @click="updateOpeningHours(rangeEdit != null ? 'update' : 'create')"
        >
          {{ t('openingHours.validate') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<style scoped>
.opening-hours-cell:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}
</style>
