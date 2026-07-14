import { describe, it, expect } from 'vitest'
import {
  defaultConfig, mergeConfig, defaultTripName,
  migrateLegacyToStore, createTripInStore, deleteTripFromStore,
  renameTripInStore, setActiveInStore, getActiveTrip, putActiveConfig,
} from './useStorage.js'

// Reine Store-Helfer (kein localStorage) — die Kern-Logik von Multi-Trip.

describe('Trip-Store — reine Helfer', () => {
  it('migrateLegacyToStore packt eine Config als einzelnen Trip t1 (aktiv)', () => {
    const s = migrateLegacyToStore({ days: 16, diet: 'omnivore' })
    expect(s.trips).toHaveLength(1)
    expect(s.trips[0].id).toBe('t1')
    expect(s.activeTripId).toBe('t1')
    expect(s.trips[0].config.days).toBe(16)
    expect(typeof s.trips[0].name).toBe('string')
  })

  it('createTripInStore hängt an und setzt ihn aktiv', () => {
    let s = migrateLegacyToStore({ days: 16 })
    s = createTripInStore(s, { id: 't2', name: 'Weipa', config: defaultConfig() })
    expect(s.trips.map(t => t.id)).toEqual(['t1', 't2'])
    expect(s.activeTripId).toBe('t2')
  })

  it('putActiveConfig ändert NUR den aktiven Trip (Isolation)', () => {
    let s = createTripInStore(migrateLegacyToStore({ days: 16 }), { id: 't2', name: 'B', config: defaultConfig() })
    s = putActiveConfig(s, { ...defaultConfig(), days: 9 })          // aktiv = t2
    expect(getActiveTrip(s).config.days).toBe(9)
    expect(s.trips.find(t => t.id === 't1').config.days).toBe(16)    // t1 unberührt
    s = setActiveInStore(s, 't1')
    expect(getActiveTrip(s).config.days).toBe(16)
  })

  it('renameTripInStore benennt gezielt um', () => {
    let s = migrateLegacyToStore({ days: 5 })
    s = renameTripInStore(s, 't1', 'June run')
    expect(s.trips[0].name).toBe('June run')
  })

  it('deleteTripFromStore entfernt + wählt einen neuen aktiven Trip', () => {
    let s = createTripInStore(migrateLegacyToStore({ days: 16 }), { id: 't2', name: 'B', config: defaultConfig() })
    // aktiv = t2; t2 löschen → fällt zurück auf t1
    s = deleteTripFromStore(s, 't2')
    expect(s.trips.map(t => t.id)).toEqual(['t1'])
    expect(s.activeTripId).toBe('t1')
    // letzten Trip löschen → activeTripId null
    s = deleteTripFromStore(s, 't1')
    expect(s.trips).toHaveLength(0)
    expect(s.activeTripId).toBeNull()
  })

  it('setActiveInStore ignoriert unbekannte IDs', () => {
    const s = migrateLegacyToStore({ days: 5 })
    expect(setActiveInStore(s, 'nope').activeTripId).toBe('t1')
  })
})

describe('mergeConfig — Sanitisierung pro Trip', () => {
  it('migriert persons→people und ergänzt Weipa-Stops', () => {
    const m = mergeConfig({ persons: 2, days: 7 })
    expect(Array.isArray(m.people)).toBe(true)
    expect(m.people).toHaveLength(2)
    expect('weipa' in m.enabledStops).toBe(true)
    expect('weipa' in m.stopDays).toBe(true)
  })

  it('leere/kaputte Eingabe → defaultConfig', () => {
    expect(mergeConfig(null).days).toBe(defaultConfig().days)
    expect(mergeConfig(undefined).completed).toBe(false)
  })

  it('behält mealStatus als Objekt', () => {
    const m = mergeConfig({ days: 5, mealStatus: { 3: { ab: 'cooked' } } })
    expect(m.mealStatus[3].ab).toBe('cooked')
  })
})
