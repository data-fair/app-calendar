import type dayjsType from 'dayjs'

export const dateFromConfig = function (dayjs: typeof dayjsType, configDate : 'none' | 'day' | 'tomorrow' | 'one-week-later' | 'one-month-later' | 'one-year-later'): string | undefined {
  if (configDate === 'none') return undefined
  else if (configDate === 'day') return dayjs().format('YYYY-MM-DD')
  else if (configDate === 'tomorrow') return dayjs().add(1, 'day').format('YYYY-MM-DD')
  else if (configDate === 'one-week-later') return dayjs().add(1, 'week').format('YYYY-MM-DD')
  else if (configDate === 'one-month-later') return dayjs().add(1, 'month').format('YYYY-MM-DD')
  else if (configDate === 'one-year-later') return dayjs().add(1, 'year').format('YYYY-MM-DD')
  else return undefined
}
