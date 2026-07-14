import { describe, it, expect, afterEach } from 'vitest'
import { setUserRecipes, recipeById, isUserRecipe } from './recipe-pool.js'

afterEach(() => setUserRecipes([]))

describe('recipe-pool Registry', () => {
  it('recipeById löst eingebaute Rezepte auf', () => {
    expect(recipeById('a1')?.name).toBeTruthy()
  })

  it('recipeById löst User-Rezepte nach setUserRecipes auf', () => {
    setUserRecipes([{ id: 'u-x', name: 'Mine', cat: 'a', ing: [], steps: [] }])
    expect(recipeById('u-x')?.name).toBe('Mine')
    expect(isUserRecipe('u-x')).toBe(true)
    expect(isUserRecipe('a1')).toBe(false)
  })

  it('nach Reset ist das User-Rezept weg, eingebaute bleiben', () => {
    setUserRecipes([{ id: 'u-x', name: 'Mine', cat: 'a', ing: [], steps: [] }])
    setUserRecipes([])
    expect(recipeById('u-x')).toBeNull()
    expect(recipeById('a1')).toBeTruthy()
  })

  it('unbekannte/leere id → null', () => {
    expect(recipeById('nope')).toBeNull()
    expect(recipeById(undefined)).toBeNull()
  })

  it('ignoriert kaputte User-Rezepte (ohne id)', () => {
    setUserRecipes([{ name: 'no id' }, null, { id: 'u-ok', name: 'ok' }])
    expect(recipeById('u-ok')?.name).toBe('ok')
  })
})
