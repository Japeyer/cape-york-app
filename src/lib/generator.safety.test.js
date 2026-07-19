// ─────────────────────────────────────────────────────────────────────────
//  SICHERHEITS-SWEEP — „Niemand hungert auf dem Trip"
// ─────────────────────────────────────────────────────────────────────────
//
// Der Worst Case dieser App ist NICHT ein hässliches Layout, sondern ein Kunde,
// der am Camp steht und zu wenig / nicht Essbares / gar nichts hat, weil der
// Generator gebuggt hat. Dieser Sweep verwandelt genau diesen Worst Case in
// harte, maschinen-geprüfte Invarianten.
//
// Kernidee: der Generator ist DETERMINISTISCH. Darum reicht kein Zufalls-Property-
// Test — wir fahren systematisch die failure-relevanten Achsen-Kombinationen ab
// (Diät × Burner × Kochaufwand × Allergene × Tage × Personen × Kühlschrank × Stops)
// und prüfen pro erzeugtem Trip eine Reihe von „Nie-Hunger"-Invarianten. Grün heißt
// dann: für JEDE geprüfte Konfiguration ist der Trip essbar, vollständig und gedeckt.
//
// Invarianten:
//   I1  Kein leerer Slot        — jeder Koch-Slot hat Rezept | Restaurant | Reste | ist Skip.
//   I2  Deckung                 — Einkauf ≥ Bedarf für jede Zutat (der eigentliche Hunger-Riegel).
//   I3  Diät-Konformität        — kein Slot unterschreitet die (angewandte) Diät.
//   I4  Allergen-Konformität    — kein gewähltes Allergen als Core-Zutat.
//   I5  Routing-Timing          — keine verderbliche Zutat wird NACH ihrem Koch-Tag gekauft.
//   I6  Keine kaputte Menge     — kein qty/amount ist NaN/undefined/Infinity/≤0.
//   I8  Warn-Transparenz        — greift ein Fallback (Diät/Burner/Aufwand), MUSS gewarnt werden.
//
// I7 (Rezept-Anzeige == Einkaufs-Skalierung) ist bewusst NICHT hier: Anzeige und
// Einkauf teilen sich dieselbe scaleFactor-Engine, die I2 gegen consumedByCooked
// absichert; die Anzeige selbst deckt RecipesTab.test.jsx + der scaleAmountLabel-
// Block in generator.test.js ab. Doppelt zu testen bringt keinen Zusatz-Beweis.

import { describe, it, expect } from 'vitest'
import { generate } from './generator.js'
import { filterByAllergens } from './allergens.js'
import { recipeById } from './recipe-pool.js'
import { consumedByCooked, shortfall, recipeUsageMap } from './inventory.js'

const DIET_RANK = { omnivore: 0, vegetarian: 1, vegan: 2 }

// N gleiche Personen (Default: Erwachsener, mittlerer Appetit).
const persons = (n, type = 'adult-m', appetite = 'medium') =>
  Array.from({ length: n }, () => ({ type, appetite }))

// Kurzer, im Fehlerfall lesbarer Config-Tag.
function tagOf(c) {
  const a = c.allergens?.length ? c.allergens.join('+') : 'none'
  return `${c.days}d/${c.people.length}p/${c.diet}/b${c.burners}/e:${c.cookEffort}/f:${c.fridgeSize}/al:${a}/bam:${c.bamagaStop}`
}

// Ist der Slot ein gültiger, „bespielter" Slot? null = leerer Slot = Hunger.
function slotValid(slot) {
  if (slot == null) return false
  if (slot.skip) return true                       // Pickup/Dropoff-Logistik
  if (slot.rest) return true                       // Restaurant
  if (slot.leftover) return recipeById(slot.from) != null   // Reste vom Quell-Rezept
  if (slot.r) return recipeById(slot.r) != null    // reguläres Rezept / Special
  return false
}

// Führt ALLE aus dem Output berechenbaren Invarianten (I1–I4, I6, I8) für eine
// Config aus und liefert die Verletzungen als lesbare Strings (leer = alles gut).
function checkConfig(cfg) {
  const fails = []
  const r = generate(cfg)
  const { plan, shopping, config, warnings } = r
  const t = tagOf(cfg)

  // I1/I3/I4 — pro Slot
  for (const day of plan) {
    for (const slotKey of ['f', 'm', 'ab']) {
      const slot = day[slotKey]
      if (!slotValid(slot)) {
        fails.push(`I1 ${t} d${day.d}.${slotKey}: leerer/ungültiger Slot ${JSON.stringify(slot)}`)
        continue
      }
      if (slot.r && !slot.leftover) {
        // I3: Rezept-Diät muss die angewandte Diät erfüllen (>= im Rank).
        if (DIET_RANK[slot.d] < DIET_RANK[config.dietApplied]) {
          fails.push(`I3 ${t} d${day.d}.${slotKey}: ${slot.r} ist ${slot.d}, verletzt ${config.dietApplied}`)
        }
        // I4: kein gewähltes Allergen als Core-Zutat (Topping ist erlaubt → nur .keep zählt).
        const rec = recipeById(slot.r)
        if (rec && !filterByAllergens(rec, config.allergens).keep) {
          fails.push(`I4 ${t} d${day.d}.${slotKey}: ${slot.r} verletzt Allergene [${config.allergens}]`)
        }
      }
    }
  }

  // I6 — keine kaputte Einkaufs-Menge
  for (const [bid, cats] of Object.entries(shopping)) {
    for (const cat of cats) {
      for (const it of cat.items) {
        if (it.qty == null || it.qty === '' || /NaN|undefined|Infinity/.test(String(it.qty))) {
          fails.push(`I6 ${t} ${bid}/${it.name}: qty="${it.qty}"`)
        }
        if (it.amount) {
          for (const [u, q] of Object.entries(it.amount)) {
            if (!Number.isFinite(q) || q <= 0) fails.push(`I6 ${t} ${bid}/${it.name}: ${u}=${q}`)
          }
        }
      }
    }
  }

  // I2 — Deckung: Einkauf ≥ Bedarf, wenn der ganze Plan gekocht wird.
  // Bedarf über consumedByCooked (separater Codepfad in inventory.js) → fängt Drift
  // zwischen Einkaufs- und Verbrauchs-Skalierung (die (ax)-Öl-Bug-Klasse).
  for (const day of plan) {
    for (const slotKey of ['f', 'm', 'ab']) {
      const s = day[slotKey]
      if (s && s.r && !s.leftover) s.reviewed = 'cooked'
    }
  }
  const consumed = consumedByCooked(plan, config.groupFactor)
  const bought = {}
  for (const cats of Object.values(shopping)) {
    for (const cat of cats) {
      for (const it of cat.items) {
        if (!it.key || !it.amount) continue          // Essentials (Wasser/Eis) haben keinen key
        if (!bought[it.key]) bought[it.key] = {}
        for (const [u, q] of Object.entries(it.amount)) bought[it.key][u] = (bought[it.key][u] || 0) + q
      }
    }
  }
  for (const key of Object.keys(consumed)) {
    const miss = shortfall(bought[key], consumed[key])
    if (Object.keys(miss).length) fails.push(`I2 ${t} ${key}: fehlt ${JSON.stringify(miss)}`)
  }

  // I8 — Warn-Transparenz: fällt der Generator hinter die Anfrage zurück, MUSS er warnen.
  if (config.dietApplied !== config.diet && !warnings.length) {
    fails.push(`I8 ${t}: Diät ${config.diet}→${config.dietApplied} ohne Warnung`)
  }
  if (config.burnersApplied !== config.burners && !warnings.length) {
    fails.push(`I8 ${t}: Burner ${config.burners}→${config.burnersApplied} ohne Warnung`)
  }
  if (config.cookEffortApplied !== config.cookEffort && !warnings.length) {
    fails.push(`I8 ${t}: Aufwand ${config.cookEffort}→${config.cookEffortApplied} ohne Warnung`)
  }

  return fails
}

// ── Sweep A — Pool-Ecken: Diät × Burner × Kochaufwand × Allergene × Tage ──────
// Das ist der Raum, in dem Filter den Pool leerfiltern könnten (→ leerer Slot,
// nicht-essbar, stiller Fallback). Volles Produkt der Pool-Achsen.

const ALLERGEN_SETS = [
  [],
  ['gluten'],
  ['dairy'],
  ['nuts'],
  ['fish', 'shellfish'],
  ['pork'],
  ['gluten', 'dairy', 'eggs'],
  ['nuts', 'gluten', 'dairy', 'eggs', 'soy'],
]

describe('Sicherheits-Sweep A — Pool-Ecken (Diät × Burner × Aufwand × Allergene × Tage)', () => {
  it('kein leerer/nicht-essbarer Slot, Einkauf deckt Bedarf, Fallbacks warnen', () => {
    const fails = []
    let count = 0
    for (const diet of ['omnivore', 'vegetarian', 'vegan']) {
      for (const burners of [1, 2, 3]) {
        for (const cookEffort of ['low', 'medium', 'high']) {
          for (const allergens of ALLERGEN_SETS) {
            for (const days of [2, 7, 16, 28]) {
              count++
              fails.push(...checkConfig({
                days, people: persons(2), diet, burners, cookEffort, allergens,
                fridgeSize: 'large', bamagaStop: true,
              }))
            }
          }
        }
      }
    }
    expect(count).toBe(3 * 3 * 3 * ALLERGEN_SETS.length * 4)   // 864 Konfigurationen
    expect(fails).toEqual([])
  })
})

// ── Sweep B — Skalierung: Personen × Tage × Diät × Kühlschrank ────────────────
// Betont die Mengen-Achsen (1–8 + gemischte Gruppe) → I2/I6 unter allen Faktoren.

const PEOPLE_SETS = [
  persons(1),
  persons(2),
  persons(4),
  persons(8),
  // gemischte Gruppe (krummer groupFactor, Kind + Heavy-Esser)
  [{ type: 'adult-m', appetite: 'heavy' }, { type: 'child', appetite: 'light' }, { type: 'adult-f', appetite: 'medium' }],
  // volle 8er-Gruppe gemischt
  [...persons(3, 'adult-m', 'heavy'), ...persons(3, 'adult-f', 'medium'), ...persons(2, 'child', 'light')],
  // ── Custom-Kalorien (manuelle kcal/Tag) — Appetit-Achse, die vorher fehlte ──
  [{ type: 'adult-m', appetite: 'custom', customKcal: 4500 }],                 // UI-Maximum
  [{ type: 'child', appetite: 'custom', customKcal: 1500 }],                   // UI-Minimum
  [{ type: 'adult-m', appetite: 'custom', customKcal: 6000 }],                 // über Max → wird geklemmt
  // gemischt: Custom-Vielfraß + Standard-Esser + Kind
  [{ type: 'adult-m', appetite: 'custom', customKcal: 4200 }, { type: 'adult-f', appetite: 'medium' }, { type: 'child', appetite: 'light' }],
  // 8× Custom-Maximum (höchster realistischer Faktor)
  Array.from({ length: 8 }, () => ({ type: 'adult-m', appetite: 'custom', customKcal: 4500 })),
]

describe('Sicherheits-Sweep B — Skalierung (Personen × Tage × Diät × Kühlschrank)', () => {
  it('jede Gruppengröße liefert intakte, gedeckte Einkaufslisten', () => {
    const fails = []
    let count = 0
    for (const people of PEOPLE_SETS) {
      for (const days of [2, 7, 16, 28]) {
        for (const diet of ['omnivore', 'vegetarian', 'vegan']) {
          for (const fridgeSize of ['small', 'medium', 'large']) {
            count++
            fails.push(...checkConfig({
              days, people, diet, burners: 2, cookEffort: 'high', allergens: [],
              fridgeSize, bamagaStop: true,
            }))
          }
        }
      }
    }
    expect(count).toBe(PEOPLE_SETS.length * 4 * 3 * 3)   // 216 Konfigurationen
    expect(fails).toEqual([])
  })
})

// ── Sweep C — Extremkombinationen (die härtesten Ecken) ───────────────────────
// Genau die Konfigurationen, die den Pool maximal einengen. Wenn hier niemand
// hungert, hält der Rest erst recht.

describe('Sicherheits-Sweep C — Extremkombinationen', () => {
  it('worst-case-Trips bleiben vollständig, essbar und gedeckt', () => {
    const extremes = [
      // 1-Tages-Trip, allein, vegan, 1 Burner, minimal-Aufwand, viele Allergene
      { days: 1, people: persons(1), diet: 'vegan', burners: 1, cookEffort: 'low', allergens: ['gluten', 'dairy', 'eggs', 'nuts', 'soy'], fridgeSize: 'small', bamagaStop: false },
      // Maximal-Trip, volle Gruppe, vegan, 1 Burner, minimal-Aufwand
      { days: 28, people: persons(8), diet: 'vegan', burners: 1, cookEffort: 'low', allergens: ['nuts', 'gluten'], fridgeSize: 'small', bamagaStop: true },
      // Omnivore mit allen Tier-Allergenen ausgeschlossen (faktisch vegetarisch-eng)
      { days: 16, people: persons(2), diet: 'omnivore', burners: 1, cookEffort: 'low', allergens: ['pork', 'fish', 'shellfish', 'dairy'], fridgeSize: 'small', bamagaStop: true },
      // Vegetarisch, kleinste Küche, alle Milch/Ei/Gluten raus
      { days: 21, people: persons(4), diet: 'vegetarian', burners: 1, cookEffort: 'low', allergens: ['dairy', 'eggs', 'gluten'], fridgeSize: 'small', bamagaStop: true },
      // Kurztrip, kein Bamaga, Nüsse+Gluten raus, vegan
      { days: 3, people: persons(2), diet: 'vegan', burners: 2, cookEffort: 'medium', allergens: ['nuts', 'gluten'], fridgeSize: 'medium', bamagaStop: false },
    ]
    const fails = []
    for (const cfg of extremes) fails.push(...checkConfig(cfg))
    expect(fails).toEqual([])
  })
})

// ── I5 — Routing-Timing: nichts wird nach dem Koch-Tag gekauft ────────────────
// Verderbliche Zutaten wandern in den zuletzt vor dem Koch-Tag erreichten Stop.
// Prüft: für jeden Nicht-Cairns-Bucket (day > 1) existiert für jede gelistete
// Zutat mindestens ein Koch-Tag >= Bucket-Tag — sonst käme sie zu spät.
// (Cairns = Tag 1 deckt trivial jeden Tag; Haltbares geht ohnehin immer nach Cairns.)

describe('Sicherheits-Check I5 — Frisch-Routing kauft nichts zu spät', () => {
  it('keine verderbliche Zutat liegt in einem Stop nach ihrem letzten Koch-Tag', () => {
    const cfgs = [
      { days: 16, people: persons(2), diet: 'omnivore', burners: 2, cookEffort: 'high', allergens: [], fridgeSize: 'small', bamagaStop: true, bamagaDay: 9 },
      { days: 20, people: persons(4), diet: 'omnivore', burners: 2, cookEffort: 'high', allergens: [], fridgeSize: 'medium', bamagaStop: true, bamagaDay: 11, enabledStops: { coen: true, weipa: true }, stopDays: { coen: 5, weipa: 14 } },
      { days: 24, people: persons(2), diet: 'omnivore', burners: 3, cookEffort: 'high', allergens: [], fridgeSize: 'small', bamagaStop: true, bamagaDay: 13, enabledStops: { cooktown: true, weipa: true }, stopDays: { cooktown: 3, weipa: 17 } },
    ]
    const fails = []
    for (const cfg of cfgs) {
      const r = generate(cfg)
      // Bucket → Ankunfts-Tag rekonstruieren (aus config + gesetzten Stop-Tagen).
      const bucketDay = { cairns: 1 }
      if (r.config.bamagaDay) bucketDay.bamaga = r.config.bamagaDay
      if (cfg.stopDays) for (const [id, d] of Object.entries(cfg.stopDays)) {
        if (cfg.enabledStops?.[id]) bucketDay[id] = d
      }
      // Koch-Tage je kanonischer Zutat.
      const usage = recipeUsageMap(r.plan)
      const cookDays = {}
      for (const [key, recs] of usage) cookDays[key] = recs.flatMap(e => e.days)

      for (const [bid, cats] of Object.entries(r.shopping)) {
        const bday = bucketDay[bid]
        if (bday == null || bday === 1) continue    // Cairns/roadhouse-only: nichts zu prüfen
        for (const cat of cats) {
          for (const it of cat.items) {
            if (!it.key || !cookDays[it.key]) continue
            if (!cookDays[it.key].some(d => d >= bday)) {
              fails.push(`I5 ${tagOf(cfg)} ${bid}(Tag ${bday})/${it.name}: nur Koch-Tage [${cookDays[it.key]}]`)
            }
          }
        }
      }
    }
    expect(fails).toEqual([])
  })
})

// ── Custom-Kalorien: defensive Klemmung greift auch im Generator ──────────────
// Die UI klemmt customKcal auf 1500–4500. Ein via localStorage/Import eingeschleuster
// Wert (6000) darf keinen absurden Skalierungs-Faktor erzeugen — die Klemmung sitzt
// zentral in calories.js (personFactor), der Generator ist über groupFactor geschützt.

describe('Sicherheits-Check — Custom-Kalorien werden im Generator geklemmt', () => {
  const cfg = (kcal) => ({
    days: 16, people: [{ type: 'adult-m', appetite: 'custom', customKcal: kcal }],
    diet: 'omnivore', burners: 2, cookEffort: 'high', fridgeSize: 'large', bamagaStop: true,
  })

  it('ungeklemmte 6000 kcal ergeben denselben Plan/Einkauf wie das Maximum 4500', () => {
    const over = generate(cfg(6000))
    const max = generate(cfg(4500))
    // groupFactor identisch (6000 wurde auf 4500 geklemmt), nicht 6000/2700.
    expect(over.config.groupFactor).toBeCloseTo(4500 / 2700, 5)
    expect(over.config.groupFactor).toBeCloseTo(max.config.groupFactor, 5)
    // → damit auch Plan + Einkaufsliste identisch
    expect(JSON.stringify(over.shopping)).toBe(JSON.stringify(max.shopping))
  })

  it('zu niedrige 500 kcal werden auf das Minimum 1500 angehoben', () => {
    const under = generate(cfg(500))
    expect(under.config.groupFactor).toBeCloseTo(1500 / 2700, 5)
  })
})

// ── Determinismus über die Extrem-Ecken ───────────────────────────────────────
// Ein zweiter Lauf mit identischer Config muss bit-identischen Plan + Shopping geben
// (sonst ist „bit-identisch zum Eigen-Trip" nicht verlässlich reproduzierbar).

describe('Sicherheits-Check — Determinismus', () => {
  it('identische Config → identischer Plan + identische Einkaufsliste', () => {
    const cfgs = [
      { days: 16, people: persons(2), diet: 'omnivore', burners: 2, cookEffort: 'high', allergens: [], fridgeSize: 'large', bamagaStop: true },
      { days: 28, people: persons(8), diet: 'vegan', burners: 1, cookEffort: 'low', allergens: ['nuts', 'gluten'], fridgeSize: 'small', bamagaStop: true },
      { days: 7, people: persons(4), diet: 'vegetarian', burners: 3, cookEffort: 'medium', allergens: ['dairy'], fridgeSize: 'medium', bamagaStop: false },
    ]
    for (const cfg of cfgs) {
      const a = generate(cfg)
      const b = generate(cfg)
      expect(JSON.stringify(a.plan)).toBe(JSON.stringify(b.plan))
      expect(JSON.stringify(a.shopping)).toBe(JSON.stringify(b.shopping))
    }
  })
})
