import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import { makeConfigState, makeDataset, field, LABEL_REFERS_TO, mountComposable } from './helpers'
import { useDateBounds } from '@/composables/useDateBounds'

const dataset = makeDataset([
  field('title', 'text', LABEL_REFERS_TO),
  field('start', 'date-time', 'https://schema.org/startDate')
])

describe('useDateBounds', () => {
  it('resolveMinDate returns null when minDate is empty or none', () => {
    for (const minDate of [undefined, 'none']) {
      const state = makeConfigState(dataset, { minDate } as never)
      const { resolveMinDate } = mountComposable(state, () => useDateBounds())
      expect(resolveMinDate()).toBeNull()
    }
  })

  it('resolveMinDate returns the expected bounds for the config value', () => {
    const cases: Array<[string, number, number]> = [
      ['day', 0, 0],
      ['tomorrow', 1, 0],
      ['one-week-later', 7, 0],
      ['one-month-later', 0, 1]
    ]
    for (const [minDate, days, months] of cases) {
      const state = makeConfigState(dataset, { minDate } as never)
      const { resolveMinDate } = mountComposable(state, () => useDateBounds())
      const expected = dayjs().add(days, 'day').add(months, 'month').startOf('day')
      expect(resolveMinDate()!.toDate().getTime()).toBe(expected.toDate().getTime())
    }
  })

  it('resolveMaxDate returns null when maxDate is empty or none', () => {
    for (const maxDate of [undefined, 'none']) {
      const state = makeConfigState(dataset, { maxDate } as never)
      const { resolveMaxDate } = mountComposable(state, () => useDateBounds())
      expect(resolveMaxDate()).toBeNull()
    }
  })

  it('resolveMaxDate returns the end of day for the configured bounds', () => {
    const cases: Array<[string, number, number]> = [
      ['one-week-later', 7, 0],
      ['one-month-later', 0, 1],
      ['one-year-later', 0, 12]
    ]
    for (const [maxDate, days, months] of cases) {
      const state = makeConfigState(dataset, { maxDate } as never)
      const { resolveMaxDate } = mountComposable(state, () => useDateBounds())
      const expected = dayjs().add(days, 'day').add(months, 'month').endOf('day')
      expect(resolveMaxDate()!.toDate().getTime()).toBe(expected.toDate().getTime())
    }
  })
})
