// Build-time OSM-Daten-Fetch für Cape-York-Geographie:
//   - Hauptflüsse (waterway=river) mit echten Wegpunkten
//   - Nationalpark-Polygone (boundary=protected_area / national_park) mit echten Grenzen
//   - Hauptstrassen (highway=*) — Mulligan, PDR, NPA, Old Telegraph, Tip, Lockhart-Branch
//   - Coastline (natural=coastline) als Grundlage für die Land-Polygon-Form
//   - **Land-Polygon** — Cape-York-Halbinsel als geschlossener Polygon, gebaut aus den
//     OSM-Coast-Chains und im Süden via BBox-Rand geschlossen. Ersetzt die früher
//     hand-skizzierte Outline und sorgt damit für Skalen-Konsistenz mit allen anderen
//     OSM-Layern (Roads/Rivers/NPs).
//   - **Forest-Polygone** (natural=wood + landuse=forest) — echte Vegetation statt
//     hand-platzierter Ovale.
//
// Ergebnis: src/data/cape-york-geo.js — statisches Modul, ESM, ODbL-attribuiert.
// Re-Generation: `npm run geo:refresh`. Build-time (nicht runtime) damit App offline-fähig bleibt.
//
// Architektur-Entscheidung: Statt Hand-skizzierte Geo-Daten aus Trainingswissen
// (ungenau, max ~10 Wegpunkte) nehmen wir echte OSM-Geometrien und vereinfachen sie
// per Douglas-Peucker. Tolerance pro Layer differenziert:
//   Flüsse  ε=0.005° (~550m)  — Hauptverlauf reicht für Coast-/Lake-Andeutung
//   NPs     ε=0.002° (~220m)  — Form-Detail wichtig, User soll Park-Lobes erkennen
//   Roads   ε=0.001° (~110m)  — Kurven matter, Strassen-Realismus
//
// Lizenz: OSM-Daten sind ODbL — Attribution in der App sichtbar (siehe AboutTab).
//
// Bekannte Cape-York-Geographie, die das Skript erfasst:
//   Flüsse:   Jardine, Wenlock, Pascoe, Archer, Normanby, Endeavour, Mitchell
//   NPs:      Lakefield (Rinyirru), Iron Range (Kutini-Payamu), Jardine River,
//             Heathlands/Apudthama, Mungkan Kandju (Oyala Thumotang)
//   Strassen: Mulligan Highway, Peninsula Developmental Road, Bamaga Road / NPA,
//             Old Telegraph Track, Pajinka/Tip Road, Lockhart-Branch (Portland Roads)
//
// Wenn ein Match nicht gefunden wird (OSM-Daten ändern sich), bleibt der ID-Eintrag
// unbesetzt und der vorherige Hand-Wert in cape-york-pois.js wird als Fallback genutzt.

import { writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_FILE = join(ROOT, 'src/data/cape-york-geo.js')

const BBOX = {
  south: -19.00,   // südlich erweitert für Mainland-Andeutung + Mitchell-River-Catchment
  west:   141.50,
  north: -10.50,
  east:   146.00,
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// Overpass-QL: Flüsse + Nationalparks + Strassen in der Cape-York-BBox.
// `out geom;` returnt für Ways die Wegpunkte direkt, für Relations die Member-Way-Geometrien.
//
// Strassen-Filter: nur Ways mit Highway-Tag UND einem der bekannten Cape-York-Namen.
// Damit ziehen wir nicht alle 4WD-Tracks rein (zu viele), sondern gezielt die 6 die wir
// rendern wollen. Server-side gefiltert via Regex-Match auf `name`.
const QUERY = `
[out:json][timeout:540];
(
  // Hauptflüsse (waterway=river) — alle Ways in Cape-York-BBox
  way["waterway"="river"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  // Streams — viele „River" in Cape York sind in OSM als stream getaggt (Stewart, Olive,
  // Coen, Edward, Watson, Lukin, Lockhart, McIvor). Wir nehmen alle named streams +
  // bekannte Cape-York-Creeks (Old-Tele-Crossings: Palm, Cypress, Bertie, Cannibal, Sailor,
  // Mistake, Nolan's, Indian Head). Filter auf benannte Streams sonst kommt zu viel Noise.
  way["waterway"="stream"]["name"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  // Nationalpark-Relations (typisch als Multi-Polygon mit outer/inner Members)
  relation["boundary"="protected_area"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  relation["boundary"="national_park"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  // Fallback: einzelne Ways die als NP getaggt sind (kleine Reserves)
  way["boundary"="national_park"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  // Hauptstrassen + Famous Tracks (named) — wird später per ROAD_NAME_MAP gematcht für
  // Trip-Overlay-Logik (Mulligan/PDR/NPA/Old-Tele/Pajinka/etc) UND für Famous-Track-
  // Render mit hoher Detail-Tolerance (CREB/Frenchmans/Bloomfield/Usshers/etc).
  way["highway"]["name"~"Mulligan|Peninsula Developmental|Bamaga|Old Telegraph|Captain Cook|Pajinka|Lockhart|Portland|Frenchman|Heathlands|Wakooka|Starcke|Lakefield|Rinyirru|Battle Camp|Kalpowar|Cooktown Developmental|CREB|C\\.R\\.E\\.B|Cairns Rainforest|Bloomfield|Cape Tribulation|Usshers?|Captain Billy|Twin Falls|Eli?ot Falls|Vrilya|Mapoon|Telegraph|Cape Melville|Seven Mile",i](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  // Major Roads — Hauptverkehrs-Highways in der bbox (mit oder ohne Name).
  // BEWUSST OHNE unclassified — das wären tausende lokaler Strassen in Cairns
  // die unsere Cape-York-Übersicht überfluten würden.
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  // Tracks — ALLE highway=track in bbox (vorher: nur mit tracktype ODER name).
  // Wir fangen damit auch unnamed Tracks zu Usshers Point, Twin Falls etc. ein —
  // der Connectivity-Filter (post-Extraction) wirft die raus die nirgends ankoppeln.
  way["highway"="track"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  // Coastline — die echte OSM-Coast-Polyline für Cape York
  way["natural"="coastline"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  // Forest / Vegetation — natural=wood + landuse=forest (Ways + Relations)
  way["natural"="wood"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  way["landuse"="forest"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  relation["natural"="wood"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  relation["landuse"="forest"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  // Camp Sites — tourism=camp_site (nodes, ways, relations) für die Cape-York-Camping-Daten.
  // OSM hat ~250 Camps in Cape-York-bbox, davon ~235 mit Name. Mix aus QPWS-NP-Camps,
  // Aboriginal-Community-Camps, kommerziellen Camping-Resorts und Roadhouse-Camps.
  // Alternative zu QPWS-Daten die Login-blockiert sind — gleiche ODbL-Lizenz wie Roads/Rivers.
  node["tourism"="camp_site"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  way["tourism"="camp_site"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  relation["tourism"="camp_site"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
);
out geom;
`.trim()

// Name-Pattern → interne ID für die App.
// Reihenfolge: spezifischste Pattern zuerst, sonst matched ein kürzeres Pattern fälschlich.
const RIVER_NAME_MAP = [
  // Hauptflüsse (Karpentarien-Coast oder Coral-Sea-Coast)
  { id: 'jardine',   pattern: /^jardine (river|creek)$/i },
  { id: 'wenlock',   pattern: /^wenlock (river|creek)$/i },
  { id: 'pascoe',    pattern: /^pascoe (river|creek)$/i },
  { id: 'archer',    pattern: /^archer (river|creek)$/i },
  { id: 'normanby',  pattern: /^normanby (river|creek)$/i },
  { id: 'endeavour', pattern: /^endeavour (river|creek)$/i },
  { id: 'mitchell',  pattern: /^mitchell (river|creek)$/i },
  // Sekundärflüsse (in Cape-York-Trip-Region wichtig — Crossings, Lakefield, Iron Range)
  // Iteration 5: Pattern erweitert um Creek-Variante. Viele Cape-York-„Rivers" sind in
  // OSM als „Creek" getaggt (kürzere Wasserläufe trotz „River"-Namensgebung im Volksmund).
  { id: 'stewart',   pattern: /^stewart (river|creek)$/i },
  { id: 'olive',     pattern: /^olive (river|creek)$/i },
  { id: 'coen',      pattern: /^coen (river|creek)$/i },
  { id: 'dulhunty',  pattern: /^dulhunty (river|creek)$/i },
  { id: 'hann',      pattern: /^hann (river|creek)$/i },
  { id: 'edward',    pattern: /^edward (river|creek)$/i },
  { id: 'watson',    pattern: /^watson (river|creek)$/i },
  { id: 'lukin',     pattern: /^lukin (river|creek)$/i },
  { id: 'kennedy',   pattern: /^kennedy (river|creek)$/i },
  { id: 'morehead',  pattern: /^morehead (river|creek)$/i },
  { id: 'holroyd',   pattern: /^holroyd (river|creek)$/i },
  { id: 'lockhart',  pattern: /^lockhart (river|creek)$/i },
  { id: 'mcivor',    pattern: /^mcivor (river|creek)$/i },
  { id: 'annan',     pattern: /^annan (river|creek)$/i },
  // Old-Tele-Crossing-Creeks (in OSM als waterway=stream, nicht river — Iteration 3)
  { id: 'palm-creek',     pattern: /^palm creek$/i },
  { id: 'cypress-creek',  pattern: /^cypress creek$/i },
  { id: 'bertie-creek',   pattern: /^bertie creek$/i },
  { id: 'cannibal-creek', pattern: /^cannibal creek$/i },
  { id: 'sailor-creek',   pattern: /^sailor creek$/i },
  { id: 'mistake-creek',  pattern: /^mistake creek$/i },
  { id: 'nolan-creek',    pattern: /^nolan'?s? brook$|^nolan'?s? creek$/i },
  { id: 'indian-head',    pattern: /^indian head creek$/i },
  { id: 'cholmondeley',   pattern: /^cholmondeley creek$/i },
  { id: 'ducie',          pattern: /^ducie river$/i },  // teils als stream getaggt
  { id: 'jacky',          pattern: /^jacky jacky creek$/i },
]

const NP_NAME_MAP = [
  { id: 'np-lakefield', pattern: /rinyirru|lakefield/i },
  { id: 'np-iron',      pattern: /iron range|kutini.?payamu/i },
  { id: 'np-jardine',   pattern: /jardine.river|jardine.+national.park/i },
  { id: 'np-apudthama', pattern: /apudthama|heathlands/i },
  { id: 'np-mungkan',   pattern: /mungkan|oyala.thumotang/i },
]

// Strassen-Pattern. Mulligan/Captain Cook = Süd-Cape-York-Verbindung Cairns→Cooktown.
// Old Telegraph: OSM unterscheidet drei Varianten.
//   1. "Old Telegraph Track" — die historische 4WD-Track (gestrichelt, primärer Track-Style)
//   2. "Old Telegraph Line Bypass" — der gegradete Bypass entlang der Track (sekundär)
//   3. "Bamaga Road (Old Telegraph Line)" — die moderne Bamaga Road = Teil von npaRoad
// npaRoad-Pattern erweitert damit auch Klammer-Suffix-Variante mitgenommen wird.
// Pajinka Road = der ungesealte Tip-Stretch ab Bamaga.
// Lockhart Road / Portland Roads = der Branch zur Iron-Range-NP / Chili Beach.
const ROAD_NAME_MAP = [
  { id: 'mulligan',         pattern: /mulligan|captain cook/i },
  { id: 'pdr',              pattern: /peninsula developmental/i },
  { id: 'npaRoad',          pattern: /^bamaga road(\s*\(.*\))?$/i },
  { id: 'oldTele',          pattern: /^old telegraph (track|road)$|^telegraph track$/i },
  { id: 'oldTeleBypass',    pattern: /^old telegraph line bypass$|^southern bypass road$/i },
  { id: 'tipRoad',          pattern: /pajinka/i },
  { id: 'ironRangeBranch',  pattern: /lockhart road|portland roads|iron range road/i },
  // Iteration 4 — bekannte Cape-York-Tracks und Branch-Roads die vorher nicht im
  // Pattern waren. Sind beim User vermutlich als „Strasse endet im Nichts" sichtbar
  // wenn die App eine Hauptstrasse zeigt aber nicht den Anschluss-Track.
  { id: 'frenchmans',       pattern: /^frenchman'?s? track$/i },
  { id: 'heathlands',       pattern: /^heathlands road$/i },
  { id: 'bamagaTele',       pattern: /^bamaga road \(old telegraph line\)$/i },  // sometimes separate from npaRoad
  { id: 'sevenmile',        pattern: /^seven mile road$/i },
  { id: 'wakooka',          pattern: /^wakooka road$/i },
  { id: 'starcke',          pattern: /^starcke road$/i },
  { id: 'rinyirru',         pattern: /^rinyirru road$|^lakefield road$/i },
  { id: 'battle-camp',      pattern: /^battle camp road$/i },
  { id: 'kalpowar',         pattern: /^kalpowar crossing road$/i },
  { id: 'cooktown-dev',     pattern: /^cooktown developmental road$/i },
  // ── Famous Cape-York-Tracks (User-Wunsch: hoher Detail-Grad) ────────────────
  // CREB Track = „Cairns Range, Eastern, Bushland" — der berühmte 4WD-Track via
  // Daintree-Hinterland von Cairns nach Cooktown. OSM-Tagging variiert.
  { id: 'creb',             pattern: /^c\.?r\.?e\.?b\.? track$|^cairns rainforest experience and bushwalk$/i },
  // Bloomfield Track — ungesealte Cooktown↔Cape-Trib-Coast-Route (Bloomfield Falls).
  { id: 'bloomfield',       pattern: /^bloomfield track$|^cape tribulation road$/i },
  // Permissive Patterns: matchen den Track auch wenn das OSM-Name-Suffix variiert
  // (Track / Road / nur Place-Name). Worst case: ein Track der zur Stelle führt
  // wird erfasst auch wenn er offiziell anders heißt.
  { id: 'usshers',          pattern: /^usshers?\s*point/i },
  { id: 'captainBilly',     pattern: /^captain billy/i },
  { id: 'twinFalls',        pattern: /^twin falls/i },
  { id: 'eliotFalls',       pattern: /^elli?ot falls/i },
  { id: 'vrilya',           pattern: /^vrilya\s*point/i },
  { id: 'mapoon',           pattern: /^mapoon/i },
  { id: 'telegraph',        pattern: /^telegraph (road|track)$/i },
  { id: 'capeMelville',     pattern: /^cape melville/i },
]

function matchId(map, name) {
  if (!name) return null
  for (const entry of map) {
    if (entry.pattern.test(name)) return entry.id
  }
  return null
}

// Douglas-Peucker-Tolerances pro Layer in Grad (1° lat ≈ 111 km).
// Niedriger = mehr Detail = mehr Bundle-Bytes. User hat explizit grünes Licht
// für größere Bundle-Größen gegeben um Detail-Genauigkeit zu maximieren.
const SIMPLIFY = {
  river:  0.002,    // ~220m — Flussschleifen sichtbar
  park:   0.0008,   // ~88m  — Park-Lobes/Concave-Edges scharf
  road:   0.0004,   // ~44m  — Strassen-Kurven mit Highway-Realismus
  coast:  0.001,    // ~110m — Coast-Detail für Outline
  land:   0.0008,   // ~88m  — Hand-Outline ersetzt → muss eng an Coast-Detail liegen
  forest: 0.003,    // ~330m — Forest-Patches sind großflächig, Detail-Aufwand niedriger
}

// Forest-Polygone: nur Patches die größer als dieser Schwellwert (Bbox-Diagonale in
// Grad lat/lng) sind kommen ins Bundle. Tiny patches wären visuell nutzlos.
// 0.04° ≈ 4.4 km Bbox-Edge — auch mittelgrosse Wald-Blöcke kommen durch (vorher 0.08°).
// Cap zusätzlich auf FOREST_TOP_N um Bundle-Bloat zu vermeiden.
const FOREST_MIN_BBOX = 0.04
const FOREST_TOP_N = 200

// ── Douglas-Peucker (rein lat/lng, kein echtes Geodäsie — reicht für ~500m-Tolerance) ──
function perpDist(p, a, b) {
  const dx = b[1] - a[1]
  const dy = b[0] - a[0]
  const norm = Math.hypot(dx, dy)
  if (norm === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  return Math.abs((dx * (a[0] - p[0]) - (a[1] - p[1]) * dy) / norm)
}
function douglasPeucker(points, epsilon) {
  if (points.length <= 2) return points.slice()
  let maxDist = 0
  let maxIdx = 0
  const start = points[0]
  const end = points[points.length - 1]
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], start, end)
    if (d > maxDist) { maxDist = d; maxIdx = i }
  }
  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon)
    const right = douglasPeucker(points.slice(maxIdx), epsilon)
    return left.slice(0, -1).concat(right)
  }
  return [start, end]
}

// ── Way-Chaining: OSM-Flüsse/Strassen sind oft in viele Ways aufgesplittet, die
//    topologisch aneinander hängen. Diese Funktionen hängen sie zu zusammenhängenden
//    Polylines zusammen.
//
//    `chainWaysAll(ways, tol)` — gibt ALLE Chains zurück, sortiert nach Länge absteigend.
//    Tributaries und disconnected branches überleben → keine „endet im Nichts"-Effekte.
//
//    `chainWays(ways)` — Compat-Wrapper: gibt nur die längste Chain zurück (für
//    NP-Polygone, wo wir nur den Outer-Ring wollen).
// ─────────────────────────────────────────────────────────────────────────────────────
function chainWaysAll(ways, tol = 0.0003) {
  // tol default = ~33m. OSM-Ways sind in der Regel sub-meter genau geteilt, aber bei
  // imprezisem Mapping (besonders ältere Tracks/Streams) gibt es Lücken bis zu 30m.
  const eq = (a, b) => Math.abs(a[0] - b[0]) < tol && Math.abs(a[1] - b[1]) < tol
  const segments = ways.map(w => (w.geometry || []).map(p => [p.lat, p.lon])).filter(s => s.length >= 2)
  const chains = []
  while (segments.length > 0) {
    let chain = segments.shift()
    let extended = true
    while (extended) {
      extended = false
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        const cs = chain[0]
        const ce = chain[chain.length - 1]
        const ss = seg[0]
        const se = seg[seg.length - 1]
        if (eq(ce, ss))      { chain = chain.concat(seg.slice(1));                                segments.splice(i, 1); extended = true; break }
        else if (eq(ce, se)) { chain = chain.concat(seg.slice().reverse().slice(1));              segments.splice(i, 1); extended = true; break }
        else if (eq(cs, se)) { chain = seg.slice(0, -1).concat(chain);                            segments.splice(i, 1); extended = true; break }
        else if (eq(cs, ss)) { chain = seg.slice().reverse().slice(0, -1).concat(chain);          segments.splice(i, 1); extended = true; break }
      }
    }
    chains.push(chain)
  }
  chains.sort((a, b) => b.length - a.length)
  return chains
}

function chainWays(ways) {
  return chainWaysAll(ways)[0] || null
}

// ── Polygon-Building für NP-Relations: Sammelt alle outer-Member-Ways und
//    kettet sie zu einem (oder mehreren) geschlossenen Polygon(en). ──────────
function buildPolygonFromRelation(rel) {
  const outerWays = (rel.members || []).filter(m => m.role === 'outer' && m.type === 'way')
  if (outerWays.length === 0) return null
  // Members haben in `out geom;` direkt `geometry` als Array von {lat, lon}
  const chained = chainWays(outerWays)
  if (!chained) return null
  // Polygon schließen wenn nicht schon geschlossen
  const first = chained[0]
  const last = chained[chained.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    chained.push([first[0], first[1]])
  }
  return chained
}

async function fetchOverpass(query) {
  console.log('→ Overpass query (~30–120 s, Geometrie-Fetch ist langsamer als Punkt-Fetch) …')
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'cape-york-app/1.0 (+https://github.com/Japeyer/cape-york-app)',
      'Accept': 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
  return res.json()
}

function extractRivers(osm, opts = {}) {
  // Pro River-ID: alle Ways mit passendem Namen sammeln, in ALLE Chains aufteilen
  // (nicht nur längste = vorher Tributaries/Branches verloren), vereinfachen.
  // Datenmodell: { id, name, segments: [[[lat,lng],...], ...] } statt single points.
  const acceptStream = !!opts.includeStreams
  const minSegmentPoints = opts.minSegmentPoints ?? 4  // unter ~4 Punkten ist visuell ein Stub
  const byId = {}
  for (const el of osm.elements || []) {
    if (el.type !== 'way') continue
    const tags = el.tags || {}
    const isRiver = tags.waterway === 'river' || (acceptStream && tags.waterway === 'stream')
    if (!isRiver) continue
    const id = matchId(RIVER_NAME_MAP, tags.name)
    if (!id) continue
    if (!byId[id]) byId[id] = { name: tags.name, ways: [] }
    byId[id].ways.push(el)
  }
  const rivers = []
  for (const { id } of RIVER_NAME_MAP) {
    const entry = byId[id]
    if (!entry) {
      console.log(`  ⚠ no OSM match: ${id}`)
      continue
    }
    const chains = chainWaysAll(entry.ways)
    if (chains.length === 0) {
      console.log(`  ⚠ chain failed: ${id} (${entry.ways.length} ways)`)
      continue
    }
    // Pro Chain: simplify + filter zu kurze Stubs (raw UND post-DP).
    // Iteration 5: post-DP-Min auf 4 Punkte erhöht damit 2-3-Punkt-Stubs (visuell
    // unschöne kurze Striche „im Nichts") wegfallen. Geographisch echte Daten,
    // aber visuell distracting.
    const segments = []
    let totalRaw = 0, totalSimp = 0
    for (const chain of chains) {
      totalRaw += chain.length
      if (chain.length < minSegmentPoints) continue
      const simplified = douglasPeucker(chain, SIMPLIFY.river)
      if (simplified.length < 4) continue
      segments.push(simplified.map(p => [round5(p[0]), round5(p[1])]))
      totalSimp += simplified.length
    }
    if (segments.length === 0) {
      console.log(`  ⚠ all segments too short: ${id}`)
      continue
    }
    rivers.push({ id, name: entry.name, segments })
    console.log(`  ✓ ${id.padEnd(11)} ${entry.name.padEnd(20)} ${entry.ways.length} ways → ${chains.length} chains → ${segments.length} kept (${totalRaw} raw → ${totalSimp} simplified pts)`)
  }
  return rivers
}

// NP-Min-Größe (bbox-Diagonale in Grad). 0.04° ≈ 4.4 km Edge — schließt Mikro-Reserves
// und Stadt-Parks aus, lässt aber alle für 4WD-Reisen relevanten Schutzgebiete zu.
const NP_MIN_BBOX = 0.04
// NP-Max-Größe — eliminiert Marine-Areas wie „Great Barrier Reef Marine Park" (17.9° bbox)
// die den gesamten Map-Bereich überdecken würden. 3° ≈ 330 km Edge ist gross genug für die
// grössten Land-NPs (Apudthama mit 488 Wegpunkten ≈ 1.5°), klein genug um Marine-Polygone
// auszufiltern.
const NP_MAX_BBOX = 3.0
// Marine/Wasser-basierte Schutzgebiete erkennen (würden über das Wasser-Layer rendern,
// macht keinen Sinn für eine 4WD-Karte).
const NP_MARINE_RX = /marine|fish habitat|sea country|dugong|reef|inlet/i

function extractNationalParks(osm) {
  // Sammelt ALLE benannten NP-Polygone in der bbox (Iteration „drastisch erweitern").
  // Bekannte IDs aus NP_NAME_MAP behalten ihre semantischen Slugs (np-lakefield etc.)
  // — das ist wichtig für die Label-Aliasse („Rinyirru" → „Lakefield NP") in
  // CapeYorkMap.jsx. Alle anderen NPs bekommen einen aus dem Namen abgeleiteten Slug.
  const polygons = {}
  const meta = []
  const usedIds = new Set()

  // Sammle alle NP-Elemente per OSM-id, gruppiert nach Name (Relations + Ways können
  // denselben Park doppelt repräsentieren; Relation hat Vorrang).
  const byOsm = new Map()  // key: tags.name → { name, relations: [], ways: [] }
  for (const el of osm.elements || []) {
    const tags = el.tags || {}
    const isPolygon =
      tags.boundary === 'national_park' ||
      tags.boundary === 'protected_area' ||
      tags.leisure === 'nature_reserve' ||
      tags.protect_class === '2'
    if (!isPolygon) continue
    const name = tags.name
    if (!name) continue  // unnamed → nicht render-bar
    if (!byOsm.has(name)) byOsm.set(name, { name, relations: [], ways: [] })
    if (el.type === 'relation') byOsm.get(name).relations.push(el)
    else if (el.type === 'way' && el.geometry?.length >= 3) byOsm.get(name).ways.push(el)
  }

  for (const entry of byOsm.values()) {
    // Bestimme ID: bekannter Cape-York-NP → semantischer Slug; sonst aus dem Name slug-ifiziert.
    const knownId = matchId(NP_NAME_MAP, entry.name)
    let id = knownId || `np-${slugify(entry.name)}`
    // Falls slug-collision (zwei NPs mit ähnlichem Namen), suffix.
    let suffix = 1
    while (usedIds.has(id)) {
      id = `${knownId || `np-${slugify(entry.name)}`}-${++suffix}`
    }

    // Polygon bauen: Relation bevorzugt, sonst grösstes Way nehmen.
    let polygon = null
    const rel = entry.relations[0]
    if (rel) polygon = buildPolygonFromRelation(rel)
    if (!polygon) {
      const way = entry.ways.sort((a, b) => (b.geometry?.length || 0) - (a.geometry?.length || 0))[0]
      if (way) {
        polygon = way.geometry.map(p => [p.lat, p.lon])
        if (polygon[0][0] !== polygon[polygon.length - 1][0] || polygon[0][1] !== polygon[polygon.length - 1][1]) {
          polygon.push([polygon[0][0], polygon[0][1]])
        }
      }
    }
    if (!polygon || polygon.length < 4) continue

    // Min-Größe-Filter: bbox-Diagonale ≥ NP_MIN_BBOX. Verhindert Mikro-Reserves.
    const bb = bboxDiagonal(polygon)
    if (bb < NP_MIN_BBOX) continue
    // Max-Größe + Marine-Filter: skip Marine-Areas und übergrosse Polygone.
    if (bb > NP_MAX_BBOX) continue
    if (NP_MARINE_RX.test(entry.name)) continue

    const simplified = douglasPeucker(polygon, SIMPLIFY.park)
    if (simplified[0][0] !== simplified[simplified.length - 1][0] ||
        simplified[0][1] !== simplified[simplified.length - 1][1]) {
      simplified.push([simplified[0][0], simplified[0][1]])
    }
    if (simplified.length < 4) continue

    polygons[id] = simplified.map(p => [round5(p[0]), round5(p[1])])
    meta.push({ id, name: entry.name, vertices: simplified.length })
    usedIds.add(id)
    console.log(`  ✓ ${id.padEnd(28)} ${entry.name.padEnd(50)} ${polygon.length} → ${simplified.length} pts (bbox-diag ${bb.toFixed(3)}°)`)
  }
  return { polygons, meta }
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

function extractCoastline(osm) {
  // Alle natural=coastline Ways sammeln. OSM-Coast-Konvention: Land liegt LINKS
  // der Linien-Richtung. Die Linien sind in der Regel NICHT geschlossen — sie
  // laufen vom einen BBox-Rand zum anderen.
  const coastWays = (osm.elements || []).filter(el => el.type === 'way' && el.tags?.natural === 'coastline')
  if (coastWays.length === 0) {
    console.log('  ⚠ no coastline ways in OSM result')
    return []
  }
  // Nutze chainWays-Logik aber sammle ALLE Chains (Inseln, getrennte Coast-Segmente).
  const TOL = 0.0001
  const eq = (a, b) => Math.abs(a[0] - b[0]) < TOL && Math.abs(a[1] - b[1]) < TOL
  const segments = coastWays.map(w => (w.geometry || []).map(p => [p.lat, p.lon])).filter(s => s.length >= 2)
  const chains = []
  while (segments.length > 0) {
    let chain = segments.shift()
    let extended = true
    while (extended) {
      extended = false
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        const cs = chain[0]
        const ce = chain[chain.length - 1]
        const ss = seg[0]
        const se = seg[seg.length - 1]
        if (eq(ce, ss))      { chain = chain.concat(seg.slice(1));                       segments.splice(i, 1); extended = true; break }
        else if (eq(ce, se)) { chain = chain.concat(seg.slice().reverse().slice(1));     segments.splice(i, 1); extended = true; break }
        else if (eq(cs, se)) { chain = seg.slice(0, -1).concat(chain);                   segments.splice(i, 1); extended = true; break }
        else if (eq(cs, ss)) { chain = seg.slice().reverse().slice(0, -1).concat(chain); segments.splice(i, 1); extended = true; break }
      }
    }
    chains.push(chain)
  }
  // Sortiere nach Länge, behalte nur signifikante (≥20 Wegpunkte = ~2 km Coast)
  chains.sort((a, b) => b.length - a.length)
  const significant = chains.filter(c => c.length >= 20)
  const simplified = significant.map(c => douglasPeucker(c, SIMPLIFY.coast).map(p => [round5(p[0]), round5(p[1])]))
  const total = simplified.reduce((s, c) => s + c.length, 0)
  console.log(`  ✓ coastline: ${coastWays.length} ways → ${chains.length} chains (${significant.length} significant ≥20pts) → ${total} simplified pts total`)
  return simplified
}

// Land-Polygon-Builder: Aus den OSM-Coast-Chains die Cape-York-Halbinsel als
// geschlossenes Polygon konstruieren. OSM-Convention: Land liegt LINKS der Coast-
// Linien-Richtung. Innerhalb unserer BBox sind die Chains offen — sie laufen vom
// einen Bbox-Rand zum anderen. Strategie:
//   1. Längste Chain = Mainland-Coast (springt um den Tip herum, Ost→Nord→West).
//   2. Diese Chain wird via Bbox-Süd-Rand geschlossen → Polygon kann gefüllt werden.
//   3. Süd-Schluss leicht UNTER dem viewBox-Rand → Halbinsel wirkt nach Süden offen
//      (= Queensland-mainland-continues-Effekt bleibt).
function extractLandPolygon(osm, bbox) {
  const coastWays = (osm.elements || []).filter(el => el.type === 'way' && el.tags?.natural === 'coastline')
  if (coastWays.length === 0) return null

  const TOL = 0.0001
  const eq = (a, b) => Math.abs(a[0] - b[0]) < TOL && Math.abs(a[1] - b[1]) < TOL
  const segments = coastWays.map(w => (w.geometry || []).map(p => [p.lat, p.lon])).filter(s => s.length >= 2)
  const chains = []
  while (segments.length > 0) {
    let chain = segments.shift()
    let extended = true
    while (extended) {
      extended = false
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        const cs = chain[0]
        const ce = chain[chain.length - 1]
        const ss = seg[0]
        const se = seg[seg.length - 1]
        if (eq(ce, ss))      { chain = chain.concat(seg.slice(1));                       segments.splice(i, 1); extended = true; break }
        else if (eq(ce, se)) { chain = chain.concat(seg.slice().reverse().slice(1));     segments.splice(i, 1); extended = true; break }
        else if (eq(cs, se)) { chain = seg.slice(0, -1).concat(chain);                   segments.splice(i, 1); extended = true; break }
        else if (eq(cs, ss)) { chain = seg.slice().reverse().slice(0, -1).concat(chain); segments.splice(i, 1); extended = true; break }
      }
    }
    chains.push(chain)
  }
  // Längste = Mainland. Restliche sind Inseln.
  chains.sort((a, b) => b.length - a.length)
  const mainland = chains[0]
  if (!mainland || mainland.length < 100) {
    console.log(`  ⚠ mainland chain zu kurz (${mainland?.length} pts) — Land-Polygon nicht generiert`)
    return null
  }

  // Vereinfachen, dann via Süd-Bbox-Rand schließen.
  const simplified = douglasPeucker(mainland, SIMPLIFY.land)

  // Endpunkte sollten ungefähr am Süd-Rand der Bbox sitzen. Wir hängen zwei Punkte
  // unterhalb der Bbox an (lat = bbox.south - 0.1 = -19.10) → Polygon wird über den
  // viewBox-Rand hinaus geschlossen, was den „Mainland geht weiter südlich"-Effekt
  // erhält den die User-Outline schon vorher hatte.
  const closeLat = bbox.south - 0.10
  const first = simplified[0]
  const last = simplified[simplified.length - 1]
  const closed = [...simplified, [closeLat, last[1]], [closeLat, first[1]], [first[0], first[1]]]

  console.log(`  ✓ land-polygon: ${chains.length} chains → mainland ${mainland.length} pts → ${simplified.length} simplified → ${closed.length} closed (south-edge)`)
  return {
    polygon: closed.map(p => [round5(p[0]), round5(p[1])]),
    islandCount: chains.length - 1,
  }
}

// Forest-Polygone: natural=wood + landuse=forest (Ways UND Relations).
// Filterung: Bbox-Diagonale ≥ FOREST_MIN_BBOX, sonst zu klein für die Cape-York-Skala.
function extractForests(osm) {
  const forests = []

  // Ways: einfache geschlossene Polygone
  for (const el of osm.elements || []) {
    if (el.type !== 'way') continue
    const tags = el.tags || {}
    if (tags.natural !== 'wood' && tags.landuse !== 'forest') continue
    if (!el.geometry || el.geometry.length < 4) continue
    const points = el.geometry.map(p => [p.lat, p.lon])
    const bb = bboxDiagonal(points)
    if (bb < FOREST_MIN_BBOX) continue
    // Polygon schließen wenn nicht schon geschlossen
    if (points[0][0] !== points[points.length - 1][0] || points[0][1] !== points[points.length - 1][1]) {
      points.push([points[0][0], points[0][1]])
    }
    const simplified = douglasPeucker(points, SIMPLIFY.forest)
    if (simplified.length < 4) continue
    forests.push({ source: 'way', name: tags.name || null, points: simplified.map(p => [round5(p[0]), round5(p[1])]) })
  }

  // Relations: Multi-Polygon mit outer-Members
  for (const el of osm.elements || []) {
    if (el.type !== 'relation') continue
    const tags = el.tags || {}
    if (tags.natural !== 'wood' && tags.landuse !== 'forest') continue
    const polygon = buildPolygonFromRelation(el)
    if (!polygon || polygon.length < 4) continue
    const bb = bboxDiagonal(polygon)
    if (bb < FOREST_MIN_BBOX) continue
    const simplified = douglasPeucker(polygon, SIMPLIFY.forest)
    if (simplified.length < 4) continue
    // Ring schließen falls DP geöffnet
    if (simplified[0][0] !== simplified[simplified.length - 1][0] ||
        simplified[0][1] !== simplified[simplified.length - 1][1]) {
      simplified.push([simplified[0][0], simplified[0][1]])
    }
    forests.push({ source: 'relation', name: tags.name || null, points: simplified.map(p => [round5(p[0]), round5(p[1])]) })
  }

  // Sortierung nach Größe (Bbox-Diagonale absteigend) — größte zuerst gerendert,
  // damit kleinere darüber liegen und nicht verdeckt werden.
  forests.sort((a, b) => bboxDiagonal(b.points) - bboxDiagonal(a.points))
  const beforeCap = forests.length
  const capped = forests.slice(0, FOREST_TOP_N)
  const totalPts = capped.reduce((s, f) => s + f.points.length, 0)
  console.log(`  ✓ forest: ${beforeCap} candidates → ${capped.length} kept (top-${FOREST_TOP_N}, ${totalPts} pts total) — min bbox-diag ${FOREST_MIN_BBOX}°`)
  return capped
}

function bboxDiagonal(points) {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
  for (const [lat, lng] of points) {
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
  }
  return Math.hypot(maxLat - minLat, maxLng - minLng)
}

// Camp Sites — extrahiert tourism=camp_site (nodes + ways + relations).
// Datenmodell: { id, name, lat, lng, operator?, website?, fee?, capacity? }
//
// Filter:
//   - nur named (skip unnamed Camps — wären auf der Map nutzlos)
//   - dedupe per (name + ~1km grid cell) — gleicher Camp manchmal als node UND way getaggt
//
// Coords: für nodes direkt aus el.lat/lon, für ways aus geometry-Centroid (avg lat/lng),
// für relations: best-effort über erstes Member-Way oder skip.
function extractCamps(osm) {
  const camps = []
  const seen = new Set()
  for (const el of osm.elements || []) {
    const tags = el.tags || {}
    if (tags.tourism !== 'camp_site') continue
    if (!tags.name) continue
    let lat, lon
    if (el.type === 'node') {
      lat = el.lat; lon = el.lon
    } else if (el.type === 'way' && Array.isArray(el.geometry) && el.geometry.length > 0) {
      // Centroid = avg of vertices (good enough für die meisten Camp-Polygone <500m Edge)
      let sumLat = 0, sumLon = 0, n = 0
      for (const p of el.geometry) { sumLat += p.lat; sumLon += p.lon; n++ }
      lat = sumLat / n; lon = sumLon / n
    } else if (el.type === 'relation') {
      // Best-effort: erstes outer way mit geometry
      const outer = (el.members || []).find(m => m.role === 'outer' && m.geometry?.length > 0)
      if (outer) {
        let sumLat = 0, sumLon = 0, n = 0
        for (const p of outer.geometry) { sumLat += p.lat; sumLon += p.lon; n++ }
        lat = sumLat / n; lon = sumLon / n
      }
    }
    if (lat == null || lon == null) continue
    // Dedupe-Key: Name + grobe 0.01° (~1.1 km) Grid-Zelle
    const key = `${tags.name.toLowerCase().trim()}@${Math.round(lat * 100)}:${Math.round(lon * 100)}`
    if (seen.has(key)) continue
    seen.add(key)
    camps.push({
      id: 'osm-' + slugify(tags.name) + '-' + camps.length,
      name: tags.name,
      lat: round5(lat),
      lng: round5(lon),
      operator: tags.operator || null,
      website: tags.website || tags['contact:website'] || null,
      fee: tags.fee || null,
      capacity: tags.capacity || null,
    })
  }
  console.log(`  ✓ camps: ${camps.length} named camp_sites extrahiert (von ${(osm.elements||[]).filter(e => e.tags?.tourism === 'camp_site').length} total in bbox)`)
  return camps
}

function extractRoads(osm) {
  // Pro Road-ID: alle Match-Ways sammeln, in ALLE Chains aufteilen (nicht nur längste).
  // Datenmodell: { [id]: { segments: [[[lat,lng],...], ...] } }.
  // Vorher: { [id]: [[lat,lng],...] } — Branch-Loops und disconnected Sektionen verloren.
  const byId = {}
  for (const el of osm.elements || []) {
    if (el.type !== 'way') continue
    const tags = el.tags || {}
    if (!tags.highway) continue
    const id = matchId(ROAD_NAME_MAP, tags.name)
    if (!id) continue
    if (!byId[id]) byId[id] = { name: tags.name, ways: [] }
    byId[id].ways.push(el)
  }
  const roads = {}
  const minSegmentPoints = 3  // unter 3 Punkten ist eine Strasse visuell wertlos
  for (const { id } of ROAD_NAME_MAP) {
    const entry = byId[id]
    if (!entry) {
      console.log(`  ⚠ no OSM match: ${id}`)
      continue
    }
    const chains = chainWaysAll(entry.ways)
    if (chains.length === 0) {
      console.log(`  ⚠ chain failed: ${id} (${entry.ways.length} ways)`)
      continue
    }
    const segments = []
    let totalRaw = 0, totalSimp = 0
    for (const chain of chains) {
      totalRaw += chain.length
      if (chain.length < minSegmentPoints) continue
      const simplified = douglasPeucker(chain, SIMPLIFY.road)
      // Iteration 5: post-DP-Min 3 — Roads dürfen kürzer sein als Rivers
      // (Branch-Stub bei einem Roadhouse ist legitim), aber 2 Punkte = unschöner
      // visueller Strich, drop.
      if (simplified.length < 3) continue
      segments.push(simplified.map(p => [round5(p[0]), round5(p[1])]))
      totalSimp += simplified.length
    }
    if (segments.length === 0) {
      console.log(`  ⚠ all segments too short: ${id}`)
      continue
    }
    roads[id] = { segments }
    console.log(`  ✓ ${id.padEnd(17)} ${entry.name.padEnd(35)} ${entry.ways.length} ways → ${chains.length} chains → ${segments.length} kept (${totalRaw} raw → ${totalSimp} simplified pts)`)
  }
  return roads
}

// Hilfsfunktion: Wege per Tag-Filter ketten + simplifizieren + min-length-Filter.
// Verwendet von extractMajorRoads + extractTracks. WaysFilter ist eine (way) → boolean Funktion.
function extractWaysAsChains(osm, waysFilter, simplifyEpsilon, minChainLength, label) {
  const ways = (osm.elements || []).filter(el => el.type === 'way' && waysFilter(el))
  if (ways.length === 0) {
    console.log(`  ⚠ no ways matched: ${label}`)
    return []
  }
  const chains = chainWaysAll(ways)
  const segments = []
  let totalRaw = 0, totalSimp = 0
  for (const chain of chains) {
    totalRaw += chain.length
    if (chain.length < 3) continue
    // Min-length-Filter via bbox-Diagonale → eliminiert <50m-Stub-Wege.
    const bb = bboxDiagonal(chain)
    if (bb < minChainLength) continue
    const simplified = douglasPeucker(chain, simplifyEpsilon)
    if (simplified.length < 3) continue
    segments.push(simplified.map(p => [round5(p[0]), round5(p[1])]))
    totalSimp += simplified.length
  }
  console.log(`  ✓ ${label.padEnd(20)} ${ways.length} ways → ${chains.length} chains → ${segments.length} kept (${totalRaw} → ${totalSimp} simplified pts)`)
  return segments
}

function extractMajorRoads(osm) {
  // Alle highway=primary|secondary|tertiary|trunk|motorway in der bbox.
  // BEWUSST OHNE `unclassified` — das ist die OSM-Default-Kategorie für Strassen ohne
  // klare Klassifikation; in Cairns-Stadtgebiet sind das tausende lokaler Strassen,
  // die unsere Cape-York-Übersicht nur überfluten würden.
  const MAJOR_TAGS = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary'])
  const filter = (way) => {
    const tags = way.tags || {}
    if (!MAJOR_TAGS.has(tags.highway)) return false
    if (tags.name && matchId(ROAD_NAME_MAP, tags.name)) return false  // schon in named ROADS
    return true
  }
  // Coarser DP (0.001° ≈ 110m) — für Branch-Roads reicht das. Min-length 0.015° ≈ 1.65 km
  // schließt kurze Abzweige aus die visuell als Stub erscheinen würden.
  return extractWaysAsChains(osm, filter, 0.001, 0.015, 'major-roads')
}

function extractTracks(osm) {
  // 4WD-Tracks. Overpass-Query filterte schon serverseitig auf `tracktype` ODER `name`.
  // Hier: dedupe gegen ROAD_NAME_MAP (Old Tele etc. sind schon in named ROADS).
  const filter = (way) => {
    const tags = way.tags || {}
    if (tags.highway !== 'track') return false
    if (isNamedTrackInRoadMap(tags.name)) return false
    return true
  }
  // Coarser DP, KEIN min-length-filter — Connectivity-Filter (Endpoint-Snap) wird
  // separat in main() angewendet, sobald Roads/Rivers/POIs bekannt sind. Tracks dürfen
  // beliebig kurz sein, müssen aber an einem anderen Feature andocken (User-Wunsch:
  // „startpunkte können nur andere tracks oder strassen sein, endpunkte können auch
  // points of interests, camp sites oder auch flüsse sein").
  return extractWaysAsChains(osm, filter, 0.001, 0, 'tracks-pre-connectivity')
}

// ── Connectivity-Filter ─────────────────────────────────────────────────────────
// Filtert Track-Segmente: behalte nur die, deren Start ODER Endpunkt innerhalb
// SNAP_DEG eines Anchor-Points (= Punkt eines anderen Features) liegt.
//
// Anchor-Quellen: alle Punkte aller named ROADS + MAJOR_ROADS + Tracks selbst (ohne
// das aktuell geprüfte) + alle River-Punkte + alle Stop-/POI-Coords.
//
// Dadurch verschwinden Tracks die „im Nichts beginnen UND enden" (z.B. eine
// digitalisierte Forst-Spur in der Mitte einer Cape-York-Wildnis ohne Anschluss).
// Tracks die an einer Strasse / einem Fluss / einem Camp ankoppeln bleiben drin —
// auch wenn sie nur 500m lang sind.
const SNAP_DEG = 0.005  // ~550m; großzügig damit OSM-Imprezisionen (Tagging-Lücken
                        // zwischen Track-Endpunkt und Road-Knoten) keine false-negatives erzeugen

function filterTracksByConnectivity(tracks, anchors) {
  if (anchors.length === 0) return tracks
  // Spatial bucket-grid für O(1)-Lookup statt O(N²) brute force.
  // Bucket-Size = SNAP_DEG, sodass ein Endpunkt-Anchor garantiert im selben oder
  // einem direkt angrenzenden Bucket liegt. Wir prüfen also 9 Buckets pro Endpunkt.
  const grid = new Map()
  const bucketKey = (lat, lng) => `${Math.floor(lat / SNAP_DEG)}:${Math.floor(lng / SNAP_DEG)}`
  for (const [lat, lng] of anchors) {
    const key = bucketKey(lat, lng)
    if (!grid.has(key)) grid.set(key, [])
    grid.get(key).push([lat, lng])
  }
  const isAnchored = (lat, lng) => {
    const baseLatBucket = Math.floor(lat / SNAP_DEG)
    const baseLngBucket = Math.floor(lng / SNAP_DEG)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const key = `${baseLatBucket + dy}:${baseLngBucket + dx}`
        const bucket = grid.get(key)
        if (!bucket) continue
        for (const [aLat, aLng] of bucket) {
          if (Math.hypot(lat - aLat, lng - aLng) <= SNAP_DEG) return true
        }
      }
    }
    return false
  }
  let kept = 0, dropped = 0
  const filtered = tracks.filter(seg => {
    if (!seg || seg.length < 2) { dropped++; return false }
    const start = seg[0], end = seg[seg.length - 1]
    if (isAnchored(start[0], start[1]) || isAnchored(end[0], end[1])) {
      kept++; return true
    }
    dropped++; return false
  })
  console.log(`  ✓ connectivity filter: ${kept} kept / ${dropped} dropped (${tracks.length} → ${filtered.length}, snap ${SNAP_DEG}° = ~${Math.round(SNAP_DEG * 111000)}m)`)
  return filtered
}

// Sammelt alle Anchor-Lat/Lng-Punkte aus den schon extrahierten Features. Wird von
// filterTracksByConnectivity verwendet um zu entscheiden welche Tracks „angeschlossen"
// sind. Quellen:
//   - Named Roads (alle Punkte aller Segmente, nicht nur Endpunkte)
//   - Major Roads (alle Punkte)
//   - Rivers (alle Punkte aller Segmente)
//   - POI lat/lng aus cape-york-pois.js
function collectAnchorsForTracks({ roads, majorRoads, rivers, poiCoords }) {
  const anchors = []
  for (const road of Object.values(roads)) {
    const segs = road?.segments || []
    for (const seg of segs) for (const pt of seg) anchors.push(pt)
  }
  for (const seg of majorRoads || []) for (const pt of seg) anchors.push(pt)
  for (const r of rivers) {
    const segs = r.segments || (r.points ? [r.points] : [])
    for (const seg of segs) for (const pt of seg) anchors.push(pt)
  }
  for (const pt of poiCoords) anchors.push(pt)
  return anchors
}

function isNamedTrackInRoadMap(name) {
  if (!name) return false
  return !!matchId(ROAD_NAME_MAP, name)
}

function round5(x) { return Math.round(x * 100000) / 100000 }

function renderModule({ rivers, nationalParks, roads, majorRoads, tracks, coastlines, landPolygon, forests, camps, generatedAt }) {
  return `// Auto-generated by scripts/fetch-osm-geo.mjs — DO NOT EDIT BY HAND.
// Re-generate with: npm run geo:refresh
//
// Quelle: OpenStreetMap (Overpass API). © OpenStreetMap contributors, ODbL.
// Stand: ${generatedAt}
//
// Datenmodell:
//   RIVERS:           Array<{ id, name, segments: [[[lat, lng], ...], ...] }>
//   NP_POLYGONS:      { [id]: [[lat, lng], ...] }              ← alle benannten NPs in bbox
//   NP_POLYGONS_META: Array<{ id, name, vertices }>
//   ROADS:            { [id]: { segments: [[[lat, lng], ...], ...] } }  ← named Cape-York-Roads
//   MAJOR_ROADS:      Array<Array<[lat, lng]>>                 ← weitere Highways (unnamed/Branch)
//   TRACKS:           Array<Array<[lat, lng]>>                 ← 4WD-Tracks (highway=track)
//   COASTLINES:       Array<Array<[lat, lng]>>                 ← OSM-Coast als Detail-Overlay
//   LAND_POLYGON:     [[lat, lng], ...]                        ← Cape-York-Halbinsel, geschlossen
//   FORESTS:          Array<{ source, name, points }>          ← Forest-Polygone, sortiert nach Größe
//   CAMPS:            Array<{ id, name, lat, lng, operator?, website?, fee?, capacity? }>
//                                                              ← OSM tourism=camp_site (named only)

export const GEO_GENERATED_AT = ${JSON.stringify(generatedAt)}
export const GEO_ATTRIBUTION = '© OpenStreetMap contributors (ODbL)'

export const RIVERS = ${JSON.stringify(rivers)}

export const NP_POLYGONS = ${JSON.stringify(nationalParks.polygons)}

export const NP_POLYGONS_META = ${JSON.stringify(nationalParks.meta)}

export const ROADS = ${JSON.stringify(roads)}

export const MAJOR_ROADS = ${JSON.stringify(majorRoads)}

export const TRACKS = ${JSON.stringify(tracks)}

export const COASTLINES = ${JSON.stringify(coastlines)}

export const LAND_POLYGON = ${JSON.stringify(landPolygon)}

export const FORESTS = ${JSON.stringify(forests)}

export const CAMPS = ${JSON.stringify(camps)}
`
}

async function main() {
  const generatedAt = new Date().toISOString().slice(0, 10)
  const osm = await fetchOverpass(QUERY)
  console.log(`✓ ${(osm.elements || []).length} OSM-Elemente geladen`)

  console.log('\n── Flüsse + Streams ──')
  const rivers = extractRivers(osm, { includeStreams: true })

  console.log('\n── Nationalparks ──')
  const nationalParks = extractNationalParks(osm)

  console.log('\n── Strassen ──')
  const roads = extractRoads(osm)

  console.log('\n── Major Roads (unnamed branches/secondaries) ──')
  const majorRoads = extractMajorRoads(osm)

  console.log('\n── Tracks (4WD) — extracting all chains ──')
  const tracksRaw = extractTracks(osm)

  // Connectivity-Filter: lade POI-Coords aus cape-york-pois.js (dynamisch, falls die
  // alte cape-york-geo.js noch nicht passt — POI-Daten sind aber direkt in pois.js und
  // nicht aus geo.js abgeleitet, also sicher). Sammle alle Anchor-Punkte und filtere
  // Tracks die nirgends ankoppeln.
  console.log('\n── Tracks: Connectivity-Filter ──')
  let poiCoords = []
  try {
    const poisUrl = pathToFileURL(join(ROOT, 'src/data/cape-york-pois.js')).href
    const { CAPE_YORK_POIS } = await import(poisUrl)
    poiCoords = (CAPE_YORK_POIS || []).map(p => [p.lat, p.lng]).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]))
    console.log(`  loaded ${poiCoords.length} POI-Coords aus cape-york-pois.js`)
  } catch (err) {
    console.log(`  ⚠ POI-Import schief gegangen, fahre ohne POI-Anchors weiter: ${err.message}`)
  }
  const anchors = collectAnchorsForTracks({ roads, majorRoads, rivers, poiCoords })
  console.log(`  ${anchors.length} Anchor-Punkte gesammelt (Roads + Major-Roads + Rivers + POIs)`)
  const tracks = filterTracksByConnectivity(tracksRaw, anchors)

  console.log('\n── Coastline ──')
  const coastlines = extractCoastline(osm)

  console.log('\n── Land-Polygon (aus Coastline) ──')
  const land = extractLandPolygon(osm, BBOX)
  const landPolygon = land?.polygon || null

  console.log('\n── Forest / Vegetation ──')
  const forests = extractForests(osm)

  console.log('\n── Camp Sites ──')
  const camps = extractCamps(osm)

  console.log(`\n✓ ${rivers.length}/${RIVER_NAME_MAP.length} Flüsse extrahiert`)
  console.log(`✓ ${Object.keys(nationalParks.polygons).length} Nationalparks extrahiert (alle benannten in bbox, min ${NP_MIN_BBOX}° bbox-diag)`)
  console.log(`✓ ${Object.keys(roads).length}/${ROAD_NAME_MAP.length} named Strassen extrahiert`)
  console.log(`✓ ${majorRoads.length} Major-Road-Segmente (unnamed/branches) extrahiert`)
  console.log(`✓ ${tracks.length} 4WD-Track-Segmente extrahiert`)
  console.log(`✓ ${coastlines.length} Coast-Polylines extrahiert`)
  console.log(`✓ Land-Polygon: ${landPolygon ? landPolygon.length + ' Punkte' : 'NICHT generiert'}`)
  console.log(`✓ ${forests.length} Forest-Polygone extrahiert`)
  console.log(`✓ ${camps.length} Camp-Sites extrahiert`)

  writeFileSync(OUT_FILE, renderModule({ rivers, nationalParks, roads, majorRoads, tracks, coastlines, landPolygon, forests, camps, generatedAt }), 'utf8')
  console.log(`\n✓ Geschrieben: ${OUT_FILE}`)
}

main().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
