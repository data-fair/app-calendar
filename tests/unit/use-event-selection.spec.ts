import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import dayjs from 'dayjs'
import { makeConfigState, makeDataset, field, LABEL_REFERS_TO, mountComposable, START_REFERS_TO, END_REFERS_TO } from './helpers'
import { useEventSelection } from '@/composables/useEventSelection'

const dataset = makeDataset([
  field('title', 'text', LABEL_REFERS_TO),
  field('start', 'date-time', START_REFERS_TO),
  field('end', 'date-time', END_REFERS_TO)
])

const dateOnlyDataset = makeDataset([
  field('title', 'text', LABEL_REFERS_TO),
  field('start', 'date', START_REFERS_TO),
  field('end', 'date', END_REFERS_TO)
])

function stubRaf () {
  vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
    const time = 0
    cb(time)
    return 0
  })
}

function eventAt (date: string, time: string): Event {
  return {
    target: {
      closest: () => null
    }
  } as unknown as Event
}

function eventOnExisting (): Event {
  return {
    target: {
      closest: () => ({ classList: [] })
    }
  } as unknown as Event
}

describe('useEventSelection', () => {
  it('démarre une sélection ponctuelle quand il n\'y a pas de champ de fin', () => {
    const schema = [
      field('title', 'text', LABEL_REFERS_TO),
      field('start', 'date-time', START_REFERS_TO)
    ]
    const state = makeConfigState(makeDataset(schema))
    const selectionEvents = ref<Record<string, unknown>[]>([])
    const menuOpen = ref(false)
    const editMode = ref(false)
    const selectedEvent = ref<Record<string, unknown> | null>(null)
    const activator = ref<HTMLElement>()
    const splitSpy = vi.fn(() => [{ id: '__preview__' }])
    const sel = mountComposable(state, () => useEventSelection(selectionEvents, menuOpen, editMode, selectedEvent, activator, splitSpy))

    sel.onMouseDownTime(eventAt('2026-08-24', '10:00'), { date: '2026-08-24', time: '10:00' })

    expect(sel.isPointSelect.value).toBe(true)
    expect(sel.isSelecting.value).toBe(false)
    expect(sel.selectionStart.value).toEqual({ date: '2026-08-24', time: '10:00' })
    expect(selectionEvents.value).toHaveLength(1)
    expect(splitSpy).toHaveBeenCalled()
  })

  it('démarre une sélection étendue quand un champ de fin existe', () => {
    const state = makeConfigState(dataset)
    const selectionEvents = ref<Record<string, unknown>[]>([])
    const menuOpen = ref(false)
    const editMode = ref(false)
    const selectedEvent = ref<Record<string, unknown> | null>(null)
    const activator = ref<HTMLElement>()
    const sel = mountComposable(state, () => useEventSelection(selectionEvents, menuOpen, editMode, selectedEvent, activator, () => []))

    sel.onMouseDownTime(eventAt('2026-08-24', '10:00'), { date: '2026-08-24', time: '10:00' })

    expect(sel.isSelecting.value).toBe(true)
    expect(sel.isPointSelect.value).toBe(false)
  })

  it('ignore le clic sur un événement existant', () => {
    const state = makeConfigState(dataset)
    const selectionEvents = ref<Record<string, unknown>[]>([])
    const menuOpen = ref(false)
    const editMode = ref(false)
    const selectedEvent = ref<Record<string, unknown> | null>(null)
    const activator = ref<HTMLElement>()
    const sel = mountComposable(state, () => useEventSelection(selectionEvents, menuOpen, editMode, selectedEvent, activator, () => []))

    sel.onMouseDownTime(eventOnExisting(), { date: '2026-08-24', time: '10:00' })

    expect(sel.isSelecting.value).toBe(false)
    expect(selectionEvents.value).toEqual([])
  })

  it('ignore le clic quand les champs sont de type date seule', () => {
    const state = makeConfigState(dateOnlyDataset)
    const selectionEvents = ref<Record<string, unknown>[]>([])
    const menuOpen = ref(false)
    const editMode = ref(false)
    const selectedEvent = ref<Record<string, unknown> | null>(null)
    const activator = ref<HTMLElement>()
    const sel = mountComposable(state, () => useEventSelection(selectionEvents, menuOpen, editMode, selectedEvent, activator, () => []))

    sel.onMouseDownTime(eventAt('2026-08-24', '10:00'), { date: '2026-08-24', time: '10:00' })

    expect(sel.isSelecting.value).toBe(false)
    expect(sel.isPointSelect.value).toBe(false)
    expect(selectionEvents.value).toEqual([])
  })

  it('ignore le clic avant la borne minimale configurée', () => {
    const state = makeConfigState(dataset, { minDate: 'day' } as never)
    const selectionEvents = ref<Record<string, unknown>[]>([])
    const menuOpen = ref(false)
    const editMode = ref(false)
    const selectedEvent = ref<Record<string, unknown> | null>(null)
    const activator = ref<HTMLElement>()
    const sel = mountComposable(state, () => useEventSelection(selectionEvents, menuOpen, editMode, selectedEvent, activator, () => []))

    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
    sel.onMouseDownTime(eventAt(yesterday, '10:00'), { date: yesterday, time: '10:00' })

    expect(sel.isSelecting.value).toBe(false)
    expect(selectionEvents.value).toEqual([])
  })

  it('met à jour l\'aperçu au déplacement de la souris', () => {
    const state = makeConfigState(dataset)
    const selectionEvents = ref<Record<string, unknown>[]>([])
    const menuOpen = ref(false)
    const editMode = ref(false)
    const selectedEvent = ref<Record<string, unknown> | null>(null)
    const activator = ref<HTMLElement>()
    const splitSpy = vi.fn((base: Record<string, unknown>, start: ReturnType<typeof dayjs>, end: ReturnType<typeof dayjs>, id: string) => [{
      ...base,
      id,
      start: start.format('YYYY-MM-DD HH:mm'),
      end: end.format('YYYY-MM-DD HH:mm')
    }])
    const sel = mountComposable(state, () => useEventSelection(selectionEvents, menuOpen, editMode, selectedEvent, activator, splitSpy))

    sel.onMouseDownTime(eventAt('2026-08-24', '10:00'), { date: '2026-08-24', time: '10:00' })
    sel.onMouseMoveTime(eventAt('2026-08-24', '12:00'), { year: 2026, month: 8, day: 24, hour: 12, minute: 0 })

    expect(splitSpy).toHaveBeenCalledTimes(2)
    const lastCall = splitSpy.mock.calls[1]
    expect(lastCall[1].format('YYYY-MM-DD HH:mm')).toBe('2026-08-24 10:00')
    expect(lastCall[2].format('YYYY-MM-DD HH:mm')).toBe('2026-08-24 12:00')
  })

  it('finalise une sélection ponctuelle en événement sur le champ de début', () => {
    stubRaf()
    const schema = [
      field('title', 'text', LABEL_REFERS_TO),
      field('start', 'date-time', START_REFERS_TO)
    ]
    const state = makeConfigState(makeDataset(schema))
    const selectionEvents = ref<Record<string, unknown>[]>([])
    const menuOpen = ref(false)
    const editMode = ref(false)
    const selectedEvent = ref<Record<string, unknown> | null>(null)
    const activator = ref<HTMLElement>()
    const sel = mountComposable(state, () => useEventSelection(selectionEvents, menuOpen, editMode, selectedEvent, activator, () => []))

    sel.onMouseDownTime(eventAt('2026-08-24', '10:00'), { date: '2026-08-24', time: '10:00' })
    sel.finalizeSelection()

    expect(selectedEvent.value).toEqual({ start: '2026-08-24 10:00' })
    expect(menuOpen.value).toBe(true)
    expect(sel.isPointSelect.value).toBe(false)
    expect(selectionEvents.value).toEqual([])
  })

  it('finalise une sélection étendue en événement début + fin', () => {
    stubRaf()
    const state = makeConfigState(dataset)
    const selectionEvents = ref<Record<string, unknown>[]>([])
    const menuOpen = ref(false)
    const editMode = ref(false)
    const selectedEvent = ref<Record<string, unknown> | null>(null)
    const activator = ref<HTMLElement>()
    const sel = mountComposable(state, () => useEventSelection(selectionEvents, menuOpen, editMode, selectedEvent, activator, () => []))

    sel.onMouseDownTime(eventAt('2026-08-24', '10:00'), { date: '2026-08-24', time: '10:00' })
    sel.onMouseMoveTime(eventAt('2026-08-24', '12:00'), { year: 2026, month: 8, day: 24, hour: 12, minute: 0 })
    sel.finalizeSelection()

    expect(selectedEvent.value).toEqual({ start: '2026-08-24 10:00', end: '2026-08-24 12:00' })
    expect(menuOpen.value).toBe(true)
  })

  it('normalise une sélection inversée (fin avant début)', () => {
    stubRaf()
    const state = makeConfigState(dataset)
    const selectionEvents = ref<Record<string, unknown>[]>([])
    const menuOpen = ref(false)
    const editMode = ref(false)
    const selectedEvent = ref<Record<string, unknown> | null>(null)
    const activator = ref<HTMLElement>()
    const sel = mountComposable(state, () => useEventSelection(selectionEvents, menuOpen, editMode, selectedEvent, activator, () => []))

    sel.onMouseDownTime(eventAt('2026-08-24', '12:00'), { date: '2026-08-24', time: '12:00' })
    sel.onMouseMoveTime(eventAt('2026-08-24', '10:00'), { year: 2026, month: 8, day: 24, hour: 10, minute: 0 })
    sel.finalizeSelection()

    expect(selectedEvent.value).toEqual({ start: '2026-08-24 10:00', end: '2026-08-24 12:00' })
  })
})
