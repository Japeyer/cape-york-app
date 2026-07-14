// Region-Metadaten. Datengetrieben gemäss CLAUDE.md § Architektur-Vorgaben.
// Stufe-2-Geo-Erweiterung: weitere Regionen daneben anlegen, Code bleibt gleich.
//
// Supply Points (Versorgungspunkte) = Orte auf der Strecke, an denen Mieter einkaufen können.
//   id              eindeutiger Schlüssel (auch Tab-Key + storage-prefix-Basis)
//   name            UI-Label (Place-Name, keine Übersetzung nötig im MVP)
//   icon            Tab-Icon (Emoji)
//   storagePrefix   localStorage-Key-Prefix für Checkboxen (eindeutig pro Stop)
//   role            'start' = Hauptversorgung am Anfang, 'mid' = Nachschub, 'roadhouse' = nur Eis/Wasser/Snacks
//   kmFromCairns    Distanz auf der Inland-Route (Peninsula Development Road) — angezeigt im DaySheet
//   optional        true = User kann via Configurator an/ausschalten; false = immer an (Cairns)
//   minTripDays     erst ab dieser Trip-Länge sinnvoll (Stop wird sonst aus DaySheet/Tabs gefiltert).
//                   Cairns hat keinen — er ist immer an. Cooktown ab 2 (Tagesausflug Norden), Coen ab 4
//                   (mid-Cape erreicht erst Tag 4–5), Archer/Bamaga ab 5 (Norden braucht Anlaufzeit).
//   calColor        Hintergrund-/Text-/Border-Farbe für den Calendar-Marker (nur optional-Stops)
//   essentials      Camping-Basics die nicht aus Rezepten kommen (Wasser, Foil, Müllbeutel…).
//                   Pro Item: { id, name, qty } — qty als String oder Funktion
//                   ({ persons, days, fridgeSize, bamagaStop, bamagaActiveDay }) → String.
//                   Generator wertet Funktionen aus (siehe lib/generator.js → injectEssentials).
//
// Texte (Notes, Progress-Labels) bleiben in src/strings.js — gelookupt via supply-point-id.

// ── Skalierungs-Helpers für essentials ──
// Cape-York-Heuristik: 3L Trinkwasser / Person / Tag bei 35–40°C; 1 Elektrolyt-Sachet/Person/Tag.
// Wasser-Splitting: ist ein Bamaga-Stop gesetzt, deckt Cairns Tag 1 bis Bamaga-Tag (inklusive),
// Bamaga den Rest. Ohne Stop: Cairns deckt den gesamten Trip.
// Refill-Stops dazwischen (Cooktown/Coen/Archer River) liefern ergänzendes Wasser/Eis als
// "Top-Up", keine harte Aufteilung — User entscheidet, wie viel er wirklich braucht.

const WATER_L_PER_PERSON_DAY = 3
const JERRY_CAN_L = 12

function jerryCansCairns(ctx) {
  const days = ctx.bamagaStop && ctx.bamagaActiveDay
    ? ctx.bamagaActiveDay
    : ctx.days
  const liters = ctx.persons * days * WATER_L_PER_PERSON_DAY
  const cans = Math.ceil(liters / JERRY_CAN_L)
  return `${cans} × ${JERRY_CAN_L}L jerry can${cans === 1 ? '' : 's'} (${liters}L for first ${days} day${days === 1 ? '' : 's'})`
}

function jerryCansBamaga(ctx) {
  const remaining = ctx.bamagaActiveDay ? ctx.days - ctx.bamagaActiveDay : 0
  if (remaining <= 0) return '— (top up if low)'
  const liters = ctx.persons * remaining * WATER_L_PER_PERSON_DAY
  const cans = Math.ceil(liters / JERRY_CAN_L)
  return `${cans} × ${JERRY_CAN_L}L (${liters}L for remaining ${remaining} day${remaining === 1 ? '' : 's'})`
}

function electrolyteForTrip(ctx) {
  const sachets = ctx.persons * ctx.days
  return `${sachets} sachets (1/person/day)`
}

function iceCairns(ctx) {
  // Compressor-Fridge → kein Eis nötig (entfällt komplett aus der Liste).
  if (ctx.fridgeCompressor) return null
  if (ctx.fridgeSize === 'large')  return '2 × 5kg bags'
  if (ctx.fridgeSize === 'medium') return '2 × 5kg bags'
  return '3 × 5kg bags'
}

function iceMidStop(ctx) {
  if (ctx.fridgeCompressor) return null
  return '1–2 × 5kg bags'
}

// Top-Up-Wasser an Refill-Stops (Cooktown/Coen): nicht der ganze Trip-Bedarf, nur
// "1–2 jerry cans als Reserve" — User entscheidet selbst basierend auf Verbrauch.
// Skalierung an Personen, weil Familie mehr verbraucht als Solo-Reisender.
function jerryCansTopUp(ctx) {
  const cans = Math.max(1, Math.min(3, Math.ceil(ctx.persons / 2)))
  return `${cans} × ${JERRY_CAN_L}L (top up if low)`
}

export const REGION = {
  id: 'cape-york',
  name: 'Cape York',
  country: 'AU',
  state: 'QLD',

  // Reihenfolge = Reise-Reihenfolge nordwärts. Configurator und buildTabs respektieren das.
  supplyPoints: [
    {
      id: 'cairns',
      name: 'Cairns',
      icon: '🛒',
      storagePrefix: 'c',
      role: 'start',
      kmFromCairns: 0,
      optional: false,  // Cairns ist immer der Start, nicht abwählbar
      reliableFresh: true,  // Hauptversorgung — Frisch-Routing-Quelle
      essentials: [
        // Hydration — skaliert mit Personen × Tagen × 3L (Cape-York-Heuristik bei 35–40°C)
        { id: 'ess-water-cairns', name: 'Drinking water (jerry cans)', qty: jerryCansCairns },
        { id: 'ess-electrolyte',  name: 'Electrolyte sachets',         qty: electrolyteForTrip },
        // Cooling — skaliert mit Fridge-Type (large = compressor, kein Eis nötig)
        { id: 'ess-ice-cairns',   name: 'Ice for cooler',              qty: iceCairns },
        // Storage & food handling
        { id: 'ess-ziploc-l',     name: 'Ziploc bags large (1L)',      qty: '1 box (20+)' },
        { id: 'ess-ziploc-s',     name: 'Ziploc bags small (250ml)',   qty: '1 box' },
        { id: 'ess-foil',         name: 'Aluminium foil',              qty: '1 large roll' },
        { id: 'ess-clingfilm',    name: 'Cling film',                  qty: '1 roll' },
        // Cleanup
        { id: 'ess-paper-towels', name: 'Paper towels',                qty: '3-pack' },
        { id: 'ess-bin-bags',     name: 'Bin bags (heavy duty)',       qty: '1 roll' },
        { id: 'ess-dish-soap',    name: 'Dishwashing liquid (eco)',    qty: '1 bottle' },
        { id: 'ess-sponges',      name: 'Sponges / scourers',          qty: '2-pack' },
        // Cooking
        { id: 'ess-matches',      name: 'Matches or lighter',          qty: '2 packs' },
        { id: 'ess-oil-spray',    name: 'Cooking oil spray',           qty: '1 can' },
        // Hygiene (camping-relevant)
        { id: 'ess-wet-wipes',    name: 'Wet wipes / hand sanitizer',  qty: '1 large pack' },
        { id: 'ess-toilet-paper', name: 'Toilet paper',                qty: '3-pack' },
      ],
    },

    {
      id: 'cooktown',
      name: 'Cooktown',
      icon: '🏪',
      storagePrefix: 'ck',
      role: 'mid',
      kmFromCairns: 330,
      optional: true,
      reliableFresh: true,  // letzter großer Supermarkt (IGA + Foodworks) — verlässlich frisch
      minTripDays: 2,
      // Calendar-Marker: blau für Cooktown (klar unterscheidbar von Bamaga grün, Restaurant gelb).
      calColor: { bg: '#DEEBFF', fg: '#1B4A8E', border: '#7AA7E6' },
      essentials: [
        { id: 'ess-water-cooktown',       name: 'Drinking water (top-up)', qty: jerryCansTopUp },
        { id: 'ess-ice-cooktown',         name: 'Ice refill',              qty: iceMidStop },
        { id: 'ess-bread-cooktown',       name: 'Fresh bread (loaf)',      qty: '1–2 loaves' },
        { id: 'ess-paper-towels-cooktown', name: 'Paper towels (refill)',  qty: '2-pack' },
        { id: 'ess-bin-bags-cooktown',    name: 'Bin bags (extra)',        qty: '1 roll' },
        { id: 'ess-wet-wipes-cooktown',   name: 'Wet wipes (refill)',      qty: '1 pack' },
      ],
    },

    {
      id: 'coen',
      name: 'Coen',
      icon: '⛽',
      storagePrefix: 'co',
      role: 'mid',
      kmFromCairns: 580,
      optional: true,
      reliableFresh: true,  // kleines IGA mid-Cape — stockt das Meiste, verlässlich genug
      minTripDays: 4,
      // Calendar-Marker: violett für Coen.
      calColor: { bg: '#EFE3F4', fg: '#5B2D7A', border: '#B088C8' },
      essentials: [
        { id: 'ess-water-coen',       name: 'Drinking water (top-up)', qty: jerryCansTopUp },
        { id: 'ess-ice-coen',         name: 'Ice refill',              qty: iceMidStop },
        { id: 'ess-bread-coen',       name: 'Fresh bread (if available)', qty: '1 loaf' },
        { id: 'ess-bin-bags-coen',    name: 'Bin bags (extra)',        qty: '1 roll' },
      ],
    },

    {
      id: 'archer',
      name: 'Archer River',
      icon: '🏕',
      storagePrefix: 'ar',
      role: 'roadhouse',
      kmFromCairns: 670,
      optional: true,
      reliableFresh: false,  // Roadhouse — Eis/Wasser/Snacks, KEIN verlässliches Frisch-Sortiment
      minTripDays: 5,
      // Calendar-Marker: rot-orange für Archer River (Roadhouse-Akzent).
      calColor: { bg: '#FCE3DA', fg: '#A0421E', border: '#E29472' },
      essentials: [
        { id: 'ess-ice-archer',     name: 'Ice (key reason to stop)', qty: iceMidStop },
        { id: 'ess-water-archer',   name: 'Drinking water (if low)',  qty: jerryCansTopUp },
        { id: 'ess-snacks-archer',  name: 'Travel snacks',            qty: '1–2 packs' },
        { id: 'ess-cold-drinks-archer', name: 'Cold drinks (Coke etc.)', qty: '4–6 cans' },
      ],
    },

    {
      id: 'weipa',
      name: 'Weipa',
      icon: '🛒',
      storagePrefix: 'we',
      role: 'mid',
      kmFromCairns: 830,  // westlicher Abstecher von der PDR — hat einen vollen Woolworths
      optional: true,
      reliableFresh: true,  // richtiger Woolworths — bestes Frisch-Sortiment nördlich von Cooktown
      minTripDays: 6,
      // Calendar-Marker: teal für Weipa (unterscheidbar von Cooktown blau / Coen violett / Bamaga grün).
      calColor: { bg: '#DCF3F0', fg: '#17706A', border: '#79C7BF' },
      essentials: [
        { id: 'ess-water-weipa',       name: 'Drinking water (top-up)', qty: jerryCansTopUp },
        { id: 'ess-ice-weipa',         name: 'Ice refill',              qty: iceMidStop },
        { id: 'ess-bread-weipa',       name: 'Fresh bread (loaf)',      qty: '1–2 loaves' },
        { id: 'ess-bin-bags-weipa',    name: 'Bin bags (extra)',        qty: '1 roll' },
      ],
    },

    {
      id: 'bamaga',
      name: 'Bamaga',
      icon: '🌿',
      storagePrefix: 'b',
      role: 'mid',
      kmFromCairns: 1000,
      optional: true,
      reliableFresh: true,  // Bamaga hat einen richtigen Supermarkt — verlässlich frisch
      minTripDays: 5,
      // Calendar-Marker: grün.
      calColor: { bg: '#E3F4E3', fg: '#2C6A2E', border: '#88C088' },
      essentials: [
        // Mid-Trip-Refill: nur Verbrauchs-Items die ausgehen (nicht Foil/Ziploc — die reichen)
        { id: 'ess-water-bamaga',        name: 'Drinking water refill',  qty: jerryCansBamaga },
        { id: 'ess-ice-bamaga',          name: 'Ice refill',             qty: iceMidStop },
        { id: 'ess-bin-bags-bamaga',     name: 'Bin bags (extra)',       qty: '1 roll' },
        { id: 'ess-paper-towels-bamaga', name: 'Paper towels (refill)',  qty: '2-pack' },
      ],
    },
  ],
}
