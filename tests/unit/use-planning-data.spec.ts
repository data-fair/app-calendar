import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import { makeConfigState, makeDataset, field, createTestI18n, LABEL_REFERS_TO, mountComposable, START_REFERS_TO, END_REFERS_TO, DATE_REFERS_TO } from './helpers'
import { usePlanningData } from '@/composables/usePlanningData'

dayjs.locale('fr')

const ofetchMock = vi.hoisted(() => vi.fn())
vi.mock('ofetch', () => ({ ofetch: ofetchMock }))

const i18n = createTestI18n()

// Le planning n'affiche que les événements à venir : utiliser des dates
// dynamiques (dans ~10 jours) pour que la suite ne devienne pas obsolète
// le jour où les dates fixes sont dans le passé.
const T0 = dayjs().add(10, 'day').startOf('day')
const T1 = T0.add(1, 'day')
const T2 = T0.add(2, 'day')
const T3 = T0.add(3, 'day')
const d = (x: ReturnType<typeof dayjs>) => x.format('YYYY-MM-DD')

function setup (schema: ReturnType<typeof field>[], lines: Record<string, unknown>[]) {
  const dataset = makeDataset(schema)
  const state = makeConfigState(dataset)
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
  it('étale un événement all-day sur tous les jours de sa période', async () => {
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

  it('un all-day daté-time à minuit est affiché "Toute la journée" et fin exclusive si minuit', async () => {
    const { planning } = setup(dateTimeSchema, [
      { _id: '1', title: 'Réservation', start: `${d(T1)}T00:00:00`, end: `${d(T3)}T00:00:00` }
    ])
    await planning.loadMore()
    await flushPromises()

    // fin exacte à minuit = exclusive → dernier jour exclu
    expect(planning.planningDays.value.map(day => day.date)).toEqual([d(T1), d(T2)])
    expect(planning.planningDays.value[0].events[0].timeLabel).toBe('Toute la journée')
  })

  it('un événement ponctuel (date-time même jour) porte l\'heure en timeLabel', async () => {
    const { planning } = setup(dateTimeSchema, [
      { _id: '1', title: 'Réunion', start: `${d(T0)}T10:00:00`, end: `${d(T0)}T12:00:00` }
    ])
    await planning.loadMore()
    await flushPromises()

    expect(planning.planningDays.value).toHaveLength(1)
    expect(planning.planningDays.value[0].events[0].timeLabel).toBe('10:00 - 12:00')
    expect(planning.planningDays.value[0].events[0].allDay).toBe(false)
  })

  it('un événement ponctuel sans champ de fin est affiché une seule fois', async () => {
    const { planning } = setup(dateTimeSchema, [
      { _id: '1', title: 'Point', start: `${d(T0)}T10:00:00` }
    ])
    await planning.loadMore()
    await flushPromises()

    expect(planning.planningDays.value[0].events[0].timeLabel).toBe('10:00')
    expect(planning.planningDays.value[0].events).toHaveLength(1)
  })

  it('découpe un événement multi-jours daté en segments étiquetés', async () => {
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

  it('ignore les dates invalides (pas de boucle infinie)', async () => {
    const { planning } = setup(dateTimeSchema, [
      { _id: '1', title: 'Cassé', start: '2026-08-32T10:00:00.000Z', end: '2026-08-32T18:00:00.000Z' }
    ])
    await planning.loadMore()
    await flushPromises()

    expect(planning.planningDays.value).toEqual([])
  })

  it('ignore les événements sans date', async () => {
    const { planning } = setup(dateTimeSchema, [
      { _id: '1', title: 'Sans date' }
    ])
    await planning.loadMore()
    await flushPromises()

    expect(planning.planningDays.value).toEqual([])
  })

  it('un événement daterend datetime (de type date seule) est all-day et ne déborde pas', async () => {
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

  it('trie les événements : all-day d\'abord puis par date de début', async () => {
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

  it('charge la page suivante via next et met à jour hasMore', async () => {
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

  it('en cas d\'erreur serveur, hasMore passe à false et initialized à true', async () => {
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
  it('renvoie le titre du planning pour un jour isolé', async () => {
    const { planning } = setup(dateOnlySchema, [
      { _id: '1', title: 'Solo', start: d(T0), end: d(T0) }
    ])
    await planning.loadMore()
    await flushPromises()

    expect(planning.planningTitle.value).toBe(T0.format('D MMMM YYYY'))
  })
})
