// Zentrale Rezept-Auflösung: eingebaute Rezepte (RECIPES) + user-eigene Rezepte.
// `recipeById` wird vom Generator und Inventar für ALLE id-Lookups benutzt, damit ein per Swap
// platziertes User-Rezept überall aufgelöst wird (Plan-Mahlzeit, Einkaufsliste, Inventar).
// User-Rezepte werden BEWUSST NICHT in die Auto-Round-Robin-Pools aufgenommen — sie kommen nur
// per manuellem Swap (Override) in den Plan.
import { RECIPES } from '../data/recipes.js'

const BUILT_IN_BY_ID = new Map(RECIPES.map(r => [r.id, r]))

let userById = new Map()

// Wird von App.jsx gesetzt (aus user_recipes_v1), bevor generate()/Swap rendern.
export function setUserRecipes(list) {
  userById = new Map((Array.isArray(list) ? list : []).filter(r => r && r.id).map(r => [r.id, r]))
}

export function recipeById(id) {
  return BUILT_IN_BY_ID.get(id) || userById.get(id) || null
}

export function isUserRecipe(id) {
  return userById.has(id)
}
