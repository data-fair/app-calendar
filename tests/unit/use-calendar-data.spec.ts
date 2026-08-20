import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import dayjs from 'dayjs'
import { makeConfigState, makeDataset, field, LABEL_REFERS_TO, mountComposable, START_REFERS_TO, END_REFERS_TO, DATE_REFERS_TO, OPENING_HOURS_REFERS_TO } from './helpers'
import { useCalendarData } from '@/composables/useCalendarData'

const ofetchMock = vi.hoisted(() => vi.fn())
vi.mock('ofetch', () => ({ ofetch: ofetchMock }))

const searchParams = vi.hoisted(() => ({}) as Record<string, string>)
vi.mock('@data-fair/lib-vue/reactive-search-params-global.js', () => ({ default: searchParams }))

const RANGE_START = '2026-08-24T00:00:00.000Z'
const RANGE_END = '2026-08-28T00:00:00.000Z'

function setup (schema: ReturnType<typeof field>[], lines: Record<string, unknown>[], opts: { view?: string } = {}) {
  searchParams.start = RANGE_START
  searchParams.end = RANGE_END
  if (opts.view) searchParams.view = opts.view
  ofetchMock.mockResolvedValue({ results: lines })
  const dataset = makeDataset(schema)
  const state = makeConfigState(dataset)
  return mountComposable(state, () => useCalendarData())
}

describe('useCalendarData.events', () => {
  it('mappe un événement date-time simple', async () => {
    const schema = [
      field('title', 'text', LABEL_REFERS_TO),
      field('start', 'date-time', START_REFERS_TO),
      field('end', 'date-time', END_REFERS_TO)
    ]
    const cal = setup(schema, [
      { _id: '1', title: 'Concert', start: '2026-08-24T20:00:00.000Z', end: '2026-08-24T22:00:00.000Z' }
    ])
    await flushPromises()

    expect(cal.events.value).toHaveLength(1)
    const e = cal.events.value[0]
    expect(e.title).toBe('Concert')
    expect(e.start).toBe('2026-08-24T20:00:00.000Z')
    expect(e.end).toBe('2026-08-24T22:00:00.000Z')
    expect(e.allDay).toBe(false)
    expect(e.editable).toBe(false)
  })

  it('un événement sur champs date-only est all-day avec fin exclusive +1 jour', async () => {
    const schema = [
      field('title', 'text', LABEL_REFERS_TO),
      field('start', 'date', START_REFERS_TO),
      field('end', 'date', END_REFERS_TO)
    ]
    const cal = setup(schema, [
      { _id: '1', title: 'Festival', start: '2026-08-24', end: '2026-08-26' }
    ])
    await flushPromises()

    const e = cal.events.value[0]
    expect(e.allDay).toBe(true)
    expect(e.start).toBe('2026-08-24')
    expect(e.end).toBe('2026-08-27')
  })

  it('un événement sur champ date unique est all-day sans fin', async () => {
    const schema = [
      field('title', 'text', LABEL_REFERS_TO),
      field('start', 'date', DATE_REFERS_TO)
    ]
    const cal = setup(schema, [
      { _id: '1', title: 'Journée', start: '2026-08-25' }
    ])
    await flushPromises()

    const e = cal.events.value[0]
    expect(e.allDay).toBe(true)
    expect(e.end).toBeUndefined()
  })

  it('déploie les horaires d\'ouverture par créneau en vue semaine (régression format dd)', async () => {
    const schema = [
      field('title', 'text', LABEL_REFERS_TO),
      field('start', 'date-time', START_REFERS_TO),
      field('end', 'date-time', END_REFERS_TO),
      field('openingHours', 'text', OPENING_HOURS_REFERS_TO)
    ]
    // Semaine du lundi 24 au vendredi 28 août 2026, horaires du lundi au vendredi
    const cal = setup(schema, [
      {
        _id: '1',
        title: 'Atelier',
        start: '2026-08-24T00:00:00.000Z',
        end: '2026-08-28T00:00:00.000Z',
        openingHours: 'Mo-Fr 09:00-17:00'
      }
    ], { view: 'dayGridWeek' })
    await flushPromises()

    expect(cal.events.value.length).toBeGreaterThanOrEqual(5)
    const days = cal.events.value.map(e => dayjs(e.start).locale('fr').format('dddd'))
    // 5 jours ouvrés : le bug format('dd') omettrait les jours dont la clé
    // 2 lettres ne matche pas le map 3 lettres fr
    expect(new Set(days).size).toBe(5)
    const monday = cal.events.value.find(e => dayjs(e.start).locale('fr').format('dddd') === 'lundi')!
    expect(dayjs(monday.start).format('HH:mm')).toBe('09:00')
    expect(dayjs(monday.end).format('HH:mm')).toBe('17:00')
    expect(monday.allDay).toBe(false)
  })

  it('déploie les horaires d\'ouverture sur un seul événement en vue mois', async () => {
    const schema = [
      field('title', 'text', LABEL_REFERS_TO),
      field('start', 'date-time', START_REFERS_TO),
      field('end', 'date-time', END_REFERS_TO),
      field('openingHours', 'text', OPENING_HOURS_REFERS_TO)
    ]
    const cal = setup(schema, [
      {
        _id: '1',
        title: 'Atelier',
        start: '2026-08-24T00:00:00.000Z',
        end: '2026-08-28T00:00:00.000Z',
        openingHours: 'Mo-Fr 09:00-17:00'
      }
    ], { view: 'dayGridMonth' })
    await flushPromises()

    expect(cal.events.value).toHaveLength(5)
    const first = cal.events.value[0]
    expect(dayjs(first.start).format('HH:mm')).toBe('09:00')
    expect(dayjs(first.end).format('HH:mm')).toBe('17:00')
  })

  it('laisse passer les dates invalides dans le mapping (filtrées par buildEvents)', async () => {
    const schema = [
      field('title', 'text', LABEL_REFERS_TO),
      field('start', 'date-time', START_REFERS_TO),
      field('end', 'date-time', END_REFERS_TO)
    ]
    const cal = setup(schema, [
      { _id: '1', title: 'Cassé', start: '2026-08-32T10:00:00.000Z', end: '2026-08-32T18:00:00.000Z' }
    ])
    await flushPromises()

    expect(cal.events.value).toHaveLength(1)
  })

  it('renvoie un tableau vide sans champ libellé', async () => {
    const schema = [
      field('start', 'date-time', START_REFERS_TO),
      field('end', 'date-time', END_REFERS_TO)
    ]
    const cal = setup(schema, [
      { _id: '1', start: '2026-08-24T20:00:00.000Z', end: '2026-08-24T22:00:00.000Z' }
    ])
    await flushPromises()

    expect(cal.events.value).toEqual([])
  })
})
