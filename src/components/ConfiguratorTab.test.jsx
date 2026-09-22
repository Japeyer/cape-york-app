// @vitest-environment jsdom
//
// Configurator (Wizard) — hier: der Kalender-Tipp unter dem Datums-Schritt. Der passive
// gelbe Hinweis wurde laut Entwickler oft übersehen — er ist jetzt eine antippbare Karte,
// die das DaySheet eines Beispiel-Tags öffnet (Mechanik der Zwischenstops zeigen statt
// nur beschreiben). Harness wie PageTour.test.jsx: react-dom/client + act, keine
// testing-library (CLAUDE.md).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../App.jsx'
import { markTourSeen } from '../hooks/useStorage.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
if (!window.matchMedia) window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
if (!window.scrollTo) window.scrollTo = () => {}

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

const seedTrip = () => {
  localStorage.setItem('cfg_trips_v1', JSON.stringify({
    trips: [{
      id: 't1', name: 'Tip Trip',
      config: {
        days: 16, startDate: '2026-06-01', completed: true,
        people: [{ type: 'adult-m', appetite: 'medium' }, { type: 'adult-f', appetite: 'medium' }],
        diet: 'omnivore', burners: 2, fridgeSize: 'large', bamagaStop: true, bamagaDay: 9, cookEffort: 'high',
      },
    }],
    activeTripId: 't1',
  }))
}

beforeEach(() => {
  localStorage.clear()
  // Touren stummschalten — hier geht es um die Wizard-UI selbst, nicht ums Tutorial.
  for (const p of ['home', 'config-dates', 'config-group', 'config-kitchen']) markTourSeen(p)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  unmount()
  document.body.querySelectorAll('.sheet-backdrop, .tour-layer').forEach(n => n.remove())
  vi.restoreAllMocks()
})

describe('Configurator — Kalender-Tipp ist eine antippbare Karte', () => {
  const openWizard = () => {
    mount(<App />)
    act(() => [...document.querySelectorAll('button')].find(b => /edit/i.test(b.textContent)).click())
    // Der Wizard öffnet auf dem Namens-Schritt (Trip-Name + Beschreibung) — der
    // Kalender-Tipp, um den es hier geht, sitzt einen Schritt weiter.
    act(() => [...document.querySelectorAll('button')].find(b => /next/i.test(b.textContent)).click())
  }

  it('der Tipp ist ein Button und öffnet das DaySheet eines Beispiel-Tags', () => {
    seedTrip()
    openWizard()
    const tip = document.querySelector('button.cfg-calendar-tip')
    expect(tip).toBeTruthy()

    act(() => tip.click())
    expect(document.querySelector('.sheet-backdrop')).toBeTruthy()
    // Das Sheet zeigt die Stop-Zeilen (Beispiel-Tag liegt in der Trip-Mitte, nie Tag 1/letzter)
    expect(document.querySelector('[data-tour="cfg-stop"]')).toBeTruthy()
  })
})
