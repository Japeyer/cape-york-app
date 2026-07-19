import { describe, it, expect } from 'vitest'
import {
  TYPES, APPETITES,
  CUSTOM_KCAL_MIN, CUSTOM_KCAL_MAX, CUSTOM_KCAL_STEP,
  clampCustomKcal, roundToHundred,
  personDailyKcal, groupFactor, groupDailyKcal,
  migratePersonsToPeople, makePersonId,
} from './calories.js'

describe('TYPES / APPETITES Konstanten', () => {
  it('enthalten die im Configurator verwendeten Werte', () => {
    expect(TYPES).toEqual(['adult-m', 'adult-f', 'child'])
    expect(APPETITES).toEqual(['light', 'medium', 'heavy', 'custom'])
  })
})

describe('clampCustomKcal', () => {
  it('klemmt unter MIN auf MIN', () => {
    expect(clampCustomKcal(500)).toBe(CUSTOM_KCAL_MIN)
    expect(clampCustomKcal(0)).toBe(CUSTOM_KCAL_MIN)
    expect(clampCustomKcal(-100)).toBe(CUSTOM_KCAL_MIN)
  })
  it('klemmt über MAX auf MAX', () => {
    expect(clampCustomKcal(9999)).toBe(CUSTOM_KCAL_MAX)
  })
  it('rundet auf 100er-Schritte', () => {
    expect(clampCustomKcal(2349)).toBe(2300)
    expect(clampCustomKcal(2350)).toBe(2400)
    expect(clampCustomKcal(2799)).toBe(2800)
  })
  it('non-finite → MIN', () => {
    expect(clampCustomKcal(NaN)).toBe(CUSTOM_KCAL_MIN)
    expect(clampCustomKcal(undefined)).toBe(CUSTOM_KCAL_MIN)
    expect(clampCustomKcal(null)).toBe(CUSTOM_KCAL_MIN)
  })
  it('STEP-Konstante ist 100', () => {
    expect(CUSTOM_KCAL_STEP).toBe(100)
  })
})

describe('roundToHundred', () => {
  it('rundet auf 100er', () => {
    expect(roundToHundred(2349)).toBe(2300)
    expect(roundToHundred(2350)).toBe(2400)
    expect(roundToHundred(0)).toBe(0)
    expect(roundToHundred(50)).toBe(100)
  })
})

describe('personDailyKcal — Standard-Modi', () => {
  it('Adult-M Medium ≈ 2835 (1.05 × 1.0 × 2700)', () => {
    expect(personDailyKcal({ type: 'adult-m', appetite: 'medium' })).toBe(2835)
  })
  it('Adult-F Medium ≈ 2565 (0.95 × 1.0 × 2700)', () => {
    expect(personDailyKcal({ type: 'adult-f', appetite: 'medium' })).toBe(2565)
  })
  it('Child Medium ≈ 1485 (0.55 × 1.0 × 2700)', () => {
    expect(personDailyKcal({ type: 'child', appetite: 'medium' })).toBe(1485)
  })
  it('Adult-M Heavy ≈ 3402 (1.05 × 1.2 × 2700)', () => {
    expect(personDailyKcal({ type: 'adult-m', appetite: 'heavy' })).toBe(3402)
  })
  it('Adult-M Light ≈ 2268 (1.05 × 0.8 × 2700)', () => {
    expect(personDailyKcal({ type: 'adult-m', appetite: 'light' })).toBe(2268)
  })
})

describe('personDailyKcal — Custom-Modus', () => {
  it('verwendet customKcal direkt wenn appetite=custom + customKcal gesetzt', () => {
    expect(personDailyKcal({ type: 'adult-f', appetite: 'custom', customKcal: 3100 })).toBe(3100)
  })
  it('ignoriert TYPE_FACTOR im Custom-Modus (Type irrelevant für kcal-Wert)', () => {
    const m = personDailyKcal({ type: 'adult-m', appetite: 'custom', customKcal: 2000 })
    const f = personDailyKcal({ type: 'adult-f', appetite: 'custom', customKcal: 2000 })
    const c = personDailyKcal({ type: 'child',   appetite: 'custom', customKcal: 2000 })
    expect(m).toBe(2000)
    expect(f).toBe(2000)
    expect(c).toBe(2000)
  })
  it('fällt auf Standard-Modus zurück wenn customKcal nicht-finite', () => {
    expect(personDailyKcal({ type: 'adult-m', appetite: 'custom' })).toBe(2835)
    expect(personDailyKcal({ type: 'adult-m', appetite: 'custom', customKcal: NaN })).toBe(2835)
  })
  it('klemmt einen zu hohen Wert defensiv (6000 → 4500), auch außerhalb der UI', () => {
    expect(personDailyKcal({ type: 'adult-m', appetite: 'custom', customKcal: 6000 })).toBe(4500)
  })
  it('klemmt einen zu niedrigen Wert defensiv (500 → 1500)', () => {
    expect(personDailyKcal({ type: 'adult-f', appetite: 'custom', customKcal: 500 })).toBe(1500)
  })
})

describe('personDailyKcal — Defensive Defaults', () => {
  it('unbekannter Type → Adult-M', () => {
    expect(personDailyKcal({ type: 'martian', appetite: 'medium' })).toBe(2835)
  })
  it('unbekannter Appetite → medium', () => {
    expect(personDailyKcal({ type: 'adult-m', appetite: 'starving' })).toBe(2835)
  })
  it('null/undefined Person → Adult-M Medium', () => {
    expect(personDailyKcal(null)).toBe(2835)
    expect(personDailyKcal(undefined)).toBe(2835)
    expect(personDailyKcal({})).toBe(2835)
  })
})

describe('groupFactor', () => {
  it('1M+1F Medium = 2.00 (1.05 + 0.95) — backward-compat zu altem persons:2', () => {
    const f = groupFactor([
      { type: 'adult-m', appetite: 'medium' },
      { type: 'adult-f', appetite: 'medium' },
    ])
    expect(f).toBeCloseTo(2.00, 5)
  })
  it('Familie 2A+2K = 2.99', () => {
    const f = groupFactor([
      { type: 'adult-m', appetite: 'medium' },
      { type: 'adult-f', appetite: 'medium' },
      { type: 'child',   appetite: 'medium' },
      { type: 'child',   appetite: 'medium' },
    ])
    expect(f).toBeCloseTo(3.10, 5)  // 1.05 + 0.95 + 0.55 + 0.55
  })
  it('leeres Array → 1 (Sicherheits-Fallback)', () => {
    expect(groupFactor([])).toBe(1)
    expect(groupFactor(null)).toBe(1)
    expect(groupFactor(undefined)).toBe(1)
  })
  it('Custom-Person addiert customKcal/2700 zum Faktor', () => {
    const f = groupFactor([
      { type: 'adult-m', appetite: 'custom', customKcal: 2700 },  // Faktor 1.0 exakt
    ])
    expect(f).toBeCloseTo(1.0, 5)
  })
  it('klemmt einen ungeklemmten Custom-Wert im Faktor (6000 → 4500/2700)', () => {
    const f = groupFactor([{ type: 'adult-m', appetite: 'custom', customKcal: 6000 }])
    expect(f).toBeCloseTo(4500 / 2700, 5)   // NICHT 6000/2700 — defensive Klemmung greift
  })
})

describe('groupDailyKcal', () => {
  it('1M+1F Medium = ~5400 kcal', () => {
    const k = groupDailyKcal([
      { type: 'adult-m', appetite: 'medium' },
      { type: 'adult-f', appetite: 'medium' },
    ])
    expect(k).toBe(5400)
  })
})

describe('migratePersonsToPeople — backward-compat', () => {
  it('persons:1 → 1 Adult-M Medium', () => {
    const p = migratePersonsToPeople(1)
    expect(p).toHaveLength(1)
    expect(p[0]).toMatchObject({ type: 'adult-m', appetite: 'medium' })
  })
  it('persons:2 → 1M + 1F Medium', () => {
    const p = migratePersonsToPeople(2)
    expect(p).toHaveLength(2)
    expect(p[0].type).toBe('adult-m')
    expect(p[1].type).toBe('adult-f')
  })
  it('persons:5 → 1M + 4F (alle Erwachsene)', () => {
    const p = migratePersonsToPeople(5)
    expect(p).toHaveLength(5)
    expect(p.filter(x => x.type === 'adult-m')).toHaveLength(1)
    expect(p.filter(x => x.type === 'adult-f')).toHaveLength(4)
  })
  it('klemmt auf [1, 8]', () => {
    expect(migratePersonsToPeople(0)).toHaveLength(1)
    expect(migratePersonsToPeople(99)).toHaveLength(8)
  })
  it('jede Person hat eindeutige id', () => {
    const p = migratePersonsToPeople(4)
    const ids = new Set(p.map(x => x.id))
    expect(ids.size).toBe(4)
  })
})

describe('makePersonId', () => {
  it('liefert verschiedene IDs bei aufeinander folgenden Calls', () => {
    const a = makePersonId(0)
    const b = makePersonId(1)
    expect(a).not.toBe(b)
    expect(a).toMatch(/^p[a-z0-9]+/)
  })
})
