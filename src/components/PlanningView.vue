<script setup lang="ts">
import { mdiCircle } from '@mdi/js'
import { watch, capitalize } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import { usePlanningData } from '@/composables/usePlanningData'

const props = defineProps<{
  getColor: (value: string) => unknown
}>()

const emit = defineEmits<{
  'click-event': [event: Record<string, unknown>, nativeEvent: MouseEvent | KeyboardEvent]
  'title-change': [title: string]
}>()

const { t } = useI18n()
const { dayjs } = useLocaleDayjs()
const { planningDays, hasMore, loadMore, planningTitle, querySignature } = usePlanningData(props.getColor, t)

watch(planningTitle, (title) => emit('title-change', title))

// v-infinite-scroll calls load again as long as its end stays visible and done('ok')
async function onLoad ({ done }: { done: (status: 'ok' | 'empty' | 'error') => void }) {
  await loadMore()
  done(hasMore.value ? 'ok' : 'empty')
}

function onClickEvent (event: Record<string, unknown>, nativeEvent: MouseEvent | KeyboardEvent) {
  emit('click-event', {
    id: event.originalId,
    originalId: event.originalId,
    start: event.originalStart,
    end: event.originalEnd,
  }, nativeEvent)
}
</script>

<template>
  <v-infinite-scroll
    :key="querySignature"
    height="100%"
    @load="onLoad"
  >
    <v-list
      class="py-0 flex-shrink-0"
      density="compact"
      prepend-gap="12"
    >
      <template
        v-for="day in planningDays"
        :key="day.date"
      >
        <v-list-subheader
          class="planning-day-header font-weight-bold"
          sticky
        >
          {{ capitalize(dayjs(day.date).format('dddd D MMMM YYYY')) }}
        </v-list-subheader>
        <v-list-item
          v-for="event in day.events"
          :key="event.id"
          class="planning-event-row"
          link
          @click="onClickEvent(event, $event)"
        >
          <template #prepend>
            <span
              class="planning-event-time text-body-medium text-medium-emphasis mr-4"
            >{{ event.timeLabel }}</span>
            <v-icon
              :color="String(event.eventColor || 'primary')"
              :icon="mdiCircle"
              size="x-small"
            />
          </template>
          <v-list-item-title class="text-body-medium">
            {{ event.name }}
          </v-list-item-title>
          <template
            v-if="event.dayIndex"
            #append
          >
            <span class="text-body-small text-medium-emphasis">{{ t('calendar.dayCounter', { index: event.dayIndex, total: event.totalDays }) }}</span>
          </template>
        </v-list-item>
      </template>
    </v-list>
    <template #empty>
      <span class="text-body-medium text-medium-emphasis">
        {{ planningDays.length ? t('planning.noMoreEvents') : t('planning.noEvents') }}
      </span>
    </template>
  </v-infinite-scroll>
</template>

<style scoped>
/* v-list-subheader sticky is transparent: give it the list surface, tinted like a header */
.planning-day-header {
  background: linear-gradient(rgba(var(--v-theme-on-surface), 0.06), rgba(var(--v-theme-on-surface), 0.06)), rgb(var(--v-theme-surface));
  z-index: 1;
}
.planning-event-time { min-width: 110px; }
</style>
