<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import { usePlanningData } from '@/composables/usePlanningData'

const props = defineProps<{
  getColor: (value: string) => unknown
}>()

const emit = defineEmits<{
  'click-event': [event: Record<string, unknown>, nativeEvent: MouseEvent]
  'title-change': [title: string]
}>()

const { t } = useI18n()
const { dayjs } = useLocaleDayjs()
const { planningDays, hasMore, isLoading, initialized, loadMore, planningTitle } = usePlanningData(props.getColor, t)

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

watch(planningTitle, (title) => {
  emit('title-change', title)
})

onMounted(async () => {
  await loadMore()

  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading.value && hasMore.value) {
      loadMore()
    }
  }, { threshold: 0.1 })

  if (sentinel.value) observer.observe(sentinel.value)
})

onUnmounted(() => {
  observer?.disconnect()
})

function formatDayHeader (date: string) {
  return dayjs(date).format('D MMMM YYYY')
}

function onClickEvent (event: Record<string, unknown>, nativeEvent: MouseEvent) {
  emit('click-event', {
    id: event.originalId,
    originalId: event.originalId,
    start: event.originalStart,
    end: event.originalEnd,
  }, nativeEvent)
}
</script>

<template>
  <div style="height: 100%; overflow-y: auto;">
    <template
      v-for="day in planningDays"
      :key="day.date"
    >
      <div class="planning-day-header">
        {{ formatDayHeader(day.date) }}
      </div>
      <div
        v-for="event in day.events"
        :key="event.id"
        class="planning-event-row"
        role="button"
        tabindex="0"
        @click="onClickEvent(event as Record<string, unknown>, $event)"
        @keydown.enter.prevent="onClickEvent(event as Record<string, unknown>, $event as unknown as MouseEvent)"
      >
        <span
          v-if="event.timeLabel"
          class="planning-event-time"
        >{{ event.timeLabel }}</span>
        <span
          class="planning-event-dot"
          :style="{ backgroundColor: String(event.eventColor || 'rgb(var(--v-theme-primary))') }"
        />
        <span class="planning-event-name">{{ event.name }}</span>
        <span
          v-if="event.dayIndex"
          class="planning-event-counter"
        >{{ t('calendar.dayCounter', { index: event.dayIndex, total: event.totalDays }) }}</span>
      </div>
    </template>

    <div
      v-if="initialized && planningDays.length === 0"
      class="planning-empty-message"
    >
      {{ t('planning.noEvents') }}
    </div>

    <div
      ref="sentinel"
      class="planning-sentinel"
    >
      <v-progress-linear
        v-if="isLoading"
        indeterminate
        color="primary"
      />
      <div
        v-else-if="!hasMore && planningDays.length > 0"
        class="planning-end-message"
      >
        {{ t('planning.noMoreEvents') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.planning-day-header {
  position: sticky;
  top: 0;
  z-index: 1;
  background: linear-gradient(rgba(var(--v-theme-on-surface), 0.06), rgba(var(--v-theme-on-surface), 0.06)), rgb(var(--v-theme-surface));
  padding: 8px 16px;
  font-weight: bold;
  font-size: 0.875rem;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.planning-event-row {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  gap: 12px;
  cursor: pointer;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  transition: background 0.15s;
}

.planning-event-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.planning-event-row:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

.planning-event-time {
  min-width: 110px;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  flex-shrink: 0;
}

.planning-event-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.planning-event-name {
  font-size: 0.875rem;
}

.planning-event-counter {
  font-size: 0.75rem;
  opacity: 0.7;
  flex-shrink: 0;
}

.planning-sentinel {
  padding: 16px;
}

.planning-end-message {
  text-align: center;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.planning-empty-message {
  padding: 48px 16px;
  text-align: center;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
</style>
