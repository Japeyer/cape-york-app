// Render-Test für die Rezept-Ansicht.
//
// Hintergrund: Die Karte rendert die Überschrift "Ingredients for N people" und darunter die
// Mengen. Bis Juli 2026 stand dort der ROHE Mengen-String — die Überschrift versprach 4 Personen,
// die Zeile sagte "1 × 400ml can" (Entwickler-Report beim Kochen der Red lentil soup). Die Rechnung
// selbst deckt generator.test.js ab; dieser Test sichert die VERKABELUNG: dass die Karte den
// groupFactor überhaupt bis in die Zutaten-Zeile durchreicht.
//
// Bewusst react-dom/server statt @testing-library/react: die Karte ist im aufgeklappten Zustand
// (focused) reines Markup ohne Interaktion — statisches Rendern reicht und spart eine Dependency
// (CLAUDE.md: keine unnötigen Dependencies).

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RecipesTab from './RecipesTab.jsx'
import { RECIPES } from '../data/recipes.js'

const A12 = RECIPES.find(r => r.id === 'a12')   // Red lentil soup with coconut milk

// Minimal-Plan, der a12 als Dinner an Tag 1 enthält → die Karte erscheint im Tab.
const planWithA12 = [{ d: 1, dt: 'Day 1', f: null, m: null, ab: { r: 'a12', t: A12.name } }]

// premium=true, damit die Karte nicht hinter dem PremiumGate/Blur liegt; focused=a12 klappt sie auf.
const render = (factor, persons) => renderToStaticMarkup(
  <RecipesTab plan={planWithA12} persons={persons} factor={factor} focusRecipeId="a12" premium={true} />
)

describe('RecipesTab — Zutaten-Mengen folgen der Gruppengröße', () => {
  it('zeigt bei 2 Personen die Mengen wie im Rezept geschrieben', () => {
    const html = render(2, 2)
    expect(html).toContain('Ingredients for 2 people')
    expect(html).toContain('1 × 400ml can')     // Kokosmilch
    expect(html).toContain('300g')              // Linsen: 150g/person × 2
  })

  it('verdoppelt die Kokosmilch bei 4 Personen — der gemeldete Bug', () => {
    const html = render(4, 4)
    expect(html).toContain('Ingredients for 4 people')
    expect(html).toContain('2 × 400ml cans')    // war: "1 × 400ml can" bei jeder Gruppengröße
    expect(html).toContain('600g')              // Linsen: 150g/person × 4
  })

  it('halbiert die Kokosmilch bei 1 Person', () => {
    const html = render(1, 1)
    expect(html).toContain('Ingredients for 1 person')
    expect(html).toContain('0.5 × 400ml cans')
  })

  it('dämpft Gewürze und Öl statt sie linear zu verdoppeln', () => {
    const html = render(4, 4)
    expect(html).toContain('2.25 tsp')          // Cumin 1.5 tsp × 1.5 (nicht 3 tsp)
    expect(html).toContain('3 tbsp')            // Oil 2 tbsp × 1.5 (nicht 4 tbsp)
  })

  it('lässt keinen /person-Marker in der Anzeige stehen', () => {
    // Ein übrig gebliebenes "600g/person" würde den Nutzer erneut multiplizieren lassen.
    const html = render(4, 4)
    const amounts = [...html.matchAll(/class="ing-amt">([^<]*)</g)].map(m => m[1])
    expect(amounts.length).toBe(A12.ing.length)
    expect(amounts.filter(a => /\/person|for both/.test(a))).toEqual([])
  })

  it('skaliert mit groupFactor, nicht mit der Personenzahl', () => {
    // 2 Personen mit kleinem Appetit haben groupFactor < 2 → weniger als die Rezept-Basismenge.
    // Sonst würde die Rezept-Ansicht von der Einkaufsliste abweichen, die mit groupFactor rechnet.
    const html = render(1.5, 2)
    expect(html).toContain('Ingredients for 2 people')   // Überschrift = Köpfe
    expect(html).toContain('230g')                       // Linsen: 150g × 1.5 = 225 → auf 10 gerundet
  })
})
