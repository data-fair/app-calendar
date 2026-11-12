import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import { makeConfigState, makeDataset, field, createTestI18n, LABEL_REFERS_TO, mountComposable, START_REFERS_TO, END_REFERS_TO, DATE_REFERS_TO, OPENING_HOURS_REFERS_TO } from './helpers'
import { usePlanningData } from '@/composables/usePlanningData'

dayjs.locale('fr')

const ofetchMock = vi.hoisted(() => vi.fn())
vi.mock('ofetch', () => ({ ofetch: ofetchMock }))

const i18n = createTestI18n()

// The planning only shows upcoming events: use dynamic dates (in ~10 days)
// so the suite does not become obsolete the day fixed dates are in the past.
const T0 = dayjs().add(10, 'day').startOf('day')
const T1 = T0.add(1, 'day')
const T2 = T0.add(2, 'day')
const T3 = T0.add(3, 'day')
const d = (x: ReturnType<typeof dayjs>) => x.format('YYYY-MM-DD')

function setup (schema: ReturnType<typeof field>[], lines: Record<string, unknown>[], config: Record<string, unknown> = {}) {
  const dataset = makeDataset(schema)
  const state = makeConfigState(dataset, config as never)
  const planning = mountComposable(state, () => usePlanningData((v: string) => `color-${v}`, i18n.global.t))
  ofetchMock.mockResolvedValue({ results: lines, next: null })
  return { planning, state }
}

const dateTimeSchema = [
  field('title', 'text', LABEL_REFERS_TO),
  field('start', 'date-time', START_REFERS_TO),
  field('end', 'date-time', END_REFERS_TO)
]

const dateOnlySchema = [
  field('title', 'text', LABEL_REFERS_TO),
  field('start', 'date', START_REFERS_TO),
  field('end', 'date', END_REFERS_TO)
]

describe('usePlanningData.planningDays', () => {
  it('spreads an all-day event over all the days of its period', async () => {
    const { planning } = setup(dateOnlySchema, [
      { _id: '1', title: 'Festival', start: d(T0), end: d(T2) }
    ])
    await planning.loadMore()
    await flushPromises()

    expect(planning.planningDays.value.map(day => day.date)).toEqual([d(T0), d(T1), d(T2)])
    const first = planning.planningDays.value[0].events[0]
    expect(first.name).toBe('Festival')
    expect(first.allDay).toBe(true)
    expect(first.timeLabel).toBe('')
    expect(first.dayIndex).toBe(1)
    expect(first.totalDays).toBe(3)
    const last = planning.planningDays.value[2].events[0]
    expect(last.dayIndex).toBe(3)
    expect(last.id).toBe('1')
  })

  it('a date-time all-day at midnight is shown as "Toute la journée" with an exclusive end at midnight', async () => {
    const { planning } = setup(dateTimeSchema, [
      { _id: '1', title: 'Réservation', start: `${d(T1)}T00:00:00`, end: `${d(T3)}T00:00:00` }
    ])
    await planning.loadMore()
    await flushPromises()

    // exact end at midnight = exclusive → last day excluded
    expect(planning.planningDays.value.map(day => day.date)).toEqual([d(T1), d(T2)])
    expect(planning.planningDays.value[0].events[0].timeLabel).toBe('Toute la journée')
  })

  it('a one-off event (same-day date-time) carries the time in timeLabel', async () => {
    const { planning } = setup(dateTimeSchema, [
      { _id: '1', title: 'Réunion', start: `${d(T0)}T10:00:00`, end: `${d(T0)}T12:00:00` }
    ])
    await planning.loadMore()
    await flushPromises()

    expect(planning.planningDays.value).toHaveLength(1)
    expect(planning.planningDays.value[0].events[0].timeLabel).toBe('10:00 - 12:00')
    expect(planning.planningDays.value[0].events[0].allDay).toBe(false)
  })

  it('a one-off event without an end field is shown only once', async () => {
    const { planning } = setup(dateTimeSchema, [
      { _id: '1', title: 'Point', start: `${d(T0)}T10:00:00` }
    ])
    await planning.loadMore()
    await flushPromises()

    expect(planning.planningDays.value[0].events[0].timeLabel).toBe('10:00')
    expect(planning.planningDays.value[0].events).toHaveLength(1)
  })

  it('splits a timed multi-day event into labelled segments', async () => {
    const { planning } = setup(dateTimeSchema, [
      { _id: '1', title: 'Voyage', start: `${d(T0)}T09:00:00`, end: `${d(T2)}T17:00:00` }
    ])
    await planning.loadMore()
    await flushPromises()

    const days = planning.planningDays.value
    expect(days.map(day => day.date)).toEqual([d(T0), d(T1), d(T2)])
    expect(days[0].events[0].timeLabel).toBe('09:00')
    expect(days[1].events[0].timeLabel).toBe('Toute la journée')
    expect(days[2].events[0].timeLabel).toBe("Jusqu'à 17:00")
    expect(days[0].events[0].id).toBe(`1-${d(T0)}`)
    expect(days[0].events[0].totalDays).toBe(3)
  })

  it('ignores invalid dates (no infinite loop)', async () => {
    const { planning } = setup(dateTimeSchema, [
      { _id: '1', title: 'Cassé', start: '2026-08-32T10:00:00.000Z', end: '2026-08-32T18:00:00.000Z' }
    ])
    await planning.loadMore()
    await flushPromises()

    expect(planning.planningDays.value).toEqual([])
  })

  it('ignores events without a date', async () => {
    const { planning } = setup(dateTimeSchema, [
      { _id: '1', title: 'Sans date' }
    ])
    await planning.loadMore()
    await flushPromises()

    expect(planning.planningDays.value).toEqual([])
  })

  it('a datetime daterend event (date-only type) is all-day and does not overflow', async () => {
    const schema = [
      field('title', 'text', LABEL_REFERS_TO),
      field('start', 'date', DATE_REFERS_TO)
    ]
    const { planning } = setup(schema, [
      { _id: '1', title: 'Journée', start: d(T1) }
    ])
    await planning.loadMore()
    await flushPromises()

    expect(planning.planningDays.value.map(day => day.date)).toEqual([d(T1)])
    expect(planning.planningDays.value[0].events[0].allDay).toBe(true)
  })

  it('sorts by start instant when dates mix UTC and local offset', async () => {
    const { planning } = setup(dateTimeSchema, [
      // 08:30 local written in UTC, 08:15 local written with its offset: east of
      // Greenwich, the order of the strings is the reverse of the order of instants
      { _id: 'late', title: 'Fêtes', start: dayjs(`${d(T1)}T08:30:00`).toISOString(), end: dayjs(`${d(T1)}T23:00:00`).toISOString() },
      { _id: 'early', title: 'Intervention', start: dayjs(`${d(T1)}T08:15:00`).format(), end: dayjs(`${d(T1)}T09:45:00`).format() }
    ])
    await planning.loadMore()
    await flushPromises()

    expect(planning.planningDays.value[0].events.map(e => e.id)).toEqual(['early', 'late'])
  })

  it('sorts events: all-day first then by start date', async () => {
    const { planning } = setup(dateTimeSchema, [
      { _id: '2', title: 'Réunion', start: `${d(T1)}T09:00:00`, end: `${d(T1)}T10:00:00` },
      { _id: '3', title: 'Journée entière', start: `${d(T1)}T00:00:00`, end: `${d(T1)}T00:00:00` }
    ])
    await planning.loadMore()
    await flushPromises()

    const events = planning.planningDays.value[0].events
    expect(events.map(e => e.id)).toEqual(['3', '2'])
    expect(events[0].allDay).toBe(true)
  })

  it('loads the next page through next and updates hasMore', async () => {
    const { planning } = setup(dateOnlySchema, [
      { _id: '1', title: 'Premier', start: d(T0), end: d(T0) }
    ])
    ofetchMock.mockResolvedValueOnce({ results: [{ _id: '1', title: 'Premier', start: d(T0), end: d(T0) }], next: '/api/v1/datasets/dataset-test/lines?page=2' })
      .mockResolvedValueOnce({ results: [{ _id: '2', title: 'Second', start: d(T1), end: d(T1) }], next: null })
    await planning.loadMore()
    await flushPromises()
    expect(planning.hasMore.value).toBe(true)

    await planning.loadMore()
    await flushPromises()
    expect(planning.hasMore.value).toBe(false)
    expect(planning.planningDays.value.map(day => day.date)).toEqual([d(T0), d(T1)])
  })

  it('does not show days beyond the last loaded start while pages remain', async () => {
    // page sorted by start date: a long (recurring) event open until T0+60
    // must not scroll the planning beyond what is loaded, otherwise the
    // one-off events of the following pages never show up
    const { planning } = setup(dateTimeSchema, [])
    ofetchMock.mockResolvedValueOnce({
      results: [
        { _id: 'long', title: 'Saison', start: `${d(T0)}T14:00:00`, end: `${d(T0.add(60, 'day'))}T18:00:00` },
        { _id: 'a', title: 'Atelier', start: `${d(T2)}T10:00:00`, end: `${d(T2)}T11:00:00` }
      ],
      next: '/api/v1/datasets/dataset-test/lines?page=2'
    }).mockResolvedValueOnce({
      results: [{ _id: 'c', title: 'Concert', start: `${d(T0.add(40, 'day'))}T09:00:00`, end: `${d(T0.add(40, 'day'))}T22:00:00` }],
      next: null
    })
    await planning.loadMore()
    await flushPromises()
    expect(planning.planningDays.value.map(day => day.date)).toEqual([d(T0), d(T1)])

    await planning.loadMore()
    await flushPromises()
    const concertDay = planning.planningDays.value.find(day => day.date === d(T0.add(40, 'day')))
    expect(concertDay?.events.map(e => e.name)).toEqual(['Saison', 'Concert'])
    expect(planning.planningDays.value.at(-1)?.date).toBe(d(T0.add(60, 'day')))
  })

  it('expands a recurring event according to its opening hours', async () => {
    const schema = [...dateTimeSchema, field('horaire', 'text', OPENING_HOURS_REFERS_TO)]
    const monday = T0.add((8 - T0.day()) % 7, 'day')
    const { planning } = setup(schema, [
      { _id: 'r', title: 'Bridge', start: `${d(monday)}T00:00:00`, end: `${d(monday.add(13, 'day'))}T23:00:00`, horaire: 'Mo 14:00-18:00; Fr 14:00-16:00' }
    ])
    await planning.loadMore()
    await flushPromises()

    const days = planning.planningDays.value
    expect(days.map(day => day.date)).toEqual([monday, monday.add(4, 'day'), monday.add(7, 'day'), monday.add(11, 'day')].map(d))
    expect(days.map(day => day.events[0].timeLabel)).toEqual(['14:00 - 18:00', '14:00 - 16:00', '14:00 - 18:00', '14:00 - 16:00'])
    expect(days[0].events[0].dayIndex).toBeUndefined()
  })

  it('applies series exceptions: cancelled or moved to another day', async () => {
    const schema = [...dateTimeSchema, field('horaire', 'text', OPENING_HOURS_REFERS_TO), field('exceptions', 'array')]
    const monday = T0.add((8 - T0.day()) % 7, 'day')
    const { planning } = setup(schema, [{
      _id: 'r',
      title: 'Bridge',
      start: `${d(monday)}T00:00:00`,
      end: `${d(monday.add(13, 'day'))}T23:00:00`,
      horaire: 'Mo 14:00-18:00',
      exceptions: [
        { occurrence: `${d(monday)}T14:00`, cancelled: true },
        { occurrence: `${d(monday.add(7, 'day'))}T14:00`, values: { start: `${d(monday.add(8, 'day'))}T10:00:00`, end: `${d(monday.add(8, 'day'))}T12:00:00`, title: 'Bridge décalé' } }
      ]
    }], { manageRecurrenceExceptions: true, recurrenceExceptionsField: { key: 'exceptions' } })
    await planning.loadMore()
    await flushPromises()

    const days = planning.planningDays.value
    expect(days.map(day => day.date)).toEqual([d(monday.add(8, 'day'))])
    const moved = days[0].events[0]
    expect(moved.name).toBe('Bridge décalé')
    expect(moved.timeLabel).toBe('10:00 - 12:00')
    expect(moved.recurrenceStart).toBe(`${d(monday.add(7, 'day'))}T14:00`)
    expect(moved.recurrenceEnd).toBe(`${d(monday.add(7, 'day'))}T18:00`)
  })

  it('brings into the planning a past occurrence moved to the future', async () => {
    const schema = [...dateTimeSchema, field('horaire', 'text', OPENING_HOURS_REFERS_TO), field('exceptions', 'array')]
    const monday = T0.add((8 - T0.day()) % 7, 'day')
    const pastOccurrence = monday.subtract(7, 'day')
    const movedDay = monday.add(8, 'day')
    const { planning } = setup(schema, [{
      _id: 'r',
      title: 'Bridge',
      start: `${d(pastOccurrence.subtract(7, 'day'))}T00:00:00`,
      end: `${d(monday.add(13, 'day'))}T23:00:00`,
      horaire: 'Mo 14:00-18:00',
      exceptions: [{
        occurrence: `${d(pastOccurrence)}T14:00`,
        values: { start: `${d(movedDay)}T10:00:00`, end: `${d(movedDay)}T12:00:00`, title: 'Bridge remonté' }
      }]
    }], { manageRecurrenceExceptions: true, recurrenceExceptionsField: { key: 'exceptions' } })
    await planning.loadMore()
    await flushPromises()

    const day = planning.planningDays.value.find(planningDay => planningDay.date === d(movedDay))
    expect(day?.events.map(e => e.name)).toEqual(['Bridge remonté'])
    expect(day?.events[0].timeLabel).toBe('10:00 - 12:00')
    expect(day?.events[0].recurrenceStart).toBe(`${d(pastOccurrence)}T14:00`)
  })

  it('on a server error, hasMore becomes false and initialized true', async () => {
    const { planning } = setup(dateOnlySchema, [])
    ofetchMock.mockRejectedValue({ response: { status: 500 }, message: 'boom' })
    await planning.loadMore()
    await flushPromises()

    expect(planning.hasMore.value).toBe(false)
    expect(planning.initialized.value).toBe(true)
    expect(planning.planningDays.value).toEqual([])
  })
})

describe('usePlanningData.planningTitle', () => {
  it('keeps the year of the first month when the period changes year', async () => {
    const first = dayjs('2030-10-07')
    const last = dayjs('2031-03-02')
    const { planning } = setup(dateOnlySchema, [
      { _id: '1', title: 'A', start: d(first), end: d(first) },
      { _id: '2', title: 'B', start: d(last), end: d(last) }
    ])
    await planning.loadMore()
    await flushPromises()

    expect(planning.planningTitle.value).toBe('octobre 2030 – mars 2031')
  })

  it('returns the planning title for a single day', async () => {
    const { planning } = setup(dateOnlySchema, [
      { _id: '1', title: 'Solo', start: d(T0), end: d(T0) }
    ])
    await planning.loadMore()
    await flushPromises()

    expect(planning.planningTitle.value).toBe(T0.format('D MMMM YYYY'))
  })
})
