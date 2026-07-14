import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { CAPE_YORK_POIS, LAYERS, MAP_BOUNDS, NP_POLYGONS, NP_POLYGONS_META, RIVERS, ROADS, MAJOR_ROADS, TRACKS, LAND_POLYGON, FORESTS, CAMPS } from '../data/cape-york-pois.js'
import { FUEL_STOPS } from '../data/route-pois.js'

// Schematische Cape-York-Karte als Inline-SVG. Offline-fähig (kein Tile-Loading),
// custom-illustriert (passt zum App-Design).
//
// Daten-Konsistenz: Land-Polygon, Roads, Rivers, NPs und Forests kommen ALLE aus
// derselben OSM-Quelle (build-time gefetcht in `cape-york-geo.js`). Damit ist
// garantiert dass alle Layer skalen-konsistent sind — ein Road-Punkt liegt exakt
// auf dem Land-Polygon, nicht „neben" einer hand-skizzierten Outline.
//
// Interaktivität:
//   - Pan (1 Finger / Maus-Drag) und Pinch-Zoom (2 Finger / Mausrad) via viewBox-Manipulation.
//   - Marker-Tap funktioniert weiter — Pointer-Down auf einem Marker wird vom Pan/Zoom
//     ignoriert (closest('.map-marker')-Check), stattdessen feuert das onClick des Markers.
//   - Trip-Overlay: wenn ein Trip konfiguriert ist, werden die genutzten Hauptstrassen
//     (Mulligan/PDR/NPA) in Trip-Orange unter den braunen Strassen hervorgehoben, plus
//     größere day-numbered Marker an den aktivierten Stops.
//   - Beschriftungen: Flüsse (italic), NPs (nur wenn Park-Layer aktiv), Hauptstrassen.
//
// Lat/Lng → SVG-Koordinaten via lineare Projektion auf MAP_BOUNDS.

const VIEWBOX_W = 400
const VIEWBOX_H = 720

function project(lat, lng) {
  const lngRange = MAP_BOUNDS.lngMax - MAP_BOUNDS.lngMin
  const latRange = MAP_BOUNDS.latMax - MAP_BOUNDS.latMin
  return {
    x: (lng - MAP_BOUNDS.lngMin) / lngRange * VIEWBOX_W,
    y: (MAP_BOUNDS.latMax - lat) / latRange * VIEWBOX_H,
  }
}

const OUTLINE_PATH = (() => {
  if (!LAND_POLYGON || LAND_POLYGON.length < 3) return ''
  const pts = LAND_POLYGON.map(([lat, lng]) => project(lat, lng))
  return 'M ' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ') + ' Z'
})()

function pathFromPoints(points) {
  if (!points || points.length < 2) return ''
  const pts = points.map(([lat, lng]) => project(lat, lng))
  return 'M ' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')
}

function polygonPath(polygon) {
  const pts = polygon.map(([lat, lng]) => project(lat, lng))
  return 'M ' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ') + ' Z'
}

function renderRoadSegments(road, { stroke, width, dash, opacity = 1, keyPrefix = 'r' }) {
  if (!road) return null
  const segments = Array.isArray(road) ? [road] : (road.segments || [])
  return segments.map((seg, i) => (
    <path
      key={`${keyPrefix}-${i}`}
      d={pathFromPoints(seg)}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinejoin="round"
      strokeLinecap="round"
      strokeDasharray={dash}
      opacity={opacity}
    />
  ))
}

const ANCHOR_LABELS = [
  { name: 'Cairns',   lat: -16.92, lng: 145.78, dx: 6,   dy: 4 },
  { name: 'Cooktown', lat: -15.47, lng: 145.25, dx: 6,   dy: 4 },
  { name: 'Coen',     lat: -13.95, lng: 143.20, dx: 6,   dy: 4 },
  { name: 'Bamaga',   lat: -10.89, lng: 142.39, dx: 8,   dy: 0 },
  { name: 'Tip',      lat: -10.69, lng: 142.53, dx: 8,   dy: 0 },
  { name: 'Weipa',    lat: -12.68, lng: 141.88, dx: -28, dy: 4 },
]

const FOREST_PATHS = FORESTS.map((f, i) => {
  if (!f.points || f.points.length < 3) return null
  const pts = f.points.map(([lat, lng]) => project(lat, lng))
  return { id: `forest-${i}`, d: 'M ' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ') + ' Z' }
}).filter(Boolean)

// OSM-Camps: nur die behalten, die NICHT in der Nähe eines hand-kuratierten 'camp'-POI
// liegen (CAPE_YORK_POIS hat ~8 hand-geschriebene Camps mit reichen Blurbs — die haben
// Vorrang über die OSM-Daten am gleichen Ort). Threshold: ~0.006° ≈ 660m.
const HAND_CAMP_COORDS = CAPE_YORK_POIS
  .filter(p => p.layer === 'camp')
  .map(p => [p.lat, p.lng])

function isNearHandCurated(lat, lng) {
  const TH = 0.006
  for (const [hLat, hLng] of HAND_CAMP_COORDS) {
    if (Math.abs(lat - hLat) < TH && Math.abs(lng - hLng) < TH) return true
  }
  return false
}

const OSM_CAMPS = CAMPS.filter(c => !isNearHandCurated(c.lat, c.lng))

// MAJOR_ROADS und TRACKS sind Arrays von Polylines (jede Polyline = Array<[lat,lng]>).
// Pre-compute SVG-Path-Strings einmal beim Modul-Load — Render-Loop iteriert nur noch.
const MAJOR_ROAD_PATHS = MAJOR_ROADS.map((seg, i) => ({
  id: `mr-${i}`,
  d: pathFromPoints(seg),
})).filter(p => p.d)

const TRACK_PATHS = TRACKS.map((seg, i) => ({
  id: `tk-${i}`,
  d: pathFromPoints(seg),
})).filter(p => p.d)

// ── Label-Berechnung ────────────────────────────────────────────────────────
// Findet den Mittelpunkt der längsten Polyline (River- oder Road-Segment) via
// kumulativer Bogenlänge. So sitzt das Label nicht am Endpunkt sondern in der
// visuell stärksten Position der Strasse/des Flusses.
function midpointAlongLongest(segments) {
  if (!segments || segments.length === 0) return null
  let longest = null
  let longestLen = -1
  for (const s of segments) {
    if (!s || s.length < 2) continue
    if (s.length > longestLen) { longest = s; longestLen = s.length }
  }
  if (!longest) return null
  let totalLen = 0
  for (let i = 1; i < longest.length; i++) totalLen += distLatLng(longest[i - 1], longest[i])
  let half = totalLen / 2
  for (let i = 1; i < longest.length; i++) {
    const segLen = distLatLng(longest[i - 1], longest[i])
    if (segLen >= half) {
      const t = segLen > 0 ? half / segLen : 0
      return [
        longest[i - 1][0] + (longest[i][0] - longest[i - 1][0]) * t,
        longest[i - 1][1] + (longest[i][1] - longest[i - 1][1]) * t,
      ]
    }
    half -= segLen
  }
  return longest[Math.floor(longest.length / 2)]
}

function distLatLng(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

// Polygon-Centroid via Shoelace-Formel. Gut genug für die typischen NP-Formen,
// auch wenn manche Multi-Lobe-Polygone (Apudthama) den geometrischen Schwerpunkt
// in einer „Tasche" haben. Wer Premium-Layer aktiviert sieht das Polygon ohnehin —
// das Label ist dort nur Orientierungs-Hilfe, nicht Pflicht-genau.
function polygonCentroid(polygon) {
  let area = 0, cx = 0, cy = 0
  for (let i = 0; i < polygon.length - 1; i++) {
    const [y1, x1] = polygon[i]
    const [y2, x2] = polygon[i + 1]
    const cross = x1 * y2 - x2 * y1
    area += cross
    cx += (x1 + x2) * cross
    cy += (y1 + y2) * cross
  }
  area /= 2
  if (Math.abs(area) < 1e-9) return polygon[0]
  cx /= (6 * area)
  cy /= (6 * area)
  return [cy, cx]  // [lat, lng]
}

// Display-Namen für Strassen-Labels (statt der internen IDs).
const ROAD_DISPLAY = {
  mulligan:    'Mulligan Hwy',
  pdr:         'Peninsula Dev Rd',
  npaRoad:     'Bamaga Rd',
  oldTele:     'Old Telegraph Track',
  tipRoad:     'Pajinka Rd',
  // Famous Cape-York-Tracks (User explizit verlangt — hoher Detail-Grad)
  frenchmans:  'Frenchmans Track',
  creb:        'CREB Track',
  bloomfield:  'Bloomfield Track',
  rinyirru:    'Lakefield Rd',
  ironRangeBranch: 'Portland Rds',
}

// IDs der Famous-Tracks die als gestrichelte 4WD-Tracks (nicht als gesealte Roads)
// gerendert werden — diese Liste steuert den separaten Render-Loop.
const FAMOUS_TRACK_IDS = ['frenchmans', 'creb', 'bloomfield', 'oldTele', 'oldTeleBypass']

// Pre-compute alle Labels einmalig (build-time-Konstanten — Daten ändern sich nicht
// während der Session).
const RIVER_LABELS = RIVERS
  .map(r => {
    const segs = r.segments || (r.points ? [r.points] : [])
    const longest = segs.reduce((m, s) => (s.length > (m?.length || 0) ? s : m), null)
    if (!longest || longest.length < 8) return null  // nur wenn substantieller Verlauf
    const mid = midpointAlongLongest(segs)
    if (!mid) return null
    return { name: r.name.replace(/\s*River$/i, '').replace(/\s*Creek$/i, ''), lat: mid[0], lng: mid[1] }
  })
  .filter(Boolean)

// Bekannte Aliasse — Cape-York-Insider-Namen die User vertrauter sind als die offiziellen
// Aboriginal-Namen. Apply nach dem generic short-name-Trim.
const NP_NAME_ALIASES = {
  'Rinyirru': 'Lakefield NP',
  'Kutini-Payamu': 'Iron Range NP',
  'Apudthama': 'Apudthama NP',
  'Oyala Thumotang': 'Mungkan NP',
  'Kalkajaka': 'Black Mountain NP',
}

// NP-Labels gecapped auf die N grössten — bei 141 NPs würden sich Labels gnadenlos
// überlappen. Top-N nach Polygon-bbox-Diagonale.
function bboxDiag(points) {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
  for (const [lat, lng] of points) {
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
  }
  return Math.hypot(maxLat - minLat, maxLng - minLng)
}

const NP_LABELS = NP_POLYGONS_META
  .map(meta => {
    const poly = NP_POLYGONS[meta.id]
    if (!poly || poly.length < 4) return null
    const [lat, lng] = polygonCentroid(poly)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    // Kurzname: „Rinyirru (Lakefield) National Park (Aboriginal Land)" → „Lakefield NP"
    let short = meta.name
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(/\s+National Park.*$/i, '')
      .replace(/\s+Nature Refuge.*$/i, ' NR')
      .replace(/\s+Indigenous Protected Area.*$/i, ' IPA')
      .replace(/\s+Forest Reserve.*$/i, ' FR')
      .replace(/\s+/g, ' ')
      .trim()
    short = NP_NAME_ALIASES[short] || (/(NP|NR|IPA|FR)$/.test(short) ? short : `${short} NP`)
    return { name: short, lat, lng, size: bboxDiag(poly) }
  })
  .filter(Boolean)
  .sort((a, b) => b.size - a.size)
  .slice(0, 30)  // Top-30 grösste NPs bekommen ein Label, der Rest bleibt anonym

const ROAD_LABELS = Object.entries(ROAD_DISPLAY)
  .map(([id, name]) => {
    const road = ROADS[id]
    if (!road) return null
    const segs = Array.isArray(road) ? [road] : (road.segments || [])
    const mid = midpointAlongLongest(segs)
    if (!mid) return null
    return { name, lat: mid[0], lng: mid[1] }
  })
  .filter(Boolean)

// ── Trip-Stop-Berechnung ────────────────────────────────────────────────────
// Mappt vom Trip-Config (enabledStops + bamagaStop + bamagaDay + stopDays) zu einer
// sortierten Liste von Stops mit lat/lng (aus CAPE_YORK_POIS) und optional Tag-Index.
const STOP_ORDER = ['cairns', 'cooktown', 'coen', 'archer', 'bamaga']

function poiForStop(stopId) {
  return CAPE_YORK_POIS.find(p => p.id === `rs-${stopId}`)
}

function computeTripStops(config) {
  if (!config || !config.completed) return []
  const stops = []
  for (const id of STOP_ORDER) {
    let active = false
    if (id === 'cairns') active = true
    else if (id === 'bamaga') active = !!config.bamagaStop
    else active = !!config.enabledStops?.[id]
    if (!active) continue
    const poi = poiForStop(id)
    if (!poi) continue
    let day = null
    if (id === 'cairns') day = 1
    else if (id === 'bamaga') day = config.bamagaDay ?? null
    else day = config.stopDays?.[id] ?? null
    stops.push({ id, name: poi.name, lat: poi.lat, lng: poi.lng, day })
  }
  return stops
}

// ── Component ────────────────────────────────────────────────────────────────
export default function CapeYorkMap({ activeLayers, onMarkerTap, premium, tripConfig }) {
  const visiblePois = CAPE_YORK_POIS.filter(p => activeLayers.has(p.layer))
  const showFuel = activeLayers.has('fuel')
  const showParkPolygons = activeLayers.has('park')

  const fuelStopsVisible = useMemo(
    () => FUEL_STOPS.filter(s => s.brand || (s.name && s.name !== '(unnamed fuel)')),
    []
  )

  const tripStops = useMemo(() => computeTripStops(tripConfig), [tripConfig])
  const isRouteActive = tripStops.length >= 2
  // Set of stop-ids für O(1) Lookup beim Filtern doppelter Resupply-Marker
  const tripStopIds = useMemo(() => new Set(tripStops.map(s => `rs-${s.id}`)), [tripStops])

  // ── Zoom/Pan State ────────────────────────────────────────────────────────
  const [view, setView] = useState({ x: 0, y: 0, w: VIEWBOX_W, h: VIEWBOX_H })
  const pointersRef = useRef(new Map())
  const pinchRef = useRef({ distance: 0 })
  const svgRef = useRef(null)

  const MIN_W = VIEWBOX_W / 6   // max zoom = 6×
  const MAX_W = VIEWBOX_W       // min zoom = 1× (full map)
  const isZoomed = view.w < MAX_W - 0.5

  const clampView = useCallback((v) => {
    const w = Math.max(MIN_W, Math.min(MAX_W, v.w))
    const h = w * (VIEWBOX_H / VIEWBOX_W)
    const x = Math.max(0, Math.min(VIEWBOX_W - w, v.x))
    const y = Math.max(0, Math.min(VIEWBOX_H - h, v.y))
    return { x, y, w, h }
  }, [MIN_W, MAX_W])

  const zoomAroundPoint = useCallback((scaleFactor, anchorClientX, anchorClientY) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    setView(v => {
      const desiredW = v.w / scaleFactor
      const newW = Math.max(MIN_W, Math.min(MAX_W, desiredW))
      const newH = newW * (VIEWBOX_H / VIEWBOX_W)
      const actualScale = newW / v.w
      const anchorVbX = v.x + (anchorClientX - rect.left) * (v.w / rect.width)
      const anchorVbY = v.y + (anchorClientY - rect.top) * (v.h / rect.height)
      const newX = anchorVbX - (anchorVbX - v.x) * actualScale
      const newY = anchorVbY - (anchorVbY - v.y) * actualScale
      return clampView({ x: newX, y: newY, w: newW, h: newH })
    })
  }, [clampView, MIN_W, MAX_W])

  const onPointerDown = (e) => {
    // Marker-Tap NICHT mit Pan kollidieren lassen — Marker-Click feuert dann normal.
    if (e.target.closest && e.target.closest('.map-marker')) return
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values())
      pinchRef.current.distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
    }
  }

  const onPointerMove = (e) => {
    const pointers = pointersRef.current
    if (!pointers.has(e.pointerId)) return
    const prev = pointers.get(e.pointerId)
    const dx = e.clientX - prev.x
    const dy = e.clientY - prev.y
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.size === 1) {
      // PAN
      const rect = e.currentTarget.getBoundingClientRect()
      if (rect.width === 0) return
      setView(v => {
        const scale = v.w / rect.width
        return clampView({ x: v.x - dx * scale, y: v.y - dy * scale, w: v.w, h: v.h })
      })
    } else if (pointers.size === 2) {
      // PINCH
      const pts = Array.from(pointers.values())
      const newDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const center = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
      const scaleFactor = pinchRef.current.distance > 0 ? newDist / pinchRef.current.distance : 1
      pinchRef.current.distance = newDist
      zoomAroundPoint(scaleFactor, center.x, center.y)
    }
  }

  const onPointerUp = (e) => {
    pointersRef.current.delete(e.pointerId)
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
    if (pointersRef.current.size < 2) pinchRef.current.distance = 0
  }

  // Wheel als nativer non-passive Listener — React-Synthetic Wheel-Events sind seit
  // v17 passive, da würde `preventDefault()` nicht greifen und die Page würde scrollen
  // statt die Map zu zoomen.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const handler = (e) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18
      zoomAroundPoint(factor, e.clientX, e.clientY)
    }
    svg.addEventListener('wheel', handler, { passive: false })
    return () => svg.removeEventListener('wheel', handler)
  }, [zoomAroundPoint])

  const zoomBy = (factor) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    zoomAroundPoint(factor, rect.left + rect.width / 2, rect.top + rect.height / 2)
  }
  const resetView = () => setView({ x: 0, y: 0, w: VIEWBOX_W, h: VIEWBOX_H })

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="map-canvas-container">
      <svg
        ref={svgRef}
        className="cape-york-map"
        viewBox={`${view.x.toFixed(2)} ${view.y.toFixed(2)} ${view.w.toFixed(2)} ${view.h.toFixed(2)}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Schematic map of Cape York Peninsula"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <defs>
          <clipPath id="land-clip">
            <path d={OUTLINE_PATH} />
          </clipPath>
        </defs>

        {/* Wasser-Hintergrund */}
        <rect x="0" y="0" width={VIEWBOX_W} height={VIEWBOX_H} fill="var(--map-water)" />

        {/* Wasser-Tiefe-Andeutung */}
        <path d={OUTLINE_PATH} fill="none" stroke="var(--map-water-deep)" strokeWidth="2" opacity="0.45" />

        {/* Land + Strand-Stroke */}
        <path d={OUTLINE_PATH} fill="var(--map-land)" stroke="var(--map-beach)" strokeWidth="1.0" strokeLinejoin="round" />

        {/* Forest-Polygone (geclippt aufs Land) */}
        <g clipPath="url(#land-clip)">
          {FOREST_PATHS.map(f => (
            <path key={f.id} d={f.d} fill="var(--map-vegetation)" opacity="0.42"
                  stroke="var(--map-vegetation)" strokeWidth="0.3" strokeOpacity="0.6" />
          ))}
        </g>

        {/* NP-Polygone (nur wenn 'park'-Layer aktiv) */}
        {showParkPolygons && Object.entries(NP_POLYGONS).map(([id, polygon]) => (
          <path key={id} d={polygonPath(polygon)} fill="var(--map-park-fill)"
                stroke="var(--map-park-stroke)" strokeWidth="1.2" strokeDasharray="4 2" opacity="0.7" />
        ))}

        {/* Flüsse (alle Segmente, vor den Strassen) */}
        {RIVERS.flatMap(river =>
          (river.segments || (river.points ? [river.points] : [])).map((seg, i) => (
            <path key={`${river.id}-${i}`} d={pathFromPoints(seg)} fill="none"
                  stroke="var(--map-river)" strokeWidth="1.4" strokeLinejoin="round"
                  strokeLinecap="round" opacity="0.85" />
          ))
        )}

        {/* TRACKS — 4WD-Tracks aus OSM (highway=track). Sehr subtil: dünn, gestrichelt,
            niedrige Opacity. Render-Reihenfolge: VOR Major Roads damit Tracks „unter"
            den Hauptstrassen liegen. */}
        <g style={{ pointerEvents: 'none' }}>
          {TRACK_PATHS.map(t => (
            <path key={t.id} d={t.d} fill="none" stroke="var(--map-road-track)"
                  strokeWidth="0.5" strokeDasharray="1.5 1.5" strokeLinecap="round" opacity="0.55" />
          ))}
        </g>

        {/* MAJOR ROADS — Branch-Roads, Side-Highways die nicht in den 7 named ROADS sind.
            Dünner und etwas heller als die named Roads damit die Hierarchie sichtbar bleibt. */}
        <g style={{ pointerEvents: 'none' }}>
          {MAJOR_ROAD_PATHS.map(r => (
            <path key={r.id} d={r.d} fill="none" stroke="var(--map-road)"
                  strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round" opacity="0.7" />
          ))}
        </g>

        {/* TRIP-ROUTE-OVERLAY — UNTER den braunen Strassen, breiter Orange-Stroke macht
            die genutzten Hauptstrassen sichtbar. Nur wenn ein Trip konfiguriert ist. */}
        {isRouteActive && (
          <g style={{ pointerEvents: 'none' }}>
            {renderRoadSegments(ROADS.mulligan, { stroke: 'var(--map-trip-route)', width: 4.5, opacity: 0.45, keyPrefix: 'tr-mul' })}
            {renderRoadSegments(ROADS.pdr,      { stroke: 'var(--map-trip-route)', width: 4.5, opacity: 0.45, keyPrefix: 'tr-pdr' })}
            {tripConfig?.bamagaStop && renderRoadSegments(ROADS.npaRoad,  { stroke: 'var(--map-trip-route)', width: 4.5, opacity: 0.45, keyPrefix: 'tr-npa' })}
            {tripConfig?.bamagaStop && renderRoadSegments(ROADS.tipRoad,  { stroke: 'var(--map-trip-route)', width: 4.0, opacity: 0.45, keyPrefix: 'tr-tip' })}
          </g>
        )}

        {/* Strassen — Hauptverkehrs-Routen, gesealt-Stil. */}
        {renderRoadSegments(ROADS.mulligan,        { stroke: 'var(--map-road)',       width: 1.6, keyPrefix: 'rd-mul' })}
        {renderRoadSegments(ROADS.pdr,             { stroke: 'var(--map-road)',       width: 1.6, keyPrefix: 'rd-pdr' })}
        {renderRoadSegments(ROADS.npaRoad,         { stroke: 'var(--map-road)',       width: 1.6, keyPrefix: 'rd-npa' })}
        {renderRoadSegments(ROADS.tipRoad,         { stroke: 'var(--map-road)',       width: 1.4, keyPrefix: 'rd-tip' })}
        {/* Lakefield Rd & Portland Rds — Park-Zugangs-Routen (semi-gesealt). */}
        {renderRoadSegments(ROADS.rinyirru,        { stroke: 'var(--map-road)',       width: 1.2, keyPrefix: 'rd-lake' })}
        {renderRoadSegments(ROADS.ironRangeBranch, { stroke: 'var(--map-road-track)', width: 1.0, dash: '2 2', keyPrefix: 'rd-iron' })}

        {/* FAMOUS 4WD-TRACKS — User explizit verlangt: hohe Detail. Eigene Render-
            Schleife, prominenter dashed-Style damit sie aus dem subtilen TRACKS-
            Hintergrund hervorstechen. */}
        {FAMOUS_TRACK_IDS.map(id => {
          const road = ROADS[id]
          if (!road) return null
          // oldTeleBypass ist subtiler (sekundärer Bypass)
          const isBypass = id === 'oldTeleBypass'
          return (
            <g key={`famous-${id}`}>
              {renderRoadSegments(road, {
                stroke: 'var(--map-road-track)',
                width: isBypass ? 1.0 : 1.4,
                dash: isBypass ? '2 3' : '3 2',
                opacity: isBypass ? 0.6 : 1,
                keyPrefix: `ft-${id}`,
              })}
            </g>
          )
        })}

        {/* ── BESCHRIFTUNGEN ────────────────────────────────────────────────
            Reihenfolge: River-Labels (italic) → Road-Labels (uppercase) → NP-Labels
            (nur wenn Park-Layer an). Alle mit weißem Halo (paint-order: stroke)
            für Lesbarkeit über variablen Hintergründen. */}

        {/* River-Labels — italic, Wasser-Farbe, 7px */}
        {RIVER_LABELS.map((l, i) => {
          const p = project(l.lat, l.lng)
          return (
            <text key={`riv-${i}`} x={p.x} y={p.y} fontSize="6.5" fontStyle="italic" fontFamily="-apple-system, sans-serif"
                  fill="var(--map-river)" textAnchor="middle"
                  paintOrder="stroke" stroke="var(--map-water)" strokeWidth="2" strokeOpacity="0.85" strokeLinejoin="round"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {l.name}
            </text>
          )
        })}

        {/* Road-Labels — uppercase, kleine 6.5px-Schrift, dunkles Braun */}
        {ROAD_LABELS.map((l, i) => {
          const p = project(l.lat, l.lng)
          return (
            <text key={`rd-${i}`} x={p.x} y={p.y} fontSize="6.5" fontWeight="600" fontFamily="-apple-system, sans-serif"
                  fill="var(--map-road)" textAnchor="middle" letterSpacing="0.5"
                  paintOrder="stroke" stroke="var(--map-land)" strokeWidth="2.5" strokeOpacity="0.92" strokeLinejoin="round"
                  style={{ pointerEvents: 'none', userSelect: 'none', textTransform: 'uppercase' }}>
              {l.name}
            </text>
          )
        })}

        {/* NP-Labels — nur wenn Park-Layer aktiv */}
        {showParkPolygons && NP_LABELS.map((l, i) => {
          const p = project(l.lat, l.lng)
          return (
            <text key={`np-${i}`} x={p.x} y={p.y} fontSize="7" fontWeight="700" fontFamily="-apple-system, sans-serif"
                  fill="var(--map-park-stroke)" textAnchor="middle"
                  paintOrder="stroke" stroke="var(--map-land)" strokeWidth="2.5" strokeOpacity="0.92" strokeLinejoin="round"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {l.name}
            </text>
          )
        })}

        {/* Anker-Labels (Cairns/Cooktown/Coen/Bamaga/Tip/Weipa) — verstecken wenn ein
            Trip-Stop denselben Ort als day-numbered Marker hat (vermeidet Doppellabel). */}
        {ANCHOR_LABELS.map(a => {
          const conflictsWithTrip = isRouteActive && tripStops.some(s =>
            Math.abs(s.lat - a.lat) < 0.05 && Math.abs(s.lng - a.lng) < 0.05
          )
          if (conflictsWithTrip) return null
          const p = project(a.lat, a.lng)
          return (
            <g key={a.name}>
              <circle cx={p.x} cy={p.y} r="2.5" fill="var(--map-text)" />
              <text x={p.x + a.dx} y={p.y + a.dy} fontSize="9" fontFamily="-apple-system, sans-serif"
                    fontWeight="700" fill="var(--map-text)"
                    paintOrder="stroke" stroke="var(--map-land)" strokeWidth="2.5" strokeOpacity="0.92" strokeLinejoin="round"
                    style={{ userSelect: 'none' }}>
                {a.name}
              </text>
            </g>
          )
        })}

        {/* Fuel-Stops */}
        {showFuel && fuelStopsVisible.map(stop => {
          const p = project(stop.lat, stop.lon)
          const blurb = `${stop.brand || 'Fuel'}${stop.diesel ? ' · diesel confirmed' : ''} — km ${stop.kmFromCairns} from Cairns.`
          return (
            <g key={`fuel-${stop.id}`} className="map-marker"
               onClick={() => onMarkerTap?.({ id: stop.id, layer: 'fuel', name: stop.name || stop.brand || 'Fuel station', kmFromCairns: stop.kmFromCairns, blurb })}>
              <circle cx={p.x} cy={p.y} r="14" fill="white" fillOpacity="0.001" pointerEvents="all" />
              <circle cx={p.x} cy={p.y} r="3.5" fill="#7C5E2C" stroke="#fff" strokeWidth="1" pointerEvents="none" />
            </g>
          )
        })}

        {/* Layer-POIs — Resupply-Marker werden ausgeblendet wenn der Stop als Trip-Stop
            gerendert wird (vermeidet Doppel-Marker am gleichen Ort). */}
        {visiblePois.map(poi => {
          if (isRouteActive && tripStopIds.has(poi.id)) return null
          const p = project(poi.lat, poi.lng)
          const layer = LAYERS.find(l => l.id === poi.layer)
          return (
            <g key={poi.id} className="map-marker" onClick={() => onMarkerTap?.(poi)}>
              <circle cx={p.x} cy={p.y} r="14" fill="white" fillOpacity="0.001" pointerEvents="all" />
              <circle cx={p.x} cy={p.y} r="4.5" fill={layer?.color || '#888'} stroke="#fff" strokeWidth="1.2" pointerEvents="none" />
            </g>
          )
        })}

        {/* OSM-Camps — zusätzlich zu den hand-kuratierten 'camp'-POIs aus CAPE_YORK_POIS.
            Nur sichtbar wenn 'camp'-Layer aktiv (Premium-gegated über das LAYERS-config).
            Etwas kleinere Marker als die hand-kuratierten Camps damit visuell klar wird,
            welches die „kuratierten Highlights" sind und welches die OSM-Mass-Daten. */}
        {activeLayers.has('camp') && OSM_CAMPS.map(camp => {
          const p = project(camp.lat, camp.lng)
          const layer = LAYERS.find(l => l.id === 'camp')
          const blurbParts = []
          if (camp.operator) blurbParts.push(`Operated by ${camp.operator}.`)
          if (camp.fee === 'yes') blurbParts.push('Fee applies.')
          else if (camp.fee === 'no') blurbParts.push('Free.')
          if (camp.capacity) blurbParts.push(`Capacity ${camp.capacity}.`)
          if (camp.website) blurbParts.push(camp.website)
          const blurb = blurbParts.length ? blurbParts.join(' ') : 'Camp site (OSM data — verify before relying on it).'
          return (
            <g key={`camp-${camp.id}`} className="map-marker"
               onClick={() => onMarkerTap?.({ id: camp.id, layer: 'camp', name: camp.name, blurb, premium: true })}>
              <circle cx={p.x} cy={p.y} r="13" fill="white" fillOpacity="0.001" pointerEvents="all" />
              <circle cx={p.x} cy={p.y} r="3.5" fill={layer?.color || '#5B9F45'} stroke="#fff" strokeWidth="1" pointerEvents="none" />
            </g>
          )
        })}

        {/* Trip-Stop-Marker — größer, day-numbered, Trip-Orange. Nach den anderen
            Markern gerendert damit sie OBEN liegen. Tap öffnet ein Sheet wie POIs. */}
        {tripStops.map(stop => {
          const p = project(stop.lat, stop.lng)
          const blurb = stop.day != null
            ? `Trip stop · day ${stop.day}.${stop.id === 'cairns' ? ' Trip starts here.' : stop.id === 'bamaga' ? ' Bamaga arrival — refresh fresh stocks for the Tip leg.' : ' Resupply stop on your route.'}`
            : `Trip stop. ${stop.id === 'cairns' ? 'Trip starts here.' : 'Resupply stop on your route.'}`
          return (
            <g key={`trip-${stop.id}`} className="map-marker"
               onClick={() => onMarkerTap?.({ id: `trip-${stop.id}`, layer: 'resupply', name: stop.name, kmFromCairns: poiForStop(stop.id)?.kmFromCairns, blurb })}>
              <circle cx={p.x} cy={p.y} r="16" fill="white" fillOpacity="0.001" pointerEvents="all" />
              {/* Outer halo */}
              <circle cx={p.x} cy={p.y} r="9" fill="var(--map-trip-route)" opacity="0.22" pointerEvents="none" />
              {/* Marker */}
              <circle cx={p.x} cy={p.y} r="6.5" fill="var(--map-trip-route)" stroke="#fff" strokeWidth="1.6" pointerEvents="none" />
              {stop.day != null && (
                <text x={p.x} y={p.y + 2.2} fontSize="6.5" fontWeight="800" fontFamily="-apple-system, sans-serif"
                      textAnchor="middle" fill="#fff" pointerEvents="none" style={{ userSelect: 'none' }}>
                  {stop.day}
                </text>
              )}
              {/* Stop-Name darunter */}
              <text x={p.x} y={p.y + 16} fontSize="7.5" fontWeight="700" fontFamily="-apple-system, sans-serif"
                    textAnchor="middle" fill="var(--map-text)"
                    paintOrder="stroke" stroke="var(--map-land)" strokeWidth="2.5" strokeOpacity="0.95" strokeLinejoin="round"
                    pointerEvents="none" style={{ userSelect: 'none' }}>
                {stop.name}
              </text>
            </g>
          )
        })}

        {/* Kompass-Rosette (immer fix in der View-Position rechts unten — wird durch
            viewBox-Manipulation mitskaliert; das ist OK weil sie als „dekoratives
            Detail" gilt und im Zoom etwas größer / dezenter wirkt). */}
        <g transform={`translate(${VIEWBOX_W - 60}, ${VIEWBOX_H - 70})`}>
          <circle cx="20" cy="20" r="18" fill="var(--map-land)" stroke="var(--map-text)" strokeWidth="0.8" opacity="0.92" />
          <text x="20" y="9" textAnchor="middle" fontSize="6" fontWeight="700" fill="var(--map-text)">N</text>
          <path d="M 20 12 L 20 28" stroke="var(--map-text)" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M 17 16 L 20 12 L 23 16 Z" fill="var(--map-text)" />
        </g>

        {/* „Mainland continues south" — nur sichtbar bei voll ausgezoomter View
            (sonst wäre der Bottom-Rand visuell weg) */}
        {!isZoomed && (
          <text x={VIEWBOX_W / 2} y={VIEWBOX_H - 14} textAnchor="middle" fontSize="9" fontWeight="600"
                fill="var(--map-text)" opacity="0.55" fontStyle="italic" pointerEvents="none">
            ↓ Queensland mainland continues south ↓
          </text>
        )}
      </svg>

      {/* Zoom-Controls — Overlay rechts oben, mit -btn-Klasse damit Pan-Logic sie ignoriert */}
      <div className="map-zoom-controls" aria-label="Map zoom controls">
        <button type="button" className="map-zoom-btn" onClick={() => zoomBy(1.5)} aria-label="Zoom in">＋</button>
        <button type="button" className="map-zoom-btn" onClick={() => zoomBy(1 / 1.5)} aria-label="Zoom out" disabled={!isZoomed}>−</button>
        <button type="button" className="map-zoom-btn" onClick={resetView} aria-label="Reset view" disabled={!isZoomed}>⟲</button>
      </div>
    </div>
  )
}
