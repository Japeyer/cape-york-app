// ── Per-Trip-Namespace für volatile Keys (Multi-Trip) ─────────────
// Shopping/Inventar-State (ck_/del_/qty_/add_/invu_/invadd_) wird pro Trip getrennt gehalten,
// indem der aktive Trip-Namespace in den Key eingebaut wird: `<prefix><tripId>~<rest>`.
// App.jsx ruft setActiveNamespace(tripId) beim Laden/Wechseln; die Consumer-Funktionen
// (ShoppingTab/InventoryTab) bleiben unverändert. `ui_`-Keys bleiben global (nicht per-Trip).
const VOLATILE_PREFIXES = ['ck_', 'del_', 'qty_', 'add_', 'invu_', 'invadd_']
let activeNs = 't1'
export function setActiveNamespace(tripId) { activeNs = tripId || 't1' }
export function getActiveNamespace() { return activeNs }
function nsKey(prefix, rest) { return prefix + activeNs + '~' + rest }
function nsPrefix(prefix) { return prefix + activeNs + '~' }

// Alle Storage-Keys als Array (über key(i) — robust über Storage-Implementierungen).
function allStorageKeys() {
  const keys = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k != null) keys.push(k)
    }
  } catch {}
  return keys
}

export function getChecked(id) {
  try {
    return JSON.parse(localStorage.getItem(nsKey('ck_', id))) || false
  } catch {
    return false
  }
}

export function setChecked(id, val) {
  try {
    localStorage.setItem(nsKey('ck_', id), JSON.stringify(val))
  } catch {}
}

export function resetPrefix(prefix) {
  try {
    const full = nsPrefix('ck_') + prefix
    allStorageKeys()
      .filter(k => k.startsWith(full))
      .forEach(k => localStorage.removeItem(k))
  } catch {}
}

// Wipe der volatilen Keys EINES Trips (aktiver Trip default). Verwendet vom "Reset all"-Button
// und beim Löschen eines Trips — trifft nur den jeweiligen Namespace, nie andere Trips.
export function wipeTripVolatile(tripId = activeNs) {
  try {
    const ns = tripId + '~'
    allStorageKeys()
      .filter(k => VOLATILE_PREFIXES.some(p => k.startsWith(p + ns)))
      .forEach(k => localStorage.removeItem(k))
  } catch {}
}
export function resetAllShoppingState() { wipeTripVolatile(activeNs) }

// Liefert alle gesetzten Checkbox-IDs unter einem Prefix (für Orphan-Detection
// nach Plan-Regeneration: bereits gekauft, aber nicht mehr in der aktuellen Liste).
export function getAllCheckedIds(prefix) {
  try {
    const out = []
    const fullPrefix = nsPrefix('ck_') + prefix
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(fullPrefix)) continue
      if (JSON.parse(localStorage.getItem(k)) === true) {
        out.push(k.slice(fullPrefix.length))
      }
    }
    return out
  } catch {
    return []
  }
}

// ── User-Customizations für die Einkaufsliste ──
// Drei Schichten on top of dem Generator-Output:
//   del_<id>          → Item ist gelöscht (global pro Item-ID, nicht pro Bucket — wenn das
//                       Item zwischen Cairns/Bamaga wandert, bleibt es gelöscht)
//   qty_<id>          → User hat die Menge überschrieben (global)
//   add_<prefix>_<id> → User-hinzugefügtes Item (per-bucket — User wählte Cairns ODER Bamaga)
//
// Storage-Pattern folgt dem existierenden ck_-Schema (eine Storage-Key pro Item),
// damit Lookups O(1) bleiben und Reset/Migration trivial sind.

export function isItemDeleted(id) {
  try { return localStorage.getItem(nsKey('del_', id)) === 'true' } catch { return false }
}

export function setItemDeleted(id, deleted) {
  try {
    if (deleted) localStorage.setItem(nsKey('del_', id), 'true')
    else         localStorage.removeItem(nsKey('del_', id))
  } catch {}
}

// Liefert alle aktuell als gelöscht markierten Item-IDs (für die "Hidden items"-Sektion
// am Listen-Ende, in der man Items wiederherstellen kann).
export function getAllDeletedIds() {
  try {
    const out = []
    const full = nsPrefix('del_')
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(full)) continue
      if (localStorage.getItem(k) === 'true') out.push(k.slice(full.length))
    }
    return out
  } catch { return [] }
}

export function getQtyOverride(id) {
  try { return localStorage.getItem(nsKey('qty_', id)) } catch { return null }
}

export function setQtyOverride(id, qty) {
  try {
    if (qty == null || qty === '') localStorage.removeItem(nsKey('qty_', id))
    else                            localStorage.setItem(nsKey('qty_', id), qty)
  } catch {}
}

// Per-bucket User-hinzugefügte Items. JSON-payload pro Storage-Key:
//   { name: string, qty: string, cat: string }
// ID wird vom Caller generiert (z.B. via slugify oder timestamp); muss eindeutig im Bucket sein.
export function getAddedItems(prefix) {
  try {
    const out = []
    const fullPrefix = nsPrefix('add_') + prefix + '_'
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(fullPrefix)) continue
      const id = k.slice(fullPrefix.length)
      const raw = localStorage.getItem(k)
      try {
        const payload = JSON.parse(raw)
        if (payload && typeof payload === 'object' && typeof payload.name === 'string') {
          out.push({ id, name: payload.name, qty: payload.qty || '', cat: payload.cat || '' })
        }
      } catch { /* skip corrupt */ }
    }
    return out
  } catch { return [] }
}

export function setAddedItem(prefix, id, payload) {
  try {
    localStorage.setItem(nsKey('add_', prefix + '_' + id), JSON.stringify({
      name: payload.name || '',
      qty:  payload.qty  || '',
      cat:  payload.cat  || '',
    }))
  } catch {}
}

export function removeAddedItem(prefix, id) {
  try { localStorage.removeItem(nsKey('add_', prefix + '_' + id)) } catch {}
}

// ── Manueller Inventar-Verbrauch ──
// Zusätzlich zum Verbrauch aus gekochten Mahlzeiten kann der User im Stock-Tab von Hand abziehen
// (z.B. einen Riegel/Chips außerhalb des Menüs gegessen). Pro kanonischer Zutat ein Mengen-Objekt
// { unit: qty }. `invu_<key>`. Wird von resetAllShoppingState mitgewischt (Per-Trip-State).
export function getManualUsed(key) {
  try { return JSON.parse(localStorage.getItem(nsKey('invu_', key))) || {} } catch { return {} }
}

export function setManualUsed(key, amount) {
  try {
    if (!amount || !Object.keys(amount).length) localStorage.removeItem(nsKey('invu_', key))
    else localStorage.setItem(nsKey('invu_', key), JSON.stringify(amount))
  } catch {}
}

// User-hinzugefügte Inventar-Items (Dinge, die nicht aus der Einkaufsliste kommen — z.B. an der
// Tankstelle gegriffene Snacks). `invadd_<id>` = { name, qty } (qty = Stückzahl). Von
// resetAllShoppingState mitgewischt.
export function getAddedInventory() {
  try {
    const out = []
    const full = nsPrefix('invadd_')
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(full)) continue
      try {
        const p = JSON.parse(localStorage.getItem(k))
        if (p && typeof p.name === 'string') out.push({ id: k.slice(full.length), name: p.name, qty: Number(p.qty) || 0 })
      } catch { /* skip corrupt */ }
    }
    return out
  } catch { return [] }
}

export function setAddedInventory(id, payload) {
  try { localStorage.setItem(nsKey('invadd_', id), JSON.stringify({ name: payload.name || '', qty: Number(payload.qty) || 0 })) } catch {}
}

export function removeAddedInventory(id) {
  try { localStorage.removeItem(nsKey('invadd_', id)) } catch {}
}

// Konfigurator-State (cfg_v1) — eine Quelle der Wahrheit für days/persons/diet.
// Architektur-Vorgabe 5: kein Backend, alles lokal.
import { migratePersonsToPeople, makePersonId } from '../lib/calories.js'

const CONFIG_KEY = 'cfg_v1'
// First-Open-Defaults: leerer Trip — User wählt Start- und End-Tag im Calendar.
// `days: 0` und `startDate: null` sind die Sentinel-Werte für "noch nichts gewählt";
// Configurator zeigt dann den Range-Picker, Submit ist deaktiviert.
// Pill-Pickers brauchen Werte (sonst rendert die UI nicht), darum Diet/Burners/Fridge
// mit sensible Defaults — Nutzer ändert sie ohnehin im Onboarding.
// Backward-Compat: Migration alter Saves mit `persons:2` läuft weiter über
// `migratePersonsToPeople` (siehe `loadConfig`).
export function defaultConfig() {
  return {
    days: 0,
    startDate: null,
    people: [
      { id: makePersonId(0), type: 'adult-m', appetite: 'medium' },
      { id: makePersonId(1), type: 'adult-f', appetite: 'medium' },
    ],
    diet: 'omnivore',
    // Kochaufwand-Obergrenze: 'low' = nur einfache/schnelle Rezepte, 'medium' = einfach + mittel,
    // 'high' = alles (inkl. aufwändiger Specials). Default 'high' = kein Filter (bisheriges Verhalten,
    // rückwärtskompatibel für Trips ohne dieses Feld). Generator klemmt via effortAllowed().
    cookEffort: 'high',
    burners: 2,
    fridgeSize: 'large',
    // Kompressor-Kühlschrank ja/nein. Beeinflusst die Eis-Mengen in den Camping-Essentials
    // (Compressor=true → kein Eis nötig; Cooler-Box mit Eis-Pack → 5kg-Säcke skaliert nach Größe).
    // Default false ist sicherer: User mit Kompressor-Fridge ändert es bewusst zu true.
    fridgeCompressor: false,
    bamagaStop: false,
    bamagaDay: 4,
    // Optionale Resupply-Stops zwischen Cairns und Bamaga. Cairns ist immer an (Start),
    // Bamaga hat seine eigene `bamagaStop`/`bamagaDay`-Logik (mit Day-Picker).
    // Hier nur die Toggle-only-Stops: Cooktown (großer Supermarkt ~330km), Coen (kleines IGA ~580km),
    // Archer River Roadhouse (Eis/Wasser/Snacks ~670km). Default alle off — User aktiviert was er
    // tatsächlich anfahren wird; jeder aktivierte Stop kriegt einen eigenen Tab + Essentials-Block.
    enabledStops: {
      cooktown: false,
      coen: false,
      archer: false,
      weipa: false,
    },
    // Tag pro optionalem Stop, an dem der User dort ankommt (1-basiert, wie bamagaDay).
    // null = noch nicht zugewiesen. Wird gesetzt durch Tap auf einen Tag im Calendar-DaySheet
    // (toggleStopForDay in ConfiguratorTab); bleibt erhalten beim Deaktivieren damit
    // Re-Aktivieren die alte Wahl als Hint hat.
    stopDays: {
      cooktown: null,
      coen: null,
      archer: null,
      weipa: null,
    },
    // Allergie-Toggle entkoppelt vom Array, damit User "Yes" wählen und Pills offen
    // lassen kann ohne sofort Filter aktiv zu haben. Generator interpretiert
    // allergens=[] = keine Filter; App.jsx übergibt [] wenn allergiesEnabled=false.
    allergiesEnabled: false,
    allergens: [],
    // Pro-Tag-Overrides — Schlüssel ist die Tagesnummer (1-basiert, nicht Datum):
    //   restaurantSlots: { 1: { f: true, ab: true } }     → tag 1 isst Frühstück + Dinner auswärts
    //   overrides:       { 5: { ab: 'a9' } }              → user hat manuell Lamb chops für tag 5 dinner gewählt
    // Beide bleiben "tag-basiert" damit ein Verschieben des Start-Datums sie nicht zerschießt.
    // Wenn Tage gekürzt werden, fallen Einträge oberhalb von days automatisch raus (Generator ignoriert sie).
    restaurantSlots: {},
    overrides: {},
    // Reaktiver Ist-Status pro Mahlzeit, im Trip getappt (Menu-Tab): { 3: { ab: 'eaten-out' } }.
    // Werte: 'eaten-out' | 'skipped' | 'leftovers'. Markierte Slots werden aus der (Rest-)
    // Einkaufsliste + Kostenschätzung entfernt. Tag-basiert wie restaurantSlots/overrides.
    mealStatus: {},
    completed: false,
  }
}

// Bamaga muss strikt zwischen Tag 2 und Tag (days-1) liegen — Start ist immer Cairns.
function clampBamagaDay(day, days) {
  const lo = 2
  const hi = Math.max(2, days - 1)
  return Math.max(lo, Math.min(hi, day | 0 || lo))
}

// Sanitisiert/migriert ein rohes Config-Objekt (persons→people, Bamaga-Defaults, Stops, …).
// Pur (kein localStorage) → pro Trip anwendbar und testbar.
export function mergeConfig(parsed) {
  try {
    if (!parsed || typeof parsed !== 'object') return defaultConfig()
    const merged = { ...defaultConfig(), ...parsed }
    // Migration alter Schema-Versionen (persons:N ohne people-Array).
    if (!Array.isArray(parsed.people) || !parsed.people.length) {
      merged.people = migratePersonsToPeople(parsed.persons ?? 2)
    }
    delete merged.persons  // alter Key wird nicht mehr verwendet
    // Bamaga-Migration für Saves vor diesem Feature: Default-Stop=true, Tag aus alter ~55%-Heuristik.
    // Bei Sentinel-Trip (days=0, kein abgeschlossener Trip) lassen wir bamagaDay null/0 — der
    // Configurator setzt sinnvolle Werte sobald der User eine Range gewählt hat.
    if (typeof parsed.bamagaStop !== 'boolean') merged.bamagaStop = false
    if (merged.days >= 2) {
      if (!Number.isFinite(parsed.bamagaDay)) {
        merged.bamagaDay = clampBamagaDay(Math.round(merged.days * 0.55), merged.days)
      } else {
        merged.bamagaDay = clampBamagaDay(parsed.bamagaDay, merged.days)
      }
    } else {
      merged.bamagaDay = Number.isFinite(parsed.bamagaDay) ? parsed.bamagaDay : null
    }
    // Allergen-Migration: alte Saves ohne diese Felder bekommen "aus".
    if (typeof parsed.allergiesEnabled !== 'boolean') merged.allergiesEnabled = false
    merged.allergens = Array.isArray(parsed.allergens) ? parsed.allergens : []
    // Compressor-Migration: alte Saves bekommen Compressor=true wenn fridgeSize='large'
    // (entspricht der vorherigen Heuristik in regions.js). Sonst false.
    if (typeof parsed.fridgeCompressor !== 'boolean') {
      merged.fridgeCompressor = parsed.fridgeSize === 'large'
    }
    // Migration für enabledStops: alte Saves bekommen alle optional-Stops aus.
    // Bestehende User-Wahl wird gemergt damit nicht versehentlich aktivierte Stops verschwinden.
    merged.enabledStops = {
      cooktown: false, coen: false, archer: false, weipa: false,
      ...(parsed.enabledStops && typeof parsed.enabledStops === 'object' ? parsed.enabledStops : {}),
    }
    // Migration für stopDays: alte Saves bekommen null (= noch nicht gesetzt).
    // Out-of-range Tage werden hier NICHT geklemmt — das macht der Configurator beim Render
    // mit dem aktuellen `days`-Wert (sonst riskiert man Race Conditions bei Trip-Verkürzung).
    merged.stopDays = {
      cooktown: null, coen: null, archer: null, weipa: null,
      ...(parsed.stopDays && typeof parsed.stopDays === 'object' ? parsed.stopDays : {}),
    }
    merged.mealStatus = (parsed.mealStatus && typeof parsed.mealStatus === 'object')
      ? parsed.mealStatus
      : {}
    // Calendar/Restaurant/Override-Migration: alte Saves mit gültigem Start-Date behalten ihn,
    // alles andere → null (= "noch nicht gewählt", Range-Picker im Configurator triggert).
    merged.startDate = typeof parsed.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.startDate)
      ? parsed.startDate
      : null
    merged.restaurantSlots = (parsed.restaurantSlots && typeof parsed.restaurantSlots === 'object')
      ? parsed.restaurantSlots
      : {}
    merged.overrides = (parsed.overrides && typeof parsed.overrides === 'object')
      ? parsed.overrides
      : {}
    return merged
  } catch {
    return defaultConfig()
  }
}

// ── Trip-Store (Multi-Trip) ───────────────────────────────────────
// `cfg_trips_v1` = { trips: [{ id, name, config }], activeTripId }. Ersetzt das Single-`cfg_v1`.
const TRIPS_KEY = 'cfg_trips_v1'

export function defaultTripName() { return 'Cape York trip' }

// Reine Store-Helfer (kein localStorage) → testbar.
export function migrateLegacyToStore(cfg, name) {
  return { trips: [{ id: 't1', name: name || defaultTripName(), config: cfg }], activeTripId: 't1' }
}
export function createTripInStore(store, trip) {
  return { trips: [...store.trips, trip], activeTripId: trip.id }
}
export function deleteTripFromStore(store, id) {
  const trips = store.trips.filter(t => t.id !== id)
  let activeTripId = store.activeTripId
  if (activeTripId === id) activeTripId = trips.length ? trips[trips.length - 1].id : null
  return { trips, activeTripId }
}
export function renameTripInStore(store, id, name) {
  return { ...store, trips: store.trips.map(t => (t.id === id ? { ...t, name } : t)) }
}
export function setActiveInStore(store, id) {
  return store.trips.some(t => t.id === id) ? { ...store, activeTripId: id } : store
}
export function getActiveTrip(store) {
  return store?.trips?.find(t => t.id === store.activeTripId) || null
}
export function putActiveConfig(store, cfg) {
  return { ...store, trips: store.trips.map(t => (t.id === store.activeTripId ? { ...t, config: cfg } : t)) }
}

// Beim App-Start: Volatile Keys des aktuellen (Single-)Trips in den Namespace 't1' umbenennen,
// damit Checkboxen/Inventar beim Umstieg auf Multi-Trip erhalten bleiben. Läuft nur bei Migration.
function renameLegacyVolatileKeys(tripId) {
  try {
    const ns = tripId + '~'
    for (const k of allStorageKeys()) {
      const p = VOLATILE_PREFIXES.find(pre => k.startsWith(pre))
      if (!p) continue
      const rest = k.slice(p.length)
      if (rest.startsWith(ns)) continue          // bereits namespaced
      localStorage.setItem(p + ns + rest, localStorage.getItem(k))
      localStorage.removeItem(k)
    }
  } catch {}
}

function readStore() {
  try {
    const raw = localStorage.getItem(TRIPS_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    return s && Array.isArray(s.trips) ? s : null
  } catch { return null }
}

export function saveTripStore(store) {
  try { localStorage.setItem(TRIPS_KEY, JSON.stringify(store)) } catch {}
}

// Store laden — oder einmalig aus dem alten Single-Trip `cfg_v1` migrieren. Configs sanitisieren.
export function loadTripStore() {
  const existing = readStore()
  if (existing) {
    existing.trips = existing.trips.map(t => ({ ...t, config: mergeConfig(t.config) }))
    if (!existing.trips.some(t => t.id === existing.activeTripId)) {
      existing.activeTripId = existing.trips[0]?.id ?? null
    }
    return existing
  }
  try {
    const legacy = localStorage.getItem(CONFIG_KEY)
    if (legacy) {
      const cfg = mergeConfig(JSON.parse(legacy))
      renameLegacyVolatileKeys('t1')
      const store = migrateLegacyToStore(cfg)
      saveTripStore(store)
      return store
    }
  } catch {}
  return { trips: [], activeTripId: null }
}

// Rückwärtskompatibel: Config des aktiven Trips (oder defaultConfig).
export function loadConfig() {
  const active = getActiveTrip(readStore())
  return active ? mergeConfig(active.config) : defaultConfig()
}

// Schreibt die Config in den aktiven Trip des Stores (legt Trip 't1' an, falls noch keiner aktiv).
export function saveConfig(cfg) {
  let store = readStore() || { trips: [], activeTripId: null }
  if (!store.activeTripId || !store.trips.some(t => t.id === store.activeTripId)) {
    const id = store.activeTripId || 't1'
    store = { trips: [...store.trips.filter(t => t.id !== id), { id, name: defaultTripName(), config: cfg }], activeTripId: id }
  } else {
    store = putActiveConfig(store, cfg)
  }
  saveTripStore(store)
}

// ── Onboarding-Tutorial (global, einmalig) ───────────────────────
// `ui_`-Prefix → global (nicht per-Trip) und vom volatilen Wipe/Trip-Reset NICHT erfasst.
// Das Tutorial soll nur beim allerersten "Create trip" erscheinen, auch nach Trip-Löschung.
const TUTORIAL_KEY = 'ui_tutorial_v1'
export function getTutorialSeen() {
  try { return localStorage.getItem(TUTORIAL_KEY) === 'true' } catch { return false }
}
export function setTutorialSeen(seen = true) {
  try {
    if (seen) localStorage.setItem(TUTORIAL_KEY, 'true')
    else localStorage.removeItem(TUTORIAL_KEY)
  } catch {}
}

// ── User-eigene Rezepte (globale Bibliothek, trip-übergreifend) ───
// `user_recipes_v1` = Array von Rezept-Objekten (gleiche Form wie data/recipes.js). Global,
// NICHT per-Trip-namespaced — einmal angelegt, in jedem Trip via Swap verwendbar.
const USER_RECIPES_KEY = 'user_recipes_v1'

export function getUserRecipes() {
  try {
    const raw = localStorage.getItem(USER_RECIPES_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter(r => r && r.id && r.name) : []
  } catch { return [] }
}

export function saveUserRecipes(list) {
  try { localStorage.setItem(USER_RECIPES_KEY, JSON.stringify(Array.isArray(list) ? list : [])) } catch {}
}

// Anlegen oder Aktualisieren (nach id). Gibt die neue Liste zurück.
export function upsertUserRecipe(recipe) {
  const list = getUserRecipes()
  const i = list.findIndex(r => r.id === recipe.id)
  const next = i >= 0 ? list.map(r => (r.id === recipe.id ? recipe : r)) : [...list, recipe]
  saveUserRecipes(next)
  return next
}

export function deleteUserRecipe(id) {
  const next = getUserRecipes().filter(r => r.id !== id)
  saveUserRecipes(next)
  return next
}
