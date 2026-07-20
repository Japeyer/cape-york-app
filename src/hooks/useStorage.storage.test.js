// @vitest-environment jsdom
//
// Persistenz-Resilienz: was passiert, wenn der localStorage-Inhalt KAPUTT ist?
// Fremde Geräte, abgebrochene Schreibvorgänge, alte Schema-Versionen, manuelle Edits —
// der App-Start (loadTripStore) darf daran NIE crashen, sondern muss auf einen brauchbaren
// Zustand zurückfallen. Genau diese Klasse von "bei mir geht's, bei anderen nicht"-Bugs.

import { describe, it, expect, beforeEach } from 'vitest'
import { loadTripStore, saveTripStore } from './useStorage.js'

const TRIPS_KEY = 'cfg_trips_v1'

beforeEach(() => {
  localStorage.clear()
})

describe('loadTripStore — Resilienz gegen korrupten localStorage', () => {
  it('frischer Start (leer) → leerer Store, kein Crash', () => {
    const s = loadTripStore()
    expect(s.trips).toEqual([])
    expect(s.activeTripId).toBeNull()
  })

  it('kaputtes JSON → leerer Store statt Crash', () => {
    localStorage.setItem(TRIPS_KEY, '{ das ist kein json')
    expect(() => loadTripStore()).not.toThrow()
    expect(loadTripStore().trips).toEqual([])
  })

  it('trips ist kein Array → leerer Store', () => {
    localStorage.setItem(TRIPS_KEY, JSON.stringify({ trips: 'nope', activeTripId: 't1' }))
    expect(loadTripStore().trips).toEqual([])
  })

  it('null-/Müll-Einträge im trips-Array werden herausgefiltert, gültige bleiben', () => {
    localStorage.setItem(TRIPS_KEY, JSON.stringify({
      trips: [null, 'garbage', { id: 't1', name: 'Real', config: { days: 16 } }, {}, 42],
      activeTripId: 't1',
    }))
    let s
    expect(() => { s = loadTripStore() }).not.toThrow()
    expect(s.trips).toHaveLength(1)
    expect(s.trips[0].id).toBe('t1')
    expect(s.trips[0].config.days).toBe(16)
  })

  it('Trip ohne config → config wird auf Default sanitisiert (kein Crash)', () => {
    localStorage.setItem(TRIPS_KEY, JSON.stringify({ trips: [{ id: 't1' }], activeTripId: 't1' }))
    const s = loadTripStore()
    expect(s.trips[0].config).toBeTruthy()
    expect(Array.isArray(s.trips[0].config.people)).toBe(true)   // mergeConfig hat gegriffen
  })

  it('Trip mit primitiver config → Default statt Crash', () => {
    localStorage.setItem(TRIPS_KEY, JSON.stringify({ trips: [{ id: 't1', config: 'kaputt' }], activeTripId: 't1' }))
    expect(() => loadTripStore()).not.toThrow()
    expect(loadTripStore().trips[0].config.people).toBeTruthy()
  })

  it('activeTripId zeigt auf nicht-existenten Trip → wird auf ersten gültigen korrigiert', () => {
    localStorage.setItem(TRIPS_KEY, JSON.stringify({
      trips: [{ id: 't1', name: 'A', config: {} }], activeTripId: 't99',
    }))
    expect(loadTripStore().activeTripId).toBe('t1')
  })

  it('Trip ohne Namen bekommt einen Default-Namen (kein undefined in der UI)', () => {
    localStorage.setItem(TRIPS_KEY, JSON.stringify({ trips: [{ id: 't1', config: {} }], activeTripId: 't1' }))
    expect(typeof loadTripStore().trips[0].name).toBe('string')
    expect(loadTripStore().trips[0].name.length).toBeGreaterThan(0)
  })

  it('Round-Trip: gespeicherter Store wird korrekt wieder geladen', () => {
    saveTripStore({ trips: [{ id: 't1', name: 'June', config: { days: 12 } }], activeTripId: 't1' })
    const s = loadTripStore()
    expect(s.trips[0].name).toBe('June')
    expect(s.trips[0].config.days).toBe(12)
  })
})
