// @vitest-environment jsdom
//
// Bottom-Nav: die Versorgungspunkte stehen nicht mehr einzeln in der Leiste, sondern
// hinter EINEM Shopping-Eintrag, der ein Popup über der Nav aufklappt (ShopStopSheet).
// Bei genau einem Stop (nur Cairns) entfällt das Popup — Tap springt direkt auf die Liste.
// Harness wie ConfiguratorTab.test.jsx: react-dom/client + act, keine testing-library (CLAUDE.md).

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

// Trip mit frei wählbaren Resupply-Stops. `stops` = zusätzliche optionale Stops
// (Cairns ist nie abwählbar und immer dabei).
const seedTrip = ({ bamagaStop = false, enabledStops = {}, stopDays = {} } = {}) => {
  localStorage.setItem('cfg_trips_v1', JSON.stringify({
    trips: [{
      id: 't1', name: 'Tip Trip',
      config: {
        days: 16, startDate: '2026-06-01', completed: true,
        people: [{ type: 'adult-m', appetite: 'medium' }, { type: 'adult-f', appetite: 'medium' }],
        diet: 'omnivore', burners: 2, fridgeSize: 'large', cookEffort: 'high',
        bamagaStop, bamagaDay: 9, enabledStops, stopDays,
      },
    }],
    activeTripId: 't1',
  }))
}

// Home → Trip öffnen (Bottom-Nav existiert nur in der trip-active-View).
const openTrip = () => {
  mount(<App />)
  act(() => document.querySelector('[data-tour="home-open"]').click())
}

const navButtons = () => [...document.querySelectorAll('.bottom-nav .nav-btn')]
const navLabels = () => navButtons().map(b => b.querySelector('.nav-label').textContent.trim())
const shopNavBtn = () => document.querySelector('.bottom-nav [data-nav="shopping"]')
const popup = () => document.querySelector('.shopnav-pop')
const popupStops = () => [...document.querySelectorAll('.shopnav-row')].map(b => b.dataset.stop)

beforeEach(() => {
  localStorage.clear()
  // Touren stummschalten — hier geht es um die Nav, nicht ums Tutorial.
  for (const p of ['home', 'menu', 'recipes', 'inventory', 'shopping']) markTourSeen(p)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  unmount()
  document.body.querySelectorAll('.sheet-backdrop, .tour-layer, .shopnav-backdrop').forEach(n => n.remove())
  vi.restoreAllMocks()
})

describe('Bottom-Nav — Versorgungspunkte gebündelt hinter einem Shopping-Eintrag', () => {
  it('zeigt vier Einträge in der Reihenfolge Menu · Recipes · Shopping · Stock', () => {
    seedTrip({ bamagaStop: true, enabledStops: { cooktown: true, coen: true } })
    openTrip()
    expect(navLabels()).toEqual(['Menu', 'Recipes', 'Shopping', 'Stock'])
  })

  it('listet im Popup genau die aktivierten Stops in Reise-Reihenfolge', () => {
    seedTrip({ bamagaStop: true, enabledStops: { cooktown: true, coen: true } })
    openTrip()
    expect(popup()).toBeFalsy()

    act(() => shopNavBtn().click())
    expect(popup()).toBeTruthy()
    expect(popupStops()).toEqual(['cairns', 'cooktown', 'coen', 'bamaga'])
  })

  it('Auswahl im Popup öffnet die Liste des Stops und schliesst das Popup', () => {
    seedTrip({ bamagaStop: true, enabledStops: { cooktown: true } })
    openTrip()
    act(() => shopNavBtn().click())
    act(() => document.querySelector('.shopnav-row[data-stop="bamaga"]').click())

    expect(popup()).toBeFalsy()
    // Der Fortschritts-Balken der Einkaufsliste nennt den Stop.
    expect(document.querySelector('.progress-label').textContent).toMatch(/bamaga/i)
    expect(shopNavBtn().className).toMatch(/active/)
  })

  it('bei nur einem Stop (Cairns) springt der Tap direkt auf die Liste, ohne Popup', () => {
    seedTrip()
    openTrip()
    act(() => shopNavBtn().click())

    expect(popup()).toBeFalsy()
    expect(document.querySelector('.progress-label').textContent).toMatch(/cairns/i)
  })

  it('Tap auf den Hintergrund schliesst das Popup, ohne den Tab zu wechseln', () => {
    seedTrip({ bamagaStop: true, enabledStops: { cooktown: true } })
    openTrip()
    act(() => shopNavBtn().click())
    act(() => document.querySelector('.shopnav-backdrop').click())

    expect(popup()).toBeFalsy()
    // Menu ist weiterhin der aktive Tab.
    expect(navButtons()[0].className).toMatch(/active/)
  })
})
