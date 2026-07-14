// Tag-zu-km-Schätzung + Fuel-Stop-Lookup auf der Cape-York-Strecke.
//
// Annahme: Trip ist Cairns (km 0, Tag 1) → Bamaga (km 1000, bamagaDay) → Cairns.
// Lineare Interpolation zwischen Cairns und Bamaga; Rückweg analog rückwärts.
// Reicht für „welche Tankstelle kommt nach Tag X" — nicht für genaue Route-Planung.
//
// Ohne Bamaga-Stop ist keine sinnvolle km-Schätzung möglich (kein Anker im Norden) →
// Funktion liefert null. UI versteckt die Section dann.

import { FUEL_STOPS } from '../data/route-pois.js'

// Fuel-Stops mit Brand oder Name → die nützlich anzeigbaren. (unnamed fuel) fallen oft
// auf die Cairns-Metro-Tankstellen oder unbenannte OSM-Einträge — die haben User selten
// als Ziel im Kopf. Brand/Name = klares Identifier-Tag.
function isShowable(stop) {
  return stop.name !== '(unnamed fuel)' || stop.brand != null
}

/**
 * Schätzt die km-Position ab Cairns für einen Trip-Tag.
 * Liefert null wenn keine Schätzung möglich (kein Bamaga-Stop = kein Norden-Anker).
 *
 * @param {object} args
 * @param {number} args.dayNum        — 1-basierter Trip-Tag
 * @param {number} args.days          — Trip-Länge total
 * @param {boolean} args.bamagaStop   — Bamaga eingeplant?
 * @param {number} args.bamagaDay     — Trip-Tag an dem Bamaga erreicht wird
 * @returns {{ km: number, direction: 'north' | 'south' } | null}
 */
export function estimateRoutePosition({ dayNum, days, bamagaStop, bamagaDay }) {
  if (!bamagaStop) return null
  if (!Number.isFinite(dayNum) || !Number.isFinite(days) || !Number.isFinite(bamagaDay)) return null
  if (dayNum < 1 || dayNum > days) return null

  // Outbound (Cairns → Bamaga). Tag 1 = km 0, bamagaDay = km 1000.
  if (dayNum <= bamagaDay) {
    const span = Math.max(1, bamagaDay - 1)  // bamagaDay=1 wäre Edge-Case (User-Fehler)
    const km = Math.round((dayNum - 1) / span * 1000)
    return { km, direction: 'north' }
  }

  // Return (Bamaga → Cairns). bamagaDay = km 1000, Tag last = km 0.
  const remainingDays = days - bamagaDay
  if (remainingDays <= 0) return { km: 1000, direction: 'south' }
  const progress = (dayNum - bamagaDay) / remainingDays
  const km = Math.round((1 - progress) * 1000)
  return { km, direction: 'south' }
}

/**
 * Liefert die nächsten N Fuel-Stops auf der Strecke ab einer km-Position.
 * Bei Richtung 'north' = stops mit höherer km; bei 'south' = niedrigere km (umgekehrt sortiert).
 * (unnamed fuel) ohne Brand werden gefiltert — meist Cairns-Metro-Stationen ohne OSM-Name.
 *
 * @param {number} currentKm   — aktuelle km-Position ab Cairns
 * @param {'north'|'south'} direction
 * @param {number} count       — max Anzahl Stops
 * @returns {Array<object>} Subset von FUEL_STOPS
 */
export function nextFuelStops(currentKm, direction, count = 3) {
  if (!Number.isFinite(currentKm) || count < 1) return []
  const showable = FUEL_STOPS.filter(isShowable)
  if (direction === 'north') {
    // Strikt > currentKm damit am Bamaga-Tag nicht Bamaga-BP selbst auftaucht.
    return showable.filter(s => s.kmFromCairns > currentKm).slice(0, count)
  }
  if (direction === 'south') {
    // Stops zwischen currentKm und Cairns, in Reise-Reihenfolge (also südwärts → absteigend).
    return showable.filter(s => s.kmFromCairns < currentKm).slice(-count).reverse()
  }
  return []
}
