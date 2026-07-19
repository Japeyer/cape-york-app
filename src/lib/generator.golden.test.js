// ─────────────────────────────────────────────────────────────────────────
//  GOLDEN MASTER — der reale Eigen-Trip (16 Tage, 2 Personen, omnivore)
// ─────────────────────────────────────────────────────────────────────────
//
// STATUS.md verweist mehrfach auf die „2-Personen-Liste, bit-identisch zum
// Ursprung" — bisher nur per manuellem stash-Diff geprüft. Das hier friert
// genau diesen Trip als committeten Snapshot ein: Menüplan UND Einkaufsliste.
//
// Zweck: JEDE künftige Generator-/Rezept-/Skalierungs-Änderung, die den realen
// Trip verschiebt, erzeugt einen sichtbaren Snapshot-Diff im Review — statt den
// Eigen-Trip unbemerkt zu verändern. Ist die Änderung gewollt, wird der Snapshot
// bewusst mit `vitest -u` aktualisiert; ist sie es nicht, ist es ein gefangener Bug.
//
// Der Snapshot ist als LESBARER Text gehalten (nicht Roh-JSON), damit ein Diff
// sofort zeigt WAS sich verschob ("Day 7 Dinner: Beef curry → Chicken stir-fry")
// statt einer unlesbaren Objekt-Wand.

import { describe, it, expect } from 'vitest'
import { generate } from './generator.js'

// Feste Repräsentation des Eigen-Trips (16 Tage, 2 Erwachsene, omnivore, 2 Burner,
// große Kühlbox, Bamaga-Resupply). Bewusst hart kodiert — der Golden Master darf
// sich NICHT mit einem geänderten defaultConfig() mitverschieben.
const OWN_TRIP = {
  days: 16,
  people: [
    { type: 'adult-m', appetite: 'medium' },
    { type: 'adult-f', appetite: 'medium' },
  ],
  diet: 'omnivore',
  cookEffort: 'high',
  burners: 2,
  fridgeSize: 'large',
  bamagaStop: true,
  bamagaDay: 9,
}

// Ein Slot → kurzer, stabiler Klartext.
function slotLabel(slot) {
  if (!slot) return '—'
  if (slot.skip) return `[${slot.kind}]`
  if (slot.rest) return 'Restaurant'
  if (slot.leftover) return `Leftovers (from Day ${slot.fromDay})`
  return slot.t || slot.r || '?'
}

function planToText(plan) {
  return plan.map(day => {
    const b = slotLabel(day.f)
    const l = slotLabel(day.m)
    const d = slotLabel(day.ab)
    const flag = day.bamaga ? '  «BAMAGA resupply»' : ''
    return `Day ${String(day.d).padStart(2)}  B: ${b}  |  L: ${l}  |  D: ${d}${flag}`
  }).join('\n')
}

function shoppingToText(shopping) {
  const lines = []
  for (const bucketId of Object.keys(shopping).sort()) {
    lines.push(`═══ ${bucketId.toUpperCase()} ═══`)
    for (const section of shopping[bucketId]) {
      lines.push(`  ${section.cat}`)
      for (const it of section.items) {
        lines.push(`    ${it.name} — ${it.qty}`)
      }
    }
  }
  return lines.join('\n')
}

describe('Golden Master — Eigen-Trip 16d/2P/omnivore', () => {
  const r = generate(OWN_TRIP)

  it('Menüplan ist unverändert', () => {
    expect(planToText(r.plan)).toMatchSnapshot()
  })

  it('Einkaufsliste (Cairns + Bamaga) ist unverändert', () => {
    expect(shoppingToText(r.shopping)).toMatchSnapshot()
  })

  it('Warnungen sind unverändert', () => {
    expect(r.warnings).toMatchSnapshot()
  })

  it('Trip-Kennzahlen sind unverändert (Tage, Personen, groupFactor, Cluster)', () => {
    expect({
      days: r.config.days,
      persons: r.config.persons,
      groupFactor: r.config.groupFactor,
      meatClusterDays: r.config.meatClusterDays,
      meatAllowedDays: r.config.meatAllowedDays,
      bamagaDay: r.config.bamagaDay,
    }).toMatchSnapshot()
  })
})
