// Plan- und Einkaufslisten-Generator (deterministische MVP-Variante).
// Architektur-Vorgabe 1 (CLAUDE.md): Logik gekapselt, Stufe 2 ersetzt sie ohne UI-Anpassung.
//
// Eingabe: {
//   days:       1..31,
//   people:     [{type, appetite}, …]   1..8 Personen mit individuellen Faktoren
//   diet:       'omnivore' | 'vegetarian' | 'vegan',
//   burners:    1 | 2 | 3,
//   fridgeSize: 'small' | 'medium' | 'large',
// }
// Ausgabe: { config, plan, shopping, warnings }
//
//   plan[i] = {
//     d:        Tagesnummer (1-basiert),
//     dt:       Anzeige-Label ("Day 1" – Generator kennt keine Kalenderdaten),
//     bamaga:   true für genau einen Tag in der Mitte (Mid-Trip-Resupply),
//     f / m / ab: { r: recipeId, t: name, k: kcal, d: diet }   (oder null, wenn Pool leer)
//   }
//
//   shopping = {
//     <supplyPointId>: [
//       { cat: 'Sektions-Label', items: [{ id, name, qty }] },
//       …
//     ],
//     …
//   }
//   Aktuelle Supply Points: 'cairns' (start, alles ausser Frisch-Nachschub) und
//   'bamaga' (mid, Frisch-Fleisch/Gemüse/Frucht für Tage *nach* Bamaga).
//
// Heuristiken (bewusst grob für MVP; Stufe 2 kann ein strukturiertes Zutaten-Datenmodell anbringen):
//  - Plan-Auswahl: pro Mahlzeitkategorie Rezept-Pool nach Kühlbedarf (high → low) sortieren,
//    dann Round-Robin pro Tag. Frisch-lastige Rezepte landen so früh im Trip.
//  - Mengen-Parsing: erste Zahl im "amt"-String + erste plausible Einheit. Range "3–4" → Mittelwert.
//    Marker "/person" oder "per person"  → ×Personen.
//    Marker "(for both)" / " for both"   → ×Personen/2 (alte 2-Personen-Konvention im Pool).
//  - Container-Hint: Bei numerischen Mengen ohne Einheit ("1 × 400g") Suche nach
//    Container-Wörtern ("can", "pack", "jar", "bottle", "tin", "loaf").
//  - Aggregation: pro Zutat (Name lowercase) Summe der Skalierungen, gruppiert nach Einheits-Klasse
//    (mass / volume / count / can / pack / …). g↔kg, ml↔L wechselt automatisch ab 1000.

import { RECIPES } from '../data/recipes.js'
import { recipeById } from './recipe-pool.js'
import { REGION } from '../data/regions.js'
import { PACK_SIZES } from '../data/packs.js'
import { groupFactor, groupDailyKcal } from './calories.js'
import { ALLERGENS, filterByAllergens } from './allergens.js'

// ── 1. Konstanten ──────────────────────────────────────────────

const DIETS = ['omnivore', 'vegetarian', 'vegan']
const DIET_RANK = { omnivore: 0, vegetarian: 1, vegan: 2 }
const COOLING_RANK = { none: 0, low: 1, medium: 2, high: 3 }
const FRIDGE_SIZES = ['small', 'medium', 'large']
const BURNERS = [1, 2, 3]

// Kochaufwand-Filter (User-Präferenz "Cooking effort" im Configurator). Rezepte tragen
// effort:'easy'|'medium'|'hard'. Der Config-Wert cookEffort ist eine OBERGRENZE (kumulativ):
//   'low'    → nur 'easy'
//   'medium' → 'easy' + 'medium'
//   'high'   → alles (= kein Filter, Default)
// Höhere Stufe = größerer Pool. So bleibt der Filter monoton und leert nie überraschend Kategorien.
const EFFORT_RANK = { easy: 0, medium: 1, hard: 2 }
const COOK_EFFORT_CEIL = { low: 0, medium: 1, high: 2 }
const COOK_EFFORT_LEVELS = ['low', 'medium', 'high']

// Passt das Rezept unter die gewählte Aufwands-Obergrenze? Unbekannter/fehlender cookEffort
// (z.B. alte Configs, Swap-Aufrufe) = keine Einschränkung → true.
export function effortAllowed(recipe, cookEffort) {
  const ceil = COOK_EFFORT_CEIL[cookEffort]
  if (ceil == null) return true
  return (EFFORT_RANK[recipe?.effort] ?? 0) <= ceil
}

// Frischfleisch-Detektion (NUR was wirklich verdirbt — canned tuna, jerky, salami zählen nicht).
const FRESH_MEAT_RX     = /\b(beef|chicken|lamb|bacon|sausages?|chorizo|pork|ham|turkey|duck|veal|bratwurst|prawns?|shrimp)\b/i
const SHELF_STABLE_RX   = /\b(jerky|biltong|salami|canned|tinned|in oil|in brine)\b/i
// Vegane / pflanzliche Fleisch-Imitate ("Vegan sausages", "Plant-based mince", "Plant bacon",
// "Vegan schnitzel") sind kein Frischfleisch im Sinne der Cluster-Logik — sie brauchen zwar
// Kühlung (über cooling:'high' im Rezept), würden aber einen Vegan-Pool-Slot blockieren wenn
// sie in den Meat-Cluster wandern. Sie bleiben deshalb im nonMeat-Pool.
const PLANT_BASED_RX    = /\b(vegan|plant-based|plant)\b/i
// Innerhalb Frischfleisch nach Haltbarkeit gestaffelt — bestimmt Cluster-Reihenfolge.
const SHORT_SHELF_RX    = /\b(chicken|turkey|duck|ground|mince|prawns?|shrimp|fish)\b/i
const MEDIUM_SHELF_RX   = /\b(sausages?|bratwurst|chorizo|kielbasa|frankfurter)\b/i
const SHELF_RANK        = { short: 0, medium: 1, long: 2 }

// Volumen-Modell für Fleisch-Cluster. Annahme: ~250g Fleisch + Verpackung/Luftraum
// = ~500 mL Stauvolumen, pro "Base-Person-Tag" (groupFactor 1.0). Skaliert linear
// mit groupFactor → Light-Esser bekommen mehr Cluster-Tage, Heavy weniger.
const FRIDGE_MEAT_VOLUME_ML = { small: 3000, medium: 6000, large: 12000 }
const MEAT_VOLUME_PER_BASE_PERSON_PER_DAY = 500
const MAX_MEAT_CLUSTER_DAYS = 6   // Food-safety-Cap (Steak/Bacon ~5–7 Tage in echter Kühlbox)
const MIN_MEAT_CLUSTER_DAYS = 1
const BREAKFAST_LUNCH_MEAT_PER_CLUSTER = 1  // pro Einkaufs-Cluster max 1 Fleisch-F + 1 Fleisch-Lunch

// Rezept-Diät >= Nutzer-Diät: Veganer akzeptiert nur vegane Rezepte;
// Vegetarier akzeptiert vegan + vegetarisch; Omnivore akzeptiert alle.
function recipeAllowedForDiet(recipe, userDiet) {
  return DIET_RANK[recipe.diet] >= DIET_RANK[userDiet]
}

// Bamaga zwischen Tag 2 und (days-1) — Start ist immer Cairns, Tag 1 ist nie Bamaga.
function clampBamagaDay(day, days) {
  return Math.max(2, Math.min(Math.max(2, days - 1), day | 0 || 2))
}

function isOptionalIngredient(name) {
  return /^\s*(?:optional|if using)\s*[:.\-–]/i.test(name)
}

// Enthält das Rezept Frischfleisch das im Kühlschrank verderben würde? Optional-Zutaten
// (z.B. "Optional: bacon" in Eierfrühstück) zählen nicht — der Nutzer kann sie weglassen.
// Ebenso werden shelf-stable Varianten (canned tuna, jerky, salami) ausgeklammert.
function containsFreshMeat(recipe) {
  return recipe.ing.some(([name]) => {
    if (isOptionalIngredient(name)) return false
    const lower = name.toLowerCase()
    if (SHELF_STABLE_RX.test(lower)) return false
    if (PLANT_BASED_RX.test(lower)) return false
    return FRESH_MEAT_RX.test(lower)
  })
}

// Haltbarkeitsklasse des Frischfleischs im Rezept. 'short' = Geflügel/Hack/Frischfisch,
// 'medium' = Wurst/Bratwurst, 'long' = Beef/Lamm/Pork/Bacon. Null wenn kein Frischfleisch.
function meatShelfLife(recipe) {
  if (!containsFreshMeat(recipe)) return null
  let best = 'long'
  for (const [name] of recipe.ing) {
    if (isOptionalIngredient(name)) continue
    const lower = name.toLowerCase()
    if (SHELF_STABLE_RX.test(lower)) continue
    if (PLANT_BASED_RX.test(lower)) continue
    if (!FRESH_MEAT_RX.test(lower)) continue
    if (SHORT_SHELF_RX.test(lower))  return 'short'   // kürzeste gewinnt sofort
    if (MEDIUM_SHELF_RX.test(lower)) best = 'medium'  // kann von 'short' überschrieben werden
  }
  return best
}

// Wieviele Tage Fleisch-Mahlzeiten am Stück passen in den Kühlschrank?
// Pro Tag verbraucht die Gruppe ~groupFactor × 500 mL Stauvolumen.
function meatClusterDays(fridge, groupF) {
  const capacity = FRIDGE_MEAT_VOLUME_ML[fridge] ?? FRIDGE_MEAT_VOLUME_ML.large
  const dailyDemand = Math.max(0.5, groupF) * MEAT_VOLUME_PER_BASE_PERSON_PER_DAY
  const days = Math.floor(capacity / dailyDemand)
  return Math.max(MIN_MEAT_CLUSTER_DAYS, Math.min(MAX_MEAT_CLUSTER_DAYS, days))
}

// ── 2. Plan-Generierung ────────────────────────────────────────

// Burner-Filter: Rezept passt wenn entweder (a) genug Burner für parallel cooking, ODER
// (b) Rezept ist sequenzierbar (kein `parallel:true`-Tag) — User kann die Komponenten
// nacheinander kochen und am Ende kurz nachwärmen.
//
// `parallel:true` ist nur bei Rezepten gesetzt die wirklich gleichzeitige Hitzequellen
// brauchen: Stir-Fries (Wok + Reis-Pot), Risotto (Mantecatura + Hot-Stock-Pot in parallel).
// Default = undefined/false = sequenzierbar. So wächst der 1-Burner-Pool drastisch ohne
// dass User in Rezepte landen die er physikalisch nicht kochen kann.
export function fitsBurnerSetup(recipe, userBurners) {
  const need = recipe.burners ?? 1
  if (need <= userBurners) return true
  return !recipe.parallel  // sequenzierbar wenn nicht parallel-only
}

// True wenn das Rezept eigentlich mehr Burner braucht aber sequenziell machbar ist.
// UI nutzt das für den „🕐 Cook in sequence"-Hint.
export function needsSequentialCooking(recipe, userBurners) {
  const need = recipe.burners ?? 1
  return need > userBurners && !recipe.parallel
}

// Liefert alle Rezepte einer Kategorie, die zu Diät/Burners/Allergenen passen.
// Wird vom Swap-Sheet im MenuTab benutzt: User wählt Ersatz-Rezept aus dem Gesamt-Pool,
// gefiltert nach den gleichen Constraints, die der Generator anwendet.
export function compatibleRecipesForCat(cat, { diet, burners, allergens, includeMeat = true } = {}) {
  const dt = DIETS.includes(diet) ? diet : 'omnivore'
  const bn = BURNERS.includes(Number(burners)) ? Number(burners) : 2
  const al = Array.isArray(allergens) ? allergens.filter(a => ALLERGENS.includes(a)) : []
  return RECIPES.filter(r =>
    r.cat === cat &&
    recipeAllowedForDiet(r, dt) &&
    fitsBurnerSetup(r, bn) &&
    filterByAllergens(r, al).keep &&
    (includeMeat || !containsFreshMeat(r))
  )
}

// Coverage-Pool für die Diät-/Burner-Fallback-Checks: nur Vorhandensein pro Kategorie.
// Nutzt denselben Allergen-Filter wie der Plan-Pool (sonst meldet die Coverage-Prüfung
// "vegetarian ok" obwohl alle vegetarischen Rezepte z.B. Gluten enthalten).
function buildRecipePool({ diet, burners, allergens, cookEffort }) {
  const pool = { f: [], m: [], a: [] }
  for (const r of RECIPES) {
    if (r.occasion === 'special') continue  // Specials laufen über separate Layer (s.u.)
    if (!recipeAllowedForDiet(r, diet)) continue
    if (!fitsBurnerSetup(r, burners)) continue
    if (!effortAllowed(r, cookEffort)) continue
    if (!filterByAllergens(r, allergens).keep) continue
    if (pool[r.cat]) pool[r.cat].push(r)
  }
  return pool
}

// Plan-Pool ist nach meat / nonMeat gesplittet. Beide bleiben pro Kategorie sortiert:
// nonMeat nach Cooling (hoch zuerst, frisches Gemüse früh aufbrauchen), meat nach
// Shelf-Life (short zuerst, da im Cluster dem Einkauf am nächsten zugewiesen).
//
// Allergen-Logik: Rezepte mit 'core'-Allergen-Hit kommen gar nicht in den Pool.
// Rezepte mit 'topping'-Allergen-Hit (z.B. Nüsse als Topping) kommen rein, werden
// aber ans Ende der Sortierung gestellt — Round-Robin pickt sie nur dann, wenn
// der "saubere" Strict-Pool für die Trip-Länge nicht reicht (= würde sonst stark
// wiederholen). Pro Mahlzeit wird `_toppingAllergens` als Marker mitgegeben,
// damit MealEntry/UI später den Warn-Banner anzeigen kann.
function buildSplitPool({ diet, burners, allergens, cookEffort }) {
  const meat    = { f: [], m: [], a: [] }
  const nonMeat = { f: [], m: [], a: [] }
  for (const r of RECIPES) {
    // Specials laufen über separate Drosselungs-Layer (computeSpecialAssignments).
    // Würden sie hier mit-gepickt, kämen sie alle paar Tage statt 1-3× pro Trip.
    if (r.occasion === 'special') continue
    if (!recipeAllowedForDiet(r, diet)) continue
    if ((r.burners ?? 1) > burners) continue
    if (!effortAllowed(r, cookEffort)) continue
    const filt = filterByAllergens(r, allergens)
    if (!filt.keep) continue
    // Tag das Rezept mit toppingAllergens-Liste (leer wenn clean). Shallow-Copy reicht
    // — Round-Robin reicht nur die Referenz weiter, mealEntry liest das Property aus.
    const tagged = filt.toppingAllergens.length
      ? { ...r, _toppingAllergens: filt.toppingAllergens }
      : r
    const target = containsFreshMeat(r) ? meat : nonMeat
    if (target[r.cat]) target[r.cat].push(tagged)
  }
  const isToppingFlagged = r => (r._toppingAllergens?.length ?? 0) > 0
  for (const cat of ['f', 'm', 'a']) {
    nonMeat[cat].sort((a, b) =>
      // Strict-Rezepte (kein Topping-Allergen) zuerst → werden bei kurzem Pool/Round-Robin
      // immer vor den Topping-Allergen-Rezepten gepickt.
      (isToppingFlagged(a) - isToppingFlagged(b)) ||
      (COOLING_RANK[b.cooling] - COOLING_RANK[a.cooling]) ||
      a.id.localeCompare(b.id)
    )
    meat[cat].sort((a, b) =>
      (isToppingFlagged(a) - isToppingFlagged(b)) ||
      (SHELF_RANK[meatShelfLife(a)] - SHELF_RANK[meatShelfLife(b)]) ||
      a.id.localeCompare(b.id)
    )
  }
  return { meat, nonMeat }
}

function mealEntry(recipe, userBurners) {
  if (!recipe) return null
  const out = { r: recipe.id, t: recipe.name, k: recipe.kcal, d: recipe.diet }
  if (recipe._toppingAllergens?.length) out.ta = recipe._toppingAllergens
  if (userBurners != null && needsSequentialCooking(recipe, userBurners)) out.seq = true
  return out
}

// Liefert Map dayNumber → clusterIndex (0-basiert: 0 = Tag direkt nach Einkauf).
// Cairns-Cluster startet an Tag 1, Bamaga-Cluster startet am Bamaga-Tag.
function meatDayIndex({ days, bamagaActiveDay, clusterDays }) {
  const map = new Map()
  for (let i = 0; i < clusterDays; i++) {
    const d = i + 1
    if (d > days) break
    if (bamagaActiveDay != null && d >= bamagaActiveDay) break  // Bamaga-Cluster übernimmt
    map.set(d, i)
  }
  if (bamagaActiveDay != null) {
    for (let i = 0; i < clusterDays; i++) {
      const d = bamagaActiveDay + i
      if (d > days) break
      map.set(d, i)
    }
  }
  return map
}

// Bevorzugte Shelf-Life-Reihenfolge je nach Cluster-Position (idx 0 = Einkaufstag).
// Geflügel/Hack zuerst, Steak/Bacon zuletzt — damit Frischfleisch früh konsumiert wird.
function shelfPreference(clusterIdx) {
  if (clusterIdx <= 1) return ['short', 'medium', 'long']
  if (clusterIdx === 2) return ['medium', 'short', 'long']
  if (clusterIdx === 3) return ['medium', 'long', 'short']
  return ['long', 'medium', 'short']
}

// Restaurant-Mahlzeit als Stand-in für einen ausgelassenen Slot (Generator erzeugt keine
// Zutaten, MealRow rendert "🍽 Restaurant"). Default-Label generisch — User wollte
// keine spezifischen Restaurants pflegen.
const REST_MEAL_LABEL = 'Restaurant'
function restaurantEntry() {
  return { rest: true, rname: REST_MEAL_LABEL }
}

// Override-Lookup: liefert das vom User explizit gewählte Rezept (oder null).
// Override gilt unbedingt — Diät-/Allergen-/Burner-Filter werden bewusst ignoriert,
// weil der User die Wahl treffen darf. Burner-Hinweis kommt im UI über das Rezept-Detail.
function getOverride(overrides, day, slot) {
  const id = overrides?.[day]?.[slot]
  if (!id) return null
  return recipeById(id)
}

// Wieviele Special-Dinner-Slots bekommt der Trip? Skaliert mit Trip-Länge — Specials sind
// "Treat-yourself"-Tage, sollen sich rar anfühlen statt zur Normalität zu werden.
export function specialQuotaForDays(days) {
  const d = Number(days) | 0
  if (d < 5)  return 0
  if (d < 13) return 1
  if (d < 22) return 2
  return 3
}

// Schätzt die tatsächliche Anzahl Specials für einen Trip — UI-tauglich, BEVOR
// `generate()` aufgerufen wird (Configurator-Preview-Hint).
// Die Quota wird durch die Cluster-Anzahl gecappt (max 1 Special pro Cluster).
//   - Ohne Bamaga-Stop: 1 Cluster, also max 1 Special unabhängig von Trip-Länge.
//   - Mit Bamaga-Stop:  2 Cluster, also max 2 Specials.
// Wenn diet/burners/allergens übergeben werden, prüft die Funktion zusätzlich ob der
// Pool tatsächlich passende Specials enthält — sonst zeigt der Hint „2 specials" obwohl
// der Generator 0 produziert (z.B. 2-burner omnivore vor a42 → kein passendes Special).
export function estimateSpecialCount({ days, bamagaStop, diet, burners, allergens, cookEffort }) {
  const quota = specialQuotaForDays(days)
  if (quota === 0) return 0
  const clusters = bamagaStop ? 2 : 1
  const capped = Math.min(quota, clusters)
  if (capped === 0) return 0
  // Optional: Pool-Verfügbarkeit prüfen. Nur wenn Caller die Filter übergibt — sonst
  // bleibt die legacy-Semantik (theoretisches Maximum) für bestehende Tests erhalten.
  if (diet != null || burners != null || allergens != null || cookEffort != null) {
    const b = burners ?? 3
    const a = allergens ?? []
    const hasMatch = RECIPES.some(r =>
      r.occasion === 'special' &&
      r.cat === 'a' &&
      (diet == null || recipeAllowedForDiet(r, diet)) &&
      fitsBurnerSetup(r, b) &&
      effortAllowed(r, cookEffort) &&
      filterByAllergens(r, a).keep
    )
    if (!hasMatch) return 0
  }
  return capped
}

// Verteilt Special-Dinners auf Cluster-Mitten. Pro Cluster max 1 Special. Pickup-Tag (1)
// und Dropoff-Tag (days) werden ausgeschlossen — keine Slots dort.
// Wenn Special Frischfleisch enthält und Cluster-Mitte nicht in meatAllowedDays liegt,
// suchen wir den nächsten meat-erlaubten Tag im selben Cluster.
// Liefert Map<dayNumber, recipeObject>.
function computeSpecialAssignments({ days, diet, burners, allergens, cookEffort, bamagaActiveDay, meatAllowedDaysSet }) {
  const quota = specialQuotaForDays(days)
  if (quota === 0) return new Map()

  // Pool: alle Specials die zu Diät/Burner/Allergens/Aufwand passen. Bei "wenig" Kochaufwand
  // fallen die aufwändigen Special-Dinner (medium/hard) raus → nur einfache Abende bleiben.
  const pool = RECIPES.filter(r =>
    r.occasion === 'special' &&
    r.cat === 'a' &&
    recipeAllowedForDiet(r, diet) &&
    fitsBurnerSetup(r, burners) &&
    effortAllowed(r, cookEffort) &&
    filterByAllergens(r, allergens).keep
  )
  if (!pool.length) return new Map()

  // Cluster definieren. Mit Bamaga-Stop: zwei Cluster (Cairns + Bamaga). Sonst: einer.
  const clusters = []
  if (bamagaActiveDay != null) {
    clusters.push({ start: 1,                end: bamagaActiveDay - 1 })
    clusters.push({ start: bamagaActiveDay,  end: days })
  } else {
    clusters.push({ start: 1, end: days })
  }

  const result = new Map()
  let poolIdx = 0
  for (const cluster of clusters) {
    if (result.size >= quota) break
    if (cluster.end < cluster.start) continue
    // Tag-Kandidaten im Cluster: alles außer Pickup (1) und Dropoff (days)
    const candidateDays = []
    for (let d = cluster.start; d <= cluster.end; d++) {
      if (d === 1 || d === days) continue
      candidateDays.push(d)
    }
    if (!candidateDays.length) continue
    const mid = candidateDays[Math.floor(candidateDays.length / 2)]

    const recipe = pool[poolIdx % pool.length]
    poolIdx++

    // Wenn das Special Frischfleisch hat und der Mid-Tag kein meat-Tag ist, suchen wir
    // einen meat-erlaubten Tag im Cluster (so nah wie möglich zur Mitte).
    let targetDay = mid
    if (containsFreshMeat(recipe) && !meatAllowedDaysSet.has(mid)) {
      const meatInCluster = candidateDays.filter(d => meatAllowedDaysSet.has(d))
      if (!meatInCluster.length) continue  // kein passender Tag — Special skip
      // Tag wählen der am nächsten zur Mitte liegt
      meatInCluster.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))
      targetDay = meatInCluster[0]
    }
    result.set(targetDay, recipe)
  }
  return result
}

// ── Waste-Optimierung (Stufe 2, nach Eigen-Trip) ───────────────
// Pack-bewusste Menü-Auswahl: bevorzugt Rezepte, die bereits geöffnete Grund-Packungen
// aufbrauchen, statt für jedes Gericht eine neue Groß-Packung anzubrechen (AU-Supermärkte
// verkaufen nur große Packs → sonst Foodwaste). Greedy-Heuristik, die als SEKUNDÄRE Sortierung
// innerhalb der bereits gefilterten Kandidaten läuft — Fleisch-Cluster/Special/Override bleiben
// primär. Deterministisch (Tie-Break über den bestehenden Round-Robin-Zähler).
const WASTE = {
  shareStaple: 3,   // Reuse einer schon geöffneten Trocken-Grundzutat (Reis/Pasta/…)
  newStaple:   2,   // Strafe fürs Anbrechen einer NEUEN, bisher ungenutzten Grundzutat
  perish:      5,   // Verbrauch einer offenen verderblichen Zutat im Haltbarkeitsfenster
  repeatCap:   1,   // wie oft ein Rezept höchstens wiederholt werden darf
  spoilWindow: 3,   // Tage, die eine geöffnete verderbliche Zutat als "nutzbar" gilt
}


// Menge der PACK_SIZES-Keys in den einzukaufenden Zutaten eines Rezepts (memoisiert pro Rezept).
const _packKeyCache = new Map()
function recipePackKeys(recipe) {
  let set = _packKeyCache.get(recipe.id)
  if (set) return set
  set = new Set()
  for (const [name] of recipe.ing) {
    if (!isShoppableIngredient(name)) continue
    const { key } = canonicalIngredient(name)
    if (PACK_SIZES[key]) set.add(key)
  }
  _packKeyCache.set(recipe.id, set)
  return set
}

// Leftover-Planung: manche Rezepte kochen wir bewusst als Großansatz und der Folgetag isst die
// Reste (kein Kochen, kein zusätzlicher Einkauf). LEFTOVER_BATCH = Skalierung des Quell-Dinners
// (deckt Dinner + Rest-Lunch), MIN_GAP = Mindestabstand zwischen Leftover-Tagen.
const LEFTOVER_BATCH = 1.6
const LEFTOVER_MIN_GAP = 3

function generatePlan({ days, diet, burners, bamagaActiveDay, fridge, groupF, allergens, cookEffort, restaurantSlots, overrides, mealStatus, specialAssignments }) {
  const { meat, nonMeat } = buildSplitPool({ diet, burners, allergens, cookEffort })
  const clusterDays = meatClusterDays(fridge, groupF)
  const meatMap = meatDayIndex({ days, bamagaActiveDay, clusterDays })
  const cairnsClusterStart = 1
  const clusterStartFor = d => (bamagaActiveDay != null && d >= bamagaActiveDay) ? bamagaActiveDay : cairnsClusterStart

  // Round-Robin-Counter: pro Kategorie für nonMeat, pro Kategorie+Tier für meat.
  const nonMeatIdx = { f: 0, m: 0, a: 0 }
  const meatTierIdx = {}  // key: "cat:tier" → counter
  // Frühstücks-/Lunch-Quote pro Cluster (clusterStart-Tag → Anzahl bereits vergeben).
  const fLunchUsed = { f: new Map(), m: new Map() }
  // Letzter Pick pro Slot (für Anti-Wiederholungs-Logik). Verhindert "a4 an Tag 5
  // UND Tag 6", wenn shelfPreference an benachbarten Cluster-Tagen denselben
  // Tier mit nur 1 Rezept ansteuert (oder nonMeat-RR auf einen Single-Item-Pool trifft).
  // Pool-Size-bedingte Wiederholungen über mehrere Tage hinweg bleiben — das ist
  // normaler Pool-Engpass, nicht das Konsekutiv-Problem.
  const lastPick = { f: null, m: null, a: null }

  // Waste-State (pro generatePlan-Aufruf, damit Determinismus erhalten bleibt):
  const usedStaples = new Set()      // schon geöffnete Trocken-Grundzutaten (packKey)
  const openedPerishDay = new Map()  // packKey → Tag des ersten Öffnens
  const cookCount = new Map()        // recipeId → wie oft schon gekocht
  let curDay = 0                     // aktueller Tag (für Score/Spoil-Fenster)

  // Leftover-Pairing: Quell-Dinner an Tag D → Rest-Lunch an Tag D+1.
  const leftoverTarget = Math.floor(days / 5)   // ~1 Leftover-Paar pro 5 Tage
  const pendingLeftoverLunch = new Map()        // Tag → { from, fromDay }
  let leftoverCount = 0
  let lastLeftoverDay = -LEFTOVER_MIN_GAP
  const lunchSlotTaken = (day) =>               // ist Tag-Lunch schon anderweitig belegt?
    restaurantSlots?.[day]?.m === true || !!overrides?.[day]?.m || !!mealStatus?.[day]?.m

  function finishesPerishable(recipe) {
    for (const k of recipePackKeys(recipe)) {
      const info = PACK_SIZES[k]
      if (info?.perishableOpen && openedPerishDay.has(k) && curDay - openedPerishDay.get(k) <= WASTE.spoilWindow) return true
    }
    return false
  }

  function wasteScore(recipe) {
    let s = 0
    for (const k of recipePackKeys(recipe)) {
      const info = PACK_SIZES[k]
      if (!info) continue
      if (info.mainStaple) s += usedStaples.has(k) ? WASTE.shareStaple : -WASTE.newStaple
      if (info.perishableOpen && openedPerishDay.has(k) && curDay - openedPerishDay.get(k) <= WASTE.spoilWindow) s += WASTE.perish
    }
    if ((cookCount.get(recipe.id) || 0) > 0) s -= 0.5  // bei Gleichstand neue Rezepte bevorzugen
    return s
  }

  // Wählt aus `arr` das Rezept mit dem besten Waste-Score. Tie-Break über den Round-Robin-Zähler
  // (Rotation + Determinismus). Wiederholungen nur erlaubt, wenn das Rezept eine offene
  // verderbliche Packung aufbraucht und die Wiederhol-Grenze nicht erreicht ist; sonst werden
  // bereits gekochte Rezepte herausgefiltert. Vortags-Pick (avoidId) wird gemieden.
  function chooseWaste(arr, idxRef, key, avoidId) {
    if (!arr.length) return null
    const eligible = arr.filter(r => r.id !== avoidId && (
      (cookCount.get(r.id) || 0) === 0 ||
      ((cookCount.get(r.id) || 0) < WASTE.repeatCap && finishesPerishable(r))
    ))
    let pool = eligible
    if (!pool.length) pool = arr.filter(r => r.id !== avoidId)  // Pool erschöpft → Wiederholung nötig
    if (!pool.length) pool = arr                                // nur 1 Rezept → unvermeidbar
    const start = idxRef[key] || 0
    let best = null, bestScore = -Infinity, bestOrd = 0
    for (let j = 0; j < pool.length; j++) {
      const r = pool[(start + j) % pool.length]
      const sc = wasteScore(r)
      if (sc > bestScore) { bestScore = sc; best = r; bestOrd = j }
    }
    idxRef[key] = start + bestOrd + 1
    return best
  }

  // Aktualisiert den Waste-State nach jeder Mahlzeit (egal ob Score-Pick, Special, Override,
  // Round-Robin), damit spätere Tage die geöffneten Packungen kennen.
  function noteCooked(recipe) {
    if (!recipe) return
    cookCount.set(recipe.id, (cookCount.get(recipe.id) || 0) + 1)
    for (const k of recipePackKeys(recipe)) {
      const info = PACK_SIZES[k]
      if (info?.mainStaple) usedStaples.add(k)
      if (info?.perishableOpen && !openedPerishDay.has(k)) openedPerishDay.set(k, curDay)
    }
  }

  function pickMeat(cat, clusterIdx) {
    const pool = meat[cat]
    if (!pool.length) return null
    const buckets = { short: [], medium: [], long: [] }
    for (const r of pool) buckets[meatShelfLife(r)].push(r)
    const tiers = shelfPreference(clusterIdx)
    const avoid = lastPick[cat]
    // Tier nach Shelf-Life-Präferenz wählen (bleibt primär). Innerhalb des Tiers entscheidet der
    // Waste-Score (Pack-Fill, sekundär). Kollidiert ein Tier komplett mit dem Vortag, nächsten
    // Tier versuchen; sonst Fallback auf den ersten Tier (Wiederholung unvermeidbar).
    let fallback = null
    for (const tier of tiers) {
      if (!buckets[tier].length) continue
      const pick = chooseWaste(buckets[tier], meatTierIdx, `${cat}:${tier}`, avoid)
      if (fallback == null) fallback = pick
      if (pick && pick.id !== avoid) return pick
    }
    return fallback
  }

  function pickNonMeat(cat) {
    return chooseWaste(nonMeat[cat], nonMeatIdx, cat, lastPick[cat])
  }

  function tryAllocateBreakfastLunchMeat(cat, day, clusterIdx) {
    // Quote pro Cluster: max 1 Fleisch-Frühstück + 1 Fleisch-Lunch je Einkauf.
    // Wir setzen sie an den frühesten verfügbaren Cluster-Tag (idx 0 für f, idx ≤ 1 für m).
    if (!meat[cat].length) return null
    const allowedIdx = cat === 'f' ? 0 : 1
    if (clusterIdx > allowedIdx) return null
    const cStart = clusterStartFor(day)
    const used = fLunchUsed[cat].get(cStart) || 0
    if (used >= BREAKFAST_LUNCH_MEAT_PER_CLUSTER) return null
    const pick = pickMeat(cat, clusterIdx)
    if (!pick) return null
    fLunchUsed[cat].set(cStart, used + 1)
    return pick
  }

  const out = []
  for (let i = 0; i < days; i++) {
    const d = i + 1
    curDay = d
    const inMeatCluster = meatMap.has(d)
    const clusterIdx = meatMap.get(d)
    const restF  = restaurantSlots?.[d]?.f === true
    const restM  = restaurantSlots?.[d]?.m === true
    const restAB = restaurantSlots?.[d]?.ab === true

    // Vehicle-Pickup/Dropoff-Logistik: 4WD-Mietfahrzeuge in Cairns werden meist erst ab
    // ~10:00 abgeholt und müssen bis ~17:00 zurück sein. Tag 1 fällt das Frühstück weg,
    // letzter Tag fällt das Abendessen weg. Diese Slots ziehen weder aus dem Rezept-Pool
    // noch aus der Einkaufsliste — Overrides und Restaurant-Slots werden hier ignoriert,
    // weil man physisch nicht im Auto ist.
    const isPickupDay = d === 1
    const isDropoffDay = d === days

    // Slot-Reihenfolge pro Tag: Skip > Restaurant > User-Override > Special > regulärer Pick.
    // Restaurant-Slots ziehen weder aus dem Pool noch aus der Einkaufsliste.
    // User-Override (manuelle Wahl im SwapSheet) gewinnt vor allem.
    // Special (Generator-zugewiesen, 0-3 pro Trip) überschreibt nur die Round-Robin-Wahl.

    // Dinner
    let dinnerEntry
    if (isDropoffDay) {
      dinnerEntry = { skip: true, kind: 'dropoff' }
    } else if (restAB) {
      dinnerEntry = restaurantEntry()
    } else {
      const ovr = getOverride(overrides, d, 'ab')
      const special = ovr ? null : specialAssignments?.get(d)
      let dinner = ovr || special
      if (!dinner && inMeatCluster) dinner = pickMeat('a', clusterIdx)
      if (!dinner) dinner = pickNonMeat('a')
      if (!dinner) dinner = pickMeat('a', clusterIdx ?? 0)
      dinnerEntry = mealEntry(dinner, burners)
      if (ovr && dinnerEntry) dinnerEntry.ovr = true
      else if (special && dinnerEntry) dinnerEntry.spec = true  // UI-Marker (optional zukünftig)
    }

    // Leftover-Pairing: ist dieses Dinner ein regulärer Großansatz-Kandidat (leftovers-Tag,
    // kein Override/Special/Restaurant) und der morgige Lunch frei? → morgen Reste, heute doppelt.
    if (
      dinnerEntry?.r && !dinnerEntry.ovr && !dinnerEntry.spec &&
      recipeById(dinnerEntry.r)?.leftovers === true &&
      leftoverCount < leftoverTarget &&
      d - lastLeftoverDay >= LEFTOVER_MIN_GAP &&
      d + 1 <= days && !lunchSlotTaken(d + 1)
    ) {
      dinnerEntry.batch = LEFTOVER_BATCH
      pendingLeftoverLunch.set(d + 1, { from: dinnerEntry.r, fromDay: d })
      leftoverCount++
      lastLeftoverDay = d
    }

    // Frühstück
    let breakfastEntry
    if (isPickupDay) {
      breakfastEntry = { skip: true, kind: 'pickup' }
    } else if (restF) {
      breakfastEntry = restaurantEntry()
    } else {
      const ovr = getOverride(overrides, d, 'f')
      let breakfast = ovr
      if (!breakfast && inMeatCluster) breakfast = tryAllocateBreakfastLunchMeat('f', d, clusterIdx)
      if (!breakfast) breakfast = pickNonMeat('f')
      if (!breakfast) breakfast = pickMeat('f', clusterIdx ?? 0)
      breakfastEntry = mealEntry(breakfast, burners)
      if (ovr && breakfastEntry) breakfastEntry.ovr = true
    }

    // Lunch
    let lunchEntry
    const leftoverInfo = pendingLeftoverLunch.get(d)
    if (leftoverInfo && !restM && !getOverride(overrides, d, 'm')) {
      // Reste vom Vortags-Dinner: kein Kochen, kein Einkauf (in generateShopping übersprungen).
      lunchEntry = { leftover: true, from: leftoverInfo.from, fromDay: leftoverInfo.fromDay, t: `Leftovers from Day ${leftoverInfo.fromDay}` }
    } else if (restM) {
      lunchEntry = restaurantEntry()
    } else {
      const ovr = getOverride(overrides, d, 'm')
      let lunch = ovr
      if (!lunch && inMeatCluster) lunch = tryAllocateBreakfastLunchMeat('m', d, clusterIdx)
      if (!lunch) lunch = pickNonMeat('m')
      if (!lunch) lunch = pickMeat('m', clusterIdx ?? 0)
      lunchEntry = mealEntry(lunch, burners)
      if (ovr && lunchEntry) lunchEntry.ovr = true
    }

    // Reaktiver Ist-Status pro Mahlzeit (vom User im Trip getappt). Werte:
    //   'cooked'        → wie geplant gekocht (alle Zutaten) — nur ein Bestätigungs-Häkchen
    //   { used:[idx…] } → Abweichung: NUR diese Rezept-Zutaten-Indizes wurden verwendet
    //                     (leeres Array = gar nicht gekocht). Steuert generateShopping.
    // Fehlt der Eintrag → wie geplant (Default). generatePlan hängt es ans jeweilige Meal.
    const applyStatus = (entry, val) => {
      if (!entry || entry.skip || entry.rest || entry.leftover || !entry.r || val == null) return
      if (val === 'cooked') entry.reviewed = 'cooked'
      else if (Array.isArray(val.used)) { entry.deviation = true; entry.usedIng = val.used }
    }
    const st = mealStatus?.[d]
    if (st) {
      applyStatus(breakfastEntry, st.f)
      applyStatus(lunchEntry, st.m)
      applyStatus(dinnerEntry, st.ab)
    }

    out.push({
      d,
      dt: `Day ${d}`,
      bamaga: bamagaActiveDay != null && d === bamagaActiveDay,
      f:  breakfastEntry,
      m:  lunchEntry,
      ab: dinnerEntry,
    })
    // Anti-Wiederholungs-Tracking: speichert die Recipe-IDs des heutigen Tages,
    // damit pickMeat/pickNonMeat morgen denselben Slot meiden. Restaurant-Slots
    // setzen lastPick auf null → der nächste Tag hat freie Wahl.
    lastPick.f = breakfastEntry?.r ?? null
    lastPick.m = lunchEntry?.r ?? null
    lastPick.a = dinnerEntry?.r ?? null

    // Waste-State nach dem Tag fortschreiben — für jede tatsächlich gekochte Mahlzeit (auch
    // Specials/Overrides), damit Folgetage die geöffneten Grund-/Verderb-Packungen kennen.
    // Als "gar nicht gekocht" markierte Slots (deviation ohne verwendete Zutaten) überspringen.
    const cookedRecipe = e => (e && e.deviation && (!e.usedIng || e.usedIng.length === 0))
      ? null : recipeById(e?.r)
    noteCooked(cookedRecipe(breakfastEntry))
    noteCooked(cookedRecipe(lunchEntry))
    noteCooked(cookedRecipe(dinnerEntry))
  }
  return out
}

// ── 3. Zutaten-Parsing ─────────────────────────────────────────

const UNIT_RX = /\b(g|kg|ml|l|tsp|tbsp|cups?|cloves?|cans?|packs?|packets?|bunch(?:es)?|pinch|squares?|slices?|fillets?|servings?|bottles?|jars?|tins?|loaves|loaf|head|rolls?|dozen)\b/i
const CONTAINER_RX = /\b(cans?|packs?|packets?|bottles?|jars?|tins?|loaves|loaf|tubes?)\b/i
const NUM_RX = /(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?/

function singularUnit(unit) {
  if (!unit) return null
  const u = unit.toLowerCase()
  // simpler Singular-Mapper
  if (u === 'loaves') return 'loaf'
  if (u === 'cloves') return 'clove'
  if (u === 'bunches') return 'bunch'
  return u.replace(/s$/, '')
}

export function parseAmount(amtStr) {
  const raw = String(amtStr || '').trim()
  const lower = raw.toLowerCase()

  const perPerson = /\bper person\b|\/person\b/.test(lower)
  const forTwo    = /\bfor both\b/.test(lower)

  const numMatch = raw.match(NUM_RX)
  if (!numMatch) {
    return { qty: null, unit: null, perPerson, forTwo, raw }
  }
  const a = Number(numMatch[1])
  const b = numMatch[2] != null ? Number(numMatch[2]) : null
  const qty = b != null ? (a + b) / 2 : a

  // Suche Einheit nach der Zahl. Bei Container-Rezepturen wie "1 × 400g can"
  // priorisiert der Container-Match das innere "400g" überschreiben.
  const afterNum = raw.slice(numMatch.index + numMatch[0].length)
  const containerMatch = afterNum.match(CONTAINER_RX)
  const unitMatch = afterNum.match(UNIT_RX)
  const rawUnit = containerMatch?.[1] || unitMatch?.[1] || null

  // Container-Anzahl-Schutz: Steht ein Container-Wort im String, ist die MENGE die Anzahl der
  // Dosen/Gläser — nicht die Grammzahl. Wenn die gematchte Zahl aber direkt eine Masse/Volumen-
  // Einheit ist (z.B. "185g can" → 185 wäre fälschlich die Anzahl), ist sie die GRÖSSE. Die echte
  // Anzahl kommt dann aus einem "N ×"-Multiplikator (z.B. "2 × 185g cans") oder ist 1.
  // Ohne diesen Schutz meldete die Einkaufsliste "376 cans Tuna" statt "~4 cans".
  if (containerMatch) {
    const numIsSize = /^\s*(?:g|kg|ml|l)\b/i.test(afterNum)
    if (numIsSize) {
      const multMatch = raw.match(/(\d+(?:\.\d+)?)\s*[×x*]\s*\d/)
      const count = multMatch ? Number(multMatch[1]) : 1
      return { qty: count, unit: singularUnit(containerMatch[1]), perPerson, forTwo, raw }
    }
  }

  return { qty, unit: singularUnit(rawUnit), perPerson, forTwo, raw }
}

// ── 4. Mengen-Aggregation ──────────────────────────────────────

// Basis-Portionen des eingebauten Pools. Die 97 Rezepte wurden für den 2-Personen-Eigen-Trip
// geschrieben: eine unmarkierte Menge ("1 × 400ml can", "3 cloves", "1 large") meint IMMER
// "für 2 Personen". Der "(for both)"-Marker sagt dasselbe explizit — er steht nur auf 45 von
// 448 unmarkierten Zeilen, deshalb ist die Basis der Default und nicht der Marker.
export const BASE_SERVINGS = 2

// Zutaten, die NICHT linear mit der Gruppengröße wachsen:
//  - Trockengewürze (das Ultra-Minimal-Kit): Aroma sättigt. Doppelte Menge = doppelt so scharf,
//    nicht doppelt so gut.
//  - Aromaten (Knoblauch, Ingwer, frischer Chili): dieselbe Sättigung. Sie werden mitgekocht und
//    nicht als Gemüse gegessen. Entwickler-Report: "für 7 Personen würde ich nicht 11 Knoblauch-
//    zehen in Fajitas machen" — linear wären es genau die 11 gewesen.
//  - Bratfett: skaliert mit der Pfannenfläche, nicht mit den Portionen — 2 tbsp fetten dieselbe
//    Pfanne ein, egal ob 2 oder 4 Portionen darin landen.
//
// NICHT hier drin, obwohl naheliegend:
//  - Zwiebeln / Frühlingszwiebeln: in vielen Rezepten Gemüse-BESTANDTEIL, nicht nur Aroma-Basis
//    (a46 Fajitas: "0.5/person, sliced" — die isst man). Dämpfen würde dort zu wenig liefern.
//  - Sojasauce, Mayo, Senf, Tomatenmark: liegen in derselben Kategorie "🫙 Spices, oils & sauces"
//    und tragen dieselbe Einheit (tbsp) wie das Öl, skalieren aber sehr wohl linear.
// Deshalb eine enge, namentliche Liste statt einer Kategorie- oder Einheiten-Regel.
//
// Kalibrierung deckt sich mit der Kochliteratur (Escoffier; gängige Scaling-Faustregeln):
// beim Verdoppeln ~1.5× Gewürz statt 2× → dampen(2) = 1.5 ✓; "1 TL Salz für 2 Portionen braucht
// bei 8 Portionen 2.5–3, nicht 4" → dampen(4) = 2.5 ✓; Knoblauch ~75% der linearen Menge.
// (Rezeptportale wie Swissmilk skalieren strikt linear — aber nur über ±1 Portion um die Basis,
// also max. 1.25×. Dort ist linear unproblematisch; diese App geht von Basis 2 auf bis zu 8.)
//
// Die Liste geht bewusst ÜBER das aktuelle Ultra-Minimal-Kit (ae) hinaus: sie deckt auch Gewürze
// ab, die der Pool derzeit NICHT führt (Turmeric, Garam masala, Zimt, Cayenne …). Sonst rutschte
// genau der gemeldete Bug-Typ zurück, sobald jemand ein Rezept mit so einem Gewürz ergänzt — die
// Dämpfung muss VORWÄRTS robust sein, nicht nur den Ist-Pool abdecken.
// "ground …"/"dried …"-Präfixe fangen die üblichen Schreibvarianten ("Ground cumin", "Dried
// oregano"); FRISCHE Blätter (bloßes "Basil", "Oregano", "Coriander leaves") bleiben bewusst
// draußen und skalieren linear — die werden gegessen/als Garnitur genutzt, nicht als Streuwürze.
const DAMPED_RX = new RegExp(
  '^(?:' +
    // Trockengewürze — Kit (ae) + plausible Erweiterungen
    'salt|black pepper|white pepper|salt & pepper|cumin|smoked paprika|paprika|' +
    'chili flakes|chilli flakes|chili powder|chilli powder|curry powder|curry paste|' +
    'mixed dried herbs|mixed herbs|turmeric|garam masala|cayenne|cinnamon|nutmeg|' +
    'cardamom|allspice|' +
    'ground (?:cumin|coriander|ginger|turmeric|cinnamon|paprika)|' +
    'dried (?:herbs|oregano|thyme|basil|rosemary|sage|mint|coriander|parsley|mixed herbs)|' +
    // Bratfett
    'olive oil|vegetable oil|coconut oil|canola oil|sunflower oil|oil|' +
    // Aromaten (mitgekocht, nicht als Gemüse gegessen)
    'garlic|ginger|red chili|green chili|chili pepper' +
  ')\\b', 'i')

// Gegenprobe zu DAMPED_RX: "Garlic bread" / "Ginger beer" / "Cinnamon roll" sind Lebensmittel,
// keine Aromen/Gewürze — die skalieren linear. Kommen im aktuellen Pool nicht als ZUTAT vor (nur
// in Rezeptnamen), wären aber jederzeit plausibel und würden sonst still zu wenig eingekauft.
const DAMPED_NOT_RX = /^(?:(?:garlic|ginger)\s+(?:bread|toast|naan|roll|bun|beer|ale|cake|biscuits?|cookies?)|cinnamon\s+(?:roll|bun|swirl|scroll|cereal|toast crunch))\b/i

// Halb-lineare Dämpfung: die Hälfte der linearen Steigerung.
//   r = Gruppen-Verhältnis zur Basis. 1 Pers → ×0.75 · 2 Pers → ×1 · 4 Pers → ×1.5 · 8 Pers → ×2.5
function dampen(r) {
  return 1 + (r - 1) * 0.5
}

// `factor` ist ein reeller Skalar (groupFactor): 1.0 = "1 adult medium", 2.0 = 2-Personen-Basis.
//   "/person"-Menge      → × Faktor (Autor hat die Pro-Person-Menge explizit angegeben)
//   sonst (inkl. "for both") → × Faktor/BASE_SERVINGS, gedämpft bei Gewürzen/Bratfett
// `name` ist der Zutatenname und entscheidet über die Dämpfung; ohne ihn wird linear skaliert.
export function isDamped(name) {
  const n = String(name || '').trim()
  return DAMPED_RX.test(n) && !DAMPED_NOT_RX.test(n)
}

export function scaleFactor(parsed, factor, name = '') {
  if (parsed.perPerson) return factor
  const r = factor / BASE_SERVINGS
  if (isDamped(name)) return dampen(r)
  return r
}

// ── 4b. Mengen-Anzeige im Rezept (skaliert auf die Gruppe) ─────
//
// Die Rezept-Ansicht zeigte bisher den ROHEN Mengen-String unter der Überschrift "Ingredients for
// N people" — also "1 × 400ml can", egal ob 2 oder 8 Personen. scaleAmountLabel() rechnet den
// String auf die Gruppe um und behält dabei die Freitext-Annotationen ("— important!", ", warmed").
//
// Die Strings sind Freitext, und eine zweite Zahl darin bedeutet dreierlei — je nach Muster:
//   "1 × 400ml can"          400 = Gebinde-GRÖSSE      → skaliert NICHT (die Anzahl davor tut es)
//   "150g/person, cut 2cm"     2 = Schnittmaß           → skaliert NICHT
//   "1 + 400ml water"        400 = Kochwasser           → skaliert MIT
//   "1 tbsp (20g)/person"     20 = Gramm-Gloss der Menge → skaliert MIT
// Deshalb wird gezielt ersetzt statt pauschal jede Zahl.

// Marker entfernen: die angezeigte Menge ist nach der Skalierung absolut für die Gruppe, ein
// stehengebliebenes "/person" würde sie erneut multiplizieren lassen. "for both" auch mitten im
// Satz greifen ("20g (for both, rehydrate in 250ml water)" → "20g (rehydrate in 250ml water)").
const MARKER_RX = /\s*\(\s*for both\s*\)|\s*\bfor both\b\s*,?\s*|\s*\/person\b|\s*\bper person\b/gi

// Rundet auf am Campingkocher abmessbare Werte — pro Einheiten-Klasse verschieden.
//
// Nötig, weil groupFactor fast nie glatt ist: 5 Erwachsene = 5.05 (Mann 1.05 + Frau 0.95), nicht
// 5.0. Ohne Rundung stünde da "758g Red lentils" statt "760g" — Scheingenauigkeit, die niemand
// abwiegt und die das Vertrauen in die Zahl untergräbt.
//
// Die Rundung ist NUR Anzeige. Die Einkaufsliste rechnet auf den ungerundeten Werten weiter
// (aggregateParts) und rundet erst am Ende auf ganze Gebinde — hier wird also nichts verfälscht.
const roundTo = (q, step) => Math.round(q / step) * step

export function roundAmount(q, unit) {
  const cls = unitClass(unit)

  // Masse/Volumen: grober werden, je größer der Wert. 758 → 760 · 1058 → 1050 · 152 → 150
  if (cls === 'mass' || cls === 'volume') {
    if (q < 10)   return roundTo(q, 1)
    if (q < 100)  return roundTo(q, 5)
    if (q < 1000) return roundTo(q, 10)
    return roundTo(q, 50)
  }

  // Löffel: Viertelschritte sind mit einem Messlöffel-Set abmessbar ("2.75 tsp" geht).
  if (cls === 'spice') return roundTo(q, 0.25)

  // Gebinde (Dosen, Packungen): ab 3 halbe Dosen ("3.5 cans" = 4 öffnen, letzte halb),
  // darunter Viertel — ein 0.5er-Raster würde "0.6 can" auf 0.5 ABrunden und damit beim
  // Wachsen der Gruppe die Menge sinken lassen.
  if (CONTAINER_RX.test(String(unit || ''))) return q >= 3 ? roundTo(q, 0.5) : roundTo(q, 0.25)

  // Zählbares (Zwiebeln, Zehen, Scheiben, Handvoll): ab 3 ganze Stücke — "7.5 cloves" ist
  // Scheingenauigkeit, "8 cloves" ist die Anweisung. Darunter Viertel, weil "0.25 Zwiebel"
  // oder "0.5 Avocado" echte, übliche Küchenmengen sind und im Pool auch so stehen.
  return q >= 3 ? roundTo(q, 1) : roundTo(q, 0.25)
}

export function scaleAmountLabel(amtStr, factor, name = '') {
  const raw = String(amtStr || '').trim()
  const strip = s => s
    .replace(MARKER_RX, ' ')
    .replace(/\(\s*,?\s*/g, '(')      // "( rehydrate …" / "(, warmed" → "(rehydrate …"
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.)])/g, '$1')
    .trim()

  const parsed = parseAmount(raw)
  // Keine Zahl → nichts zu rechnen. "to taste" / "small handful/person" bleiben wörtlich stehen:
  // "pro Person eine kleine Handvoll" ist bereits die richtige Anweisung für jede Gruppengröße.
  if (parsed.qty == null) return raw
  const mult = scaleFactor(parsed, factor, name)
  if (mult === 1) return strip(raw)

  const qty = roundAmount(parsed.qty * mult, parsed.unit)
  const numMatch = raw.match(NUM_RX)
  const afterNum = raw.slice(numMatch.index + numMatch[0].length)

  // Gebinde-Wort an die neue Anzahl angleichen ("2 can" → "2 cans"). Nur Container-Wörter, denn
  // die stehen nie für eine Größe — im Gegensatz zu "ml" in "2 × 400ml can".
  const fixPlural = s => parsed.unit && CONTAINER_RX.test(parsed.unit)
    ? s.replace(CONTAINER_RX, pluralize(parsed.unit, qty))
    : s

  // Gebinde-Größe zuerst ("185g can/person"): die ANZAHL steht gar nicht im String, parseAmount
  // hat implizit 1 angenommen. Also die skalierte Anzahl voranstellen statt die Größe zu ersetzen.
  const implicitCount = CONTAINER_RX.test(afterNum)
    && /^\s*(?:g|kg|ml|l)\b/i.test(afterNum)
    && !/(\d+(?:\.\d+)?)\s*[×x*]\s*\d/.test(raw)
  if (implicitCount) return strip(fixPlural(`${roundAmount(parsed.qty * mult, parsed.unit)} × ${raw}`))

  // Primärzahl ersetzen (erste Zahl = die Menge; Größen wie "400ml" stehen immer dahinter).
  let out = raw.slice(0, numMatch.index) + qty + afterNum
  // Kochwasser mitskalieren: "1 + 400ml water" → "2 + 800ml water". "1 + 2× rice water" bleibt,
  // weil dort ein Verhältnis und keine Volumen-Einheit steht.
  out = out.replace(/\+\s*(\d+(?:\.\d+)?)\s*(ml|l)\b/gi, (m, q, u) => `+ ${roundAmount(Number(q) * mult, u)}${u}`)
  // Masse-/Volumen-Gloss in Klammern mitskalieren — er glossiert immer die Primärmenge, nie die
  // Einheit: "1 tbsp (20g)/person" → "4 tbsp (80g)" · "45g/person (25g mash, 20g sear)" → ×4.
  out = out.replace(/\(([^)]*)\)/g, (m, inner) =>
    '(' + inner.replace(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l)\b/gi, (mm, q, u) => `${roundAmount(Number(q) * mult, u)}${u}`) + ')')
  return strip(fixPlural(out))
}

export function unitClass(unit) {
  if (!unit) return 'count'
  if (['g', 'kg'].includes(unit)) return 'mass'
  if (['ml', 'l'].includes(unit)) return 'volume'
  if (['tsp', 'tbsp', 'cup', 'pinch'].includes(unit)) return 'spice'
  return unit  // can, pack, bottle, jar, tin, bunch, slice, … eigene Klasse
}

export function unitToBase(qty, unit) {
  if (unit === 'kg') return { qty: qty * 1000, unit: 'g'  }
  if (unit === 'l')  return { qty: qty * 1000, unit: 'ml' }
  return { qty, unit }
}

// SI-Einheiten und Kürzel werden nie plural; sonstige Wörter bekommen 's' (oder Spezial-Plural).
const NO_PLURAL = new Set(['g', 'kg', 'ml', 'l', 'tsp', 'tbsp'])
const PLURAL_MAP = { pinch: 'pinches', loaf: 'loaves', leaf: 'leaves', bunch: 'bunches' }

function pluralize(unit, n) {
  if (n === 1 || NO_PLURAL.has(unit)) return unit
  return PLURAL_MAP[unit] || (unit.endsWith('s') ? unit : unit + 's')
}

function trimTrailingZeros(s) {
  return s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

export function formatQty(qty, unit) {
  const r = Math.round(qty * 100) / 100
  if (unit === 'g'  && r >= 1000) return `${trimTrailingZeros((r/1000).toFixed(2))} kg`
  if (unit === 'ml' && r >= 1000) return `${trimTrailingZeros((r/1000).toFixed(2))} L`
  const display = r % 1 === 0 ? Math.round(r) : Math.round(r * 10) / 10
  if (!unit || unit === 'count') return String(display)
  return `${display} ${pluralize(unit, display)}`
}

function aggregateParts(parts) {
  // gruppiert nach unitClass, summiert qty × factor, normalisiert g/ml
  const totals = new Map()
  let hasNoQty = false
  for (const p of parts) {
    if (p.qty == null) { hasNoQty = true; continue }
    const { qty, unit } = unitToBase(p.qty, p.unit)
    const cls = unitClass(unit)
    const key = cls === 'mass'   ? 'g'
              : cls === 'volume' ? 'ml'
              : (unit || 'count')
    totals.set(key, (totals.get(key) || 0) + qty * p.factor)
  }
  return { totals, hasNoQty }
}

// Gebinde, die es nur ganz zu kaufen gibt — krumme Summen werden aufgerundet.
const ROUNDABLE_CONTAINERS = new Set(['can', 'jar', 'tin', 'pack', 'packet', 'bottle', 'loaf', 'carton', 'tube'])

// Formatiert die aggregierten Mengen pack-bewusst: Masse-/Volumen-Mengen einer in PACK_SIZES gelisteten
// Zutat werden auf ganze Packungen aufgerundet und mit tatsächlichem Verbrauch annotiert
// ("2 × 500g pack · ~750 g used"); Dosen/Gläser werden auf ganze Einheiten aufgerundet
// ("1 can · uses ~0.5 cans"). So zeigt die Liste, was WIRKLICH zu kaufen ist, statt der krummen
// Summe. Nicht gelistete Masse/Volumen-Zutaten und alle übrigen Einheiten bleiben wie gehabt.
export function describeQty({ totals, hasNoQty }, packInfo) {
  if (!totals.size) return hasNoQty ? 'as needed' : ''

  // Gebinde mit bekanntem Inhalt (`contains`): gemischt notierte Mengen — z.B. ein Rezept schreibt
  // "400ml", ein anderes "1 can" — zu EINER Gebinde-Zahl zusammenführen, statt "500 ml + 1 can".
  let entries = [...totals.entries()]
  if (packInfo?.contains && (packInfo.unit === 'can' || packInfo.unit === 'carton')) {
    const content = totals.get(packInfo.containsUnit) || 0
    if (content > 0) {
      const merged = (totals.get(packInfo.unit) || 0) + content / packInfo.contains
      entries = entries.filter(([u]) => u !== packInfo.containsUnit && u !== packInfo.unit)
      entries.push([packInfo.unit, merged])
    }
  }

  const parts = []
  for (const [unit, qty] of entries) {
    if (qty <= 0) continue
    if (packInfo && packInfo.unit === unit && (unit === 'g' || unit === 'ml')) {
      const packs = Math.max(1, Math.ceil(qty / packInfo.pack))
      parts.push(`${packs} × ${packInfo.label} · ~${formatQty(qty, unit)} used`)
    } else if (ROUNDABLE_CONTAINERS.has(unit) && qty % 1 !== 0) {
      parts.push(`${formatQty(Math.ceil(qty), unit)} · uses ~${formatQty(qty, unit)}`)
    } else {
      parts.push(formatQty(qty, unit))
    }
  }
  return parts.join(' + ')
}

// ── 5. Kategorien & Bamaga-Routing ─────────────────────────────

const CATEGORIES = [
  { cat: '🥩 Fresh meat & plant proteins', rx: /\b(beef|chicken|lamb|bacon|bratwurst|sausages?|chorizo|pork|ham|tofu|tempeh|seitan|schnitzel|cutlets?|mince|patty|patties|nuggets?)\b/i },
  { cat: '🐟 Protein — canned & shelf',    rx: /\b(tuna|sardines?|anchovies?|jerky)\b/i },
  { cat: '🥚 Dairy, eggs & plant milk',    rx: /\b(eggs?|butter|cheddar|parmesan|mozzarella|feta|ricotta|cheese|cream|milk|sour cream|yoghurt|plant milk)\b/i },
  { cat: '🍝 Pasta, rice & bread',         rx: /\b(spaghetti|penne|pasta|macaroni|rigatoni|arborio|jasmine rice|rice|noodles?|tortilla|wraps?|taco|sandwich bread|sourdough|bread|toast|pita|naan|crispbread|crackers?|flour|baking powder|couscous|bread roll|breadcrumbs)\b/i },
  { cat: '🍓 Fresh fruit',                 rx: /\b(banana|mango|apple|lemon|lime|orange)\b/i },
  { cat: '🥬 Fresh vegetables & herbs',    rx: /\b(onion|garlic|ginger|potato|sweet potato|carrot|lettuce|tomato|cucumber|spring onion|pak choi|zucchini|avocado|bell pepper|capsicum|chili pepper|spinach|cabbage|celery|parsley|basil|coriander leaves|jalape)\b/i },
  { cat: '🥫 Canned vegetables & legumes', rx: /\b(diced tomatoes|tomato paste|coconut milk|kidney beans|black beans|chickpeas|baked beans|refried beans|beans|corn|peas|lentils|olives|capers|porcini)\b/i },
  { cat: '🥣 Breakfast, snacks & sweet',   rx: /\b(rolled oats|oats?|muesli|honey|maple syrup|clif|protein bar|dried fruit|apricots|raisins|peanut butter|nutella|chocolate|chips|coffee|tea|ovaltine|milo|condensed milk|sugar|chia|seeds?|nuts?|almonds?|cashews?|pine nuts|peanuts|hummus|mango chutney|jam)\b/i },
  { cat: '🫙 Spices, oils & sauces',       rx: /\b(olive oil|coconut oil|canola oil|sesame oil|oil|soy sauce|fish sauce|oyster sauce|curry paste|curry powder|worcestershire|sriracha|tabasco|balsamic|rice vinegar|vinegar|stock cube|salt|pepper|cumin|paprika|turmeric|chili|garlic powder|cinnamon|nutmeg|oregano|thyme|rosemary|coriander|ground coriander|bay leaf|herbs?|mustard|mayo|nutritional yeast)\b/i },
]

function categorize(name) {
  for (const { cat, rx } of CATEGORIES) {
    if (rx.test(name)) return cat
  }
  return '📦 Other'
}

// Für Frisch-Kategorien wandert Nachschub *nach* dem Bamaga-Tag in den Bamaga-Bucket.
const FRESH_CATEGORIES = new Set([
  '🥩 Fresh meat & plant proteins',
  '🥬 Fresh vegetables & herbs',
  '🍓 Fresh fruit',
])

// Trailing-Qualifier, die den Einkauf NICHT ändern (Zubereitungs-/Serviervermerke, Descriptor
// nach Komma): ", grated" · " to serve" · " for drizzling" · " for garnish" … → weg, damit
// "Parmesan, grated" == "Parmesan" und "Maple syrup to serve" == "Maple syrup".
const TRAILING_QUALIFIER_RX = /\s*(?:,.*$|\bto (?:serve|garnish|taste|finish)\b.*$|\bfor (?:garnish|drizzling|topping|dusting|serving|both)\b.*$)/i

// Anzeige-Basisname: parenthetische Qualifier ("(Wasa or similar)", "(canned)", "(for both)"),
// Präfixe wie "Optional:"/"If using:" und Trailing-Qualifier raus, Erstbuchstabe gross.
function baseIngredientName(name) {
  const stripped = name
    .replace(/\([^)]*\)/g, '')
    .replace(/^\s*(?:optional|if using)\s*:?\s*/i, '')
    .replace(TRAILING_QUALIFIER_RX, '')
    .trim()
  return stripped
    ? stripped.charAt(0).toUpperCase() + stripped.slice(1)
    : name.trim()
}

// Bei "X or Y[ or Z]"-Alternativen die PRIMÄRE (erste) Zutat nehmen, damit
// "Maple syrup or honey" / "Maple syrup or agave" / "Maple syrup" als EINE Zeile zusammenfallen.
// Guard gegen den Adjektiv-Fall: linker Teil = 1 Wort UND rechter Teil mehrwortig — dort teilt
// sich das "or" ein gemeinsames Kopf-Nomen ("Olive or coconut oil" = Olive [oil], "Rice or
// hokkien noodles", "Black or green olives"), da wäre nur das linke Wort kaputt. Diese Fälle
// bleiben stehen; alle anderen (beide Seiten vollständige Zutaten) fallen auf die linke zusammen.
function primaryAlternative(base) {
  const m = base.match(/^(.*?)\s+or\s+(.+)$/i)
  if (!m) return base
  const left = m[1].trim()
  const right = m[2].trim()
  if (left.split(/\s+/).length === 1 && right.split(/\s+/).length >= 2) return base
  return left
}

// Kanonische Zusammenfassung austauschbarer Varianten, damit die Einkaufsliste EINE Zeile pro
// Grundzutat zeigt ("Jasmine rice" / "Basmati rice" / "Long-grain rice" → "Rice"). Bewusst
// konservativ — nur wirklich substituierbare Varianten mergen. Nicht-Substituierbares bleibt
// getrennt: Arborio (Risotto), Sushi rice, Rice noodles, Instant noodles, Rice flour/vinegar,
// Gnocchi. Betrifft NUR die Einkaufsliste — die Rezept-Ansicht liest recipe.ing direkt und zeigt
// weiterhin die spezifische Zutat.
const CANONICAL_RULES = [
  { display: 'Rice',  rx: /\brice\b/i, not: /noodle|vermicelli|vinegar|flour|paper|arborio|sushi|risotto|short-grain|hokkien/i },
  { display: 'Pasta', rx: /\b(spaghetti|penne|rigatoni|macaroni|fusilli|farfalle|tagliatelle|fettuccine|linguine|lasagne|lasagna|pasta)\b/i, not: /gnocchi/i },
  { display: 'Onion', rx: /\bonions?\b/i, not: /red onion|spring onion|green onion/i },
]

// Zutatenname → { key, display }: key ist der Aggregations-Schlüssel (lowercase), display der
// Name in der Einkaufsliste. Reihenfolge: erst die Rezept-übergreifenden CANONICAL_RULES auf den
// vollen Basisnamen (fängt "Jasmine or brown rice" → Rice), dann generisch die primäre
// Alternative bei "X or Y" (fängt "Maple syrup or honey" → Maple syrup).
export function canonicalIngredient(name) {
  const base = baseIngredientName(name)
  for (const rule of CANONICAL_RULES) {
    if (rule.rx.test(base) && !(rule.not && rule.not.test(base))) {
      return { key: rule.display.toLowerCase(), display: rule.display }
    }
  }
  const primary = primaryAlternative(base)
  return { key: primary.toLowerCase(), display: primary }
}

// Recipe-Zutaten, die nicht eingekauft werden müssen (Meta-/Resteverwendungs-Marker).
export function isShoppableIngredient(name) {
  const n = name.toLowerCase().trim()
  if (/leftover/.test(n))                    return false
  if (/last night/.test(n))                  return false
  if (/(^|\W)to taste/.test(n))              return false
  if (/^(boiling |hot |cold )?water\b/.test(n)) return false  // Trinkwasser separat
  return true
}

function slugify(s) {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toLowerCase() || 'item'
}

// ── 6. Einkaufsliste-Generierung ───────────────────────────────

function generateShopping({ plan, factor: groupF, freshStops }) {
  // freshStops: aufsteigend sortierte [{id, day}] der verlässlichen Frisch-Resupply-Stops
  // (mind. [{id:'cairns', day:1}]). Frische Zutaten wandern in den zuletzt erreichten Stop vor
  // dem Koch-Tag; alles Haltbare geht immer nach Cairns (einmal kaufen, verdirbt nicht).
  const stops = (Array.isArray(freshStops) && freshStops.length) ? freshStops : [{ id: 'cairns', day: 1 }]
  const buckets = {}
  for (const s of stops) buckets[s.id] = new Map()
  if (!buckets.cairns) buckets.cairns = new Map()
  const freshTargetFor = (dnum) => {
    let t = 'cairns'
    for (const s of stops) { if (s.day <= dnum) t = s.id; else break }
    return t
  }

  for (let i = 0; i < plan.length; i++) {
    const day = plan[i]
    const dnum = day.d
    const meals = [day.f, day.m, day.ab].filter(Boolean)
    for (const meal of meals) {
      if (meal.leftover) continue                  // Auto-Reste → kein Einkauf
      const recipe = recipeById(meal.r)
      if (!recipe) continue
      const batch = meal.batch || 1                // Leftover-Quelle: Großansatz skaliert Mengen hoch
      // Abweichung: nur die vom User als "verwendet" markierten Zutaten-Indizes zählen.
      // usedIng undefined = wie geplant (alle); leeres Array = gar nicht gekocht (keine).
      const usedIng = meal.usedIng

      for (let idx = 0; idx < recipe.ing.length; idx++) {
        const [ingName, ingAmt] = recipe.ing[idx]
        if (usedIng && !usedIng.includes(idx)) continue
        if (!isShoppableIngredient(ingName)) continue
        const parsed = parseAmount(ingAmt)
        const factor = scaleFactor(parsed, groupF, ingName) * batch
        const cat = categorize(ingName)
        const target = FRESH_CATEGORIES.has(cat) ? freshTargetFor(dnum) : 'cairns'

        const { key, display } = canonicalIngredient(ingName)
        const map = buckets[target] || buckets.cairns
        let entry = map.get(key)
        if (!entry) {
          // Display-Name aus der Kanonisierung: Varianten ("Bacon" vs. "Optional: bacon",
          // "Jasmine rice" vs. "Basmati rice") erscheinen als ein Item. key wird für die
          // Pack-Größen-Rundung im Ergebnis-Schritt mitgeführt.
          entry = { id: slugify(display), name: display, cat, key, parts: [] }
          map.set(key, entry)
        }
        entry.parts.push({ ...parsed, factor })
      }
    }
  }

  const result = {}
  for (const [bucketId, map] of Object.entries(buckets)) {
    const byCategory = new Map()
    for (const entry of map.values()) {
      const agg = aggregateParts(entry.parts)
      const qty = describeQty(agg, PACK_SIZES[entry.key]) || 'as needed'
      // id ist nur slugify(name), ohne Bucket-Prefix: Storage-Keys bleiben stabil,
      // wenn ein Item bei Konfig-Änderung zwischen cairns/bamaga wandert. `key` (kanonischer
      // Zutaten-Key) + `amount` (numerische Basis-Mengen {g|ml|count|can:…}) für den Inventar-Tab,
      // der die eingekauften Mengen um den Verbrauch gekochter Mahlzeiten reduziert.
      const item = { id: entry.id, name: entry.name, key: entry.key, qty, amount: Object.fromEntries(agg.totals) }
      if (!byCategory.has(entry.cat)) byCategory.set(entry.cat, [])
      byCategory.get(entry.cat).push(item)
    }
    result[bucketId] = [...byCategory.entries()]
      .map(([cat, items]) => ({
        cat,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.cat.localeCompare(b.cat))
  }
  return result
}

// ── 7. Camping-Essentials-Injektion ────────────────────────────

// Pro Supply Point hängt regions.js eine `essentials`-Liste an. Nach der Rezept-basierten
// Shopping-Generierung schiebt diese Funktion die Essentials als eigene Kategorie an die
// Spitze des Buckets. qty kann String oder Funktion sein — Funktion wird mit dem Trip-Kontext
// (persons, days, fridgeSize, bamagaStop, bamagaActiveDay) ausgewertet, damit Wasser/Ice
// mit Gruppe und Kühl-Setup mitskalieren können.
//
// Welche Stops einen Bucket bekommen:
//  - Cairns (sp.optional=false): immer
//  - Bamaga: nur wenn ctx.bamagaStop=true
//  - Cooktown/Coen/Archer (sp.optional=true): nur wenn ctx.enabledStops[id]=true
// Stops die kein Frisch-Routing haben (Cooktown/Coen/Archer) bekommen frisch erstellte
// leere Buckets — sonst hätte injectEssentials nichts zum unshift-en.
const ESSENTIALS_CAT = '🧼 Camping essentials'

function isStopEnabled(sp, ctx) {
  if (!sp.optional) return true
  if (sp.id === 'bamaga') return ctx.bamagaStop === true
  return ctx.enabledStops?.[sp.id] === true
}

function injectEssentials(shopping, ctx) {
  for (const sp of REGION.supplyPoints) {
    if (!isStopEnabled(sp, ctx)) continue
    if (!sp.essentials?.length) continue
    if (!shopping[sp.id]) shopping[sp.id] = []  // Optional-Stops haben noch keinen Bucket
    // qty=null aus der qty-Funktion ⇒ Item entfällt (z.B. Compressor-Fridge → kein Eis).
    const items = sp.essentials.map(ess => {
      const qty = typeof ess.qty === 'function' ? ess.qty(ctx) : ess.qty
      return qty == null ? null : { id: ess.id, name: ess.name, qty }
    }).filter(Boolean)
    if (!items.length) continue
    shopping[sp.id].unshift({ cat: ESSENTIALS_CAT, items })
  }
}

// Aufräumen nach Injektion: Buckets von deaktivierten Stops löschen, damit App.jsx
// keinen leeren Bucket findet wenn der User nachträglich einen Stop ausschaltet.
function pruneDisabledStops(shopping, ctx) {
  for (const sp of REGION.supplyPoints) {
    if (!isStopEnabled(sp, ctx) && shopping[sp.id]) delete shopping[sp.id]
  }
}

// ── 8. Top-Level API ───────────────────────────────────────────

export function generate({ days, people, diet, burners, fridgeSize, fridgeCompressor, bamagaStop, bamagaDay, allergens, cookEffort, restaurantSlots, overrides, mealStatus, enabledStops, stopDays }) {
  // Konfigurator ist System-Boundary → Eingaben hier klemmen.
  const D = Math.max(1, Math.min(31, Number(days) | 0))
  const peopleArr = Array.isArray(people) && people.length
    ? people.slice(0, 8)
    : [{ type: 'adult-m', appetite: 'medium' }]
  const P = peopleArr.length
  const factor = groupFactor(peopleArr)
  const requested = DIETS.includes(diet) ? diet : 'omnivore'
  const requestedBurners = BURNERS.includes(Number(burners)) ? Number(burners) : 2
  // Kochaufwand-Obergrenze. Unbekannt/fehlend → 'high' (kein Filter, bisheriges Verhalten).
  const requestedEffort = COOK_EFFORT_LEVELS.includes(cookEffort) ? cookEffort : 'high'
  const fridge = FRIDGE_SIZES.includes(fridgeSize) ? fridgeSize : 'large'
  const compressor = fridgeCompressor === true
  const stopAtBamaga = bamagaStop !== false  // Default true, explicit false respektieren
  const bamagaActiveDay = stopAtBamaga
    ? clampBamagaDay(Number.isFinite(bamagaDay) ? bamagaDay : Math.round(D * 0.55), D)
    : null
  // Allergens auf bekannte Werte klemmen, Duplikate raus, falls UI/Storage etwas kaputtes liefert.
  const allergenList = Array.isArray(allergens)
    ? [...new Set(allergens.filter(a => ALLERGENS.includes(a)))]
    : []
  const warnings = []

  let dt = requested
  let bn = requestedBurners
  let ce = requestedEffort

  // Aufwands-Lücken-Fallback ZUERST (vor Diät): würde "wenig Kochaufwand" in Kombination mit
  // Diät/Allergenen/Burner eine Mahlzeit-Kategorie leeren, lockern wir die Aufwands-Obergrenze
  // stufenweise hoch — bevor wir an der (harten) Diät-Vorgabe rütteln. Ein Veganer wird nie zum
  // Vegetarier degradiert, nur weil "easy only" zu wenig Rezepte übrig lässt.
  while (COOK_EFFORT_CEIL[ce] < 2) {
    const pool = buildRecipePool({ diet: dt, burners: bn, allergens: allergenList, cookEffort: ce })
    if (pool.f.length && pool.m.length && pool.a.length) break
    const next = COOK_EFFORT_LEVELS[COOK_EFFORT_CEIL[ce] + 1]
    warnings.push(`Not enough "${ce}"-effort recipes for your settings — including more elaborate recipes for this trip.`)
    ce = next
  }

  // Pool-Lücken-Fallback: kann der Pool die geforderte Diät nicht in allen drei
  // Mahlzeit-Kategorien bedienen, locker auf die nächst-mildere Stufe zurück.
  // Stufe 2 ersetzt das durch echte Substitutions-Logik im Pool.
  while (DIET_RANK[dt] > 0) {
    const pool = buildRecipePool({ diet: dt, burners: bn, allergens: allergenList, cookEffort: ce })
    if (pool.f.length && pool.m.length && pool.a.length) break
    const fallback = DIETS[DIET_RANK[dt] - 1]
    warnings.push(`Recipe pool has no full coverage for "${dt}" — falling back to "${fallback}" for this trip.`)
    dt = fallback
  }

  // Burner-Lücken-Fallback: 1-Burner-Filter kann den Dinner-Pool zu klein machen.
  // Wenn eine Kategorie leer ist, ignorieren wir den Burner-Filter und warnen.
  {
    const pool = buildRecipePool({ diet: dt, burners: bn, allergens: allergenList, cookEffort: ce })
    if (!pool.f.length || !pool.m.length || !pool.a.length) {
      warnings.push(`Single-burner pool too thin for "${dt}" — including 2-burner recipes (you\'ll need to cook them sequentially).`)
      bn = 2
    }
  }

  const clusterDays = meatClusterDays(fridge, factor)
  // Tage in denen Frischfleisch erlaubt ist (= im Cluster nach Cairns- oder Bamaga-Einkauf).
  // Wird als sortiertes Array exportiert, sodass UI (SwapSheet, MenuTab-Hint) prüfen kann
  // welche Tage Frischfleisch-Rezepte zulassen.
  const meatMap = meatDayIndex({ days: D, bamagaActiveDay, clusterDays })
  const meatAllowedDays = [...meatMap.keys()].sort((a, b) => a - b)
  const safeRestaurantSlots = restaurantSlots && typeof restaurantSlots === 'object' ? restaurantSlots : {}
  const safeOverrides = overrides && typeof overrides === 'object' ? overrides : {}
  const safeMealStatus = mealStatus && typeof mealStatus === 'object' ? mealStatus : {}

  // Toggle-Stops normalisieren (inkl. Weipa) — Generator klemmt Eingaben, akzeptiert nur IDs+Werte.
  const stopsCfg = (enabledStops && typeof enabledStops === 'object') ? enabledStops : {}
  const safeEnabledStops = {
    cooktown: stopsCfg.cooktown === true,
    coen:     stopsCfg.coen === true,
    archer:   stopsCfg.archer === true,
    weipa:    stopsCfg.weipa === true,
  }
  const daysCfg = (stopDays && typeof stopDays === 'object') ? stopDays : {}
  const clampStopDay = v => (Number.isFinite(v) && v >= 2 && v <= D) ? Math.round(v) : null
  const safeStopDays = {
    cooktown: clampStopDay(daysCfg.cooktown),
    coen:     clampStopDay(daysCfg.coen),
    weipa:    clampStopDay(daysCfg.weipa),
  }
  // Frisch-Resupply-Kette: Cairns (Tag 1) + verlässliche, aktivierte, datierte Supermärkte.
  // Roadhouses (reliableFresh=false, z.B. Archer) bekommen KEINE Frisch-Zuweisung — nur Essentials.
  const freshStops = [{ id: 'cairns', day: 1 }]
  for (const sp of REGION.supplyPoints) {
    if (!sp.reliableFresh || sp.id === 'cairns') continue
    if (sp.id === 'bamaga') {
      if (stopAtBamaga && bamagaActiveDay) freshStops.push({ id: 'bamaga', day: bamagaActiveDay })
    } else if (safeEnabledStops[sp.id] && safeStopDays[sp.id]) {
      freshStops.push({ id: sp.id, day: safeStopDays[sp.id] })
    }
  }
  freshStops.sort((a, b) => (a.day - b.day) || (a.id === 'cairns' ? -1 : 1))

  // Specials werden VOR dem Plan-Lauf zugewiesen, damit der Daily-Loop sie als feste
  // Belegungen behandeln kann (statt sie nachträglich in Round-Robin-Ergebnisse zu spritzen).
  const specialAssignments = computeSpecialAssignments({
    days: D, diet: dt, burners: bn, allergens: allergenList, cookEffort: ce,
    bamagaActiveDay,
    meatAllowedDaysSet: new Set(meatAllowedDays),
  })
  const plan = generatePlan({
    days: D, diet: dt, burners: bn, bamagaActiveDay, fridge, groupF: factor,
    allergens: allergenList, cookEffort: ce,
    restaurantSlots: safeRestaurantSlots,
    overrides: safeOverrides,
    mealStatus: safeMealStatus,
    specialAssignments,
  })
  const shopping = generateShopping({ plan, factor, freshStops })
  const essentialsCtx = {
    persons: P,
    days: D,
    fridgeSize: fridge,
    fridgeCompressor: compressor,
    bamagaStop: stopAtBamaga,
    bamagaActiveDay,
    enabledStops: safeEnabledStops,
    stopDays: safeStopDays,
  }
  injectEssentials(shopping, essentialsCtx)
  pruneDisabledStops(shopping, essentialsCtx)

  // Thin-Pool-Warnung: wenn nach allen Filtern nur 1 Rezept pro Kategorie übrig bleibt,
  // ist jede Mahlzeit dieser Kategorie identisch. Stufe 2 löst das mit grösserem Pool.
  const finalPool = buildRecipePool({ diet: dt, burners: bn, allergens: allergenList, cookEffort: ce })
  const catLabels = { f: 'breakfast', m: 'lunch', a: 'dinner' }
  for (const cat of Object.keys(catLabels)) {
    if (finalPool[cat].length === 1) {
      warnings.push(`Only one ${catLabels[cat]} recipe matches your settings — every ${catLabels[cat]} will be the same.`)
    }
  }

  // Meat-Off-Cluster-Pool-Check: bei Omnivore ist der Plan außerhalb der Fleisch-Cluster
  // rein vegetarisch/vegan. Ist der nonMeat-Pool dann zu klein für die Off-Cluster-Tage,
  // werden Mahlzeiten stark wiederholt — User darauf hinweisen.
  if (dt === 'omnivore') {
    const split = buildSplitPool({ diet: dt, burners: bn, allergens: allergenList, cookEffort: ce })
    const offClusterDays = D - (bamagaActiveDay != null ? Math.min(2, 1) * clusterDays : clusterDays)
      // grobe Schätzung: bei Bamaga-Stop bis zu 2 Cluster aktiv, sonst 1
    const minNonMeatNeeded = Math.max(2, Math.ceil(offClusterDays / 3))
    for (const cat of ['f', 'm', 'a']) {
      if (split.nonMeat[cat].length > 0 && split.nonMeat[cat].length < minNonMeatNeeded) {
        warnings.push(`Few meat-free ${catLabels[cat]} options for your settings — off-cluster days will repeat. Consider larger fridge or fewer days.`)
        break  // eine Warnung reicht
      }
    }
  }

  // Kühlschrank-Hinweis: zeigt dem Nutzer, wieviele Tage Fleisch am Stück eingeplant sind.
  // Bei Omnivore + small fridge ist clusterDays oft 1–3 → die Warnung gibt Kontext, warum.
  if (dt === 'omnivore' && (fridge === 'small' || fridge === 'medium')) {
    warnings.push(`Fridge size "${fridge}" → ${clusterDays} day(s) of fresh-meat meals after each shop. Off-cluster days are vegetarian/vegan to avoid spoilage.`)
  }

  // (Bamaga-Bucket-Cleanup ist jetzt Teil von pruneDisabledStops — siehe oben.)

  return {
    config: {
      days: D,
      people: peopleArr,
      persons: P,                              // = people.length, für UI-Convenience
      groupFactor: factor,                     // Skalar fürs Shopping-Scaling
      dailyKcal: groupDailyKcal(peopleArr),    // Anzeige im Configurator / Subtitle
      diet: requested, dietApplied: dt,
      cookEffort: requestedEffort, cookEffortApplied: ce,
      burners: requestedBurners, burnersApplied: bn,
      fridgeSize: fridge,
      fridgeCompressor: compressor,
      bamagaStop: stopAtBamaga,                // ob Mid-Trip-Resupply genutzt wird
      bamagaDay: bamagaActiveDay,              // null wenn kein Stop, sonst geklemmter Tag
      meatClusterDays: clusterDays,            // Tage Frischfleisch am Stück nach Einkauf
      meatAllowedDays,                         // Array<number> der Day-Nummern in denen Frischfleisch erlaubt ist
      allergens: allergenList,                 // aktive Allergen-Filter (nach Cleanup)
    },
    plan,
    shopping,
    warnings,
  }
}
