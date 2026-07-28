// @vitest-environment jsdom
//
// ─────────────────────────────────────────────────────────────────────────
//  APP-ROBUSTHEIT — gegen "ein fremder Nutzer klickt anders als ich"
// ─────────────────────────────────────────────────────────────────────────
//
// Der Sicherheits-Sweep prüft die Generator-Logik. DIESE Datei prüft die INTERAKTIONS-
// Ebene: die klickbare React-App, in der fremde Nutzer auf Bugs stoßen, die der Entwickler
// (der immer denselben Pfad geht) nie sieht. Zwei Werkzeuge:
//
//  (A) Flow-Tests   — die zentralen Nutzerpfade müssen erreichbar bleiben (Happy Path).
//  (B) UI-Fuzzer    — klickt DETERMINISTISCH wild durch die App und stellt sicher, dass
//                     KEINE Klick-Sequenz einen Crash (Render ODER Handler) oder einen
//                     leeren Bildschirm erzeugt. Bei einem Fund wird die exakte, reproduzier-
//                     bare Klick-Sequenz ausgegeben.
//
// Läuft ohne @testing-library (nur react-dom/client + act, wie RecipesTab.test.jsx) —
// keine neue Dependency (CLAUDE.md).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { S } from './strings.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// ── jsdom-Polyfills für Browser-APIs, die die App nutzt ──
if (!window.matchMedia) window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
if (!window.scrollTo) window.scrollTo = () => {}

// Deterministischer PRNG (mulberry32) — reproduzierbare Fuzz-Läufe: gleicher Seed → gleiche Sequenz.
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

let container, root
function mount(node) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(node))
}
function cleanup() {
  if (root) { try { act(() => root.unmount()) } catch {} }
  if (container) container.remove()
  // Portale (Sheets/Overlays) hängen an document.body — Reste zwischen Tests entfernen.
  document.body.querySelectorAll('.tut-overlay, [role="dialog"]').forEach(n => n.remove())
  container = root = null
}

// Alle aktuell klickbaren Elemente — inkl. Portalen, die nach document.body rendern.
function clickables() {
  return [...document.body.querySelectorAll('button, [role="button"]')].filter(el => !el.disabled)
}
function label(el) {
  return (el.textContent || '').trim().slice(0, 24) || el.getAttribute('aria-label') || '?'
}
function boundaryTripped() {
  return !!document.body.querySelector('[data-testid="error-boundary"]')
}
function findByText(rx) {
  return clickables().find(b => rx.test(b.textContent || ''))
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(console, 'error').mockImplementation(() => {})   // erwartetes React-/App-Logging dämpfen
  window.confirm = () => true                               // destruktive Pfade (Reset/Delete) durchlaufen
  window.alert = () => {}
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

// ── (A) FLOW-TESTS — Happy Path bleibt erreichbar ──────────────────────────

describe('App-Flow — zentrale Pfade erreichbar', () => {
  it('startet im leeren Zustand mit Create-CTA', () => {
    mount(<App />)
    expect(container.textContent).toContain('No trip planned yet')
    expect(findByText(/plan your cape york trip/i)).toBeTruthy()
  })

  it('Create → Configurator-Wizard (Schritt 1) ist ohne Crash erreichbar', () => {
    mount(<ErrorBoundary><App /></ErrorBoundary>)
    // Trip anlegen — führt jetzt DIREKT in den Configurator-Wizard (kein Vorab-Tutorial mehr;
    // die Erklärungen laufen kontextuell pro Wizard-Seite).
    act(() => findByText(/plan your cape york trip/i).click())
    // Wizard Schritt 1 ist erreicht: Fortschritts-Titel + "Next" da (Generate erst auf Schritt 3,
    // "Next" bis zur Datums-Range disabled — via textContent geprüft, nicht via Klick).
    expect(boundaryTripped()).toBe(false)
    expect(container.textContent).toContain(S.config.steps[0].title)
    expect(container.textContent).toContain(S.config.wizard.next)
  })

  it('About- und Account-Ansicht öffnen ohne Crash', () => {
    mount(<ErrorBoundary><App /></ErrorBoundary>)
    const about = clickables().find(b => b.textContent.includes('ⓘ'))
    if (about) act(() => about.click())
    expect(boundaryTripped()).toBe(false)
    expect(container.textContent.length).toBeGreaterThan(0)
  })
})

// ── (B) UI-FUZZER — keine Klick-Sequenz darf crashen ───────────────────────

describe('App-Fuzzer — chaotische Klick-Sequenzen crashen nie', () => {
  // Mehrere Seeds = verschiedene Pfade durch die App. Deterministisch → ein Fund ist reproduzierbar.
  for (const seed of [1, 7, 42, 123, 2024]) {
    it(`Seed ${seed}: 60 zufällige Klicks — kein Crash, kein leerer Screen`, () => {
      mount(<ErrorBoundary><App /></ErrorBoundary>)
      const rng = mulberry32(seed)
      const history = []

      for (let step = 0; step < 60; step++) {
        // Render-Crash von der Boundary gefangen? → mit reproduzierbarer Sequenz scheitern.
        // (Deterministisch — hängt nicht am Timing, daher nach JEDEM Klick geprüft.)
        if (boundaryTripped()) {
          throw new Error(`Render-Crash (Seed ${seed}) nach: ${history.join(' → ')}`)
        }
        const btns = clickables()
        if (!btns.length) break
        const btn = btns[Math.floor(rng() * btns.length)]
        history.push(label(btn))
        // Handler-Crashes fängt KEINE Error Boundary → hier abfangen, damit die Sequenz sichtbar wird.
        try {
          act(() => btn.click())
        } catch (e) {
          throw new Error(`Handler-Crash (Seed ${seed}) bei "${history[history.length - 1]}" nach: ${history.join(' → ')}\n   ${e?.message || e}`)
        }
      }

      expect(boundaryTripped()).toBe(false)
      expect(document.body.textContent.trim().length).toBeGreaterThan(0)
    })
  }
})

// ── (B2) UI-FUZZER mit AKTIVEM Trip — die interaktionsreichen Tabs & Sheets ──
// Der Fuzzer oben startet leer und erreicht die Menu/Recipes/Shopping/Stock-Tabs nicht
// (der Weg dahin braucht eine Kalender-Range, kein simpler Button-Klick). Hier seeden wir
// einen fertigen Trip, öffnen ihn und fuzzen genau die Ebene, auf der fremde Nutzer am
// meisten interagieren: Tab-Wechsel, Swap-Sheet, Meal-Status, Rezept-Editor, Checkboxen.
// confirm→false, damit Delete/Reset den Trip nicht zerstören → maximale Tiefe.

describe('App-Fuzzer (aktiver Trip) — Tabs & Sheets crashen nie', () => {
  const seedTrip = () => {
    localStorage.setItem('cfg_trips_v1', JSON.stringify({
      trips: [{
        id: 't1', name: 'Fuzz Trip',
        config: {
          days: 16, startDate: '2026-06-01', completed: true,
          people: [{ type: 'adult-m', appetite: 'medium' }, { type: 'adult-f', appetite: 'medium' }],
          diet: 'omnivore', burners: 2, fridgeSize: 'large', bamagaStop: true, bamagaDay: 9, cookEffort: 'high',
        },
      }],
      activeTripId: 't1',
    }))
  }

  for (const seed of [3, 55, 777]) {
    it(`Seed ${seed}: aktiver Trip, 70 Klicks durch Tabs/Sheets — kein Crash`, () => {
      seedTrip()
      window.confirm = () => false   // destruktive Aktionen abbrechen → Trip bleibt für tiefe Coverage
      mount(<ErrorBoundary><App /></ErrorBoundary>)
      const open = findByText(/^open$/i)
      if (open) act(() => open.click())

      const rng = mulberry32(seed)
      const history = ['(open trip)']
      for (let step = 0; step < 70; step++) {
        if (boundaryTripped()) throw new Error(`Render-Crash (Seed ${seed}) nach: ${history.join(' → ')}`)
        const btns = clickables()
        if (!btns.length) break
        const btn = btns[Math.floor(rng() * btns.length)]
        history.push(label(btn))
        try {
          act(() => btn.click())
        } catch (e) {
          throw new Error(`Handler-Crash (Seed ${seed}) bei "${history[history.length - 1]}" nach: ${history.join(' → ')}\n   ${e?.message || e}`)
        }
      }
      expect(boundaryTripped()).toBe(false)
      expect(document.body.textContent.trim().length).toBeGreaterThan(0)
    })
  }
})
