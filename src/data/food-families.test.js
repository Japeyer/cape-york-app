import { describe, it, expect } from 'vitest'
import { RECIPES } from './recipes.js'
import { FOOD_FAMILIES, EMOJI_FAMILY, familyOf, familyColor } from './food-families.js'

describe('Lebensmittel-Familien', () => {
  // Der wichtigste Test der Datei. Ohne ihn fällt ein neues Rezept mit unbekanntem
  // Emoji stumm auf die Emoji-Darstellung zurück — die App sähe dann wieder gemischt
  // aus, ohne dass jemand merkt warum.
  it('deckt jedes Emoji aus recipes.js ab', () => {
    const unmapped = [...new Set(RECIPES.map(r => r.icon))].filter(e => familyOf(e) === null)
    expect(unmapped, `Nicht zugeordnete Emoji: ${unmapped.join(' ')} — in EMOJI_FAMILY ergänzen`).toEqual([])
  })

  it('ordnet jedes Emoji einer existierenden Familie zu', () => {
    const known = Object.keys(FOOD_FAMILIES)
    const bad = Object.entries(EMOJI_FAMILY).filter(([, fam]) => !known.includes(fam))
    expect(bad).toEqual([])
  })

  it('jede Familie hat Label und gültige Hex-Farbe', () => {
    for (const [id, fam] of Object.entries(FOOD_FAMILIES)) {
      expect(fam.label, `${id} ohne Label`).toBeTruthy()
      expect(fam.color, `${id} mit ungültiger Farbe`).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  // Die Farbe ist der Kanal, der bei kleinen Grössen trägt. Zwei Familien mit derselben
  // Farbe wären für den Nutzer nicht unterscheidbar.
  it('keine zwei Familien teilen sich eine Farbe', () => {
    const colors = Object.values(FOOD_FAMILIES).map(f => f.color.toUpperCase())
    expect(new Set(colors).size).toBe(colors.length)
  })

  it('jede Familie wird von mindestens einem Emoji benutzt', () => {
    const used = new Set(Object.values(EMOJI_FAMILY))
    const orphans = Object.keys(FOOD_FAMILIES).filter(f => !used.has(f))
    expect(orphans, `Familien ohne Emoji: ${orphans.join(', ')}`).toEqual([])
  })

  it('unbekanntes Emoji liefert null statt zu werfen', () => {
    expect(familyOf('🛸')).toBeNull()
    expect(familyOf('')).toBeNull()
    expect(familyOf(undefined)).toBeNull()
  })

  // Variantenselektor U+FE0F: '♻️' steht so in recipes.js, andere Emoji mal mit,
  // mal ohne. familyOf() muss beide Schreibweisen finden.
  it('findet Emoji auch ohne Variantenselektor', () => {
    expect(familyOf('♻️')).toBe('other')
    expect(familyOf('♻')).toBe('other')
  })

  it('familyColor fällt für Unbekanntes auf die Restkategorie zurück', () => {
    expect(familyColor('gibtsnicht')).toBe(FOOD_FAMILIES.other.color)
  })
})
