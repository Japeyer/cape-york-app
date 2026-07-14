// Build-time OSM-Daten-Fetch für Cape York Route-POIs.
// Ergebnis: src/data/route-pois.js — statisches Modul mit Tankstellen + supplyPoint-Geo-Refs.
//
// Architektur-Entscheidung: build-time (nicht runtime) damit die App offline-fähig bleibt
// (Cape York hat oft keinen Empfang). User muss `npm run osm:refresh` manuell ausführen
// wenn er aktualisierte OSM-Daten will — typisch alle paar Monate genug, OSM-Coverage
// in Remote-Australien ändert sich selten.
//
// Lizenz: OSM-Daten sind ODbL — Attribution "© OpenStreetMap contributors" muss in der
// App sichtbar sein (siehe src/strings.js / About-Section).
//
// Verwendung:
//   node scripts/fetch-osm.mjs
//   → schreibt src/data/route-pois.js (ESM-Modul)
//   → druckt Diff der kmFromCairns-Werte gegen regions.js aus

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_FILE = join(ROOT, 'src/data/route-pois.js')

// Cape York Bounding Box: Cairns (S) → Bamaga (N), Peninsula Development Road Korridor.
// Etwas weiter Richtung Westen damit Old Telegraph Track + alte Stationen mit dabei sind.
const BBOX = {
  south: -16.95,  // Süd-Cairns
  west:   142.0,
  north: -10.55,  // Cape York Tip / Bamaga
  east:   145.85,
}

// Cairns-Referenz-Position (Stadt-Center) für km-Berechnung.
const CAIRNS = { lat: -16.9203, lon: 145.7710 }

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// Overpass QL: alle Tankstellen (Nodes + Ways) in der Bounding Box.
// `out center tags` → Ways bekommen einen Center-Punkt + Tags.
const QUERY = `
[out:json][timeout:90];
(
  node["amenity"="fuel"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  way["amenity"="fuel"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
);
out center tags;
`.trim()

// Haversine — Distanz auf Kugel-Erde in km. Genau ±0.5% genug für Route-Sortierung.
// Echte Straßen-Distanz wäre ~1.2–1.5× größer (kurvige Outback-Pisten), aber für eine
// "Stop X liegt zwischen A und B"-Sortierung reicht Luftlinie.
function haversineKm(a, b) {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLon = (b.lon - a.lon) * Math.PI / 180
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180
  const sinDLat = Math.sin(dLat / 2)
  const sinDLon = Math.sin(dLon / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

// Cape-York-Heuristik: tatsächliche Straßen-Distanz ≈ 1.30× Luftlinie. Empirisch
// abgeleitet aus Cairns→Bamaga (1000 km Straße / ~770 km Luftlinie) und Cairns→Cooktown
// (330 km Straße / ~250 km Luftlinie). Heuristik genug für Sanity-Check der bestehenden
// regions.js-Werte.
const ROAD_FACTOR = 1.30
function estimatedRoadKm(asKm) {
  return Math.round(asKm * ROAD_FACTOR)
}

async function fetchOverpass(query) {
  console.log('→ Overpass query (~5–30 s, je nach Server-Last) …')
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      // Overpass verlangt einen aussagekräftigen UA — sonst 406. Ehrliche Identifikation
      // damit OSM-Admins bei Last-Problemen nachvollziehen können wer der Caller ist.
      'User-Agent': 'cape-york-app/1.0 (+https://github.com/Japeyer/cape-york-app)',
      'Accept': 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
  return res.json()
}

function extractFuelStops(osm) {
  const stops = []
  for (const el of osm.elements || []) {
    const tags = el.tags || {}
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (lat == null || lon == null) continue
    stops.push({
      id: `${el.type}/${el.id}`,
      name: tags.name || tags.brand || tags.operator || '(unnamed fuel)',
      brand: tags.brand || null,
      operator: tags.operator || null,
      diesel: tags['fuel:diesel'] === 'yes' ? true : tags['fuel:diesel'] === 'no' ? false : null,
      hours: tags.opening_hours || null,
      lat,
      lon,
      kmFromCairns: estimatedRoadKm(haversineKm(CAIRNS, { lat, lon })),
    })
  }
  // Sortierung: nach geschätzter Straßen-Distanz aufsteigend → Reise-Reihenfolge nordwärts.
  stops.sort((a, b) => a.kmFromCairns - b.kmFromCairns)
  return stops
}

// Bekannte supplyPoints aus regions.js zum Cross-Check (hardcoded hier statt import damit
// das Script standalone läuft ohne Vite/JSX-Auflösung).
const KNOWN_SUPPLY_POINTS = [
  { id: 'cairns',   name: 'Cairns',       lat: -16.9203, lon: 145.7710, currentKm:    0 },
  { id: 'cooktown', name: 'Cooktown',     lat: -15.4693, lon: 145.2510, currentKm:  330 },
  { id: 'coen',     name: 'Coen',         lat: -13.9410, lon: 143.1990, currentKm:  580 },
  { id: 'archer',   name: 'Archer River', lat: -13.4344, lon: 142.9332, currentKm:  670 },
  { id: 'bamaga',   name: 'Bamaga',       lat: -10.8889, lon: 142.3886, currentKm: 1000 },
]

function verifySupplyPointKm() {
  console.log('\n── kmFromCairns Verifikation (regions.js → OSM) ──')
  console.log('Stop'.padEnd(15) + 'Current'.padStart(8) + 'Estimated'.padStart(12) + 'Diff'.padStart(8))
  console.log('─'.repeat(43))
  const diffs = []
  for (const sp of KNOWN_SUPPLY_POINTS) {
    const air = haversineKm(CAIRNS, sp)
    const est = estimatedRoadKm(air)
    const diff = est - sp.currentKm
    const flag = Math.abs(diff) > 50 ? ' ⚠' : ''
    console.log(
      sp.name.padEnd(15) +
      String(sp.currentKm).padStart(8) +
      String(est).padStart(12) +
      String(diff > 0 ? `+${diff}` : diff).padStart(8) +
      flag,
    )
    diffs.push({ id: sp.id, current: sp.currentKm, estimated: est, diff })
  }
  return diffs
}

function renderModule(stops, generatedAt) {
  return `// Auto-generated by scripts/fetch-osm.mjs — DO NOT EDIT BY HAND.
// Re-generate with: npm run osm:refresh
//
// Quelle: OpenStreetMap (Overpass API). © OpenStreetMap contributors, ODbL.
// Stand: ${generatedAt}
//
// Skript-Heuristik: Straßen-Distanz ≈ 1.30 × Luftlinie ab Cairns (-16.92, 145.77).
// Stops sind nach geschätzter Straßen-km aufsteigend sortiert (Cairns → Bamaga = nordwärts).
// Diesel/Öffnungszeiten sind aus OSM-Tags und können fehlen — niemals verlassen, im Zweifel
// vor Fahrt anrufen.

export const ROUTE_POIS_GENERATED_AT = ${JSON.stringify(generatedAt)}

export const ROUTE_POIS_ATTRIBUTION = '© OpenStreetMap contributors (ODbL)'

export const FUEL_STOPS = ${JSON.stringify(stops, null, 2)}
`
}

async function main() {
  const generatedAt = new Date().toISOString().slice(0, 10)
  const osm = await fetchOverpass(QUERY)
  const stops = extractFuelStops(osm)
  console.log(`✓ ${stops.length} Tankstellen extrahiert`)
  if (stops.length) {
    console.log(`  Range: km ${stops[0].kmFromCairns} – km ${stops[stops.length - 1].kmFromCairns}`)
    const longestGap = stops.reduce((max, s, i) => {
      if (i === 0) return max
      const gap = s.kmFromCairns - stops[i - 1].kmFromCairns
      return gap > max.gap ? { gap, between: [stops[i - 1].name, s.name] } : max
    }, { gap: 0, between: [] })
    console.log(`  Längste Lücke: ${longestGap.gap} km (${longestGap.between.join(' → ')})`)
  }

  verifySupplyPointKm()

  writeFileSync(OUT_FILE, renderModule(stops, generatedAt), 'utf8')
  console.log(`\n✓ Geschrieben: ${OUT_FILE}`)
}

main().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
