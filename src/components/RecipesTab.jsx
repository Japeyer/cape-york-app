import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { RECIPES } from '../data/recipes.js'
import { S } from '../strings.js'
import PremiumGate from './PremiumGate.jsx'
import VeganBadge from './VeganBadge.jsx'
import { FREE_LIMITS } from '../lib/premium.js'
import { scaleAmountLabel, BASE_SERVINGS } from '../lib/generator.js'

function allergenLabels(ids) {
  return ids.map(id => S.config.allergenOptions[id]?.label.toLowerCase() ?? id)
}

const EDITOR_CATS = ['f', 'm', 'a']
const EDITOR_DIETS = ['omnivore', 'vegetarian', 'vegan']
const EDITOR_BURNERS = [1, 2, 3]

// Editor für eigene Rezepte. Portaled (wie MealStatusSheet) → über der Bottom-Nav.
function RecipeEditorSheet({ open, recipe, onSave, onClose }) {
  const editing = !!recipe
  const [name, setName] = useState('')
  const [cat, setCat] = useState('a')
  const [diet, setDiet] = useState('omnivore')
  const [icon, setIcon] = useState('🍽')
  const [burners, setBurners] = useState(1)
  const [ings, setIngs] = useState([['', '']])
  const [steps, setSteps] = useState('')

  useEffect(() => {
    if (!open) return
    if (recipe) {
      setName(recipe.name || ''); setCat(recipe.cat || 'a'); setDiet(recipe.diet || 'omnivore')
      setIcon(recipe.icon || '🍽'); setBurners(recipe.burners || 1)
      setIngs(recipe.ing?.length ? recipe.ing.map(x => [x[0] || '', x[1] || '']) : [['', '']])
      setSteps((recipe.steps || []).join('\n'))
    } else {
      setName(''); setCat('a'); setDiet('omnivore'); setIcon('🍽'); setBurners(1); setIngs([['', '']]); setSteps('')
    }
  }, [open, recipe])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null

  const setIng = (i, j, v) => setIngs(prev => prev.map((row, ri) => (ri === i ? (j === 0 ? [v, row[1]] : [row[0], v]) : row)))
  const addIng = () => setIngs(prev => [...prev, ['', '']])
  const removeIng = (i) => setIngs(prev => (prev.length > 1 ? prev.filter((_, ri) => ri !== i) : prev))
  const cleanIngs = ings.map(([n, a]) => [n.trim(), a.trim()]).filter(([n]) => n)
  const valid = name.trim() && cleanIngs.length > 0

  const save = () => {
    if (!valid) return
    onSave({
      id: recipe?.id || ('u-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)),
      cat, icon: icon.trim() || '🍽', name: name.trim(), diet, burners,
      time: recipe?.time || '', tools: recipe?.tools || '', kcal: recipe?.kcal || '',
      cooling: recipe?.cooling || 'medium', effort: recipe?.effort || 'easy',
      ing: cleanIngs,
      steps: steps.split('\n').map(s => s.trim()).filter(Boolean),
    })
    onClose()
  }

  return createPortal(
    <div className="ms-overlay" role="dialog" aria-modal="true" aria-label={editing ? S.recipes.editor.editTitle : S.recipes.editor.newTitle} onClick={onClose}>
      <div className="ms-sheet" onClick={e => e.stopPropagation()}>
        <div className="ms-handle" aria-hidden="true" />
        <div className="ms-head">
          <div className="ms-title">{editing ? S.recipes.editor.editTitle : S.recipes.editor.newTitle}</div>
          <button className="ms-close" aria-label={S.recipes.editor.close} onClick={onClose}>✕</button>
        </div>
        <div className="ms-body">
          <label className="re-label">{S.recipes.editor.nameLabel}</label>
          <div className="re-namerow">
            <input className="re-icon" value={icon} onChange={e => setIcon(e.target.value)} aria-label={S.recipes.editor.iconLabel} />
            <input className="re-input" value={name} onChange={e => setName(e.target.value)} placeholder={S.recipes.editor.namePh} autoFocus />
          </div>

          <label className="re-label">{S.recipes.editor.mealTypeLabel}</label>
          <div className="re-pills">
            {EDITOR_CATS.map(c => (
              <button key={c} className={`re-pill${cat === c ? ' active' : ''}`} onClick={() => setCat(c)}>
                {S.recipes.sections[c === 'f' ? 'breakfast' : c === 'm' ? 'lunch' : 'dinner']}
              </button>
            ))}
          </div>

          <label className="re-label">{S.recipes.editor.dietLabel}</label>
          <div className="re-pills">
            {EDITOR_DIETS.map(d => (
              <button key={d} className={`re-pill${diet === d ? ' active' : ''}`} onClick={() => setDiet(d)}>
                {S.config.dietOptions[d].label}
              </button>
            ))}
          </div>

          <label className="re-label">{S.recipes.editor.burnersLabel}</label>
          <div className="re-pills">
            {EDITOR_BURNERS.map(b => (
              <button key={b} className={`re-pill${burners === b ? ' active' : ''}`} onClick={() => setBurners(b)}>{b}</button>
            ))}
          </div>

          <label className="re-label">{S.recipes.editor.ingLabel}</label>
          {/* Ohne diesen Hinweis rät der Nutzer, worauf sich "1 can" bezieht — und die App
              skaliert seine Rezepte dann falsch auf die Gruppe. */}
          <div className="re-hint">{S.recipes.editor.ingHint}</div>
          {ings.map((row, i) => (
            <div key={i} className="re-ingrow">
              <input className="re-input re-ing-name" value={row[0]} onChange={e => setIng(i, 0, e.target.value)} placeholder={S.recipes.editor.ingNamePh} />
              <input className="re-input re-ing-amt" value={row[1]} onChange={e => setIng(i, 1, e.target.value)} placeholder={S.recipes.editor.ingAmtPh} />
              <button className="re-ing-del" aria-label={S.recipes.editor.removeIng} onClick={() => removeIng(i)}>✕</button>
            </div>
          ))}
          <button className="re-add-ing" onClick={addIng}>+ {S.recipes.editor.addIng}</button>

          <label className="re-label">{S.recipes.editor.stepsLabel}</label>
          <textarea className="re-textarea" value={steps} onChange={e => setSteps(e.target.value)} placeholder={S.recipes.editor.stepsPh} rows={5} />
        </div>
        <div className="ms-foot">
          <button className="ms-save" disabled={!valid} onClick={save}>{S.recipes.editor.save}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function RecipeCard({ recipe, persons, factor, toppingAllergens, focused }) {
  const [open, setOpen] = useState(!!focused)
  // Wird die Karte per Link fokussiert (aus Menu/Einkaufsliste), aufklappen — auch wenn sie
  // schon gemountet war. Schließt nie automatisch (nur der User klappt zu).
  useEffect(() => { if (focused) setOpen(true) }, [focused])

  return (
    <div className="recipe-card" data-recipe={recipe.id}>
      <div className="recipe-head" onClick={() => setOpen(o => !o)}>
        <div className="recipe-icon">{recipe.icon}</div>
        <div className="recipe-info">
          <div className="recipe-name">
            {recipe.name}
            {recipe.diet === 'vegan' && <VeganBadge />}
          </div>
          <div className="recipe-meta">
            {recipe.time && <span className="meta-chip">⏱ {recipe.time}</span>}
            {recipe.tools && <span className="meta-chip">🍳 {recipe.tools}</span>}
            {recipe.kcal && <span className="meta-chip">🔥 {recipe.kcal}</span>}
          </div>
        </div>
        <div className={`recipe-arrow${open ? ' open' : ''}`}>▾</div>
      </div>

      {toppingAllergens?.length > 0 && (
        <div className="topping-warning topping-warning-card">
          {S.menu.toppingWarning({ allergenLabels: allergenLabels(toppingAllergens) })}
        </div>
      )}

      {open && (
        <div className="recipe-body">
          <div className="recipe-sec">{S.recipes.ingredients({ persons })}</div>
          {recipe.ing.map(([name, amt], i) => (
            <div key={i} className="recipe-ing">
              <span className="ing-name">{name}</span>
              {/* Auf die Gruppe umgerechnet — die Überschrift verspricht "for N people".
                  Skaliert wird mit groupFactor (nicht persons), damit die Menge exakt der
                  Einkaufsliste entspricht: die rechnet mit demselben Faktor. */}
              <span className="ing-amt">{scaleAmountLabel(amt, factor, name)}</span>
            </div>
          ))}

          <div className="recipe-sec">{S.recipes.steps}</div>
          {recipe.steps.map((step, i) => (
            <div key={i} className="recipe-step">
              <div className="step-num">{i + 1}</div>
              <div className="step-text">{step}</div>
            </div>
          ))}

          <div className="recipe-tip">💡 {recipe.tip}</div>
        </div>
      )}
    </div>
  )
}

const CAT_LABELS = { f: S.recipes.sections.breakfast, m: S.recipes.sections.lunch, a: S.recipes.sections.dinner }

// `factor` = groupFactor aus dem Generator (reeller Skalar, berücksichtigt Appetit/Alter).
// Default BASE_SERVINGS: ohne Faktor werden die Rezepte so gezeigt, wie sie geschrieben sind.
export default function RecipesTab({ plan = [], persons = 2, factor = BASE_SERVINGS, focusRecipeId = null, onFocusHandled, userRecipes = [], onSaveRecipe, onDeleteRecipe, premium = false, onUpgrade }) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState(null)   // Rezept-Objekt (Edit) oder null (Neu)
  const openEditor = (recipe) => { setEditing(recipe || null); setEditorOpen(true) }

  // Von der Einkaufsliste / Menu verlinkt: das fokussierte Rezept aufklappen (defaultOpen via
  // focusRecipeId) + hinscrollen, dann Fokus zurücksetzen (damit ein Tab-Wechsel nicht erneut springt).
  useEffect(() => {
    if (!focusRecipeId) return
    const id = focusRecipeId
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector(`[data-recipe="${id}"]`)
      if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' })
      onFocusHandled?.()   // erst nach dem Scroll den Fokus zurücksetzen
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRecipeId])

  // Nur Rezepte zeigen, die im aktuellen Plan vorkommen — die App ist Reise-Begleiter,
  // kein Kochbuch. Auf 360 px Display ist die volle Library-Liste Lärm.
  // Free-Version: nur Rezepte aus den ersten FREE_LIMITS.maxPlanDays Tagen sind
  // direkt sichtbar; alle anderen werden geblurrt + Premium-Sticker.
  const freeRecipeIds = useMemo(() => {
    if (premium) return null
    const cap = Math.min(FREE_LIMITS.maxPlanDays, plan.length)
    const ids = new Set()
    for (let i = 0; i < cap; i++) {
      const d = plan[i]
      for (const r of [d?.f?.r, d?.m?.r, d?.ab?.r]) if (r) ids.add(r)
    }
    return ids
  }, [plan, premium])

  const usedIds = useMemo(
    () => new Set(plan.flatMap(d => [d.f?.r, d.m?.r, d.ab?.r].filter(Boolean))),
    [plan]
  )
  // Topping-Allergene pro Rezept aus dem Plan ziehen — Rezept kann an mehreren Tagen
  // vorkommen, ta ist immer dasselbe (kommt aus dem Allergen-Filter im Generator).
  const toppingMap = useMemo(() => {
    const map = new Map()
    for (const d of plan) {
      for (const meal of [d.f, d.m, d.ab]) {
        if (meal?.r && meal.ta?.length && !map.has(meal.r)) map.set(meal.r, meal.ta)
      }
    }
    return map
  }, [plan])
  const filtered = RECIPES.filter(r => usedIds.has(r.id))
  const isLocked = (id) => freeRecipeIds != null && !freeRecipeIds.has(id)

  // "My recipes"-Bibliothek — immer sichtbar (free), mit Edit/Delete + "New recipe".
  const myRecipesBlock = (
    <div className="my-recipes">
      <div className="shdr">{S.recipes.myRecipesLabel}</div>
      {userRecipes.length === 0 && <div className="my-recipes-empty">{S.recipes.myRecipesEmpty}</div>}
      {userRecipes.map(r => (
        <div key={r.id} className="my-recipe">
          <RecipeCard recipe={r} persons={persons} factor={factor} focused={r.id === focusRecipeId} />
          <div className="my-recipe-actions">
            <button className="my-recipe-edit" onClick={() => openEditor(r)}>✎ {S.recipes.editor.editBtn}</button>
            <button
              className="my-recipe-del"
              onClick={() => { if (window.confirm(S.recipes.deleteConfirm({ name: r.name }))) onDeleteRecipe?.(r.id) }}
            >
              🗑 {S.recipes.editor.deleteBtn}
            </button>
          </div>
        </div>
      ))}
      <button className="re-newbtn" onClick={() => openEditor(null)}>+ {S.recipes.newRecipeCta}</button>
    </div>
  )

  return (
    <div style={{ paddingTop: 8 }}>
      {myRecipesBlock}
      {filtered.length === 0 && <div className="empty-state">{S.recipes.empty}</div>}
      {['f', 'm', 'a'].map(cat => {
        const items = filtered.filter(r => r.cat === cat)
        if (!items.length) return null
        // Free-Rezepte zuerst, dann Premium-Sub-Divider, dann Premium-Rezepte.
        // Für Premium-User: keine Sortierung nach locked-Status nötig (alle gleich).
        const free = premium ? items : items.filter(r => !isLocked(r.id))
        const lockedItems = premium ? [] : items.filter(r => isLocked(r.id))
        return (
          <div key={cat}>
            <div className="shdr">{CAT_LABELS[cat]}</div>
            {free.map(r => (
              <RecipeCard
                key={r.id}
                recipe={r}
                persons={persons}
                factor={factor}
                toppingAllergens={toppingMap.get(r.id)}
                focused={r.id === focusRecipeId}
              />
            ))}
            {lockedItems.length > 0 && (
              <>
                <div className="recipes-premium-divider">
                  <span className="recipes-premium-divider-line" />
                  <span className="recipes-premium-divider-label">
                    🔒 {S.recipes.premiumDivider({ count: lockedItems.length })}
                  </span>
                  <span className="recipes-premium-divider-line" />
                </div>
                {lockedItems.map(r => (
                  <PremiumGate key={r.id} active={true} onUpgrade={onUpgrade}>
                    <RecipeCard
                      recipe={r}
                      persons={persons}
                      factor={factor}
                      toppingAllergens={toppingMap.get(r.id)}
                      focused={r.id === focusRecipeId}
                    />
                  </PremiumGate>
                ))}
              </>
            )}
          </div>
        )
      })}

      <RecipeEditorSheet
        open={editorOpen}
        recipe={editing}
        onSave={onSaveRecipe}
        onClose={() => setEditorOpen(false)}
      />
    </div>
  )
}
