import { describe, it, expect } from 'vitest'
import {
  formatShoppingListAsText,
  buildWhatsAppUrl,
  buildMailtoUrl,
} from './share.js'

const SP = { id: 'cairns', name: 'Cairns' }

const SAMPLE = [
  { cat: '🥩 Fresh meat & plant proteins', items: [
    { id: 'beef-mince', name: 'Beef mince', qty: '2 kg' },
    { id: 'bacon',      name: 'Bacon',      qty: '500 g' },
  ]},
  { cat: '🥕 Fresh produce', items: [
    { id: 'onions', name: 'Onions', qty: '6' },
    { id: 'tomatoes', name: 'Tomatoes', qty: '1 kg' },
  ]},
]

describe('formatShoppingListAsText', () => {
  it('rendert Header mit Supply-Point-Name und Counts', () => {
    const text = formatShoppingListAsText({ data: SAMPLE, checked: {}, supplyPoint: SP })
    expect(text).toContain('Cape York shopping — Cairns')
    expect(text).toContain('0 / 4 done')
  })

  it('rendert alle Kategorien und Items mit ☐-Marker wenn ungecheckt', () => {
    const text = formatShoppingListAsText({ data: SAMPLE, checked: {}, supplyPoint: SP })
    expect(text).toContain('🥩 Fresh meat & plant proteins')
    expect(text).toContain('☐ Beef mince — 2 kg')
    expect(text).toContain('☐ Bacon — 500 g')
    expect(text).toContain('🥕 Fresh produce')
    expect(text).toContain('☐ Onions — 6')
  })

  it('rendert ✓-Marker für gecheckte Items', () => {
    const text = formatShoppingListAsText({
      data: SAMPLE,
      checked: { 'beef-mince': true, 'onions': true },
      supplyPoint: SP,
    })
    expect(text).toContain('✓ Beef mince — 2 kg')
    expect(text).toContain('☐ Bacon — 500 g')
    expect(text).toContain('✓ Onions — 6')
    expect(text).toContain('2 / 4 done')
  })

  it('lässt qty-Suffix weg wenn qty leer ist', () => {
    const data = [{ cat: 'Test', items: [{ id: 'x', name: 'NoQty', qty: '' }] }]
    const text = formatShoppingListAsText({ data, checked: {}, supplyPoint: SP })
    expect(text).toContain('☐ NoQty\n')
    expect(text).not.toContain('NoQty — ')
  })

  it('enthält keine Kostenschätzung mehr', () => {
    const text = formatShoppingListAsText({ data: SAMPLE, checked: {}, supplyPoint: SP })
    expect(text).not.toMatch(/💰|Estimate|AUD|\$/)
  })

  it('endet mit App-Signatur', () => {
    const text = formatShoppingListAsText({ data: SAMPLE, checked: {}, supplyPoint: SP })
    expect(text.trim().endsWith('— Cape York Trip Planner')).toBe(true)
  })

  it('handhabt leere Liste sauber', () => {
    const text = formatShoppingListAsText({ data: [], checked: {}, supplyPoint: SP })
    expect(text).toContain('0 / 0 done')
    expect(text).toContain('— Cape York Trip Planner')
  })

  it('skipt Kategorien mit leeren items', () => {
    const data = [
      { cat: 'Empty', items: [] },
      { cat: 'Has-One', items: [{ id: 'a', name: 'Apple', qty: '1' }] },
    ]
    const text = formatShoppingListAsText({ data, checked: {}, supplyPoint: SP })
    expect(text).not.toContain('Empty')
    expect(text).toContain('Has-One')
  })
})

describe('buildWhatsAppUrl', () => {
  it('encoded den Text korrekt in wa.me/?text=', () => {
    const url = buildWhatsAppUrl('Hello world & friends')
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
    expect(url).toContain('Hello%20world%20%26%20friends')
  })

  it('handhabt Newlines + Emoji', () => {
    const url = buildWhatsAppUrl('🛒 Liste\nZeile 2')
    expect(url).toContain('%F0%9F%9B%92')
    expect(url).toContain('%0A')
  })
})

describe('buildMailtoUrl', () => {
  it('baut mailto mit Subject und Body', () => {
    const url = buildMailtoUrl({ subject: 'Trip list', text: 'Body text' })
    expect(url.startsWith('mailto:?')).toBe(true)
    expect(url).toContain('subject=Trip%20list')
    expect(url).toContain('body=Body%20text')
  })

  it('kürzt sehr langen Body und fügt Truncation-Hint an', () => {
    const longText = 'x'.repeat(3000)
    const url = buildMailtoUrl({ subject: 's', text: longText })
    expect(url).toContain(encodeURIComponent('(truncated'))
  })

  it('lässt kurzen Body unangetastet', () => {
    const url = buildMailtoUrl({ subject: 's', text: 'short' })
    expect(url).not.toContain('truncated')
    expect(url).toContain('body=short')
  })
})
