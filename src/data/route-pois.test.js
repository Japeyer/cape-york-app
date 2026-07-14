import { describe, it, expect } from 'vitest'
import { FUEL_STOPS, ROUTE_POIS_ATTRIBUTION, ROUTE_POIS_GENERATED_AT } from './route-pois.js'

describe('route-pois module exports', () => {
  it('exportiert FUEL_STOPS als Array', () => {
    expect(Array.isArray(FUEL_STOPS)).toBe(true)
  })

  // ODbL-Pflicht: jede UI die diese Daten zeigt muss diesen String einblenden.
  // Test schützt davor dass die Konstante leer/umbenannt wird ohne dass die UI nachzieht.
  it('exportiert nicht-leeren ATTRIBUTION-String mit OpenStreetMap-Erwähnung', () => {
    expect(typeof ROUTE_POIS_ATTRIBUTION).toBe('string')
    expect(ROUTE_POIS_ATTRIBUTION.length).toBeGreaterThan(0)
    expect(ROUTE_POIS_ATTRIBUTION).toMatch(/openstreetmap/i)
  })

  it('exportiert GENERATED_AT als ISO-Date-String (YYYY-MM-DD)', () => {
    expect(ROUTE_POIS_GENERATED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('FUEL_STOPS Datenstruktur', () => {
  it('jeder Stop hat die Pflichtfelder id, name, lat, lon, kmFromCairns', () => {
    for (const stop of FUEL_STOPS) {
      expect(stop.id).toMatch(/^(node|way)\/\d+$/)
      expect(typeof stop.name).toBe('string')
      expect(stop.name.length).toBeGreaterThan(0)
      expect(typeof stop.lat).toBe('number')
      expect(typeof stop.lon).toBe('number')
      expect(typeof stop.kmFromCairns).toBe('number')
      expect(stop.kmFromCairns).toBeGreaterThanOrEqual(0)
    }
  })

  it('alle Koordinaten liegen in der Cape-York-Bounding-Box', () => {
    for (const stop of FUEL_STOPS) {
      expect(stop.lat).toBeGreaterThanOrEqual(-16.95)
      expect(stop.lat).toBeLessThanOrEqual(-10.55)
      expect(stop.lon).toBeGreaterThanOrEqual(142.0)
      expect(stop.lon).toBeLessThanOrEqual(145.85)
    }
  })

  it('Stops sind nach kmFromCairns aufsteigend sortiert (Reise-Reihenfolge)', () => {
    for (let i = 1; i < FUEL_STOPS.length; i++) {
      expect(FUEL_STOPS[i].kmFromCairns).toBeGreaterThanOrEqual(FUEL_STOPS[i - 1].kmFromCairns)
    }
  })

  it('IDs sind eindeutig (kein OSM-Duplikat)', () => {
    const ids = FUEL_STOPS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('optionale Felder sind null oder vom erwarteten Typ', () => {
    for (const stop of FUEL_STOPS) {
      expect(stop.brand === null || typeof stop.brand === 'string').toBe(true)
      expect(stop.operator === null || typeof stop.operator === 'string').toBe(true)
      expect(stop.diesel === null || typeof stop.diesel === 'boolean').toBe(true)
      expect(stop.hours === null || typeof stop.hours === 'string').toBe(true)
    }
  })
})

describe('FUEL_STOPS Plausibilität', () => {
  // Sanity-Check: 70+ Tankstellen in Cape York erwartet (Cairns hat allein ~25, Cooktown ~5,
  // Roadhouses entlang PDR ~10, Bamaga ~3). Wenn deutlich weniger → Overpass hat Daten verloren
  // oder BBox stimmt nicht mehr.
  it('hat eine plausible Anzahl an Tankstellen (mindestens 30)', () => {
    expect(FUEL_STOPS.length).toBeGreaterThanOrEqual(30)
  })

  // Mindestens eine Tankstelle nördlich von Cooktown (km > 300) ist Trip-kritisch.
  // Ohne Stops im Norden ist die Daten-Quelle für eine Cape-York-App wertlos.
  it('hat mindestens 5 Tankstellen nördlich von Cooktown (km > 300)', () => {
    const remote = FUEL_STOPS.filter(s => s.kmFromCairns > 300)
    expect(remote.length).toBeGreaterThanOrEqual(5)
  })

  // Bamaga (Cape York Tip) muss erreicht sein — wenn nicht, Overpass-BBox stimmt nicht.
  it('hat mindestens eine Tankstelle bei Bamaga (km > 900)', () => {
    const tip = FUEL_STOPS.filter(s => s.kmFromCairns > 900)
    expect(tip.length).toBeGreaterThanOrEqual(1)
  })
})
