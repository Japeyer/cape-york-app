// ─────────────────────────────────────────────────────────────────────────
//  SHUFFLE-SWEEP — „Zufall ja, Restriktions-Bruch nein"
// ─────────────────────────────────────────────────────────────────────────
//
// Der optionale Shuffle-Modus (config.seed > 0) würfelt einen ANDEREN Plan aus dem
// gefilterten Rezept-Pool. Die Sorge dabei: der Zufall könnte eine harte Restriktion
// aushebeln (Fleisch für Veganer, Allergen auf den Teller, leerer Slot). Dieser Sweep
// beweist das Gegenteil — er fährt viele Seeds über viele Configs und prüft dieselben
// „Nie-Hunger / Nie-verboten"-Invarianten wie der deterministische Sicherheits-Sweep:
//
//   I1  Kein leerer Slot        — jeder Koch-Slot hat Rezept | Restaurant | Reste | ist Skip.
//   I2  Deckung                 — Einkauf ≥ Bedarf für jede gekochte Zutat.
//   I3  Diät-Konformität        — kein Slot unterschreitet die (angewandte) Diät.
//   I4  Allergen-Konformität    — kein gewähltes Allergen als Core-Zutat.
//   I6  Keine kaputte Menge     — kein qty/amount ist NaN/undefined/Infinity/≤0.
//
// Zusätzlich die Shuffle-spezifischen Eigenschaften:
//   S1  Ohne Seed  → bit-identisch zum deterministischen Default (Golden Master heil).
//   S2  Seed stabil → gleicher Seed liefert bit-identischen Plan (reproduzierbar).
//   S3  Seed wirkt  → über eine Handvoll Seeds entstehen ≥2 verschiedene Pläne.

import { describe, it, expect } from 'vitest'
import { generate } from './generator.js'
import { filterByAllergens } from './allergens.js'
import { recipeById } from './recipe-pool.js'
import { consumedByCooked, shortfall } from './inventory.js'

const DIET_RANK = { omnivore: 0, vegetarian: 1, vegan: 2 }

const persons = (n, type = 'adult-m', appetite = 'medium') =>
  Array.from({ length: n }, () => ({ type, appetite }))

function tagOf(c) {
  const a = c.allergens?.length ? c.allergens.join('+') : 'none'
  return `${c.days}d/${c.people.length}p/${c.diet}/b${c.burners}/e:${c.cookEffort}/f:${c.fridgeSize}/al:${a}/seed:${c.seed}`
}

function slotValid(slot) {
  if (slot == null) return false
  if (slot.skip) return true
  if (slot.rest) return true
  if (slot.leftover) return recipeById(slot.from) != null
  if (slot.r) return recipeById(slot.r) != null
  return false
}

// Prüft I1/I2/I3/I4/I6 für eine konkrete (geshuffelte) Config. Liefert Verletzungen als
// lesbare Strings (leer = alles gut). Gleiche Logik wie generator.safety.test.js:checkConfig,
// hier bewusst dupliziert, damit der Shuffle-Beweis unabhängig lesbar bleibt.
function checkConfig(cfg) {
  const fails = []
  const { plan, shopping, config } = generate(cfg)
  const t = tagOf(cfg)

  for (const day of plan) {
    for (const slotKey of ['f', 'm', 'ab']) {
      const slot = day[slotKey]
      if (!slotValid(slot)) {
        fails.push(`I1 ${t} d${day.d}.${slotKey}: leerer Slot ${JSON.stringify(slot)}`)
        continue
      }
      if (slot.r && !slot.leftover) {
        if (DIET_RANK[slot.d] < DIET_RANK[config.dietApplied]) {
          fails.push(`I3 ${t} d${day.d}.${slotKey}: ${slot.r} ist ${slot.d}, verletzt ${config.dietApplied}`)
        }
        const rec = recipeById(slot.r)
        if (rec && !filterByAllergens(rec, config.allergens).keep) {
          fails.push(`I4 ${t} d${day.d}.${slotKey}: ${slot.r} verletzt Allergene [${config.allergens}]`)
        }
      }
    }
  }

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

  // I2 — Deckung (ganzer Plan gekocht): Einkauf ≥ Verbrauch über den separaten Codepfad.
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
        if (!it.key || !it.amount) continue
        if (!bought[it.key]) bought[it.key] = {}
        for (const [u, q] of Object.entries(it.amount)) bought[it.key][u] = (bought[it.key][u] || 0) + q
      }
    }
  }
  for (const key of Object.keys(consumed)) {
    const miss = shortfall(bought[key], consumed[key])
    if (Object.keys(miss).length) fails.push(`I2 ${t} ${key}: fehlt ${JSON.stringify(miss)}`)
  }

  return fails
}

// Seeds bewusst gemischt (klein, groß, „unglückliche" Muster) — der Shuffle muss über den
// ganzen Wertebereich robust sein, nicht nur bei 1,2,3.
const SEEDS = [1, 2, 7, 42, 1337, 99999, 2147483646]

describe('Shuffle-Sweep — Zufall hält alle harten Restriktionen', () => {
  it('kein leerer Slot, Diät/Allergen-konform, gedeckt — über viele Seeds × Configs', () => {
    const fails = []
    let count = 0
    const configs = [
      { people: persons(2), diet: 'omnivore',   burners: 2, cookEffort: 'high',   allergens: [],                     fridgeSize: 'small'  },
      { people: persons(2), diet: 'vegan',       burners: 1, cookEffort: 'low',    allergens: ['nuts', 'gluten'],     fridgeSize: 'large'  },
      { people: persons(4), diet: 'vegetarian',  burners: 2, cookEffort: 'medium', allergens: ['dairy', 'eggs'],      fridgeSize: 'medium' },
      { people: persons(8), diet: 'omnivore',    burners: 3, cookEffort: 'high',   allergens: ['pork', 'shellfish'],  fridgeSize: 'small'  },
      { people: persons(1), diet: 'omnivore',    burners: 1, cookEffort: 'low',    allergens: ['fish', 'dairy'],      fridgeSize: 'medium' },
    ]
    for (const base of configs) {
      for (const days of [7, 16, 28]) {
        for (const seed of SEEDS) {
          count++
          fails.push(...checkConfig({ ...base, days, bamagaStop: true, seed }))
        }
      }
    }
    expect(count).toBe(5 * 3 * SEEDS.length)   // 105 geshuffelte Configs
    expect(fails).toEqual([])
  })

  // Spezifisch: Veganer bekommt unter KEINEM Seed jemals Frischfleisch/Tierprodukt-Rezept.
  it('Veganer sieht über alle Seeds nur vegane Rezepte', () => {
    const bad = []
    for (const seed of SEEDS) {
      const { plan } = generate({
        days: 28, people: persons(2), diet: 'vegan', burners: 3,
        cookEffort: 'high', allergens: [], fridgeSize: 'large', bamagaStop: true, seed,
      })
      for (const day of plan) {
        for (const k of ['f', 'm', 'ab']) {
          const s = day[k]
          if (s?.r && !s.leftover && s.d !== 'vegan') bad.push(`seed ${seed} d${day.d}.${k}: ${s.r} (${s.d})`)
        }
      }
    }
    expect(bad).toEqual([])
  })
})

describe('Shuffle — Determinismus & Wirkung', () => {
  const base = {
    days: 16, people: persons(2), diet: 'omnivore', burners: 2,
    cookEffort: 'high', allergens: [], fridgeSize: 'large', bamagaStop: true,
  }

  it('S1 — ohne Seed identisch zum deterministischen Default', () => {
    const noSeed = generate(base)
    const seedZero = generate({ ...base, seed: 0 })
    const seedNull = generate({ ...base, seed: null })
    expect(JSON.stringify(seedZero.plan)).toBe(JSON.stringify(noSeed.plan))
    expect(JSON.stringify(seedNull.plan)).toBe(JSON.stringify(noSeed.plan))
    expect(JSON.stringify(seedZero.shopping)).toBe(JSON.stringify(noSeed.shopping))
  })

  it('S2 — gleicher Seed liefert bit-identischen Plan (reproduzierbar)', () => {
    const a = generate({ ...base, seed: 12345 })
    const b = generate({ ...base, seed: 12345 })
    expect(JSON.stringify(a.plan)).toBe(JSON.stringify(b.plan))
    expect(JSON.stringify(a.shopping)).toBe(JSON.stringify(b.shopping))
  })

  it('S3 — verschiedene Seeds erzeugen verschiedene Pläne', () => {
    const def = JSON.stringify(generate(base).plan)
    const variants = new Set([def])
    for (const seed of SEEDS) variants.add(JSON.stringify(generate({ ...base, seed }).plan))
    // Mindestens der Default + eine echte Shuffle-Variante → der Seed wirkt sichtbar.
    expect(variants.size).toBeGreaterThanOrEqual(2)
  })
})
