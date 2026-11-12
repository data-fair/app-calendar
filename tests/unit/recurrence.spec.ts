import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import {
  cancelOccurrence,
  changedValues,
  findException,
  mergeException,
  occurrenceKey,
  parseExceptions,
  removeOccurrenceException,
  serializeExceptions,
  setOccurrenceException,
} from '@/utils/recurrence'

describe('recurrence exceptions', () => {
  it('reads an array or JSON text, and ignores invalid values', () => {
    const entries = [{ occurrence: '2026-10-12T14:00', cancelled: true }]
    expect(parseExceptions(entries)).toEqual(entries)
    expect(parseExceptions(JSON.stringify(entries))).toEqual(entries)
    expect(parseExceptions('')).toEqual([])
    expect(parseExceptions('{')).toEqual([])
    expect(parseExceptions({ occurrence: '2026-10-12T14:00' })).toEqual([])
    expect(parseExceptions([{ occurrence: 12 }, null])).toEqual([])
  })

  it('builds a local key stable to the minute', () => {
    expect(occurrenceKey(dayjs('2026-10-12T14:00:00+02:00'))).toBe('2026-10-12T14:00')
  })

  it('finds and applies an exception without touching the other fields', () => {
    const entries = parseExceptions([{ occurrence: '2026-10-12T14:00', values: { title: 'Décalé' } }])
    const exception = findException(entries, '2026-10-12T14:00')
    expect(exception?.values).toEqual({ title: 'Décalé' })
    expect(mergeException({ title: 'Série', place: 'Salle 1' }, exception)).toEqual({ title: 'Décalé', place: 'Salle 1' })
    expect(mergeException({ title: 'Série' }, { occurrence: '2026-10-12T14:00', cancelled: true })).toEqual({ title: 'Série' })
  })

  it('keeps only the changed fields, null included', () => {
    expect(changedValues(
      { title: 'Décalé', start: '2026-10-13T10:00:00+02:00', room: null },
      { title: 'Série', start: '2026-10-12T14:00:00+02:00', room: 'A' },
      ['title', 'start', 'room']
    )).toEqual({
      title: 'Décalé',
      start: '2026-10-13T10:00:00+02:00',
      room: null,
    })
    expect(changedValues({ title: 'Série' }, { title: 'Série' }, ['title'])).toEqual({})
  })

  it('replaces, cancels and removes an occurrence keeping the list sorted', () => {
    let entries = setOccurrenceException([], '2026-10-19T14:00', { title: 'B' })
    entries = setOccurrenceException(entries, '2026-10-12T14:00', { title: 'A' })
    expect(entries.map(e => e.occurrence)).toEqual(['2026-10-12T14:00', '2026-10-19T14:00'])

    entries = setOccurrenceException(entries, '2026-10-12T14:00', { title: 'A2' })
    expect(entries.find(e => e.occurrence === '2026-10-12T14:00')?.values).toEqual({ title: 'A2' })

    entries = cancelOccurrence(entries, '2026-10-19T14:00')
    expect(entries.find(e => e.occurrence === '2026-10-19T14:00')).toEqual({ occurrence: '2026-10-19T14:00', cancelled: true })

    entries = removeOccurrenceException(entries, '2026-10-12T14:00')
    expect(entries).toHaveLength(1)
  })

  it('serializes as an array or JSON text depending on the column', () => {
    const entries = [{ occurrence: '2026-10-12T14:00', cancelled: true }]
    expect(serializeExceptions(entries)).toEqual(entries)
    expect(serializeExceptions(entries, 'array')).toEqual(entries)
    expect(serializeExceptions(entries, 'string')).toBe(JSON.stringify(entries))
  })
})
