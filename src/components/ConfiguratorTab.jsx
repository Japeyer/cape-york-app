import { useState, useMemo } from 'react'
import { S } from '../strings.js'
import {
  TYPES, APPETITES,
  personDailyKcal, groupDailyKcal,
  makePersonId,
  CUSTOM_KCAL_MIN, CUSTOM_KCAL_MAX, CUSTOM_KCAL_STEP,
  clampCustomKcal, roundToHundred,
} from '../lib/calories.js'
import TripCalendar from './TripCalendar.jsx'
import DaySheet from './DaySheet.jsx'
import PremiumGate from './PremiumGate.jsx'
import { getConfigIntrosSeen, markConfigIntroSeen } from '../hooks/useStorage.js'
import { parseISO, addDays } from '../lib/dates.js'
import { ALLERGENS } from '../lib/allergens.js'
import { REGION } from '../data/regions.js'
import { estimateSpecialCount } from '../lib/generator.js'

const DIETS = ['omnivore', 'vegetarian', 'vegan']
const COOK_EFFORT_OPTS = ['low', 'medium', 'high']
const BURNER_OPTS = [1, 2, 3]
const FRIDGE_OPTS = ['small', 'medium', 'large']
const COMPRESSOR_OPTS = ['yes', 'no']
const ALLERGY_OPTS = ['yes', 'no']

// Toggle-only Optional-Stops (Bamaga hat eigene bamagaStop/-Day-Logik). Datengetrieben aus
// regions.js — neue Stops (z.B. Weipa) erscheinen automatisch in Calendar/DaySheet + State.
const OPTIONAL_STOP_IDS = REGION.supplyPoints
  .filter(sp => sp.optional && sp.id !== 'bamaga')
  .map(sp => sp.id)

function clampBamagaDay(day, days) {
  const hi = Math.max(2, days - 1)
  return Math.max(2, Math.min(hi, day | 0 || 2))
}

// Clamp für Optional-Stop-Days: null bleibt null (= nicht zugewiesen), sonst auf [2, days-1].
function clampStopDay(day, days) {
  if (day == null) return null
  const hi = Math.max(2, days - 1)
  return Math.max(2, Math.min(hi, day | 0 || 2))
}

function PillPicker({ label, hint, options, optionMap, value, onChange, columns, locked, onUpgrade }) {
  const cols = columns || options.length
  const grid = (
    <div className="diet-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map(key => {
        const opt = optionMap[key]
        return (
          <button
            key={key}
            className={`diet-pill${value === key ? ' active' : ''}`}
            onClick={() => onChange(key)}
          >
            <div className="diet-pill-label">{opt.label}</div>
            {opt.sub && <div className="diet-pill-sub">{opt.sub}</div>}
          </button>
        )
      })}
    </div>
  )
  return (
    <div className="cfg-row">
      <div className="cfg-row-head">
        <div className="cfg-label">{label}</div>
        {hint && <div className="cfg-hint">{hint}</div>}
      </div>
      {locked ? (
        <PremiumGate active={true} variant="inline" onUpgrade={onUpgrade}>
          {grid}
        </PremiumGate>
      ) : grid}
    </div>
  )
}

function PersonRow({ person, index, canRemove, onChange, onRemove }) {
  const update = (patch) => onChange({ ...person, ...patch })
  const kcal = personDailyKcal(person)

  // Wechsel zu Custom: Initialwert aus aktuellem Type+Appetite ableiten und auf 100er runden,
  // damit der Stepper bei einem sinnvollen Default startet (statt bei MIN).
  // Wenn customKcal schon mal gesetzt war, beibehalten — Toggle-back ohne Verlust.
  const setAppetite = (a) => {
    if (a === 'custom') {
      const initial = person.customKcal != null
        ? clampCustomKcal(person.customKcal)
        : clampCustomKcal(roundToHundred(personDailyKcal({ ...person, appetite: 'medium' })))
      update({ appetite: 'custom', customKcal: initial })
    } else {
      update({ appetite: a })
    }
  }

  const customVal = person.customKcal != null
    ? clampCustomKcal(person.customKcal)
    : clampCustomKcal(roundToHundred(personDailyKcal({ ...person, appetite: 'medium' })))
  const decKcal = () => update({ customKcal: clampCustomKcal(customVal - CUSTOM_KCAL_STEP) })
  const incKcal = () => update({ customKcal: clampCustomKcal(customVal + CUSTOM_KCAL_STEP) })

  return (
    <div className="person-row">
      <div className="person-head">
        <div className="person-num">{index + 1}</div>
        <div className="person-kcal">≈ {kcal} kcal/day</div>
        {canRemove && (
          <button className="person-remove" onClick={onRemove} aria-label="remove person">✕</button>
        )}
      </div>
      <div className="person-grid">
        {TYPES.map(t => {
          const opt = S.config.typeOptions[t]
          return (
            <button
              key={t}
              className={`person-pill${person.type === t ? ' active' : ''}`}
              onClick={() => update({ type: t })}
            >
              <span className="person-pill-icon">{opt.icon}</span>
              <span className="person-pill-label">{opt.label}</span>
            </button>
          )
        })}
      </div>
      <div className="person-grid person-grid-4">
        {APPETITES.map(a => {
          const opt = S.config.appetiteOptions[a]
          return (
            <button
              key={a}
              className={`person-pill${person.appetite === a ? ' active' : ''}`}
              onClick={() => setAppetite(a)}
            >
              <span className="person-pill-label">{opt.label}</span>
              <span className="person-pill-sub">{opt.sub}</span>
            </button>
          )
        })}
      </div>
      {person.appetite === 'custom' && (
        <div className="custom-kcal">
          <button
            className="custom-kcal-btn"
            onClick={decKcal}
            disabled={customVal <= CUSTOM_KCAL_MIN}
            aria-label="decrease kcal"
          >−</button>
          <div className="custom-kcal-val">{customVal} {S.config.customKcalUnit}</div>
          <button
            className="custom-kcal-btn"
            onClick={incKcal}
            disabled={customVal >= CUSTOM_KCAL_MAX}
            aria-label="increase kcal"
          >+</button>
        </div>
      )}
    </div>
  )
}

function GroupEditor({ people, onChange }) {
  const updatePerson = (idx, next) => {
    const arr = people.slice()
    arr[idx] = next
    onChange(arr)
  }
  const removePerson = (idx) => {
    if (people.length <= 1) return
    onChange(people.filter((_, i) => i !== idx))
  }
  const addPerson = () => {
    if (people.length >= 8) return
    onChange([
      ...people,
      { id: makePersonId(people.length), type: 'adult-m', appetite: 'medium' },
    ])
  }

  const totalKcal = groupDailyKcal(people)

  return (
    <div className="cfg-row">
      <div className="cfg-row-head">
        <div className="cfg-label">{S.config.groupLabel}</div>
        <div className="cfg-hint">{S.config.groupHint}</div>
      </div>
      {people.map((p, i) => (
        <PersonRow
          key={p.id || i}
          person={p}
          index={i}
          canRemove={people.length > 1}
          onChange={(next) => updatePerson(i, next)}
          onRemove={() => removePerson(i)}
        />
      ))}
      {people.length < 8 && (
        <button className="add-person-btn" onClick={addPerson}>{S.config.addPerson}</button>
      )}
      <div className="group-total">
        <span className="group-total-label">{S.config.dailyKcalLabel}</span>
        <span className="group-total-val">{totalKcal} kcal/day</span>
      </div>
    </div>
  )
}

export default function ConfiguratorTab({ config, onSubmit, onResetAll, premium, onUpgrade }) {
  const [draft, setDraft] = useState(() => ({
    // days=0/startDate=null = "Range noch nicht gewählt" → Calendar im Range-Select-Mode.
    days: Number.isFinite(config.days) ? config.days : 0,
    startDate: config.startDate || null,
    people: config.people.map(p => ({ ...p })),
    diet: config.diet,
    cookEffort: COOK_EFFORT_OPTS.includes(config.cookEffort) ? config.cookEffort : 'high',
    burners: config.burners,
    fridgeSize: config.fridgeSize,
    fridgeCompressor: config.fridgeCompressor === true,
    bamagaStop: config.bamagaStop === true,
    bamagaDay: config.days >= 2
      ? clampBamagaDay(config.bamagaDay ?? Math.round(config.days * 0.55), config.days)
      : null,
    allergiesEnabled: config.allergiesEnabled === true,
    allergens: Array.isArray(config.allergens) ? [...config.allergens] : [],
    // Interner Zufalls-Seed (bei Trip-Erstellung vergeben) — kein UI-Feld, aber durchreichen,
    // damit er den Submit überlebt und der Trip seine eigene Rezept-Auswahl behält.
    shuffleSeed: config.shuffleSeed,
    restaurantSlots: config.restaurantSlots ? { ...config.restaurantSlots } : {},
    overrides: config.overrides ? { ...config.overrides } : {},
    enabledStops: Object.fromEntries(
      OPTIONAL_STOP_IDS.map(id => [id, config.enabledStops?.[id] === true])
    ),
    stopDays: Object.fromEntries(
      OPTIONAL_STOP_IDS.map(id => [id, clampStopDay(config.stopDays?.[id] ?? null, config.days)])
    ),
  }))

  const [openDay, setOpenDay] = useState(null)  // { dayNum, dateLabel } oder null

  const isOnboarding = !config.completed
  const cta = isOnboarding ? S.config.generateCta : S.config.updateCta
  const hasRange = draft.days >= 1 && !!draft.startDate
  const update = (patch) => setDraft(d => ({ ...d, ...patch }))

  // ── Wizard-Schritt-Steuerung ──────────────────────────────────────
  const STEPS = S.config.steps           // [{key,title,intro}] × 3
  const totalSteps = STEPS.length
  const [step, setStep] = useState(0)
  const curStep = STEPS[step]

  // Schritt 1 (Datum) ist das Gate: ohne gewählten Zeitraum kein Weiter/kein Vorwärts-Sprung.
  const canAdvance = step > 0 || hasRange
  const goNext = () => { if (step < totalSteps - 1 && canAdvance) setStep(step + 1) }
  const goBack = () => setStep(s => Math.max(0, s - 1))
  // Punkte antippen: rückwärts immer, vorwärts nur wenn ein Zeitraum gewählt ist (sonst Gate umgangen).
  const jumpTo = (i) => { if (i <= step || hasRange) setStep(i) }

  // Kontextuelle Intro-Karte pro Schritt — erscheint beim ersten Betreten, wegklickbar, global
  // in localStorage gemerkt (nur einmal pro Schritt, trip-übergreifend).
  const [seenIntros, setSeenIntros] = useState(() => new Set(getConfigIntrosSeen()))
  const dismissIntro = (key) => {
    markConfigIntroSeen(key)
    setSeenIntros(prev => new Set(prev).add(key))
  }
  const showIntro = !seenIntros.has(curStep.key)

  // Calendar-Range-Select: ruft das mit (startISO, days) wenn der User eine Range gewählt hat.
  // Bamaga-Day kommt aus 0.55-Heuristik wenn vorher noch nichts war; sonst auf neue Range geklemmt.
  // Restaurant-Slots/Overrides werden auf neue Trip-Länge gefiltert.
  // Stops, deren minTripDays jetzt nicht mehr reicht, werden auto-disabled — der UI-Filter
  // (markedDays/allStopRows) blendet sie ohnehin aus, aber der Generator braucht den State
  // konsistent (sonst routet er Frisch-Items in einen unsichtbaren Bamaga-Bucket).
  const handleSelectRange = (startISO, days) => setDraft(d => {
    const filtered = (m) => {
      const out = {}
      for (const k of Object.keys(m || {})) if (Number(k) <= days) out[k] = m[k]
      return out
    }
    const stopMin = (id) => {
      const sp = REGION.supplyPoints.find(s => s.id === id)
      return sp?.minTripDays ?? 0
    }
    const fits = (id) => days >= stopMin(id)
    const clampedStopDays = Object.fromEntries(OPTIONAL_STOP_IDS.map(id =>
      [id, fits(id) && d.stopDays[id] != null && d.stopDays[id] <= days ? d.stopDays[id] : null]
    ))
    const enabledStops = Object.fromEntries(OPTIONAL_STOP_IDS.map(id =>
      [id, d.enabledStops[id] === true && fits(id)]
    ))
    const bamagaStop = d.bamagaStop && fits('bamaga')
    const newBamagaDay = bamagaStop
      ? clampBamagaDay(d.bamagaDay ?? Math.round(days * 0.55), days)
      : null
    return {
      ...d,
      days,
      startDate: startISO,
      bamagaStop,
      bamagaDay: newBamagaDay,
      enabledStops,
      restaurantSlots: filtered(d.restaurantSlots),
      overrides: filtered(d.overrides),
      stopDays: clampedStopDays,
    }
  })

  // "Re-pick dates": Range löschen → Calendar springt in Range-Select-Mode zurück.
  // Stop-Aktivierungen + Restaurant-Slots bleiben erhalten, werden aber bei der nächsten
  // Range-Auswahl ggf. neu geklemmt (siehe handleSelectRange).
  const handleRepickDates = () => setDraft(d => ({
    ...d,
    days: 0,
    startDate: null,
    bamagaDay: null,
  }))

  // Day-Sheet-Callbacks. Im Range-Select-Mode ist startDate null; der Calendar tappt
  // in dem Modus nicht auf Trip-Tage, daher wird handleTapDay nicht erreicht.
  const tripStartDate = useMemo(
    () => draft.startDate ? parseISO(draft.startDate) : null,
    [draft.startDate]
  )
  const dateForDay = (dayNum) => tripStartDate ? addDays(tripStartDate, dayNum - 1) : null
  const formatDate = (date) => {
    const wd = S.config.calendar.weekdaysFull[(date.getDay() + 6) % 7]
    const mo = S.config.calendar.monthNames[date.getMonth()]
    return `${wd}, ${mo} ${date.getDate()}`
  }
  const handleTapDay = (dayNum) => {
    const date = dateForDay(dayNum)
    if (!date) return
    setOpenDay({ dayNum, dateLabel: formatDate(date) })
  }
  // Stop-Toggle aus dem DaySheet — der Calendar ist jetzt die einzige UI für Stop-Aktivierung.
  // Drei Zustände kombiniert in EINER Aktion (= ein Tap pro Stop pro Tag):
  //   inactive          → enable + assign auf diesen Tag
  //   active, this day  → disable (Day bleibt im Storage als Restore-Hint, falls re-aktiviert)
  //   active, other day → move auf diesen Tag (still active)
  const toggleStopForDay = (stopId, dayNum) => {
    setDraft(d => {
      if (stopId === 'bamaga') {
        const safeDay = clampBamagaDay(dayNum, d.days)
        if (!d.bamagaStop) return { ...d, bamagaStop: true, bamagaDay: safeDay }
        if (d.bamagaDay === dayNum) return { ...d, bamagaStop: false }
        return { ...d, bamagaDay: safeDay }
      }
      const safeDay = clampStopDay(dayNum, d.days)
      const isOn = d.enabledStops[stopId] === true
      if (!isOn) {
        return {
          ...d,
          enabledStops: { ...d.enabledStops, [stopId]: true },
          stopDays:     { ...d.stopDays,     [stopId]: safeDay },
        }
      }
      if (d.stopDays[stopId] === dayNum) {
        return { ...d, enabledStops: { ...d.enabledStops, [stopId]: false } }
      }
      return { ...d, stopDays: { ...d.stopDays, [stopId]: safeDay } }
    })
  }
  const toggleRestaurantSlot = (dayNum, slot) => {
    setDraft(d => {
      const cur = d.restaurantSlots[dayNum] || {}
      const next = { ...cur, [slot]: !cur[slot] }
      // Wenn alle Slots aus → Tag-Eintrag löschen damit das Map sauber bleibt.
      const anyOn = next.f || next.m || next.ab
      const slots = { ...d.restaurantSlots }
      if (anyOn) slots[dayNum] = next
      else delete slots[dayNum]
      return { ...d, restaurantSlots: slots }
    })
  }

  // markedDays für den Calendar — alle Stops, die einen Day haben + aktiviert sind.
  // Reihenfolge folgt REGION.supplyPoints damit bei Day-Kollision (mehrere Stops am selben Tag)
  // first-wins deterministisch dem nördlicheren Stop folgt.
  const markedDays = useMemo(() => {
    const out = []
    for (const sp of REGION.supplyPoints) {
      if (!sp.optional) continue
      // Trip-Länge zu kurz → Marker raus (UI-Konsistenz mit allStopRows-Filter).
      if (sp.minTripDays && draft.days < sp.minTripDays) continue
      let dayNum = null
      if (sp.id === 'bamaga') {
        if (draft.bamagaStop) dayNum = draft.bamagaDay
      } else if (draft.enabledStops[sp.id]) {
        dayNum = draft.stopDays[sp.id]
      }
      if (!Number.isFinite(dayNum)) continue
      out.push({ dayNum, stopId: sp.id, icon: sp.icon, calColor: sp.calColor })
    }
    return out
  }, [draft.days, draft.bamagaStop, draft.bamagaDay, draft.enabledStops, draft.stopDays])

  // allStopRows für DaySheet — für JEDEN optionalen Stop ein Toggle-Row, unabhängig vom
  // aktuellen Aktivierungs-Status. So ist der Calendar die einzige Aktivierungs-UI:
  // tap auf inaktiven Stop = enable + zuweisen, tap auf aktiven (gleicher Tag) = disable,
  // tap auf aktiven (anderer Tag) = move.
  // Day 1 (Cairns-Start) und letzter Tag (Rückkehr) bekommen keine Stop-Optionen — dort
  // ergeben Resupplies keinen Sinn.
  const allStopRows = useMemo(() => {
    if (!openDay) return []
    if (openDay.dayNum === 1 || openDay.dayNum === draft.days) return []
    const rows = []
    for (const sp of REGION.supplyPoints) {
      if (!sp.optional) continue
      // Stops, deren minTripDays für die aktuelle Trip-Länge nicht erreicht ist, ausblenden
      // (Bamaga/Archer brauchen Anlauf-Tage, Coen mid-Cape — bei 2-Tages-Trip sinnlos).
      if (sp.minTripDays && draft.days < sp.minTripDays) continue
      const isBamaga = sp.id === 'bamaga'
      const enabled = isBamaga ? draft.bamagaStop : draft.enabledStops[sp.id]
      const day = isBamaga ? draft.bamagaDay : draft.stopDays[sp.id]
      const isHere = enabled && day === openDay.dayNum
      const isElsewhere = enabled && day != null && day !== openDay.dayNum
      rows.push({
        stopId: sp.id,
        icon: sp.icon,
        label: isElsewhere
          ? S.config.daySheet.stopElsewhere({ name: sp.name, day })
          : S.config.daySheet.stopArrival({ name: sp.name }),
        sub: S.config.daySheet.stopArrivalSub({ km: sp.kmFromCairns }),
        active: isHere,
      })
    }
    return rows
  }, [openDay, draft.days, draft.bamagaStop, draft.bamagaDay, draft.enabledStops, draft.stopDays])

  return (
    <div className="cfg-wrap">
      <div className="cfg-card">
        {/* Titel/Untertitel nur auf dem Einstiegs-Schritt — sonst übernimmt die Intro-Karte. */}
        {step === 0 && (
          <>
            <div className="cfg-title">
              {isOnboarding ? S.config.welcome : S.config.editTitle}
            </div>
            <div className="cfg-sub">
              {isOnboarding ? S.config.welcomeSub : S.config.editSub}
            </div>
          </>
        )}

        {/* Schritt-Fortschritt: antippbare Punkte (vorwärts nur mit gewähltem Zeitraum) + Label. */}
        <div className="cfg-steps">
          <div className="cfg-steps-dots">
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                className={`cfg-step-dot${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}
                onClick={() => jumpTo(i)}
                disabled={i > step && !hasRange}
                aria-label={s.title}
                aria-current={i === step ? 'step' : undefined}
              />
            ))}
          </div>
          <div className="cfg-steps-label">
            {S.config.wizard.stepOf({ cur: step + 1, total: totalSteps })} · {curStep.title}
          </div>
        </div>

        {/* Kontextuelle Erklärung — erscheint einmal beim ersten Betreten der Seite. */}
        {showIntro && (
          <div className="cfg-intro">
            <div className="cfg-intro-body">{curStep.intro}</div>
            <button className="cfg-intro-dismiss" onClick={() => dismissIntro(curStep.key)}>
              {S.config.wizard.introDismiss}
            </button>
          </div>
        )}

        {/* ── Schritt 1: Datum & Route ── */}
        {step === 0 && (
          <div className="cfg-step-panel">
            <div className="cfg-row">
              <div className="cfg-row-head">
                <div className="cfg-label">{S.config.daysLabel}</div>
                <div className="cfg-hint">
                  {hasRange
                    ? S.config.daysSelected({ days: draft.days })
                    : S.config.daysNotSelected}
                </div>
              </div>
              {hasRange && (
                <button className="repick-btn" onClick={handleRepickDates}>
                  {S.config.repickDates}
                </button>
              )}
            </div>

            <TripCalendar
              startDate={draft.startDate}
              days={draft.days}
              markedDays={markedDays}
              restaurantSlots={draft.restaurantSlots}
              onSelectRange={handleSelectRange}
              onTapDay={handleTapDay}
            />

            {hasRange && (
              <div className="cfg-calendar-tip">{S.config.calendarTip}</div>
            )}
          </div>
        )}

        {/* ── Schritt 2: Gruppe & Ernährung ── */}
        {step === 1 && (
          <div className="cfg-step-panel">
            <GroupEditor
              people={draft.people}
              onChange={(people) => update({ people })}
            />

            <PillPicker
              label={S.config.dietLabel}
              options={DIETS}
              optionMap={S.config.dietOptions}
              value={draft.diet}
              onChange={(v) => update({ diet: v })}
            />

            <PillPicker
              label={S.config.allergiesLabel}
              hint={S.config.allergiesHint}
              options={ALLERGY_OPTS}
              optionMap={S.config.allergiesOptions}
              value={draft.allergiesEnabled ? 'yes' : 'no'}
              onChange={(v) => update({ allergiesEnabled: v === 'yes' })}
              locked={!premium}
              onUpgrade={onUpgrade}
            />

            {draft.allergiesEnabled && premium && (
              <div className="cfg-row">
                <div className="cfg-row-head">
                  <div className="cfg-label">{S.config.allergiesPickLabel}</div>
                  <div className="cfg-hint">{S.config.allergiesPickHint}</div>
                </div>
                <div className="allergen-grid">
                  {ALLERGENS.map(a => {
                    const opt = S.config.allergenOptions[a]
                    const active = draft.allergens.includes(a)
                    const toggle = () => update({
                      allergens: active
                        ? draft.allergens.filter(x => x !== a)
                        : [...draft.allergens, a],
                    })
                    return (
                      <button
                        key={a}
                        className={`allergen-pill${active ? ' active' : ''}`}
                        onClick={toggle}
                      >
                        <span className="allergen-pill-label">{opt.label}</span>
                        {opt.sub && <span className="allergen-pill-sub">{opt.sub}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Schritt 3: Küche & Ausrüstung ── */}
        {step === 2 && (
          <div className="cfg-step-panel">
            <PillPicker
              label={S.config.effortLabel}
              hint={S.config.effortHint}
              options={COOK_EFFORT_OPTS}
              optionMap={S.config.effortOptions}
              value={draft.cookEffort}
              onChange={(v) => update({ cookEffort: v })}
            />

            <PillPicker
              label={S.config.burnersLabel}
              hint={S.config.burnersHint}
              options={BURNER_OPTS}
              optionMap={S.config.burnersOptions}
              value={draft.burners}
              onChange={(v) => update({ burners: v })}
            />

            <PillPicker
              label={S.config.fridgeLabel}
              hint={S.config.fridgeHint}
              options={FRIDGE_OPTS}
              optionMap={S.config.fridgeOptions}
              value={draft.fridgeSize}
              onChange={(v) => update({ fridgeSize: v })}
              locked={!premium}
              onUpgrade={onUpgrade}
            />

            <PillPicker
              label={S.config.compressorLabel}
              hint={S.config.compressorHint}
              options={COMPRESSOR_OPTS}
              optionMap={S.config.compressorOptions}
              value={draft.fridgeCompressor ? 'yes' : 'no'}
              onChange={(v) => update({ fridgeCompressor: v === 'yes' })}
              locked={!premium}
              onUpgrade={onUpgrade}
            />

            {/* Special-Dinner-Preview vor dem Generieren — nutzt alle jetzt gesetzten Werte. */}
            {hasRange && (() => {
              const specialCount = estimateSpecialCount({
                days: draft.days,
                bamagaStop: draft.bamagaStop,
                diet: draft.diet,
                burners: draft.burners,
                allergens: draft.allergens,
                cookEffort: draft.cookEffort,
              })
              if (specialCount === 0) return null
              return <div className="cfg-special-hint">{S.config.specialHint({ count: specialCount })}</div>
            })()}
          </div>
        )}

        {/* ── Navigation: Zurück · Weiter / Generieren ── */}
        <div className="cfg-nav">
          {step > 0
            ? <button className="cfg-nav-back" onClick={goBack}>{S.config.wizard.back}</button>
            : <span className="cfg-nav-spacer" />}
          {step < totalSteps - 1 ? (
            <button className="cfg-nav-next" onClick={goNext} disabled={!canAdvance}>
              {S.config.wizard.next}
            </button>
          ) : (
            <button
              className="gen-btn cfg-nav-gen"
              onClick={() => onSubmit({ ...draft, completed: true })}
              disabled={!hasRange}
            >
              {cta}
            </button>
          )}
        </div>

        {/* Reset (nur Edit-Modus) — auf dem letzten Schritt. */}
        {step === totalSteps - 1 && !isOnboarding && onResetAll && (
          <div className="cfg-reset">
            <div className="cfg-reset-hint">{S.config.resetAllHint}</div>
            <button
              className="reset-all-btn"
              onClick={() => {
                if (window.confirm(S.config.resetAllConfirm)) onResetAll()
              }}
            >
              {S.config.resetAll}
            </button>
          </div>
        )}
      </div>

      <DaySheet
        open={openDay !== null}
        dayNum={openDay?.dayNum}
        dateLabel={openDay?.dateLabel}
        stopRows={allStopRows}
        restaurantSlots={draft.restaurantSlots}
        onToggleStop={(stopId) => openDay && toggleStopForDay(stopId, openDay.dayNum)}
        onToggleRestaurant={(slot) => openDay && toggleRestaurantSlot(openDay.dayNum, slot)}
        onClose={() => setOpenDay(null)}
      />
    </div>
  )
}
