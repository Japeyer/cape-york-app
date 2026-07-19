// Inventar-Berechnung (Stufe 2). Modell:
//   Bestand = eingekaufte Menge (auf der Einkaufsliste abgehakt) − verbrauchte Menge.
// Der Verbrauch kommt aus den im Menü-Tab als GEKOCHT markierten Mahlzeiten (der Cooked/Deviation-
// Toggle): "cooked" verbraucht ALLE Zutaten, "deviation" nur die angehakten (usedIng-Indizes),
// unmarkierte/Reste/Restaurant/Skip verbrauchen nichts. Mengen in Basiseinheiten ({g|ml|count|
// can|…}), konsistent mit generateShopping (dieselben parse-Helfer).

import {
  parseAmount, scaleFactor, unitToBase, unitClass,
  canonicalIngredient, isShoppableIngredient, formatQty,
} from './generator.js'
import { recipeById } from './recipe-pool.js'

// Addiert die (skalierte) Basis-Menge einer Zutat in ein totals-Objekt { unit: qty }.
// `ingName` muss mitlaufen: scaleFactor dämpft darüber Gewürze/Bratfett. Ohne den Namen würde der
// Verbrauch linear gerechnet, der Einkauf aber gedämpft → der Stock-Tab meldete Öl als aufgebraucht.
function addAmount(totals, ingName, ingAmt, factor, batch) {
  const parsed = parseAmount(ingAmt)
  if (parsed.qty == null) return
  const mult = scaleFactor(parsed, factor, ingName) * batch
  const base = unitToBase(parsed.qty, parsed.unit)
  const cls = unitClass(base.unit)
  const key = cls === 'mass' ? 'g' : cls === 'volume' ? 'ml' : (base.unit || 'count')
  totals[key] = (totals[key] || 0) + base.qty * mult
}

// Ob eine Mahlzeit als gekocht zählt (→ Verbrauch). Nutzt die Meal-Status-Flags aus generatePlan.
function mealCookedUsage(meal) {
  if (!meal || !meal.r) return null           // Restaurant/Skip/Leftover haben kein Rezept
  if (meal.deviation) {
    return (meal.usedIng && meal.usedIng.length) ? new Set(meal.usedIng) : null  // leer = nicht gekocht
  }
  if (meal.reviewed === 'cooked') return 'all'
  return null                                  // unmarkiert = noch nicht gekocht → kein Verbrauch
}

// Verbrauch pro kanonischer Zutat über alle GEKOCHTEN Mahlzeiten im Plan.
// → { [canonicalKey]: { unit: qty } }
export function consumedByCooked(plan, factor) {
  const out = {}
  for (const day of plan || []) {
    for (const meal of [day.f, day.m, day.ab]) {
      const usage = mealCookedUsage(meal)
      if (!usage) continue
      const recipe = recipeById(meal.r)
      if (!recipe) continue
      const batch = meal.batch || 1
      recipe.ing.forEach(([name, amt], idx) => {
        if (usage instanceof Set && !usage.has(idx)) return   // Deviation: nur angehakte Zutaten
        if (!isShoppableIngredient(name)) return
        const { key } = canonicalIngredient(name)
        if (!out[key]) out[key] = {}
        addAmount(out[key], name, amt, factor, batch)
      })
    }
  }
  return out
}

// Rest = Einkauf − Verbrauch, pro Einheit, auf 0 geklemmt.
export function subtractAmounts(bought, consumed) {
  const rem = {}
  for (const [unit, q] of Object.entries(bought || {})) {
    const left = q - ((consumed && consumed[unit]) || 0)
    if (left > 0.0001) rem[unit] = left
  }
  return rem
}

// Fehlmenge = Verbrauch − Einkauf, pro Einheit (nur wo positiv). Umkehrung von subtractAmounts.
// Für die Deckungs-Prüfung "reicht der Einkauf für den Plan?": leeres Ergebnis = genug gekauft,
// niemand geht auf dem Trip hungrig ins Bett. Anders als subtractAmounts wird NICHT auf 0 geklemmt —
// eine Unterdeckung MUSS sichtbar werden. (subtractAmounts klemmt bewusst, weil der Stock-Tab keine
// negativen Bestände zeigen darf; für die Test-Invariante brauchen wir aber genau das Vorzeichen.)
export function shortfall(bought, consumed) {
  const miss = {}
  for (const [unit, q] of Object.entries(consumed || {})) {
    const lack = q - ((bought && bought[unit]) || 0)
    if (lack > 0.0001) miss[unit] = lack
  }
  return miss
}

// Ist praktisch nichts mehr übrig (aufgebraucht)?
export function isDepleted(amount) {
  return !amount || Object.values(amount).every(q => q <= 0.0001)
}

// "3 apples" / "700 g" / "2 cans" — ohne Pack-Rundung (echte Restmenge). Mehrere Einheiten mit " + ".
export function formatAmount(amount) {
  const parts = Object.entries(amount || {})
    .filter(([, q]) => q > 0.0001)
    .map(([unit, q]) => formatQty(q, unit))
  return parts.join(' + ')
}

// Map: kanonischer Zutaten-Key → Liste der Rezepte im Plan, die die Zutat verwenden.
// Pro Eintrag { id, name, icon, cat, amount (Rezept-Zeile = Rolle/Wichtigkeit), days:[…] }.
// Für das "Wo wird das verwendet?"-Dropdown in der Einkaufsliste (Link zum Rezept).
export function recipeUsageMap(plan) {
  const nested = new Map()  // key → Map(recipeId → entry)
  for (const day of plan || []) {
    for (const meal of [day.f, day.m, day.ab]) {
      if (!meal || !meal.r || meal.leftover) continue
      const recipe = recipeById(meal.r)
      if (!recipe) continue
      const seen = new Set()
      for (const [name, amt] of recipe.ing) {
        if (!isShoppableIngredient(name)) continue
        const { key } = canonicalIngredient(name)
        if (seen.has(key)) continue            // eine Zeile pro Key pro Rezept
        seen.add(key)
        if (!nested.has(key)) nested.set(key, new Map())
        const rmap = nested.get(key)
        let e = rmap.get(recipe.id)
        if (!e) { e = { id: recipe.id, name: recipe.name, icon: recipe.icon, cat: recipe.cat, amount: amt, days: new Set() }; rmap.set(recipe.id, e) }
        e.days.add(day.d)
      }
    }
  }
  const out = new Map()
  for (const [key, rmap] of nested) {
    out.set(key, [...rmap.values()].map(e => ({ ...e, days: [...e.days].sort((a, b) => a - b) })))
  }
  return out
}
