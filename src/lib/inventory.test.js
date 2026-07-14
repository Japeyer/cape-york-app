import { describe, it, expect } from 'vitest'
import { generate } from './generator.js'
import { consumedByCooked, subtractAmounts, isDepleted, formatAmount } from './inventory.js'

const base = {
  days: 8,
  people: [{ type: 'adult-m', appetite: 'medium' }, { type: 'adult-f', appetite: 'medium' }],
  diet: 'omnivore', burners: 2, fridgeSize: 'large', bamagaStop: false, allergens: [],
}

describe('inventory — Mengen-Arithmetik', () => {
  it('subtrahiert pro Einheit und klemmt auf 0 (Apfel-Beispiel: 4 − 1 = 3)', () => {
    expect(subtractAmounts({ count: 4 }, { count: 1 })).toEqual({ count: 3 })
    expect(subtractAmounts({ g: 900 }, { g: 900 })).toEqual({})
    expect(subtractAmounts({ g: 200 }, { g: 500 })).toEqual({})   // nicht negativ
    expect(subtractAmounts({ count: 2 }, undefined)).toEqual({ count: 2 })
  })

  it('isDepleted erkennt leeren/aufgebrauchten Bestand', () => {
    expect(isDepleted({})).toBe(true)
    expect(isDepleted({ count: 0 })).toBe(true)
    expect(isDepleted({ count: 2 })).toBe(false)
  })

  it('formatAmount ohne Pack-Rundung', () => {
    expect(formatAmount({ count: 3 })).toBe('3')
    expect(formatAmount({ g: 700 })).toBe('700 g')
    expect(formatAmount({ g: 1500 })).toMatch(/kg/)
    expect(formatAmount({})).toBe('')
  })
})

describe('consumedByCooked', () => {
  it('unmarkierte Mahlzeiten verbrauchen nichts', () => {
    const r = generate(base)
    expect(Object.keys(consumedByCooked(r.plan, r.config.groupFactor))).toHaveLength(0)
  })

  it('"cooked"-Mahlzeit verbraucht ihre Zutaten', () => {
    const day = generate(base).plan.find(d => d.ab?.r && !d.ab.leftover)
    const r = generate({ ...base, mealStatus: { [day.d]: { ab: 'cooked' } } })
    expect(Object.keys(consumedByCooked(r.plan, r.config.groupFactor)).length).toBeGreaterThan(0)
  })

  it('Deviation verbraucht nur die angehakten Zutaten (≤ voll gekocht)', () => {
    const r0 = generate(base)
    const day = r0.plan.find(d => d.ab?.r && !d.ab.leftover)
    const full = consumedByCooked(generate({ ...base, mealStatus: { [day.d]: { ab: 'cooked' } } }).plan, r0.config.groupFactor)
    const one  = consumedByCooked(generate({ ...base, mealStatus: { [day.d]: { ab: { used: [0] } } } }).plan, r0.config.groupFactor)
    expect(Object.keys(one).length).toBeLessThanOrEqual(Object.keys(full).length)
  })

  it('alle Mahlzeiten gekocht → Verbrauch == Einkauf → Bestand komplett 0', () => {
    const r0 = generate(base)
    const ms = {}
    for (const d of r0.plan) ms[d.d] = { f: 'cooked', m: 'cooked', ab: 'cooked' }
    const r = generate({ ...base, mealStatus: ms })
    const bought = {}
    for (const bucket of Object.values(r.shopping)) for (const c of bucket) for (const it of c.items) {
      if (!it.key || !it.amount) continue
      if (!bought[it.key]) bought[it.key] = {}
      for (const [u, q] of Object.entries(it.amount)) bought[it.key][u] = (bought[it.key][u] || 0) + q
    }
    const consumed = consumedByCooked(r.plan, r.config.groupFactor)
    expect(Object.keys(bought).length).toBeGreaterThan(0)
    for (const key of Object.keys(bought)) {
      expect(isDepleted(subtractAmounts(bought[key], consumed[key]))).toBe(true)
    }
  })
})
