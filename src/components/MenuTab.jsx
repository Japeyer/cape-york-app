import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { S } from '../strings.js'
import SwapSheet from './SwapSheet.jsx'
import PremiumGate from './PremiumGate.jsx'
import VeganBadge from './VeganBadge.jsx'
import { FREE_LIMITS } from '../lib/premium.js'
import { parseISO, diffDays } from '../lib/dates.js'
import { RECIPES } from '../data/recipes.js'
import { isShoppableIngredient } from '../lib/generator.js'

// Einkaufbare Zutaten eines Rezepts (Index + Name) für die Deviation-Checkliste.
const RECIPE_ING_INDEX = new Map(
  RECIPES.map(r => [r.id, r.ing
    .map((pair, idx) => ({ idx, name: pair[0] }))
    .filter(p => isShoppableIngredient(p.name))])
)

// Badge/Dim-Info aus dem Ist-Status einer Mahlzeit (cooked / deviation-partial / not-cooked).
function statusInfo(meal) {
  if (meal.reviewed === 'cooked') return { badge: S.menu.status.badgeCooked, cls: 'tag-cooked', marked: false }
  if (meal.deviation) {
    const none = !meal.usedIng || meal.usedIng.length === 0
    return { badge: none ? S.menu.status.badgeNotCooked : S.menu.status.badgePartial, cls: 'tag-status', marked: none }
  }
  return null
}

// Wenn der Trip aktuell läuft (heute zwischen Start und Ende), liefert die 1-basierte
// Tag-Nummer. Sonst null (Trip in Zukunft, Trip vorbei, oder kein startDate gesetzt).
function currentTripDay(startDateIso, totalDays) {
  if (!startDateIso || !totalDays) return null
  const start = parseISO(startDateIso)
  if (!start || Number.isNaN(start.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayIdx = diffDays(start, today) + 1
  if (dayIdx < 1 || dayIdx > totalDays) return null
  return dayIdx
}

function allergenLabels(ids) {
  return ids.map(id => S.config.allergenOptions[id]?.label.toLowerCase() ?? id)
}

// Erklärungs-Banner für omnivore-Kunden: warum nicht jeden Tag Frischfleisch?
// Erscheint nur wenn omnivore + es gibt Off-Cluster-Tage (Plan-Tage > Cluster-Tage).
// Standardmäßig collapsed mit Tagline; Tap erweitert die volle Erklärung.
// Kein Dismiss — User soll es jederzeit nachschlagen können, ist aber zugeklappt unaufdringlich.
function ClusterInfoBanner({ clusterDays, fridgeSize, totalDays, meatDays, hasBamaga }) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('ui_dismissed_meatcluster') === 'true' } catch { return false }
  })
  if (dismissed) return null
  const dismiss = (e) => {
    e.stopPropagation()  // sonst togglet auch open am Head-Button-Container
    setDismissed(true)
    try { localStorage.setItem('ui_dismissed_meatcluster', 'true') } catch {}
  }
  return (
    <div className="cluster-info-banner">
      <button className="cluster-info-head" onClick={() => setOpen(o => !o)}>
        <span className="cluster-info-icon">🥩</span>
        <span className="cluster-info-tagline">
          {S.menu.meatCluster.tagline({ meatDays, totalDays })}
        </span>
        <span className={`cluster-info-arrow${open ? ' open' : ''}`}>▾</span>
      </button>
      <button
        className="info-dismiss"
        onClick={dismiss}
        aria-label={S.menuJump.dismissAria}
      >
        ✕
      </button>
      {open && (
        <div className="cluster-info-body">
          <p>{S.menu.meatCluster.body1({ clusterDays, fridgeSize })}</p>
          <p>{S.menu.meatCluster.body2}</p>
          <ul className="cluster-info-list">
            {S.menu.meatCluster.shelfStableExamples.map((ex, i) => (
              <li key={i}>{ex}</li>
            ))}
          </ul>
          <p>{hasBamaga ? S.menu.meatCluster.body3WithBamaga : S.menu.meatCluster.body3NoBamaga}</p>
        </div>
      )}
    </div>
  )
}

function MealRow({ label, meal, dayNum, slot, onRecipeClick, onSwap, onMark }) {
  if (!meal) return null
  if (meal.skip) {
    const text = meal.kind === 'pickup'
      ? S.menu.skipPickup
      : meal.kind === 'dropoff'
        ? S.menu.skipDropoff
        : null
    if (!text) return null
    return (
      <div className="meal-row">
        <div className="meal-lbl">{label}</div>
        <div className="meal-text meal-skip">🚙 {text}</div>
      </div>
    )
  }
  if (meal.rest) {
    return (
      <div className="meal-row">
        <div className="meal-lbl">{label}</div>
        <div className="meal-text meal-rest">🍽 {meal.rname}</div>
      </div>
    )
  }
  // Auto-Leftover-Slot: Reste vom Vortags-Dinner, kein Kochen/Einkauf.
  if (meal.leftover) {
    return (
      <div className="meal-row">
        <div className="meal-lbl">{label}</div>
        <div className="meal-text meal-leftover">{S.menu.leftover.lunch({ fromDay: meal.fromDay })}</div>
      </div>
    )
  }
  const info = statusInfo(meal)
  return (
    <div className="meal-row">
      <div className="meal-lbl">{label}</div>
      <div className={`meal-text${info?.marked ? ' meal-marked' : ''}`}>
        {meal.t}
        {meal.d === 'vegan' && <VeganBadge />}
        {info && <span className={`tag ${info.cls}`}>{info.badge}</span>}
        {meal.ovr && <span className="tag tag-ovr">{S.menu.swap.ovrTag}</span>}
        {meal.batch && (
          <span className="tag tag-leftover-src" title={S.menu.leftover.batchHint}>♻️+</span>
        )}
        {meal.seq && (
          <span className="tag tag-sequential" title={S.menu.sequentialHint}>
            {S.menu.tags.sequential}
          </span>
        )}
        {meal.r && (
          <button className="meal-link" onClick={() => onRecipeClick?.(meal.r)}>
            {S.menu.recipeLink}
          </button>
        )}
        {onSwap && !info?.marked && (
          <button className="meal-swap" onClick={() => onSwap(dayNum, slot, meal.r)}>
            {S.menu.swap.btn}
          </button>
        )}
        {onMark && (
          <button className="meal-swap meal-mark" onClick={() => onMark(dayNum, slot, meal)}>
            {S.menu.status.markBtn}
          </button>
        )}
        {meal.ta?.length > 0 && (
          <div className="topping-warning">
            {S.menu.toppingWarning({ allergenLabels: allergenLabels(meal.ta) })}
          </div>
        )}
      </div>
      {meal.k && <div className="meal-kcal">{meal.k}</div>}
    </div>
  )
}

// Bottom-Sheet: „Cooked as planned" (alle Zutaten) ODER „Deviation" mit Zutaten-Checkliste
// (nur angehakte Zutaten zählen; nichts angehakt = gar nicht gekocht). `current` = aktueller
// mealStatus-Wert ('cooked' | { used:[…] } | undefined).
function MealStatusSheet({ open, meal, current, onSave, onClose }) {
  const isDeviation = !!(current && Array.isArray(current.used))
  const [deviating, setDeviating] = useState(isDeviation)
  const [used, setUsed] = useState(() => new Set(isDeviation ? current.used : []))
  // Beim Öffnen einer anderen Mahlzeit / geänderten Status neu initialisieren.
  useEffect(() => {
    const dev = !!(current && Array.isArray(current.used))
    setDeviating(dev)
    setUsed(new Set(dev ? current.used : []))
  }, [meal, current])
  // Escape schließt das Sheet (Accessibility).
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null

  const ingredients = meal?.r ? (RECIPE_ING_INDEX.get(meal.r) || []) : []
  const toggle = (idx) => setUsed(prev => {
    const next = new Set(prev)
    next.has(idx) ? next.delete(idx) : next.add(idx)
    return next
  })
  const saveCooked = () => { onSave('cooked'); onClose() }
  const saveDeviation = () => { onSave({ used: [...used].sort((a, b) => a - b) }); onClose() }
  const clear = () => { onSave(null); onClose() }

  // Portal nach document.body: sonst steckt das Sheet im Stacking-Context von `.content`
  // (position:fixed) und die Bottom-Nav (z-index 200 im Root) läge über dem Save-Button.
  return createPortal(
    <div className="ms-overlay" role="dialog" aria-modal="true" aria-label={S.menu.status.sheetTitle} onClick={onClose}>
      <div className="ms-sheet" onClick={e => e.stopPropagation()}>
        <div className="ms-handle" aria-hidden="true" />
        <div className="ms-head">
          <div className="ms-title">
            {S.menu.status.sheetTitle}
            {meal?.t && <span className="ms-sub">{meal.t}</span>}
          </div>
          <button className="ms-close" aria-label={S.menu.status.close} onClick={onClose}>✕</button>
        </div>

        <div className="ms-body">
          <button
            className={`ms-opt ms-opt-cooked${current === 'cooked' ? ' active' : ''}`}
            aria-pressed={current === 'cooked'}
            onClick={saveCooked}
          >
            {S.menu.status.cooked}
          </button>
          <button
            className={`ms-opt ms-opt-dev${deviating ? ' active' : ''}`}
            aria-pressed={deviating}
            aria-expanded={deviating}
            onClick={() => setDeviating(d => !d)}
          >
            {S.menu.status.deviation}
          </button>

          {deviating && (
            <div className="ms-ing">
              <div className="ms-hint">{S.menu.status.deviationHint}</div>
              {ingredients.map(({ idx, name }) => {
                const on = used.has(idx)
                return (
                  <label key={idx} className={`ms-ing-row${on ? ' on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => toggle(idx)} />
                    <span className="ms-ing-box" aria-hidden="true">{on ? '✓' : ''}</span>
                    <span className="ms-ing-name">{name}</span>
                  </label>
                )
              })}
              {ingredients.length === 0 && <div className="ms-ing-note">—</div>}
            </div>
          )}
          {current != null && (
            <button className="ms-clear" onClick={clear}>{S.menu.status.clear}</button>
          )}
        </div>

        {deviating && (
          <div className="ms-foot">
            <div className={`ms-count${used.size === 0 ? ' none' : ''}`}>
              {used.size === 0 ? S.menu.status.noneCooked : S.menu.status.usedCount({ n: used.size })}
            </div>
            <button className="ms-save" onClick={saveDeviation}>{S.menu.status.save}</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// Open-State liegt in MenuTab (parent) — der Jump-Bar muss eine Card aufklappen können
// wenn der User darauf springt. DayCard ist deshalb stateless bezüglich open/close.
function DayCard({ day, isToday, isOpen, onToggle, onRecipeClick, onSwap, onMark }) {
  return (
    <div
      data-day={day.d}
      className={`day-card${day.bamaga ? ' bamaga-day' : ''}${isToday ? ' day-today' : ''}`}
    >
      <div className="day-head" onClick={onToggle}>
        <div className="day-num">
          <span className="day-num-n">{day.d}</span>
          {day.dt}
        </div>
        <div className="day-info">
          <div className="day-title">
            {day.dt}
            {isToday && <span className="day-today-pill">{S.menuJump.todayPill}</span>}
            {day.ab?.spec && <span className="tag tag-special">{S.menu.tags.special}</span>}
            {day.bamaga && <span className="tag tag-n">{S.menu.tags.new}</span>}
          </div>
          <div className="day-date">{day.ab?.t || ''}</div>
        </div>
        <div className={`day-arrow${isOpen ? ' open' : ''}`}>▾</div>
      </div>
      {isOpen && (
        <div className="day-body">
          <MealRow label={S.menu.meals.breakfast} meal={day.f}  dayNum={day.d} slot="f"  onRecipeClick={onRecipeClick} onSwap={onSwap} onMark={onMark} />
          <MealRow label={S.menu.meals.lunch}     meal={day.m}  dayNum={day.d} slot="m"  onRecipeClick={onRecipeClick} onSwap={onSwap} onMark={onMark} />
          <MealRow label={S.menu.meals.dinner}    meal={day.ab} dayNum={day.d} slot="ab" onRecipeClick={onRecipeClick} onSwap={onSwap} onMark={onMark} />
        </div>
      )}
    </div>
  )
}

// Sticky-Bar mit allen Tag-Nummern. Tap scrollt zur passenden DayCard, Today highlighted.
// Bar selbst scrollt horizontal wenn die Tage nicht reinpassen; Today-Button wird beim
// ersten Render zentriert (inline: 'center').
function DayJumpBar({ plan, todayDay, onJumpTo }) {
  const barRef = useRef(null)
  useEffect(() => {
    if (!todayDay || !barRef.current) return
    const btn = barRef.current.querySelector(`[data-jump-day="${todayDay}"]`)
    if (btn) btn.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' })
  }, [todayDay])
  return (
    <div className="day-jump-bar" ref={barRef}>
      {plan.map(day => (
        <button
          key={day.d}
          data-jump-day={day.d}
          aria-label={S.menuJump.jumpAria({ d: day.d })}
          className={`day-jump-btn${day.d === todayDay ? ' today' : ''}${day.bamaga ? ' bamaga' : ''}`}
          onClick={() => onJumpTo(day.d)}
        >
          {day.d}
        </button>
      ))}
    </div>
  )
}

function PhaseHeader({ children }) {
  return (
    <div className="phase-hdr">
      <div className="phase-line" />
      <div className="phase-txt">{children}</div>
      <div className="phase-line" />
    </div>
  )
}

export default function MenuTab({ plan, config, allergens, onJumpToRecipe, onSetOverride, onResetAllOverrides, onSetMealStatus, userRecipes = [], premium, onUpgrade }) {
  const [swap, setSwap] = useState(null)  // { dayNum, slot, currentRecipeId } | null
  const handleSwap = onSetOverride
    ? (dayNum, slot, currentRecipeId) => setSwap({ dayNum, slot, currentRecipeId })
    : null
  const [statusMeal, setStatusMeal] = useState(null)  // { dayNum, slot, meal } | null
  const handleMark = onSetMealStatus
    ? (dayNum, slot, meal) => setStatusMeal({ dayNum, slot, meal })
    : null

  // Anzahl gesetzter Overrides (über alle Tage + Slots) für Button-Sichtbarkeit/Label.
  const overrideCount = Object.values(config?.overrides || {})
    .reduce((acc, day) => acc + Object.keys(day || {}).length, 0)

  if (!plan?.length) {
    return <div className="empty-state">{S.menu.empty}</div>
  }

  const counts = plan.reduce(
    (acc, d) => {
      // skip-Slots (Pickup/Dropoff-Tage) zählen weder als Restaurant noch als Mahlzeit.
      if (d.f?.skip)  { /* skip */ } else if (d.f?.rest)  acc.rest++; else if (d.f)  acc.f++
      if (d.m?.skip)  { /* skip */ } else if (d.m?.rest)  acc.rest++; else if (d.m)  acc.m++
      if (d.ab?.skip) { /* skip */ } else if (d.ab?.rest) acc.rest++; else if (d.ab) acc.a++
      return acc
    },
    { rest: 0, f: 0, m: 0, a: 0 }
  )

  // Bamaga-Tag splittet den Plan in zwei Phasen. Wenn keiner gesetzt ist
  // (sehr kurze Trips ohne Mid-Resupply), zeige eine einzelne Phase.
  const bamagaIdx = plan.findIndex(d => d.bamaga)
  const hasSplit = bamagaIdx >= 0
  const phase1 = hasSplit ? plan.slice(0, bamagaIdx + 1) : plan
  const phase2 = hasSplit ? plan.slice(bamagaIdx + 1) : []

  // Today-Erkennung: nur wenn der Trip aktuell läuft, nicht für Pre-/Post-Trip-Browsing.
  const todayDay = currentTripDay(config?.startDate, plan.length)

  // Open-State pro Tag-Nummer, gelift in MenuTab damit der Jump-Bar eine Card aufklappen
  // kann. Initial: Today (wenn vorhanden) ist offen — sonst alle zu.
  const [openDays, setOpenDays] = useState(() => new Set(todayDay ? [todayDay] : []))
  const toggleDay = useCallback((d) => {
    setOpenDays(prev => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d)
      else next.add(d)
      return next
    })
  }, [])

  // Beim ersten Mount: instant zur Today-Card scrollen wenn vorhanden. Auto (nicht smooth)
  // damit der User die Seite direkt richtig positioniert sieht, ohne Animations-Wegrollen.
  // Tab-Reset-Position aus App.jsx greift hier nicht (Menu ist nicht in der Scroll-Map).
  useEffect(() => {
    if (!todayDay) return
    const el = document.querySelector(`[data-day="${todayDay}"]`)
    if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' })
    // Nur einmal beim Tab-Open — nicht jedes Mal wenn plan re-rendert.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Jump aus der Sticky-Bar: Tag aufklappen UND scrollen. Scroll-Offset für die Sticky-Bar
  // wird via CSS `scroll-margin-top` auf `.day-card` gelöst (sonst verdeckt die Bar das Top).
  // requestAnimationFrame: warten bis das Aufklappen im DOM ist, sonst scrollt der Browser
  // zur kollabierten Position und springt dann beim Expand.
  const handleJumpTo = (d) => {
    setOpenDays(prev => prev.has(d) ? prev : new Set(prev).add(d))
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-day="${d}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  // Free-Limit: Tag-Cards für d > FREE_LIMITS.maxPlanDays werden geblurrt + Sticker.
  // Swap-Action wird für gegate Tage deaktiviert (Pool-Pick + Persistierung sollen
  // konsistent bleiben, aber UI-Trigger ist weg).
  const isDayLocked = (day) => !premium && day.d > FREE_LIMITS.maxPlanDays
  const renderDay = (d) => {
    const locked = isDayLocked(d)
    return (
      <PremiumGate key={d.d} active={locked} onUpgrade={onUpgrade}>
        <DayCard
          day={d}
          isToday={d.d === todayDay}
          isOpen={openDays.has(d.d)}
          onToggle={() => toggleDay(d.d)}
          onRecipeClick={onJumpToRecipe}
          onSwap={locked ? null : handleSwap}
          onMark={locked ? null : handleMark}
        />
      </PremiumGate>
    )
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: '0 12px 8px' }}>
        {[
          { n: counts.rest, l: S.menu.summary.restaurant },
          { n: counts.f,    l: S.menu.summary.breakfasts },
          { n: counts.m,    l: S.menu.summary.lunches },
          { n: counts.a,    l: S.menu.summary.dinners },
        ].map(({ n, l }) => (
          <div key={l} style={{ background: 'var(--wh)', borderRadius: 10, padding: '10px 8px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--or)' }}>{n}</div>
            <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {config?.dietApplied === 'omnivore'
        && Array.isArray(config?.meatAllowedDays)
        && config.meatAllowedDays.length < plan.length && (
        <ClusterInfoBanner
          clusterDays={config.meatClusterDays}
          fridgeSize={config.fridgeSize}
          totalDays={plan.length}
          meatDays={config.meatAllowedDays.length}
          hasBamaga={config.bamagaStop === true}
        />
      )}

      {overrideCount > 0 && onResetAllOverrides && (
        <div style={{ padding: '0 12px 8px' }}>
          <button
            className="reset-swaps-btn"
            onClick={() => {
              if (window.confirm(S.menu.swap.resetAllConfirm({ count: overrideCount }))) {
                onResetAllOverrides()
              }
            }}
          >
            {S.menu.swap.resetAll({ count: overrideCount })}
          </button>
        </div>
      )}

      <DayJumpBar plan={plan} todayDay={todayDay} onJumpTo={handleJumpTo} />

      {hasSplit ? (
        <>
          <PhaseHeader>
            {S.menu.phases.beforeBamaga({ from: 1, to: phase1.at(-1).d })}
          </PhaseHeader>
          {phase1.map(renderDay)}

          <PhaseHeader>
            {S.menu.phases.afterBamaga({ from: phase2[0].d, to: phase2.at(-1).d })}
          </PhaseHeader>
          {phase2.map(renderDay)}
        </>
      ) : (
        <>
          <PhaseHeader>
            {S.menu.phases.single({ from: 1, to: plan.at(-1).d })}
          </PhaseHeader>
          {plan.map(renderDay)}
        </>
      )}

      <SwapSheet
        open={swap !== null}
        dayNum={swap?.dayNum}
        slot={swap?.slot}
        currentRecipeId={swap?.currentRecipeId}
        config={config}
        allergens={allergens}
        meatAllowedDays={config.meatAllowedDays}
        userRecipes={userRecipes}
        onPick={(recipeId) => onSetOverride?.(swap.dayNum, swap.slot, recipeId)}
        onClose={() => setSwap(null)}
      />

      <MealStatusSheet
        open={statusMeal !== null}
        meal={statusMeal?.meal}
        current={statusMeal ? config?.mealStatus?.[statusMeal.dayNum]?.[statusMeal.slot] : undefined}
        onSave={(val) => onSetMealStatus?.(statusMeal.dayNum, statusMeal.slot, val)}
        onClose={() => setStatusMeal(null)}
      />
    </div>
  )
}
