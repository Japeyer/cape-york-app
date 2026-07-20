// @vitest-environment jsdom
//
// Beweist, dass das globale Absturz-Netz greift: eine werfende Kind-Komponente führt
// NICHT zum weißen Bildschirm, sondern zur Recovery-UI. Genau die Zusicherung, die
// unentdeckte Render-Bugs von "1-Stern-Bewertung" auf "Nutzer klickt weiter" absenkt.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import ErrorBoundary from './ErrorBoundary.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function Boom() { throw new Error('boom in render') }
function Fine() { return <div data-testid="fine">all good</div> }

let container, root
afterEach(() => {
  if (root) act(() => root.unmount())
  if (container) container.remove()
  container = root = null
  vi.restoreAllMocks()
})

function mount(node) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(node))
}

describe('ErrorBoundary', () => {
  it('rendert die Kinder normal, wenn kein Fehler auftritt', () => {
    mount(<ErrorBoundary><Fine /></ErrorBoundary>)
    expect(container.querySelector('[data-testid="fine"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="error-boundary"]')).toBeNull()
  })

  it('fängt einen Render-Crash und zeigt die Recovery-UI statt weißem Bildschirm', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})   // React loggt den gefangenen Fehler — erwartet
    mount(<ErrorBoundary><Boom /></ErrorBoundary>)
    const fallback = container.querySelector('[data-testid="error-boundary"]')
    expect(fallback).toBeTruthy()
    expect(container.textContent).toContain('Something went wrong')
  })

  it('bietet Recovery-Buttons an, die beim Klick nicht erneut crashen', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mount(<ErrorBoundary><Boom /></ErrorBoundary>)
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)   // Try again + Reset
    // Klick darf keine unbehandelte Exception werfen (Handler sind try/catch-gekapselt).
    expect(() => act(() => buttons[0].click())).not.toThrow()
  })

  it('zeigt die Fehlermeldung in den technischen Details (für einen freiwilligen Bug-Report)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mount(<ErrorBoundary><Boom /></ErrorBoundary>)
    expect(container.textContent).toContain('boom in render')
  })
})
