import { describe, it, expect } from 'vitest'
import { CAPE_YORK_POIS, LAYERS, MAP_BOUNDS } from './cape-york-pois.js'

describe('Cape York POI dataset', () => {
  it('jeder POI hat die Pflicht-Felder', () => {
    for (const p of CAPE_YORK_POIS) {
      expect(typeof p.id).toBe('string')
      expect(p.id.length).toBeGreaterThan(0)
      expect(typeof p.name).toBe('string')
      expect(typeof p.layer).toBe('string')
      expect(typeof p.lat).toBe('number')
      expect(typeof p.lng).toBe('number')
    }
  })

  it('alle POI-IDs sind unique', () => {
    const ids = CAPE_YORK_POIS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('jeder POI-layer ist in LAYERS deklariert', () => {
    const layerIds = new Set(LAYERS.map(l => l.id))
    for (const p of CAPE_YORK_POIS) {
      expect(layerIds.has(p.layer)).toBe(true)
    }
  })

  it('alle POIs liegen innerhalb der MAP_BOUNDS', () => {
    for (const p of CAPE_YORK_POIS) {
      expect(p.lat).toBeGreaterThanOrEqual(MAP_BOUNDS.latMin)
      expect(p.lat).toBeLessThanOrEqual(MAP_BOUNDS.latMax)
      expect(p.lng).toBeGreaterThanOrEqual(MAP_BOUNDS.lngMin)
      expect(p.lng).toBeLessThanOrEqual(MAP_BOUNDS.lngMax)
    }
  })

  it('LAYERS Konstanten haben Pflicht-Felder', () => {
    for (const l of LAYERS) {
      expect(typeof l.id).toBe('string')
      expect(typeof l.label).toBe('string')
      expect(typeof l.icon).toBe('string')
      expect(typeof l.color).toBe('string')
      expect(/^#[0-9A-Fa-f]{6}$/.test(l.color)).toBe(true)
      expect(typeof l.premium).toBe('boolean')
    }
  })

  it('Free-Layer (Resupply, Fuel, Beach, Crossing) sind als premium=false markiert — sicherheits-/pflichtkritisch', () => {
    const safetyCritical = ['fuel', 'resupply', 'beach', 'crossing']
    for (const id of safetyCritical) {
      const layer = LAYERS.find(l => l.id === id)
      expect(layer).toBeDefined()
      expect(layer.premium).toBe(false)
    }
  })

  it('jeder Layer hat mindestens 1 POI im Datensatz (außer fuel — der kommt aus FUEL_STOPS)', () => {
    for (const layer of LAYERS) {
      if (layer.id === 'fuel') continue  // fuel POIs leben separat in route-pois.js
      const count = CAPE_YORK_POIS.filter(p => p.layer === layer.id).length
      expect(count).toBeGreaterThan(0)
    }
  })

  it('Premium-Layer (Camp, Waterfall, Park, Historical) haben premium=true Markierung auf den POIs', () => {
    const premiumLayers = ['camp', 'waterfall', 'park', 'historical']
    for (const layerId of premiumLayers) {
      const pois = CAPE_YORK_POIS.filter(p => p.layer === layerId)
      expect(pois.length).toBeGreaterThan(0)
      // Konsistenz: alle POIs des Layers sollten die premium-Flag haben (der UI-Layer zieht
      // das vom LAYERS-Eintrag, das ist nur ein Sanity-Check für die Daten).
      for (const p of pois) {
        expect(p.premium).toBe(true)
      }
    }
  })
})
