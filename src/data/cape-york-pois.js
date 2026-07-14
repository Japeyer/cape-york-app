// Kuratierte Cape-York-POIs für die InfoMapTab.
//
// Datenmodell pro POI:
//   { id, name, layer, lat, lng, kmFromCairns?, premium?, blurb? }
//
// Layer-Enum (matched mit den Toggle-Pills im UI):
//   'fuel'       — Tankstellen (= FUEL_STOPS aus route-pois.js, hier nur Spec; UI lädt direkt)
//   'resupply'   — Cairns / Cooktown / Coen / Archer / Bamaga (Supermarkt + IGA + Roadhouse)
//   'beach'      — Strände an Ostküste + Tip
//   'camp'       — Camp-Plätze (insider-knowledge, premium-relevant)
//   'crossing'   — Fluss-Crossings (sicherheitskritisch, MUSS free sein)
//   'waterfall'  — Wasserfälle (hidden gems, premium)
//   'park'       — Nationalparks (extended itineraries, premium)
//   'historical' — Telegraph Track Sites, Aboriginal Mission, Tip Marker (premium)
//
// Premium-Strategie:
//   Free-Layer:    fuel, resupply, beach, crossing  (Pflicht-Wissen + Sicherheit)
//   Premium-Layer: camp, waterfall, park, historical (Bonus-Content)
//
// Lat/Lng aus Aussie-4WD-Reise-Wissen + OSM-Recherche, jeweils 4 Dezimalstellen
// (= ~10 m Genauigkeit, mehr als genug für eine schematische Karte).
// Alle Coordinaten WGS84.
//
// kmFromCairns ist ungefähr (Strassen-km, nicht Luftlinie) — für Sortierung
// in der Detail-Card. Bei Stops abseits der Hauptstrasse (z.B. Iron Range NP)
// wird der nächste Punkt auf der PDR als Referenz gewählt.

export const CAPE_YORK_POIS = [
  // ── RESUPPLY (free) ───────────────────────────────
  { id: 'rs-cairns',    layer: 'resupply', name: 'Cairns',     lat: -16.92, lng: 145.78, kmFromCairns: 0,    blurb: 'Trip start. Last big supermarket — Woolworths, Coles, butchers. Stock up here for everything.' },
  { id: 'rs-cooktown',  layer: 'resupply', name: 'Cooktown',   lat: -15.47, lng: 145.25, kmFromCairns: 330,  blurb: 'IGA + small supermarkets. Last sealed-road shopping. Refuel and top-up fresh produce.' },
  { id: 'rs-coen',      layer: 'resupply', name: 'Coen',       lat: -13.95, lng: 143.20, kmFromCairns: 580,  blurb: 'Tiny IGA in remote outback town. Limited stock, expensive — emergency-only resupply.' },
  { id: 'rs-archer',    layer: 'resupply', name: 'Archer River Roadhouse', lat: -13.43, lng: 142.95, kmFromCairns: 670, blurb: 'Roadhouse with snacks, ice, fuel. No real groceries. Good rest stop.' },
  { id: 'rs-bamaga',    layer: 'resupply', name: 'Bamaga / Seisia', lat: -10.89, lng: 142.39, kmFromCairns: 1000, blurb: 'Tip-area community. Small store, prices high, selection limited. Freeze meat immediately.' },

  // ── BEACHES (free) ────────────────────────────────
  { id: 'b-chili',       layer: 'beach', name: 'Chili Beach',          lat: -12.78, lng: 143.43, kmFromCairns: 750, blurb: 'Long sandy beach in Iron Range NP, coconut palms. Camping right by the water. Iconic Cape stop.' },
  { id: 'b-loyalty',     layer: 'beach', name: 'Loyalty Beach (Seisia)', lat: -10.85, lng: 142.36, kmFromCairns: 990, blurb: 'Calm tropical beach with reef views. Loyalty Beach Camping Resort right on the sand.' },
  { id: 'b-punsand',     layer: 'beach', name: 'Punsand Bay',          lat: -10.71, lng: 142.46, kmFromCairns: 1015, blurb: 'Beachfront camping near the Tip. Bar, restaurant, fishing tours.' },
  { id: 'b-pajinka',     layer: 'beach', name: 'Pajinka / Cape York Tip', lat: -10.69, lng: 142.53, kmFromCairns: 1020, blurb: 'The northernmost beach on the Australian mainland. Photo at the Tip marker is mandatory.' },
  { id: 'b-vrilya',      layer: 'beach', name: 'Vrilya Point',         lat: -11.34, lng: 142.18, kmFromCairns: 950, blurb: 'Remote west-coast beach off the beaten track. Quiet, dramatic, often empty.' },
  { id: 'b-billy',       layer: 'beach', name: 'Captain Billy Landing', lat: -11.62, lng: 142.85, kmFromCairns: 870, blurb: 'East-coast beach with cliffs and clear water. Rough access track, worth it.' },
  { id: 'b-mapoon',      layer: 'beach', name: 'Mapoon (Cullen Point)', lat: -11.97, lng: 141.92, kmFromCairns: 850, blurb: 'West-coast Aboriginal community with stunning coastline. Permits + respect required.' },

  // ── RIVER CROSSINGS (free, safety-critical) ───────
  { id: 'c-jardine',     layer: 'crossing', name: 'Jardine River Ferry', lat: -11.10, lng: 142.40, kmFromCairns: 970, blurb: 'The only legal crossing — vehicle ferry. ~$130 return, daylight only. NEVER attempt to drive across — crocs.' },
  { id: 'c-wenlock',     layer: 'crossing', name: 'Wenlock River',     lat: -12.05, lng: 142.52, kmFromCairns: 750, blurb: 'Bridged on PDR. Old Telegraph crossing is rocky + tidal — for the bypass road, easy. Old crossing: experts only.' },
  { id: 'c-pascoe',      layer: 'crossing', name: 'Pascoe River',      lat: -12.62, lng: 143.27, kmFromCairns: 720, blurb: 'Notorious crossing on Old Telegraph Track. Steep entry, deep middle, can swallow vehicles. Bypass strongly recommended.' },
  { id: 'c-dulhunty',    layer: 'crossing', name: 'Dulhunty River',    lat: -11.83, lng: 142.75, kmFromCairns: 800, blurb: 'Beautiful "paradise" crossing on Old Tele — clear flowing water, sandy bottom. Manageable but check depth first.' },
  { id: 'c-bertie',      layer: 'crossing', name: 'Bertie Creek',      lat: -11.40, lng: 142.65, kmFromCairns: 880, blurb: 'Old Telegraph crossing with steep banks. Walk in first, time it dry-season only.' },
  { id: 'c-gunshot',     layer: 'crossing', name: 'Gunshot Creek',     lat: -11.55, lng: 142.66, kmFromCairns: 870, blurb: 'The legendary Old Tele drop — vertical entry. Modified vehicles only. Bypass exists.' },

  // ── CAMPGROUNDS (PREMIUM) ─────────────────────────
  { id: 'cg-eliot',      layer: 'camp', name: 'Eliot Falls / Heathlands', lat: -11.36, lng: 142.59, kmFromCairns: 900, premium: true, blurb: 'NP campground next to the falls. Fees apply, book ahead. Gateway to Twin Falls + Indian Head Falls.' },
  { id: 'cg-bramwell',   layer: 'camp', name: 'Bramwell Junction Roadhouse', lat: -11.70, lng: 142.79, kmFromCairns: 850, premium: true, blurb: 'Roadhouse with camping, fuel, meals, beer. Decision point: PDR (bypass) or Old Telegraph Track north.' },
  { id: 'cg-bramwell-stn', layer: 'camp', name: 'Bramwell Station',    lat: -11.78, lng: 142.74, kmFromCairns: 855, premium: true, blurb: 'Working cattle station with bush camping, hot showers, station tours. Iconic Cape stay.' },
  { id: 'cg-billy',      layer: 'camp', name: 'Captain Billy Landing Camp', lat: -11.62, lng: 142.85, kmFromCairns: 870, premium: true, blurb: 'Bush camp on the east coast cliffs. No facilities. Spectacular, isolated.' },
  { id: 'cg-chili',      layer: 'camp', name: 'Chili Beach Camp',     lat: -12.78, lng: 143.43, kmFromCairns: 750, premium: true, blurb: 'NP camp on the beach, palm trees, fireplaces. Small fee. Books out fast in dry season.' },
  { id: 'cg-loyalty',    layer: 'camp', name: 'Loyalty Beach Camping', lat: -10.85, lng: 142.36, kmFromCairns: 990, premium: true, blurb: 'Beachfront resort camp with cabin options, restaurant, cold beer. Tip-area home base.' },
  { id: 'cg-wenlock',    layer: 'camp', name: 'Moreton Telegraph Station', lat: -12.45, lng: 142.65, kmFromCairns: 760, premium: true, blurb: 'Historic Telegraph station with bush camping, hot showers, store, fuel. Mid-Cape stop.' },
  { id: 'cg-laura',      layer: 'camp', name: 'Lakefield NP campsites', lat: -14.85, lng: 144.05, kmFromCairns: 460, premium: true, blurb: 'Multiple bush camps along Lakefield rivers. Crocs in waterways, swim with caution. Lakeside bird-watching paradise.' },

  // ── WATERFALLS (PREMIUM) ──────────────────────────
  { id: 'wf-fruit-bat',  layer: 'waterfall', name: 'Fruit Bat Falls', lat: -11.42, lng: 142.61, kmFromCairns: 890, premium: true, blurb: 'Croc-free swimming hole — Cape York classic. Day-use only, no camping. Crystal-clear plunge pool.' },
  { id: 'wf-eliot',      layer: 'waterfall', name: 'Eliot Falls',     lat: -11.36, lng: 142.59, kmFromCairns: 900, premium: true, blurb: 'Curtain falls into a natural pool. Croc-free, swim allowed. Adjacent campground.' },
  { id: 'wf-twin',       layer: 'waterfall', name: 'Twin Falls',      lat: -11.36, lng: 142.65, kmFromCairns: 900, premium: true, blurb: 'Two parallel falls with a chasm pool below. Short walk from Eliot Falls. Photogenic and remote.' },
  { id: 'wf-indian',     layer: 'waterfall', name: 'Indian Head Falls', lat: -11.32, lng: 142.58, kmFromCairns: 905, premium: true, blurb: 'Cascading falls reached via Old Telegraph Track. Boulder-hopping required. Worth the effort.' },
  { id: 'wf-saucepan',   layer: 'waterfall', name: 'Saucepan Falls', lat: -11.45, lng: 142.62, kmFromCairns: 880, premium: true, blurb: 'Hidden waterfall on the Old Tele between Bertie and Cholmondeley. Deep pool, clear water.' },

  // ── NATIONAL PARKS (PREMIUM) ──────────────────────
  { id: 'np-lakefield',  layer: 'park', name: 'Lakefield NP / Rinyirru', lat: -14.83, lng: 144.10, kmFromCairns: 470, premium: true, blurb: 'Massive savanna NP with rivers, wetlands, croc-watching. Major detour from Cooktown. Worth 2–3 days.' },
  { id: 'np-iron',       layer: 'park', name: 'Iron Range NP / Kutini-Payamu', lat: -12.85, lng: 143.30, kmFromCairns: 740, premium: true, blurb: 'Tropical lowland rainforest extending to the coast. Endemic birds (eclectus parrot, palm cockatoo). Detour east from PDR.' },
  { id: 'np-jardine',    layer: 'park', name: 'Jardine NP', lat: -11.40, lng: 142.55, kmFromCairns: 880, premium: true, blurb: 'Covers the Eliot/Fruit Bat Falls area + Old Telegraph Track. Heart of the tip-trip experience.' },
  { id: 'np-apudthama',  layer: 'park', name: 'Apudthama NP', lat: -10.85, lng: 142.50, kmFromCairns: 990, premium: true, blurb: 'Tip-area NP — covers Pajinka, Punsand surroundings, coastal ecosystems. Cultural heritage of the Apudthama people.' },
  { id: 'np-mungkan',    layer: 'park', name: 'Mungkan Kandju NP', lat: -13.50, lng: 143.05, kmFromCairns: 620, premium: true, blurb: 'Coen-area NP with eucalypt forest, river systems. Less visited, quieter than Lakefield.' },

  // ── HISTORICAL SITES (PREMIUM) ────────────────────
  { id: 'h-tip',         layer: 'historical', name: 'Cape York Tip Marker', lat: -10.69, lng: 142.53, kmFromCairns: 1020, premium: true, blurb: 'The northernmost point of mainland Australia. Photo at the wooden marker = the trip\'s defining moment.' },
  { id: 'h-somerset',    layer: 'historical', name: 'Somerset Beach', lat: -10.78, lng: 142.61, kmFromCairns: 1010, premium: true, blurb: 'First European settlement on Cape York (1864). Ruins, graves, signage. Quiet historic beach.' },
  { id: 'h-mapoon',      layer: 'historical', name: 'Mapoon Mission', lat: -11.97, lng: 141.92, kmFromCairns: 850, premium: true, blurb: 'Aboriginal mission abandoned in 1963 (forced removal). Painful history, important to acknowledge.' },
  { id: 'h-laura',       layer: 'historical', name: 'Quinkan Rock Art (Laura)', lat: -15.55, lng: 144.45, kmFromCairns: 320, premium: true, blurb: 'World Heritage Aboriginal rock art galleries. Tours via Quinkan Cultural Centre. Up to 30,000 years old.' },
  { id: 'h-tele',        layer: 'historical', name: 'Old Telegraph Track', lat: -11.65, lng: 142.70, kmFromCairns: 850, premium: true, blurb: 'The original 1880s telegraph line route — now an iconic 4WD track. River crossings, history, the proper Cape adventure.' },
  { id: 'h-moreton',     layer: 'historical', name: 'Moreton Telegraph Station', lat: -12.45, lng: 142.65, kmFromCairns: 760, premium: true, blurb: 'Restored 1887 telegraph relay station — now a roadhouse + museum. Stop for fuel, water, history.' },
]

// Layer-Metadaten — Reihenfolge im UI = Reihenfolge hier.
// `premium: true` = Layer ist für Free-User geblurrt + Sticker.
export const LAYERS = [
  { id: 'resupply',   label: 'Resupply',     icon: '🛒', color: '#C0600C', premium: false },
  { id: 'fuel',       label: 'Fuel',         icon: '⛽', color: '#7C5E2C', premium: false },
  { id: 'beach',      label: 'Beaches',      icon: '🏖', color: '#E8B86A', premium: false },
  { id: 'crossing',   label: 'River crossings', icon: '🌊', color: '#3E7AA9', premium: false },
  { id: 'camp',       label: 'Campgrounds',  icon: '🏕', color: '#5C8A4F', premium: true },
  { id: 'waterfall',  label: 'Waterfalls',   icon: '💧', color: '#3DA89B', premium: true },
  { id: 'park',       label: 'National parks', icon: '🏞', color: '#3A7448', premium: true },
  { id: 'historical', label: 'Historical',   icon: '📜', color: '#8B5E3C', premium: true },
]

// Bounding-Box für SVG-Projektion. Cape York liegt zwischen ungefähr:
//   nord (top):  Pajinka -10.69
//   süd (cape):  Cairns  -16.92
//   ost (right): Cairns  145.78
//   west (left): Mapoon  141.85
// MAP_BOUNDS extends *südlich* von Cairns bis -19 — damit der untere Bildrand
// suggeriert, dass Queensland weitergeht (nicht „Cape York als Insel"-Effekt).
export const MAP_BOUNDS = {
  latMin: -19.00,   // unten — extra Platz nach Süden für Queensland-Mainland-Andeutung
  latMax: -10.50,   // oben
  lngMin: 141.50,   // links
  lngMax: 146.00,   // rechts
}

// Nationalpark-Polygone und Flüsse kommen aus echten OSM-Geometrien
// (build-time gefetcht via `npm run geo:refresh`, vereinfacht per Douglas-Peucker
// auf ~30–150 Wegpunkte pro Form). Source of Truth: cape-york-geo.js.
//
// Rationale: Hand-skizzierte Polygone aus Trainingswissen sind zwangsläufig
// ungenau. OSM hat die echten QPWS-/QLD-Government-Grenzen importiert
// (1000–4000 Wegpunkte pro NP), die wir auf eine 360px-Karte herunterbrechen.
//
// Wenn ein Re-Refresh fehlschlägt oder OSM-Daten fehlen, bleibt der vorherige
// generierte Stand bestehen — der Build muss kein Network haben.
export { RIVERS, NP_POLYGONS, NP_POLYGONS_META, ROADS, MAJOR_ROADS, TRACKS, COASTLINES, LAND_POLYGON, FORESTS, CAMPS, GEO_GENERATED_AT, GEO_ATTRIBUTION } from './cape-york-geo.js'
