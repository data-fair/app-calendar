import { useConfig } from './config'
import { useLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import type { Dayjs } from 'dayjs'

export function useDateBounds () {
  const { config } = useConfig()
  const { dayjs } = useLocaleDayjs()

  function resolveMinDate (): Dayjs | null {
    const v = config.value.minDate
    if (!v || v === 'none') return null
    if (v === 'day') return dayjs().startOf('day')
    if (v === 'tomorrow') return dayjs().add(1, 'day').startOf('day')
    if (v === 'one-week-later') return dayjs().add(1, 'week').startOf('day')
    if (v === 'one-month-later') return dayjs().add(1, 'month').startOf('day')
    return null
  }

  function resolveMaxDate (): Dayjs | null {
    const v = config.value.maxDate
    if (!v || v === 'none') return null
    if (v === 'one-week-later') return dayjs().add(1, 'week').endOf('day')
    if (v === 'one-month-later') return dayjs().add(1, 'month').endOf('day')
    if (v === 'one-year-later') return dayjs().add(1, 'year').endOf('day')
    return null
  }

  return { resolveMinDate, resolveMaxDate }
}
