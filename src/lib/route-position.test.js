import { describe, it, expect } from 'vitest'
import { estimateRoutePosition, nextFuelStops } from './route-position.js'

describe('estimateRoutePosition — Outbound (Cairns → Bamaga)', () => {
  // Standard-Trip: 16 Tage, Bamaga an Tag 9.
  const trip = { days: 16, bamagaStop: true, bamagaDay: 9 }

  it('Tag 1 (Start in Cairns) ist km 0', () => {
    expect(estimateRoutePosition({ ...trip, dayNum: 1 })).toEqual({ km: 0, direction: 'north' })
  })

  it('Tag bamagaDay (Ankunft Bamaga) ist km 1000', () => {
    expect(estimateRoutePosition({ ...trip, dayNum: 9 })).toEqual({ km: 1000, direction: 'north' })
  })

  it('linear interpoliert dazwischen', () => {
    const r = estimateRoutePosition({ ...trip, dayNum: 5 })
    expect(r.direction).toBe('north')
    // (5-1)/(9-1) * 1000 = 500
    expect(r.km).toBe(500)
  })
})

describe('estimateRoutePosition — Return (Bamaga → Cairns)', () => {
  const trip = { days: 16, bamagaStop: true, bamagaDay: 9 }

  it('Tag direkt nach Bamaga zeigt Süd-Richtung', () => {
    const r = estimateRoutePosition({ ...trip, dayNum: 10 })
    expect(r.direction).toBe('south')
    // (10-9)/(16-9) * 1000 zurück = 1000 - 142 ≈ 857
    expect(r.km).toBeGreaterThan(800)
    expect(r.km).toBeLessThan(900)
  })

  it('letzter Tag (Rückkehr Cairns) ist km 0', () => {
    expect(estimateRoutePosition({ ...trip, dayNum: 16 })).toEqual({ km: 0, direction: 'south' })
  })

  it('Mitte Rückweg ist ~halbe Strecke', () => {
    const r = estimateRoutePosition({ ...trip, dayNum: 13 })
    expect(r.direction).toBe('south')
    expect(r.km).toBeGreaterThan(400)
    expect(r.km).toBeLessThan(600)
  })
})

describe('estimateRoutePosition — Edge Cases', () => {
  it('liefert null wenn bamagaStop=false (kein Norden-Anker)', () => {
    expect(estimateRoutePosition({ dayNum: 5, days: 14, bamagaStop: false, bamagaDay: 7 })).toBeNull()
  })

  it('liefert null bei out-of-range Tag', () => {
    const trip = { days: 16, bamagaStop: true, bamagaDay: 9 }
    expect(estimateRoutePosition({ ...trip, dayNum: 0 })).toBeNull()
    expect(estimateRoutePosition({ ...trip, dayNum: 17 })).toBeNull()
  })

  it('liefert null bei nicht-finiten Inputs', () => {
    expect(estimateRoutePosition({ dayNum: NaN, days: 16, bamagaStop: true, bamagaDay: 9 })).toBeNull()
    expect(estimateRoutePosition({ dayNum: 5, days: NaN, bamagaStop: true, bamagaDay: 9 })).toBeNull()
  })

  it('Trip ohne Rückweg (bamagaDay = letzter Tag) zeigt south direkt nicht', () => {
    // Wenn bamagaDay === days, gibt's keinen Rückweg im Trip — Tag 16 ist Bamaga.
    const trip = { days: 16, bamagaStop: true, bamagaDay: 16 }
    expect(estimateRoutePosition({ ...trip, dayNum: 16 })).toEqual({ km: 1000, direction: 'north' })
  })
})

describe('nextFuelStops', () => {
  it('liefert Stops nördlich der currentKm in Reise-Reihenfolge', () => {
    const stops = nextFuelStops(500, 'north', 3)
    expect(stops.length).toBeLessThanOrEqual(3)
    expect(stops.length).toBeGreaterThan(0)
    for (const s of stops) {
      expect(s.kmFromCairns).toBeGreaterThan(500)
    }
    // Aufsteigend sortiert (Reise-Reihenfolge nordwärts)
    for (let i = 1; i < stops.length; i++) {
      expect(stops[i].kmFromCairns).toBeGreaterThanOrEqual(stops[i - 1].kmFromCairns)
    }
  })

  it('liefert Stops südlich der currentKm in Süd-Reise-Reihenfolge (absteigend)', () => {
    const stops = nextFuelStops(700, 'south', 3)
    expect(stops.length).toBeGreaterThan(0)
    for (const s of stops) {
      expect(s.kmFromCairns).toBeLessThan(700)
    }
    // Absteigend sortiert (Reise-Reihenfolge südwärts)
    for (let i = 1; i < stops.length; i++) {
      expect(stops[i].kmFromCairns).toBeLessThanOrEqual(stops[i - 1].kmFromCairns)
    }
  })

  it('respektiert das count-Limit', () => {
    const stops = nextFuelStops(0, 'north', 2)
    expect(stops.length).toBe(2)
  })

  it('schließt strikt > currentKm aus (am Bamaga-Tag erscheint Bamaga selbst nicht)', () => {
    // Bei km=1000 (Bamaga selbst): keine Stops mehr nördlich
    const stops = nextFuelStops(1000, 'north', 3)
    expect(stops.length).toBe(0)
  })

  it('liefert leeres Array bei invalidem Input', () => {
    expect(nextFuelStops(NaN, 'north', 3)).toEqual([])
    expect(nextFuelStops(500, 'invalid', 3)).toEqual([])
  })

  it('filtert (unnamed fuel) ohne Brand raus', () => {
    const stops = nextFuelStops(0, 'north', 50)
    for (const s of stops) {
      // Entweder hat einen Namen != "(unnamed fuel)" oder einen Brand
      const hasIdentifier = s.name !== '(unnamed fuel)' || s.brand != null
      expect(hasIdentifier).toBe(true)
    }
  })
})
