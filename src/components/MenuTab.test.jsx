// @vitest-environment jsdom
//
// Kartenkopf im Menüplan. Vorher stand die Tagnummer DREIMAL pro Karte (als Zahl im
// Kästchen, als "Day N" darunter, und nochmal als Titel), und die Unterzeile zeigte
// ausschliesslich das Abendessen — was laut Entwickler verwirrte ("warum nur das
// Abendessen?"). Jetzt: Kästchen = "Day N" (einmal), Titel = Kalenderdatum,
// Unterzeile = alle drei Mahlzeiten.
//
// Harness wie ConfiguratorTab.test.jsx: react-dom/client + act, keine testing-library (CLAUDE.md).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import MenuTab from './MenuTab.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}

let container, root
function mount(node) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(node))
}
function unmount() {
  if (root) { try { act(() => root.unmount()) } catch {} }
  if (container) container.remove()
  container = root = null
}

// Minimal-Plan in der Form, die generator.js liefert (siehe dessen Kopfkommentar).
const meal = (t) => ({ t, r: 'r-' + t, d: 'omnivore' })
const day = (d, over = {}) => ({
  d, dt: `Day ${d}`, bamaga: false,
  f: meal('Porridge'), m: meal('Wraps'), ab: meal('Chili con carne'),
  ...over,
})

// startDate 2026-06-01 ist ein Montag → Tag 1 = "Monday, June 1".
const baseConfig = { startDate: '2026-06-01', days: 3, mealStatus: {} }

const renderPlan = (plan, config = baseConfig) =>
  mount(<MenuTab plan={plan} config={config} allergens={[]} premium={true} />)

const heads = () => [...document.querySelectorAll('.day-head')]
const firstHead = () => heads()[0]

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  unmount()
  document.body.querySelectorAll('.sheet-backdrop, .tour-layer').forEach(n => n.remove())
  vi.restoreAllMocks()
})

describe('MenuTab — Kartenkopf', () => {
  it('nennt die Tagnummer genau einmal pro Karte', () => {
    renderPlan([day(1), day(2), day(3)])
    const head = firstHead()
    // Der Tag-Bezeichner darf im Kopf nur ein einziges Mal auftauchen. Gross-D ist
    // wichtig: "Monday" in der Datumszeile enthält "day" klein und zählt nicht mit.
    // Kein \b am Ende: der Kopf-Text läuft als "Day1Monday, June 1" durch, und zwischen
    // "1" und "M" liegt keine Wortgrenze. (?!\d) verhindert stattdessen Treffer auf "Day 12".
    const matches = head.textContent.match(/Day\s*1(?!\d)/g) || []
    expect(matches.length).toBe(1)
  })

  it('zeigt im Kästchen "Day" über der Zahl', () => {
    renderPlan([day(1), day(2)])
    const box = firstHead().querySelector('.day-num')
    // Label und Zahl sind getrennte Elemente (untereinander gesetzt) → kein Leerzeichen erzwingen.
    expect(box.textContent.trim()).toMatch(/^Day\s*1$/)
    expect(box.querySelector('.day-num-n').textContent).toBe('1')
  })

  it('zeigt in der Titelzeile das Kalenderdatum statt "Day N"', () => {
    renderPlan([day(1), day(2)])
    const title = firstHead().querySelector('.day-title').textContent
    expect(title).toMatch(/Monday, June 1/)
    expect(title).not.toMatch(/Day 1/)
  })

  it('fällt ohne startDate auf "Day N" zurück, statt leer zu bleiben', () => {
    renderPlan([day(1), day(2)], { ...baseConfig, startDate: null })
    expect(firstHead().querySelector('.day-title').textContent).toMatch(/Day 1/)
  })

  it('listet in der Unterzeile alle drei Mahlzeiten, nicht nur das Abendessen', () => {
    renderPlan([day(1), day(2)])
    const meals = firstHead().querySelector('.day-meals').textContent
    expect(meals).toContain('Porridge')
    expect(meals).toContain('Wraps')
    expect(meals).toContain('Chili con carne')
  })

  it('übernimmt Restaurant- und Reste-Slots in die Unterzeile', () => {
    renderPlan([
      day(1, {
        m: { rest: true, rname: 'Exchange Hotel' },
        ab: { leftover: true, fromDay: 1 },
      }),
      day(2),
    ])
    const meals = firstHead().querySelector('.day-meals').textContent
    expect(meals).toContain('Exchange Hotel')
    expect(meals).toMatch(/Leftovers/i)
  })

  it('lässt Pickup-/Dropoff-Slots aus der Unterzeile weg', () => {
    renderPlan([day(1, { f: { skip: true, kind: 'pickup' } }), day(2)])
    const meals = firstHead().querySelector('.day-meals').textContent
    expect(meals).not.toMatch(/pickup/i)
    expect(meals).not.toMatch(/🚙/)
    // Die verbleibenden zwei Mahlzeiten stehen weiterhin da.
    expect(meals).toContain('Wraps')
    expect(meals).toContain('Chili con carne')
  })
})
