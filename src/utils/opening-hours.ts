import { getDailyOpeningHours } from '@wojtekmaj/opening-hours-utils'

export type Slot = { from: number[], to: number[] }

const dayIndex: Record<string, number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 }

// Slots by day of week, indexed like dayjs().day() (0 = sunday) so the lookup
// never depends on the locale. Invalid opening hours give no slot at all.
export function parseOpeningHours (value: string): Record<number, Slot[]> {
  try {
    const dailyHours = getDailyOpeningHours(value) ?? []
    return Object.fromEntries(dailyHours.map(oh => [
      dayIndex[oh.day],
      oh.hours.map(h => ({ from: h.from.split(':').map(Number), to: (h.to ?? '').split(':').map(Number) }))
    ]))
  } catch {
    return {}
  }
}
