// @vitest-environment jsdom
//
// Seiten-Tutorial (Spotlight): erscheint EINMAL pro Seite, hebt genau eine Funktion hervor
// und verschwindet, sobald der Nutzer sie ausführt. Getestet wird das Verhalten, nicht die
// Optik — interaktiv via react-dom/client + act (keine testing-library, CLAUDE.md).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import PageTour from './PageTour.jsx'
import App from '../App.jsx'
import { getToursSeen, markTourSeen } from '../hooks/useStorage.js'
import { S } from '../strings.js'

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

// Ziel-Anker der Inventory-Seite (data-tour="inv-row" / "inv-add") als echte DOM-Knoten.
function anchors(...names) {
  const host = document.createElement('div')
  for (const n of names) {
    const b = document.createElement('button')
    b.setAttribute('data-tour', n)
    b.textContent = n
    host.appendChild(b)
  }
  document.body.appendChild(host)
  return host
}

function pop() { return document.body.querySelector('.tour-pop') }
function popText() { return pop()?.textContent || '' }
function tourBtn(rx) {
  return [...document.body.querySelectorAll('.tour-pop button')].find(b => rx.test(b.textContent || ''))
}

let host
beforeEach(() => {
  localStorage.clear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  unmount()
  host?.remove(); host = null
  document.body.querySelectorAll('.tour-layer').forEach(n => n.remove())
  vi.restoreAllMocks()
})

describe('PageTour — erster Besuch', () => {
  it('zeigt den ersten Schritt mit Spotlight auf dem Ziel-Element', () => {
    host = anchors('inv-row', 'inv-add')
    mount(<PageTour page="inventory" />)

    expect(pop()).toBeTruthy()
    expect(popText()).toContain(S.tours.inventory.row.title)
    // Abdunklung (4 Panels) + Hervorhebungs-Ring liegen über der Seite
    expect(document.body.querySelectorAll('.tour-dim').length).toBe(4)
    expect(document.body.querySelector('.tour-ring')).toBeTruthy()
  })

  it('erscheint NICHT, wenn die Seite schon gesehen wurde', () => {
    host = anchors('inv-row', 'inv-add')
    markTourSeen('inventory')
    mount(<PageTour page="inventory" />)
    expect(pop()).toBeFalsy()
  })

  it('erscheint nicht für Seiten ohne Tutorial', () => {
    host = anchors('inv-row')
    mount(<PageTour page="about" />)
    expect(pop()).toBeFalsy()
  })
})

// Der Tap wird in der Capture-Phase gesehen und per Microtask weitergeschaltet (damit
// Reacts Re-Render zuerst läuft) → in Tests async act, sonst prüft man den alten Stand.
const tap = (el) => act(async () => { el.click() })

describe('PageTour — der Schritt endet mit der Aktion', () => {
  it('Tap auf das hervorgehobene Element schaltet zum nächsten Schritt', async () => {
    host = anchors('inv-row', 'inv-add')
    mount(<PageTour page="inventory" />)
    expect(popText()).toContain(S.tours.inventory.row.title)

    await tap(host.querySelector('[data-tour="inv-row"]'))
    expect(popText()).toContain(S.tours.inventory.add.title)
  })

  it('nach dem letzten Schritt verschwindet das Tutorial und gilt als gesehen', async () => {
    host = anchors('inv-row', 'inv-add')
    mount(<PageTour page="inventory" />)

    await tap(host.querySelector('[data-tour="inv-row"]'))
    await tap(host.querySelector('[data-tour="inv-add"]'))

    expect(pop()).toBeFalsy()
    expect(getToursSeen()).toContain('inventory')
  })

  it('Klick NEBEN das Ziel beendet den Schritt nicht', async () => {
    host = anchors('inv-row', 'inv-add')
    mount(<PageTour page="inventory" />)
    await tap(document.body)
    expect(popText()).toContain(S.tours.inventory.row.title)
  })
})

describe('PageTour — Notausgänge', () => {
  it('"Skip tips" beendet das Tutorial und merkt sich das', () => {
    host = anchors('inv-row', 'inv-add')
    mount(<PageTour page="inventory" />)
    act(() => tourBtn(/skip/i).click())
    expect(pop()).toBeFalsy()
    expect(getToursSeen()).toContain('inventory')
  })

  it('"Next" springt weiter, ohne die Funktion auszuführen', () => {
    host = anchors('inv-row', 'inv-add')
    mount(<PageTour page="inventory" />)
    act(() => tourBtn(/next/i).click())
    expect(popText()).toContain(S.tours.inventory.add.title)
    // letzter Schritt → Button heisst jetzt "Got it"
    expect(tourBtn(/got it/i)).toBeTruthy()
  })

  it('Seite verlassen, nachdem ein Schritt sichtbar war → gilt als gesehen', () => {
    host = anchors('inv-row', 'inv-add')
    mount(<PageTour page="inventory" />)
    expect(pop()).toBeTruthy()
    unmount()
    expect(getToursSeen()).toContain('inventory')
  })
})

describe('PageTour — Robustheit', () => {
  it('überspringt Schritte, deren Funktion auf der Seite nicht sichtbar ist', () => {
    host = anchors('inv-add')            // kein "inv-row" (leerer Stock-Tab)
    mount(<PageTour page="inventory" />)
    expect(popText()).toContain(S.tours.inventory.add.title)
  })

  it('leere Seite: nichts anzeigbar → NICHT als gesehen abhaken (kommt beim nächsten Besuch)', () => {
    host = anchors()                     // gar kein Ziel vorhanden
    mount(<PageTour page="inventory" />)
    expect(pop()).toBeFalsy()
    expect(getToursSeen()).not.toContain('inventory')
    unmount()
    expect(getToursSeen()).not.toContain('inventory')
  })

  // Sheet auf/zu wird per MutationObserver bemerkt → Callback ist ein Microtask,
  // deshalb async act (sonst misst das Tutorial erst beim nächsten Ereignis nach).
  it('pausiert, solange ein Bottom-Sheet offen ist, und kommt danach zurück', async () => {
    host = anchors('inv-row', 'inv-add')
    mount(<PageTour page="inventory" />)
    expect(pop()).toBeTruthy()

    const sheet = document.createElement('div')
    sheet.className = 'sheet-backdrop'
    await act(async () => { document.body.appendChild(sheet) })
    expect(pop()).toBeFalsy()

    await act(async () => { sheet.remove() })
    expect(pop()).toBeTruthy()
  })

  // jsdom rechnet kein Layout (alle Rects = 0) — die Geometrie wird deshalb mit
  // gefälschten Rects geprüft: Spotlight muss auf dem Element sitzen, das Popup auf der
  // Seite mit Platz.
  const fakeRect = (el, top, height) => {
    el.getBoundingClientRect = () => ({ top, left: 20, width: 200, height, right: 220, bottom: top + height })
  }

  it('Spotlight liegt exakt auf dem Element, Popup darunter wenn Platz ist', () => {
    host = anchors('inv-row', 'inv-add')
    fakeRect(host.querySelector('[data-tour="inv-row"]'), 80, 40)
    mount(<PageTour page="inventory" />)

    const ring = document.querySelector('.tour-ring')
    expect(ring.style.top).toBe('74px')       // 80 − 6px Luft
    expect(ring.style.height).toBe('52px')    // 40 + 2× 6px
    expect(pop().style.top).toBeTruthy()
    expect(pop().style.bottom).toBeFalsy()
  })

  it('Popup weicht nach oben aus, wenn das Element am unteren Rand klebt', () => {
    host = anchors('inv-row', 'inv-add')
    fakeRect(host.querySelector('[data-tour="inv-row"]'), window.innerHeight - 60, 40)
    mount(<PageTour page="inventory" />)

    expect(pop().style.bottom).toBeTruthy()
    expect(pop().style.top).toBeFalsy()
  })

  it('kaputter localStorage legt das Tutorial nicht lahm', () => {
    host = anchors('inv-row', 'inv-add')
    localStorage.setItem('ui_tours_v1', '{nope')
    expect(() => mount(<PageTour page="inventory" />)).not.toThrow()
    expect(pop()).toBeTruthy()
  })
})

// ── Integration: greifen die data-tour-Anker in der ECHTEN App? ────────────
// Der Rest der Datei testet PageTour isoliert — hier läuft die App selbst, damit ein
// umbenannter/verschobener Anker (Menu-Tag → Swap-Button) sofort auffällt.

describe('PageTour — in der echten App', () => {
  const seedTrip = () => {
    localStorage.setItem('cfg_trips_v1', JSON.stringify({
      trips: [{
        id: 't1', name: 'Tour Trip',
        config: {
          days: 16, startDate: '2026-06-01', completed: true,
          people: [{ type: 'adult-m', appetite: 'medium' }, { type: 'adult-f', appetite: 'medium' }],
          diet: 'omnivore', burners: 2, fridgeSize: 'large', bamagaStop: true, bamagaDay: 9, cookEffort: 'high',
        },
      }],
      activeTripId: 't1',
    }))
  }
  const openTrip = () => document.querySelector('[data-tour="home-open"]').click()
  const navBtn = (label) => [...document.querySelectorAll('.nav-btn')].find(b => (b.textContent || '').includes(label))

  // ── Trip-Erstellung: der Wizard erklärt jeden Schritt am Element ──
  // Der Datums-Schritt endet NICHT am Tap (eine Range braucht zwei Taps), sondern am
  // Zustand — und die Folge-Schritte zeigen INS offene DaySheet.
  it('Wizard Schritt 1: Kalender → Trip-Tag → Resupply-Stop → Restaurant (im DaySheet)', async () => {
    seedTrip()                                   // fertiger Trip → "Edit" öffnet den Wizard
    markTourSeen('home')
    mount(<App />)
    act(() => [...document.querySelectorAll('button')].find(b => /edit/i.test(b.textContent)).click())

    // Range steht schon (Edit-Modus) → Kalender-Schritt entfällt, der Tag ist dran.
    expect(popText()).toContain(S.tours['config-dates'].day.title)
    const day = document.querySelector('[data-tour="cfg-tripday"]')
    expect(day).toBeTruthy()

    await tap(day)                               // DaySheet öffnet
    expect(document.querySelector('.sheet-backdrop')).toBeTruthy()
    // Tutorial pausiert NICHT, weil das Ziel im Sheet liegt:
    expect(popText()).toContain(S.tours['config-dates'].stop.title)
    expect(document.querySelector('[data-tour="cfg-stop"]')).toBeTruthy()

    await tap(document.querySelector('[data-tour="cfg-stop"] button'))
    expect(popText()).toContain(S.tours['config-dates'].restaurant.title)
    expect(document.querySelector('[data-tour="cfg-restaurant"]')).toBeTruthy()
  })

  it('Wizard Schritt 1 ohne Datum: Kalender-Schritt bleibt stehen, bis eine Range steht', () => {
    mount(<App />)                               // leerer Start
    act(() => document.querySelector('[data-tour="home-create"]').click())

    expect(popText()).toContain(S.tours['config-dates'].calendar.title)
    // Ein einzelner Tag-Tap ist erst der Start der Range → Schritt bleibt stehen.
    const firstDay = document.querySelector('.cal-grid .cal-cell:not(.cal-empty)')
    act(() => firstDay.click())
    expect(popText()).toContain(S.tours['config-dates'].calendar.title)
  })

  it('Wizard Schritt 2 + 3: Gruppe/Diät und Kochaufwand/Kühlschrank haben eigene Tipps', () => {
    seedTrip()
    markTourSeen('home')
    markTourSeen('config-dates')
    mount(<App />)
    act(() => [...document.querySelectorAll('button')].find(b => /edit/i.test(b.textContent)).click())
    expect(pop()).toBeFalsy()                    // Schritt 1 schon gesehen

    act(() => [...document.querySelectorAll('button')].find(b => /next/i.test(b.textContent)).click())
    expect(popText()).toContain(S.tours['config-group'].people.title)
    act(() => tourBtn(/skip/i).click())

    act(() => [...document.querySelectorAll('button')].find(b => /next/i.test(b.textContent)).click())
    expect(popText()).toContain(S.tours['config-kitchen'].effort.title)
    expect(document.querySelector('[data-tour="cfg-generate"]')).toBeTruthy()
  })

  it('Home: Spotlight liegt auf der Trip-Karte', () => {
    seedTrip()
    mount(<App />)
    expect(popText()).toContain(S.tours.home.open.title)
  })

  it('Menu: Tag-1-Karte → Tap öffnet den Tag und der Spotlight wandert zum Swap-Button', async () => {
    seedTrip()
    markTourSeen('home')                       // Home-Tipp weg, wir wollen den Menu-Tipp
    mount(<App />)
    act(() => openTrip())

    expect(popText()).toContain(S.tours.menu.day.title)
    const dayHead = document.querySelector('[data-tour="menu-day"]')
    expect(dayHead).toBeTruthy()

    await tap(dayHead)
    expect(popText()).toContain(S.tours.menu.swap.title)
    expect(document.querySelector('[data-tour="menu-swap"]')).toBeTruthy()
  })

  it('Tab-Wechsel: jede Seite bringt ihren eigenen Tipp, gesehene kommen nicht wieder', () => {
    seedTrip()
    markTourSeen('home')
    mount(<App />)
    act(() => openTrip())
    act(() => tourBtn(/skip/i).click())        // Menu-Tipp weg
    expect(pop()).toBeFalsy()

    act(() => navBtn(S.app.tabs.recipes).click())
    expect(popText()).toContain(S.tours.recipes.card.title)

    act(() => navBtn(S.app.tabs.menu).click())
    expect(pop()).toBeFalsy()                  // Menu war schon dran
  })

  // Vor dem ersten Einkauf ist der Stock-Tab leer → der "−1"-Schritt hat kein Ziel und
  // entfällt; erklärt wird der Empty-State (Einkauf rein / gekocht wieder raus).
  it('Stock-Tab ohne Einkauf: der Tipp erklärt, wie sich der Bestand füllt', () => {
    seedTrip()
    markTourSeen('home')
    mount(<App />)
    act(() => openTrip())
    act(() => tourBtn(/skip/i).click())
    act(() => navBtn(S.app.tabs.inventory).click())

    expect(popText()).toContain(S.tours.inventory.empty.title)
    expect(document.querySelector('[data-tour="inv-empty"]')).toBeTruthy()
    // Der "−1"-Schritt hat kein Ziel und wird übersprungen → nächster ist "Add an item".
    act(() => tourBtn(/next/i).click())
    expect(popText()).toContain(S.tours.inventory.add.title)
  })
})
