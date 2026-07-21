// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  isLicenseValid, activateLicense, deactivate, isPremium, hasActiveLicense, MONETIZATION_ENABLED,
  activeLicenseKey, formatLicenseDisplay,
} from './premium.js'

// Vorgenerierte Codes von scripts/generate-license.mjs (alle gegen das aktuelle SECRET).
// Wenn das SECRET in premium.js und dem Script rotiert wird, müssen diese Codes neu
// generiert werden — sonst Test-Failure als Reminder dass die Verifikations-Kette
// auseinandergelaufen ist.
const VALID_KEYS = [
  'F6UK-UN4S-VDGL-XCCV',  // gen aus einem Test-Seed
  'BJP6-P6SN-Q8BN-WNK2',  // random
  'AYGE-FDWG-W953-2ZTJ',  // random batch[0]
]
const INVALID_KEYS = [
  'CY26-AAAA-AAAA-AAAA',
  'F6UK-UN4S-VDGL-XCCX',  // last char getauscht
  '',
  null,
  'kein-license-format',
]

describe('License-Key-Verifikation', () => {
  it.each(VALID_KEYS)('akzeptiert gültigen Code %s', async (key) => {
    expect(await isLicenseValid(key)).toBe(true)
  })

  it.each(INVALID_KEYS)('lehnt ungültigen Code %s ab', async (key) => {
    expect(await isLicenseValid(key)).toBe(false)
  })

  it('toleriert Lower-Case und Spaces', async () => {
    const original = VALID_KEYS[0]
    expect(await isLicenseValid(original.toLowerCase())).toBe(true)
    expect(await isLicenseValid(original.replace(/-/g, ' '))).toBe(true)
  })
})

describe('Activate / Deactivate / License-Status', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // Diese Tests prüfen die reine Kauf-/Lizenz-Logik (hasActiveLicense), unabhängig vom
  // Monetarisierungs-Flag — sonst würde der Gratis-Launch (isPremium()===true) sie verdecken.
  it('hasActiveLicense() ohne Storage = false', () => {
    expect(hasActiveLicense()).toBe(false)
  })

  it('activateLicense() schreibt Storage und aktiviert die Lizenz', async () => {
    expect(await activateLicense(VALID_KEYS[0])).toBe(true)
    expect(hasActiveLicense()).toBe(true)
    expect(activeLicenseKey()).toBeTruthy()
  })

  it('activateLicense() lehnt ungültige Codes ab und ändert nichts', async () => {
    expect(await activateLicense('CY26-AAAA-AAAA-AAAA')).toBe(false)
    expect(hasActiveLicense()).toBe(false)
  })

  it('deactivate() entfernt den Lizenz-Status', async () => {
    await activateLicense(VALID_KEYS[1])
    expect(hasActiveLicense()).toBe(true)
    deactivate()
    expect(hasActiveLicense()).toBe(false)
    expect(activeLicenseKey()).toBeNull()
  })

  it('formatLicenseDisplay rendert 4-4-4-4', () => {
    expect(formatLicenseDisplay(VALID_KEYS[0])).toBe('F6UK-UN4S-VDGL-XCCV')
    expect(formatLicenseDisplay('f6uk un4s vdgl xccv')).toBe('F6UK-UN4S-VDGL-XCCV')
  })

  it('formatLicenseDisplay returns "" für ungültige Eingabe', () => {
    expect(formatLicenseDisplay('')).toBe('')
    expect(formatLicenseDisplay('invalid')).toBe('')
  })
})

describe('Monetarisierungs-Flag (Gratis-Launch)', () => {
  beforeEach(() => localStorage.clear())

  it('MONETIZATION_ENABLED ist für den ersten Release AUS', () => {
    // Bewusster Guard: wird beim Aktivieren der Monetarisierung rot und erinnert daran,
    // die isPremium()-Erwartungen hier + das Play-Billing-Andocken zu aktualisieren.
    expect(MONETIZATION_ENABLED).toBe(false)
  })

  it('isPremium() ist bei deaktivierter Monetarisierung immer true — alle Features frei', () => {
    expect(isPremium()).toBe(true)                 // ohne jeden Kauf
  })

  it('bei Gratis-Launch bleibt der Kauf-Status getrennt (isPremium true, aber keine Lizenz)', () => {
    expect(hasActiveLicense()).toBe(false)         // niemand hat gekauft …
    expect(isPremium()).toBe(true)                 // … trotzdem alles frei
  })
})
