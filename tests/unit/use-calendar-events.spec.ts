import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import dayjs from 'dayjs'
import { makeConfigState, makeDataset, field, LABEL_REFERS_TO, mountComposable, START_REFERS_TO, END_REFERS_TO } from './helpers'
import { useCalendarEvents } from '@/composables/useCalendarEvents'

const ofetchMock = vi.hoisted(() => vi.fn())
vi.mock('ofetch', () => ({ ofetch: ofetchMock }))
const searchParams = vi.hoisted(() => ({}) as Record<string, string>)
vi.mock('@data-fair/lib-vue/reactive-search-params-global.js', () => ({ default: searchParams }))

function setup (type: 'month' | 'week' | 'day', lines: Record<string, unknown>[]) {
  searchParams.start = '2026-08-24T00:00:00.000Z'
  searchParams.end = '2026-08-28T00:00:00.000Z'
  ofetchMock.mockResolvedValue({ results: lines })
  const schema = [
    field('title', 'text', LABEL_REFERS_TO),
    field('start', 'date-time', START_REFERS_TO),
    field('end', 'date-time', END_REFERS_TO)
  ]
  const state = makeConfigState(makeDataset(schema))
  const dragState = ref<{ originalId: string } | null>(null)
  const menuOpen = ref(false)
  const typeRef = ref<'month' | 'week' | 'day'>(type)
  const events = mountComposable(state, () => useCalendarEvents(dragState, menuOpen, typeRef))
  return { events, typeRef, dragState }
}

describe('useCalendarEvents.splitMultiDayEvent', () => {
  it('ne découpe pas un événement d\'un seul jour', () => {
    const { events } = setup('week', [])
    const start = dayjs('2026-08-24 09:00:00')
    const end = dayjs('2026-08-24 11:00:00')
    const segs = events.splitMultiDayEvent({ id: '1', name: 'Réunion' }, start, end, '1', '2026-08-24T09:00:00.000Z', '2026-08-24T11:00:00.000Z')
    expect(segs).toHaveLength(1)
    expect(segs[0].start).toBe('2026-08-24 09:00')
    expect(segs[0].end).toBe('2026-08-24 11:00')
    expect(segs[0].timed).toBe(true)
    expect(segs[0].allDay).toBe(false)
  })

  it('découpe un événement multi-jours daté en 3 segments en vue semaine', () => {
    const { events } = setup('week', [])
    const segs = events.splitMultiDayEvent({ id: '1', name: 'Voyage' }, dayjs('2026-08-24 09:00:00'), dayjs('2026-08-26 17:00:00'), '1', '2026-08-24T09:00:00.000Z', '2026-08-26T17:00:00.000Z')
    expect(segs).toHaveLength(3)
    const [first, middle, last] = segs
    expect(first.id).toBe('1-2026-08-24')
    expect(first.dayIndex).toBe(1)
    expect(first.totalDays).toBe(3)
    expect(first.isFirstSegment).toBe(true)
    expect(first.start).toBe('2026-08-24 09:00')
    expect(first.end).toBe('2026-08-24 23:59')
    expect(middle.id).toBe('1-middle')
    expect(middle.allDay).toBe(true)
    expect(middle.dayIndex).toBe(2)
    expect(middle.start).toBe('2026-08-25')
    expect(middle.end).toBe('2026-08-25')
    expect(last.id).toBe('1-2026-08-26')
    expect(last.dayIndex).toBe(3)
    expect(last.isLastSegment).toBe(true)
    expect(last.end).toBe('2026-08-26 17:00')
  })

  it('omet le dernier segment si la fin tombe à minuit exact', () => {
    const { events } = setup('week', [])
    const segs = events.splitMultiDayEvent({ id: '1', name: 'Voyage' }, dayjs('2026-08-24 09:00:00'), dayjs('2026-08-26 00:00:00'), '1', '2026-08-24T09:00:00.000Z', '2026-08-26T00:00:00.000Z')
    expect(segs).toHaveLength(2)
    expect(segs.map(s => s.id)).toEqual(['1-2026-08-24', '1-middle'])
  })

  it('n\'ajoute pas de segment intermédiaire pour une durée de 2 jours', () => {
    const { events } = setup('week', [])
    const segs = events.splitMultiDayEvent({ id: '1', name: 'Week-end' }, dayjs('2026-08-24 09:00:00'), dayjs('2026-08-25 17:00:00'), '1', '2026-08-24T09:00:00.000Z', '2026-08-25T17:00:00.000Z')
    expect(segs).toHaveLength(2)
    expect(segs.map(s => s.id)).toEqual(['1-2026-08-24', '1-2026-08-25'])
  })

  it('ne découpe pas en vue mois', () => {
    const { events } = setup('month', [])
    const segs = events.splitMultiDayEvent({ id: '1', name: 'Voyage' }, dayjs('2026-08-24 09:00:00'), dayjs('2026-08-26 17:00:00'), '1', '2026-08-24T09:00:00.000Z', '2026-08-26T17:00:00.000Z')
    expect(segs).toHaveLength(1)
    expect(segs[0].start).toBe('2026-08-24 09:00')
  })
})

describe('useCalendarEvents.buildEvents', () => {
  it('construit les événements all-day et datés depuis le fetch', async () => {
    const { events } = setup('week', [
      { _id: '1', title: 'Ponctuel', start: '2026-08-24T10:00:00.000Z' },
      { _id: '2', title: 'Général', start: '2026-08-24T14:00:00.000Z', end: '2026-08-25T16:00:00.000Z' }
    ])
    await flushPromises()

    const evts = events.allEventsRef.value
    expect(evts.length).toBeGreaterThanOrEqual(3)
    const punctual = evts.find(e => e.id === '1')!
    // événement ponctuel étendu de 30 min pour la lisibilité
    expect(punctual.start).toBe(dayjs('2026-08-24T10:00:00.000Z').format('YYYY-MM-DD HH:mm'))
    expect(punctual.end).toBe(dayjs('2026-08-24T10:00:00.000Z').add(30, 'minute').format('YYYY-MM-DD HH:mm'))
    expect(punctual.isPunctual).toBe(true)

    const multi = evts.filter(e => e.originalId === '2')
    expect(multi).toHaveLength(2)
    expect(multi[0].dayIndex).toBe(1)
    expect(multi[1].dayIndex).toBe(2)
    expect(multi[1].isLastSegment).toBe(true)
  })

  it('ignore les événements à date invalide et avertit pour ceux sans date', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { events } = setup('week', [
      { _id: '1', title: 'Cassé', start: '2026-08-32T10:00:00.000Z', end: '2026-08-32T18:00:00.000Z' },
      { _id: '2', title: 'Sans date' }
    ])
    await flushPromises()

    expect(events.allEventsRef.value).toEqual([])
    // seul l'événement sans date déclenche l'avertissement
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('1 événement(s) ignoré(s)'))
    warnSpy.mockRestore()
  })

  it('décale de 2 minutes les événements datés superposés', async () => {
    const { events } = setup('week', [
      { _id: '1', title: 'A', start: '2026-08-24T10:00:00.000Z', end: '2026-08-24T11:00:00.000Z' },
      { _id: '2', title: 'B', start: '2026-08-24T10:00:00.000Z', end: '2026-08-24T11:00:00.000Z' }
    ])
    await flushPromises()

    const evts = events.allEventsRef.value
    expect(evts).toHaveLength(2)
    const a = evts.find(e => e.originalId === '1')!
    const b = evts.find(e => e.originalId === '2')!
    expect(b.start).toBe(dayjs(a.start as string).add(2, 'minute').format('YYYY-MM-DD HH:mm'))
    expect(b.end).toBe(dayjs(a.end as string).add(2, 'minute').format('YYYY-MM-DD HH:mm'))
  })

  it('reconstruit les événements quand le type de vue change', async () => {
    const { events, typeRef } = setup('week', [
      { _id: '1', title: 'Voyage', start: '2026-08-24T09:00:00.000Z', end: '2026-08-26T17:00:00.000Z' }
    ])
    await flushPromises()
    expect(events.allEventsRef.value).toHaveLength(3)

    typeRef.value = 'month'
    await nextTick()
    await flushPromises()
    expect(events.allEventsRef.value).toHaveLength(1)
  })
})
