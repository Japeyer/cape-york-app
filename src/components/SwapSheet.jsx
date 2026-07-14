import { useMemo } from 'react'
import { S } from '../strings.js'
import { Sheet } from './DaySheet.jsx'
import { compatibleRecipesForCat, needsSequentialCooking } from '../lib/generator.js'
import VeganBadge from './VeganBadge.jsx'

const SLOT_TO_CAT = { f: 'f', m: 'm', ab: 'a' }
const SLOT_LABELS = { f: 'breakfast', m: 'lunch', ab: 'dinner' }

export default function SwapSheet({ open, dayNum, slot, currentRecipeId, config, allergens, meatAllowedDays, userRecipes = [], onPick, onClose }) {
  const cat = slot ? SLOT_TO_CAT[slot] : null

  // Eigene Rezepte des Users für diesen Meal-Typ — IMMER anzeigbar (kein Diät-/Burner-Filter,
  // es sind ja seine eigenen). Erscheinen als eigene Sektion ganz oben.
  const myRecipes = useMemo(() => {
    if (!open || !cat) return []
    return (userRecipes || []).filter(r => r && r.cat === cat)
  }, [open, cat, userRecipes])

  // Frischfleisch ist nur an Tagen erlaubt, die im Cluster nach einem Einkaufsstop liegen.
  // Außerhalb (= nach Cluster-Ende, vor Bamaga) würde es im Kühlschrank verderben.
  // omnivore + Off-Cluster-Tag → kein meat-Pool im Swap-Sheet, plus Erklärungs-Hint.
  const includeMeat = useMemo(() => {
    if (config?.dietApplied !== 'omnivore') return true
    if (!Array.isArray(meatAllowedDays) || meatAllowedDays.length === 0) return true
    return meatAllowedDays.includes(dayNum)
  }, [config?.dietApplied, meatAllowedDays, dayNum])

  // Kandidaten in zwei Gruppen aufgeteilt: Specials zuerst (auffindbar als „Treat-yourself"-
  // Optionen), dann regulär. Beim Dinner-Slot bekommen Specials einen eigenen Section-Header
  // mit ✨-Badge, damit User sie als besondere Wahl erkennen.
  const { specials, regulars } = useMemo(() => {
    if (!open || !cat) return { specials: [], regulars: [] }
    const all = compatibleRecipesForCat(cat, {
      diet: config.diet,
      burners: config.burners,
      allergens,
      includeMeat,
    })
    return {
      specials: all.filter(r => r.occasion === 'special'),
      regulars: all.filter(r => r.occasion !== 'special'),
    }
  }, [open, cat, config.diet, config.burners, allergens, includeMeat])

  if (!open) return null

  const renderCard = (r) => {
    const seq = needsSequentialCooking(r, config.burners)
    return (
      <button
        key={r.id}
        className={`swap-card${r.id === currentRecipeId ? ' active' : ''}${r.occasion === 'special' ? ' swap-card-special' : ''}`}
        onClick={() => { onPick(r.id); onClose() }}
      >
        <div className="swap-card-icon">{r.icon}</div>
        <div className="swap-card-info">
          <div className="swap-card-name">
            {r.name}
            {r.diet === 'vegan' && <VeganBadge />}
            {r.occasion === 'special' && <span className="swap-card-badge">{S.menu.swap.specialBadge}</span>}
            {seq && <span className="swap-card-badge swap-card-badge-seq" title={S.menu.sequentialHint}>{S.menu.tags.sequential}</span>}
          </div>
          <div className="swap-card-meta">⏱ {r.time} · 🔥 {r.kcal}</div>
        </div>
        {r.id === currentRecipeId && <div className="swap-card-mark">✓</div>}
      </button>
    )
  }

  const hasResults = myRecipes.length > 0 || specials.length > 0 || regulars.length > 0

  return (
    <Sheet
      title={S.menu.swap.title({ day: dayNum, slot: SLOT_LABELS[slot] })}
      onClose={onClose}
    >
      <div className="swap-hint">{S.menu.swap.hint}</div>
      {!includeMeat && (
        <div className="swap-meat-filter-hint">
          {S.menu.swap.noFreshMeatHint}
        </div>
      )}
      {currentRecipeId && (
        <button
          className="swap-reset"
          onClick={() => { onPick(null); onClose() }}
        >
          {S.menu.swap.reset}
        </button>
      )}
      {!hasResults && (
        <div className="swap-empty">{S.menu.swap.empty}</div>
      )}
      {myRecipes.length > 0 && (
        <>
          <div className="swap-section-header">{S.menu.swap.myRecipesSection}</div>
          {myRecipes.map(renderCard)}
        </>
      )}
      {specials.length > 0 && (
        <>
          <div className="swap-section-header">{S.menu.swap.specialSection}</div>
          {specials.map(renderCard)}
        </>
      )}
      {regulars.length > 0 && (
        <>
          {(myRecipes.length > 0 || specials.length > 0) && (
            <div className="swap-section-header">{S.menu.swap.regularSection}</div>
          )}
          {regulars.map(renderCard)}
        </>
      )}
    </Sheet>
  )
}
