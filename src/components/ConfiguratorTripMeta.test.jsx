// @vitest-environment jsdom
//
// Wizard-Schritt 1: Trip-Name + optionale Beschreibung. Steht sowohl beim Neuanlegen als
// auch beim Bearbeiten an erster Stelle (Entwickler-Ansage: "genau auch so wie wenn man
// auf create new trip drückt").
//
// Eigene Datei statt Erweiterung von ConfiguratorTab.test.jsx: am Wizard arbeitet parallel
// ein zweiter Agent (Fortschrittsleiste), getrennte Dateien vermeiden Konflikte.
//
// Harness wie ConfiguratorTab.test.jsx: react-dom/client + act, keine testing-library (CLAUDE.md).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../App.jsx'
import { markTourSeen, loadTripStore } from '../hooks/useStorage.js'

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

const seedTrip = ({ name = 'Tip Trip', description } = {}) => {
  const trip = {
    id: 't1', name,
    config: {
      days: 16, startDate: '2026-06-01', completed: true,
      people: [{ type: 'adult-m', appetite: 'medium' }, { type: 'adult-f', appetite: 'medium' }],
      diet: 'omnivore', burners: 2, fridgeSize: 'large', cookEffort: 'high',
      bamagaStop: true, bamagaDay: 9,
    },
  }
  if (description !== undefined) trip.description = description
  localStorage.setItem('cfg_trips_v1', JSON.stringify({ trips: [trip], activeTripId: 't1' }))
}

const byText = (re, sel = 'button') =>
  [...document.querySelectorAll(sel)].find(b => re.test(b.textContent))

const openEdit = () => {
  mount(<App />)
  act(() => byText(/edit/i).click())
}
const openCreate = () => {
  mount(<App />)
  act(() => document.querySelector('[data-tour="home-create"]').click())
}

const nameInput = () => document.querySelector('[data-cfg="trip-name"]')
const descInput = () => document.querySelector('[data-cfg="trip-desc"]')
const stepLabel = () => document.querySelector('.cfg-steps-label')?.textContent || ''
const waypoints = () => document.querySelectorAll('.cfg-waypoint')
const nextBtn = () => byText(/next/i)

const type = (el, value) => act(() => {
  const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set
  setter.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
})

beforeEach(() => {
  localStorage.clear()
  for (const p of ['home', 'config-name', 'config-dates', 'config-group', 'config-kitchen']) markTourSeen(p)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  unmount()
  document.body.querySelectorAll('.sheet-backdrop, .tour-layer').forEach(n => n.remove())
  vi.restoreAllMocks()
})

describe('Wizard — Trip-Name als erster Schritt', () => {
  it('der Wizard beginnt beim Namen und zählt vier Schritte', () => {
    seedTrip()
    openEdit()
    expect(nameInput()).toBeTruthy()
    expect(stepLabel()).toMatch(/1\s*(of|\/)\s*4/i)
    expect(waypoints().length).toBe(4)
  })

  it('zeigt beim Neuanlegen denselben Schritt zuerst', () => {
    openCreate()
    expect(nameInput()).toBeTruthy()
    expect(stepLabel()).toMatch(/1\s*(of|\/)\s*4/i)
  })

  it('füllt den Namen vor und lässt die Beschreibung leer', () => {
    seedTrip({ name: 'Tip Trip' })
    openEdit()
    expect(nameInput().value).toBe('Tip Trip')
    expect(descInput().value).toBe('')
  })

  it('markiert die Beschreibung sichtbar als optional', () => {
    seedTrip()
    openEdit()
    const panel = nameInput().closest('.cfg-step-panel')
    expect(panel.textContent.toLowerCase()).toContain('optional')
  })

  it('lässt Weiter zu, ohne dass etwas eingegeben werden muss', () => {
    seedTrip()
    openEdit()
    const next = nextBtn()
    expect(next.disabled).toBe(false)
    act(() => next.click())
    // Schritt 2 ist der Kalender — der Namens-Schritt ist verlassen.
    expect(nameInput()).toBeFalsy()
    expect(stepLabel()).toMatch(/2\s*(of|\/)\s*4/i)
  })

  it('speichert Name und Beschreibung beim Absenden im Trip-Store', () => {
    seedTrip()
    openEdit()
    type(nameInput(), 'Tip Trip 2027')
    type(descInput(), 'Two weeks with Sarah')

    // Bis zum letzten Schritt durchklicken und absenden.
    for (let i = 0; i < 3; i++) act(() => nextBtn().click())
    act(() => byText(/update plan|generate plan/i).click())

    const trip = loadTripStore().trips[0]
    expect(trip.name).toBe('Tip Trip 2027')
    expect(trip.description).toBe('Two weeks with Sarah')
  })

  it('fällt auf den bisherigen Namen zurück, wenn das Feld geleert wird', () => {
    seedTrip({ name: 'Tip Trip' })
    openEdit()
    type(nameInput(), '   ')
    for (let i = 0; i < 3; i++) act(() => nextBtn().click())
    act(() => byText(/update plan|generate plan/i).click())

    expect(loadTripStore().trips[0].name).toBe('Tip Trip')
  })

  it('zeigt eine gespeicherte Beschreibung auf der Trip-Karte', () => {
    seedTrip({ description: 'Fishing gear in the ute' })
    mount(<App />)
    expect(document.body.textContent).toContain('Fishing gear in the ute')
  })
})
