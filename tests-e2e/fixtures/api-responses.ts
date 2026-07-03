// Mock API responses for the DataFair endpoints used by app-calendar.
// Each response is small but realistic (a handful of events with realistic shape)
// so we exercise the data flow without pulling real data.
//
// Tests match URLs by substring (see helpers/mock-api.ts) and serve these JSON
// payloads via page.route().

import type { DatasetKey } from './datasets'

const now = new Date()
const TODAY = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

// ──────────────────────────────────────────────────────────────────
// /lines
// ──────────────────────────────────────────────────────────────────

/**
 * 5 accidents-velos events spread across the current month
 * (date-only field, format='date').
 */
export const linesAccidentsVelos = (() => {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const events = []
  for (let i = 0; i < 5; i++) {
    const day = String(i * 5 + 1).padStart(2, '0')
    events.push({
      _id: `acc-${i}`,
      Num_Acc: `2024ACC${String(i).padStart(5, '0')}`,
      date: `${year}-${month}-${day}`,
      dep: ['75', '92', '13', '69', '31'][i],
      an: year,
      agg: i % 2 === 0 ? 1 : 2,
      grav: ['1', '2', '3', '4', '1'][i],
    })
  }
  return { total: events.length, results: events }
})()

/**
 * 4 multi-day events (startDate + endDate) like JEP.
 */
export const linesJep = (() => {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return {
    total: 4,
    results: [
      {
        _id: 'jep-1',
        title_fr: 'Visite du musée',
        firstdate_begin: `${year}-${month}-01T10:00:00.000Z`,
        lastdate_end: `${year}-${month}-01T18:00:00.000Z`,
        updatedat: `${year}-${month}-01T08:00:00.000Z`,
        location_city: 'Paris',
      },
      {
        _id: 'jep-2',
        title_fr: 'Conférence patrimoine',
        firstdate_begin: `${year}-${month}-05T14:00:00.000Z`,
        lastdate_end: `${year}-${month}-07T17:00:00.000Z`,
        updatedat: `${year}-${month}-01T08:00:00.000Z`,
        location_city: 'Lyon',
      },
      {
        _id: 'jep-3',
        title_fr: 'Exposition photo',
        firstdate_begin: `${year}-${month}-10T09:00:00.000Z`,
        lastdate_end: `${year}-${month}-10T18:00:00.000Z`,
        updatedat: `${year}-${month}-01T08:00:00.000Z`,
        location_city: 'Marseille',
      },
      {
        _id: 'jep-4',
        title_fr: 'Atelier enfants',
        firstdate_begin: `${year}-${month}-15T10:00:00.000Z`,
        lastdate_end: `${year}-${month}-15T12:00:00.000Z`,
        updatedat: `${year}-${month}-01T08:00:00.000Z`,
        location_city: 'Bordeaux',
      },
    ],
  }
})()

/**
 * 6 admin events with explicit time slots (start + end as date-time),
 * used by jep_admin_week for drag/resize/edit/delete tests.
 * Distributed across the current week so every working day has at least one event.
 */
export const linesJepAdmin = (() => {
  const now2 = new Date()
  const year = now2.getFullYear()
  const month = String(now2.getMonth() + 1).padStart(2, '0')
  // Place events in the current week (offset by 0..3 days from today)
  const baseDay = now2.getDate()
  return {
    total: 4,
    results: [
      {
        _id: 'jep-admin-1',
        title_fr: 'Événement admin 1',
        firstdate_begin: `${year}-${month}-${String(baseDay).padStart(2, '0')}T09:00:00.000Z`,
        lastdate_end: `${year}-${month}-${String(baseDay).padStart(2, '0')}T10:30:00.000Z`,
        updatedat: `${year}-${month}-01T08:00:00.000Z`,
        location_city: 'Paris',
      },
      {
        _id: 'jep-admin-2',
        title_fr: 'Événement admin 2',
        firstdate_begin: `${year}-${month}-${String(baseDay + 1).padStart(2, '0')}T14:00:00.000Z`,
        lastdate_end: `${year}-${month}-${String(baseDay + 1).padStart(2, '0')}T15:00:00.000Z`,
        updatedat: `${year}-${month}-01T08:00:00.000Z`,
        location_city: 'Lyon',
      },
      {
        _id: 'jep-admin-3',
        title_fr: 'Événement admin 3',
        firstdate_begin: `${year}-${month}-${String(baseDay + 2).padStart(2, '0')}T11:00:00.000Z`,
        lastdate_end: `${year}-${month}-${String(baseDay + 2).padStart(2, '0')}T12:30:00.000Z`,
        updatedat: `${year}-${month}-01T08:00:00.000Z`,
        location_city: 'Marseille',
      },
      {
        _id: 'jep-admin-4',
        title_fr: 'Événement admin 4',
        firstdate_begin: `${year}-${month}-${String(baseDay + 3).padStart(2, '0')}T16:00:00.000Z`,
        lastdate_end: `${year}-${month}-${String(baseDay + 3).padStart(2, '0')}T17:00:00.000Z`,
        updatedat: `${year}-${month}-01T08:00:00.000Z`,
        location_city: 'Bordeaux',
      },
    ],
  }
})()

/**
 * 6 future events for the planning view (open-ended, today or later).
 * Used by jep_planning.
 */
export const linesJepPlanning = (() => {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const events = []
  for (let i = 0; i < 6; i++) {
    const day = String(Math.max(now.getDate(), 1) + i * 3).padStart(2, '0')
    events.push({
      _id: `jep-future-${i}`,
      title_fr: `Événement futur ${i + 1}`,
      firstdate_begin: `${year}-${month}-${day}T10:00:00.000Z`,
      lastdate_end: `${year}-${month}-${day}T18:00:00.000Z`,
      updatedat: `${year}-${month}-01T08:00:00.000Z`,
      location_city: ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse', 'Nantes'][i],
    })
  }
  return { total: events.length, results: events, next: null }
})()

/**
 * 20 future events to test pagination (next=null = end of pages).
 * Used by planning view.
 */
export const linesJepPlanningPaginated = (() => {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const events = []
  for (let i = 0; i < 20; i++) {
    const day = String(((now.getDate() + i) % 28) + 1).padStart(2, '0')
    events.push({
      _id: `jep-page-${i}`,
      title_fr: `Événement ${i + 1}`,
      firstdate_begin: `${year}-${month}-${day}T${String(9 + (i % 8)).padStart(2, '0')}:00:00.000Z`,
      lastdate_end: `${year}-${month}-${day}T${String(17 + (i % 5)).padStart(2, '0')}:00:00.000Z`,
      updatedat: `${year}-${month}-01T08:00:00.000Z`,
      location_city: 'Paris',
    })
  }
  return { total: events.length, results: events, next: null }
})()

/**
 * Empty results for the planning empty state.
 */
export const emptyResults = { total: 0, results: [], next: null }

/**
 * Single event for an admin / single-event test.
 */
export const linesSingleEvent = (() => {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return {
    total: 1,
    results: [{
      _id: 'single-1',
      Num_Acc: '2024SINGLE01',
      date: `${year}-${month}-15`,
      dep: '75',
      an: year,
    }],
  }
})()

// ──────────────────────────────────────────────────────────────────
// /values/<field>
// ──────────────────────────────────────────────────────────────────

export const valuesAccidentsAgg = ['1', '2']

// ──────────────────────────────────────────────────────────────────
// /safe-schema (used by EventEdit form)
// ──────────────────────────────────────────────────────────────────

/**
 * Minimal schema for the EventEdit VJSF form (read by `/safe-schema?...`).
 * Only keeps user-editable fields (no _id, _i, _rand, etc.).
 */
export const safeSchemaAccidents = {
  type: 'object',
  properties: {
    Num_Acc: { type: 'string', title: 'Identifiant accident' },
    date: { type: 'string', format: 'date', title: 'Date' },
    dep: { type: 'string', title: 'Département' },
    an: { type: 'integer', title: 'Année' },
  },
}

/**
 * JEP-style single event (for /lines?_id_eq=... used by EventDetails modale).
 */
export const linesJepAdminSingle = (() => {
  const now3 = new Date()
  const year3 = now3.getFullYear()
  const month3 = String(now3.getMonth() + 1).padStart(2, '0')
  const day3 = String(now3.getDate()).padStart(2, '0')
  return {
    total: 1,
    results: [{
      _id: 'jep-admin-1',
      title_fr: 'Événement admin 1',
      firstdate_begin: `${year3}-${month3}-${day3}T09:00:00.000Z`,
      lastdate_end: `${year3}-${month3}-${day3}T10:30:00.000Z`,
      updatedat: `${year3}-${month3}-01T08:00:00.000Z`,
      location_city: 'Paris',
    }],
  }
})()

/**
 * JEP-safe-schema (for EventEdit.vue form loading).
 */
export const safeSchemaJep = {
  type: 'object',
  properties: {
    title_fr: { type: 'string', title: 'Titre' },
    firstdate_begin: { type: 'string', format: 'date-time', title: 'Début' },
    lastdate_end: { type: 'string', format: 'date-time', title: 'Fin' },
    location_city: { type: 'string', title: 'Ville' },
  },
}
