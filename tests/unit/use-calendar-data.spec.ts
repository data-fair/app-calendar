import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import dayjs from 'dayjs'
import { makeConfigState, makeDataset, field, createTestI18n, LABEL_REFERS_TO, mountComposable, START_REFERS_TO, END_REFERS_TO, DATE_REFERS_TO, OPENING_HOURS_REFERS_TO } from './helpers'
import { useCalendarData } from '@/composables/useCalendarData'

const ofetchMock = vi.hoisted(() => vi.fn())
vi.mock('ofetch', () => ({ ofetch: ofetchMock }))

const searchParams = vi.hoisted(() => ({}) as Record<string, string>)
vi.mock('@data-fair/lib-vue/reactive-search-params-global.js', () => ({ default: searchParams }))

const i18n = createTestI18n()

const RANGE_START = '2026-08-24T00:00:00.000Z'
const RANGE_END = '2026-08-28T00:00:00.000Z'

function setup (schema: ReturnType<typeof field>[], lines: Record<string, unknown>[], config: Record<string, unknown> = {}) {
  searchParams.start = RANGE_START
  searchParams.end = RANGE_END
  ofetchMock.mockResolvedValue({ results: lines })
  const dataset = makeDataset(schema)
  const state = makeConfigState(dataset, config as never)
  return mountComposable(state, () => useCalendarData(i18n.global.t))
}

describe('useCalendarData.events', () => {
  it('maps a simple date-time event', async () => {
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

  it('an event on date-only fields is all-day with an exclusive end +1 day', async () => {
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

  it('an event on a single date field is all-day without an end', async () => {
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

  it('expands opening hours per slot in week view (format dd regression)', async () => {
    const schema = [
      field('title', 'text', LABEL_REFERS_TO),
      field('start', 'date-time', START_REFERS_TO),
      field('end', 'date-time', END_REFERS_TO),
      field('openingHours', 'text', OPENING_HOURS_REFERS_TO)
    ]
    // Week from Monday 24 to Friday 28 August 2026, opening hours Monday to Friday
    const cal = setup(schema, [
      {
        _id: '1',
        title: 'Atelier',
        start: '2026-08-24T00:00:00.000Z',
        end: '2026-08-28T00:00:00.000Z',
        openingHours: 'Mo-Fr 09:00-17:00'
      }
    ])
    await flushPromises()

    expect(cal.events.value.length).toBeGreaterThanOrEqual(5)
    const days = cal.events.value.map(e => dayjs(e.start as string).locale('fr').format('dddd'))
    // 5 working days: the format('dd') bug would omit the days whose 2-letter
    // key does not match the 3-letter fr map
    expect(new Set(days).size).toBe(5)
    const monday = cal.events.value.find(e => dayjs(e.start as string).locale('fr').format('dddd') === 'lundi')!
    expect(dayjs(monday.start as string).format('HH:mm')).toBe('09:00')
    expect(dayjs(monday.end as string).format('HH:mm')).toBe('17:00')
    expect(monday.allDay).toBe(false)
  })

  it('applies series exceptions: cancelled or moved occurrence', async () => {
    const schema = [
      field('title', 'text', LABEL_REFERS_TO),
      field('start', 'date-time', START_REFERS_TO),
      field('end', 'date-time', END_REFERS_TO),
      field('openingHours', 'text', OPENING_HOURS_REFERS_TO),
      field('exceptions', 'array')
    ]
    const cal = setup(schema, [{
      _id: '1',
      title: 'Atelier',
      start: '2026-08-24T00:00:00.000Z',
      end: '2026-08-28T00:00:00.000Z',
      openingHours: 'Mo-Fr 09:00-17:00',
      exceptions: [
        { occurrence: '2026-08-25T09:00', cancelled: true },
        {
          occurrence: '2026-08-26T09:00',
          values: {
            start: '2026-08-27T10:00:00+02:00',
            end: '2026-08-27T12:00:00+02:00',
            title: 'Atelier décalé'
          }
        }
      ]
    }], { manageRecurrenceExceptions: true, recurrenceExceptionsField: { key: 'exceptions' } })
    await flushPromises()

    expect(cal.events.value).toHaveLength(4)
    expect(cal.events.value.some(e => e.recurrenceStart === '2026-08-25T09:00')).toBe(false)

    const moved = cal.events.value.find(e => e.recurrenceStart === '2026-08-26T09:00')!
    expect(moved.title).toBe('Atelier décalé')
    expect(dayjs(moved.start as string).format('YYYY-MM-DD HH:mm')).toBe('2026-08-27 10:00')
    expect(dayjs(moved.end as string).format('YYYY-MM-DD HH:mm')).toBe('2026-08-27 12:00')
    expect(moved.recurrenceEnd).toBe('2026-08-26T17:00')

    // the series still produces its own Thursday occurrence
    const thursday = cal.events.value.find(e => e.recurrenceStart === '2026-08-27T09:00')!
    expect(thursday.title).toBe('Atelier')
    expect(dayjs(thursday.start as string).format('HH:mm')).toBe('09:00')
  })

  it('brings into the period an occurrence moved from another period', async () => {
    const schema = [
      field('title', 'text', LABEL_REFERS_TO),
      field('start', 'date-time', START_REFERS_TO),
      field('end', 'date-time', END_REFERS_TO),
      field('openingHours', 'text', OPENING_HOURS_REFERS_TO),
      field('exceptions', 'array')
    ]
    const cal = setup(schema, [{
      _id: '1',
      title: 'Atelier',
      start: '2026-08-24T00:00:00.000Z',
      end: '2026-09-04T00:00:00.000Z',
      openingHours: 'Mo-Fr 09:00-17:00',
      exceptions: [{
        occurrence: '2026-08-31T09:00',
        values: {
          start: '2026-08-27T10:00:00+02:00',
          end: '2026-08-27T12:00:00+02:00',
          title: 'Ramené dans la semaine'
        }
      }]
    }], { manageRecurrenceExceptions: true, recurrenceExceptionsField: { key: 'exceptions' } })
    await flushPromises()

    const moved = cal.events.value.find(e => e.recurrenceStart === '2026-08-31T09:00')!
    expect(moved.title).toBe('Ramené dans la semaine')
    expect(dayjs(moved.start as string).format('YYYY-MM-DD HH:mm')).toBe('2026-08-27 10:00')
    // the normal occurrences of the period are still there
    expect(cal.events.value.filter(e => e.recurrenceStart === '2026-08-27T09:00')).toHaveLength(1)
  })

  it('ignores exceptions when the setting is disabled', async () => {
    const schema = [
      field('title', 'text', LABEL_REFERS_TO),
      field('start', 'date-time', START_REFERS_TO),
      field('end', 'date-time', END_REFERS_TO),
      field('openingHours', 'text', OPENING_HOURS_REFERS_TO),
      field('exceptions', 'array')
    ]
    const cal = setup(schema, [{
      _id: '1',
      title: 'Atelier',
      start: '2026-08-24T00:00:00.000Z',
      end: '2026-08-28T00:00:00.000Z',
      openingHours: 'Mo-Fr 09:00-17:00',
      exceptions: [{ occurrence: '2026-08-25T09:00', cancelled: true }]
    }], { manageRecurrenceExceptions: false, recurrenceExceptionsField: { key: 'exceptions' } })
    await flushPromises()

    expect(cal.events.value).toHaveLength(5)
    expect(cal.events.value.some(e => e.recurrenceStart === '2026-08-25T09:00')).toBe(true)
  })

  it('lets invalid dates through the mapping (filtered by buildEvents)', async () => {
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

  it('returns an empty array without a label field', async () => {
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

describe('useCalendarData requests', () => {
  const schema = [
    field('title', 'text', LABEL_REFERS_TO),
    field('start', 'date-time', START_REFERS_TO),
    field('end', 'date-time', END_REFERS_TO)
  ]

  function setupWithConfig (config: Record<string, unknown>, response: (url: string) => unknown) {
    searchParams.start = RANGE_START
    searchParams.end = RANGE_END
    ofetchMock.mockReset()
    ofetchMock.mockImplementation(async (url: string) => response(url))
    const state = makeConfigState(makeDataset(schema), config as never)
    return mountComposable(state, () => useCalendarData(i18n.global.t))
  }
  const linesUrls = () => ofetchMock.mock.calls.map(([url]) => decodeURIComponent(url as string)).filter(url => url.includes('/lines'))

  it('converts static filters to /lines REST parameters', async () => {
    setupWithConfig({ staticFilters: [{ type: 'in', field: 'dep', values: ['75', '92'] }] }, () => ({ results: [] }))
    await flushPromises()

    expect(linesUrls().length).toBeGreaterThan(0)
    expect(linesUrls().every(url => url.includes('dep_in=75,92') && !url.includes('qs='))).toBe(true)
  })

  it('builds the multicolor palette from the field values', async () => {
    const cal = setupWithConfig({
      color: { type: 'multicolor', field: 'agg', colors: { type: 'palette', name: 'Spectral', offset: 0 } }
    }, (url) => url.includes('/values/agg') ? ['1', '2'] : { results: [] })
    await flushPromises()

    expect(ofetchMock.mock.calls.some(([url]) => (url as string).includes('/values/agg?size=100'))).toBe(true)
    const palette = cal.colorPalette.value!
    expect(Object.keys(palette)).toEqual(['1', '2'])
    expect(palette['1']).toMatch(/^#[0-9a-f]{6}$/)
    expect(palette['1']).not.toBe(palette['2'])
  })

  it('uses the colors of the custom categories', async () => {
    const cal = setupWithConfig({
      color: { type: 'multicolor', field: 'grav', colors: { type: 'custom', categories: [{ value: '1', color: '#4caf50' }, { value: '2', color: '#f44336' }] } }
    }, () => ({ results: [] }))
    await flushPromises()

    expect(cal.colorPalette.value).toEqual({ 1: '#4caf50', 2: '#f44336' })
  })
})
