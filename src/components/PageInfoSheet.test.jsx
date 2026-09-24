// @vitest-environment jsdom
//
// Einführungstexte raus, ⓘ rein. Die Seiten trugen oben je einen Satz, der erklärte was
// man dort tun kann — dasselbe, was das Spotlight-Tutorial ohnehin zeigt. Ersatz ist ein
// ⓘ oben rechts (wie auf der Startseite), das die Tutorial-Inhalte der Seite als Sheet
// nachliefert. Quelle ist S.tours[page], es gibt also keine zweite Textfassung.
//
// Harness wie ConfiguratorTab.test.jsx: react-dom/client + act, keine testing-library (CLAUDE.md).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../App.jsx'
import { markTourSeen } from '../hooks/useStorage.js'
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

const seedTrip = () => {
  localStorage.setItem('cfg_trips_v1', JSON.stringify({
    trips: [{
      id: 't1', name: 'Tip Trip',
      config: {
        days: 16, startDate: '2026-06-01', completed: true,
        people: [{ type: 'adult-m', appetite: 'medium' }, { type: 'adult-f', appetite: 'medium' }],
        diet: 'omnivore', burners: 2, fridgeSize: 'large', cookEffort: 'high',
        bamagaStop: true, bamagaDay: 9,
      },
    }],
    activeTripId: 't1',
  }))
}

const openTrip = () => {
  mount(<App />)
  act(() => document.querySelector('[data-tour="home-open"]').click())
}
const navBtn = (label) =>
  [...document.querySelectorAll('.bottom-nav .nav-btn')].find(b => (b.textContent || '').includes(label))
const goTo = (label) => act(() => navBtn(label).click())

const infoBtn = () => document.querySelector('[data-info="page"]')
const openInfo = () => act(() => infoBtn().click())
const sheet = () => document.querySelector('.info-sheet')
const sheetText = () => sheet()?.textContent || ''
const pageText = () => document.querySelector('.content')?.textContent || ''

beforeEach(() => {
  localStorage.clear()
  // Touren stummschalten — hier geht es um das ⓘ, nicht um den Spotlight.
  for (const p of ['home', 'menu', 'recipes', 'inventory', 'shopping']) markTourSeen(p)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  unmount()
  document.body.querySelectorAll('.sheet-backdrop, .tour-layer, .shopnav-backdrop').forEach(n => n.remove())
  vi.restoreAllMocks()
})

describe('Seiten-Info statt Einführungstext', () => {
  it('jede Trip-Seite hat oben rechts ein ⓘ', () => {
    seedTrip()
    openTrip()
    expect(infoBtn()).toBeTruthy()
    for (const label of ['Recipes', 'Stock']) {
      goTo(label)
      expect(infoBtn()).toBeTruthy()
    }
  })

  it('das ⓘ zeigt die Tutorial-Inhalte der aktuellen Seite', () => {
    seedTrip()
    openTrip()
    expect(sheet()).toBeFalsy()

    openInfo()
    expect(sheetText()).toContain(S.tours.menu.day.title)
    expect(sheetText()).toContain(S.tours.menu.swap.title)
  })

  it('der Inhalt wechselt mit der Seite', () => {
    seedTrip()
    openTrip()
    goTo('Recipes')
    openInfo()
    expect(sheetText()).toContain(S.tours.recipes.card.title)
    expect(sheetText()).not.toContain(S.tours.menu.swap.title)
  })

  it('lässt die Handlungsaufforderung des Spotlights weg', () => {
    seedTrip()
    openTrip()
    openInfo()
    // `cta` ("Tap the highlighted day") ergibt ohne Spotlight keinen Sinn.
    expect(sheetText()).not.toContain(S.tours.menu.day.cta)
  })

  it('Recipes trägt den alten Einführungssatz nicht mehr', () => {
    seedTrip()
    openTrip()
    goTo('Recipes')
    expect(pageText()).not.toContain('swap them onto any day in the planner')
  })

  it('Stock trägt den alten Einführungssatz nicht mehr', () => {
    seedTrip()
    openTrip()
    goTo('Stock')
    expect(pageText()).not.toContain('What you have on board')
  })

  it('die Stop-Notiz steht nicht mehr auf der Einkaufsliste, aber im ⓘ', () => {
    seedTrip()
    openTrip()
    goTo('Shopping')          // ein Stop mehr als Cairns → Popup
    act(() => document.querySelector('.shopnav-row[data-stop="cairns"]').click())

    expect(pageText()).not.toContain('Last big supermarket')
    openInfo()
    expect(sheetText()).toContain('Last big supermarket')
    expect(sheetText()).toContain(S.tours.shopping.tick.title)
  })

  it('das Sheet lässt sich wieder schliessen', () => {
    seedTrip()
    openTrip()
    openInfo()
    expect(sheet()).toBeTruthy()
    act(() => document.querySelector('.info-sheet .sheet-close').click())
    expect(sheet()).toBeFalsy()
  })
})
