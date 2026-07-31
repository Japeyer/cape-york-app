import { useState, useMemo } from 'react'
import { S } from '../strings.js'
import { parseISO, addDays, diffDays, sameMonth, weekdayMo, isoFromDate, todayISO } from '../lib/dates.js'

// Liefert alle Monate, die der Trip berührt.
function monthsInRange(start, end) {
  const out = []
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cursor <= last) {
    out.push(new Date(cursor))
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }
  return out
}

// `tourDayNum` = der Tag, auf den das Seiten-Tutorial zeigt (data-tour="cfg-tripday").
// Bewusst ein Tag in der Trip-Mitte: an Tag 1 (Cairns-Start) und am letzten Tag bietet das
// DaySheet keine Resupply-Optionen an, dort liefe die Erklärung ins Leere.
function MonthGrid({
  monthDate, tripStart, tripEnd, pendingStart, markedByDayNum, restaurantSlots,
  getDayNum, onTapDate, tourDayNum,
}) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadPad = weekdayMo(firstOfMonth)

  const cells = []
  for (let i = 0; i < leadPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  const isInTrip = date => tripStart && tripEnd && date >= tripStart && date <= tripEnd
  const isStart  = date => tripStart && sameMonth(date, tripStart) && date.getDate() === tripStart.getDate()
  const isEnd    = date => tripEnd && sameMonth(date, tripEnd) && date.getDate() === tripEnd.getDate()
  const isPending = date => pendingStart && sameMonth(date, pendingStart) && date.getDate() === pendingStart.getDate()

  return (
    <div className="cal-month">
      <div className="cal-month-name">
        {S.config.calendar.monthNames[month]} {year}
      </div>
      <div className="cal-weekdays">
        {S.config.calendar.weekdays.map(w => (
          <div key={w} className="cal-weekday">{w}</div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="cal-cell cal-empty" />
          const inTrip = isInTrip(date)
          const dayNum = inTrip ? getDayNum(date) : null
          const slots = inTrip ? restaurantSlots?.[dayNum] : null
          const hasRest = slots && (slots.f || slots.m || slots.ab)
          const marker = inTrip ? markedByDayNum.get(dayNum) : null
          const cls = [
            'cal-cell',
            inTrip ? 'cal-trip' : '',
            isStart(date) ? 'cal-start' : '',
            isEnd(date) ? 'cal-end' : '',
            isPending(date) ? 'cal-pending' : '',
            marker ? 'cal-stop' : '',
            hasRest ? 'cal-restaurant' : '',
          ].filter(Boolean).join(' ')
          const style = marker?.calColor
            ? {
                background: marker.calColor.bg,
                color: marker.calColor.fg,
                borderColor: marker.calColor.border,
              }
            : undefined
          return (
            <button
              key={i}
              className={cls}
              style={style}
              data-tour={dayNum != null && dayNum === tourDayNum ? 'cfg-tripday' : undefined}
              onClick={() => onTapDate(date, inTrip, dayNum)}
            >
              <span className="cal-day-num">{date.getDate()}</span>
              {marker && <span className="cal-day-icon">{marker.icon}</span>}
              {hasRest && !marker && <span className="cal-day-icon">🍽</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Zwei Modi:
//   • Range-Select-Mode (wenn startDate==null oder days==0):
//     Leerer Calendar, 1. Tap = Start (pending), 2. Tap = End → onSelectRange(startISO, days).
//     Tap auf pendingStart = Reset. Tap < pendingStart = auto-swap (= neuer Start).
//   • View-Mode (Range gesetzt): bestehendes Verhalten — Tap auf Trip-Tag öffnet
//     DaySheet (über onTapDay), Tap außerhalb wird ignoriert (Edit der Range geht
//     explicit über "Re-pick dates" im Configurator).
//
// Props:
//   startDate, days   — null/0 ⇒ Range-Select-Mode
//   markedDays        — Stop-Marker (nur im View-Mode rendered)
//   restaurantSlots   — Restaurant-Marker
//   onSelectRange(startISO, days)  — Callback wenn Range vollständig
//   onTapDay(dayNum)               — Callback im View-Mode für Trip-Tage
export default function TripCalendar({
  startDate, days, markedDays, restaurantSlots,
  onSelectRange, onTapDay,
}) {
  const isSelectMode = !startDate || !days

  const start = useMemo(
    () => isSelectMode ? null : parseISO(startDate),
    [startDate, isSelectMode]
  )
  const end = useMemo(
    () => isSelectMode ? null : addDays(start, days - 1),
    [start, days, isSelectMode]
  )

  const [pendingStart, setPendingStart] = useState(null)

  // Tutorial-Anker: mittlerer Trip-Tag (nie Tag 1 / letzter Tag — dort gibt es keine
  // Resupply-Optionen). Zu kurze Trips bekommen keinen Anker, der Schritt entfällt dann.
  const tourDayNum = useMemo(() => {
    if (isSelectMode || days < 3) return null
    return Math.min(Math.max(2, Math.round(days / 2)), days - 1)
  }, [isSelectMode, days])

  const markedByDayNum = useMemo(() => {
    const m = new Map()
    if (isSelectMode) return m
    for (const mark of (markedDays || [])) {
      if (!Number.isFinite(mark.dayNum)) continue
      if (!m.has(mark.dayNum)) m.set(mark.dayNum, mark)
    }
    return m
  }, [markedDays, isSelectMode])

  // Anzeige-Anker: View-Mode = Trip-Start-Monat. Select-Mode = aktueller Monat.
  const [anchor, setAnchor] = useState(() => {
    if (start) return new Date(start.getFullYear(), start.getMonth(), 1)
    const t = parseISO(todayISO())
    return new Date(t.getFullYear(), t.getMonth(), 1)
  })

  const months = useMemo(() => {
    if (isSelectMode) return [anchor]
    const tripMonths = monthsInRange(start, end)
    const all = [anchor, ...tripMonths]
    const seen = new Set()
    return all.filter(m => {
      const k = `${m.getFullYear()}-${m.getMonth()}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    }).sort((a, b) => a - b)
  }, [anchor, start, end, isSelectMode])

  const getDayNum = date => start ? diffDays(start, date) + 1 : null

  const goPrev = () => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))
  const goNext = () => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))

  // Tap-Handling — Mode-abhängig.
  const handleTap = (date, inTrip, dayNum) => {
    if (isSelectMode) {
      // 1. Tap → pendingStart setzen.
      // 2. Tap auf gleichen Tag → 1-Tages-Trip.
      // 2. Tap nach pendingStart → onSelectRange(start, days).
      // 2. Tap vor pendingStart → swap (pending = neuer früher Tag).
      if (!pendingStart) {
        setPendingStart(date)
        return
      }
      if (date.getTime() === pendingStart.getTime()) {
        // Tap zweimal denselben Tag = 1-Tages-Trip
        const iso = isoFromDate(date)
        setPendingStart(null)
        onSelectRange?.(iso, 1)
        return
      }
      const earlier = date < pendingStart ? date : pendingStart
      const later   = date < pendingStart ? pendingStart : date
      const totalDays = diffDays(earlier, later) + 1
      const startIso = isoFromDate(earlier)
      setPendingStart(null)
      onSelectRange?.(startIso, totalDays)
      return
    }
    // View-Mode: Trip-Tag tippen → DaySheet öffnen. Außerhalb: ignorieren.
    if (inTrip) onTapDay?.(dayNum)
  }

  return (
    // data-tour: Anker fürs Tutorial. Bewusst der GANZE Block (inkl. ◀▶-Monatsnavigation) —
    // wäre nur das Tage-Raster hervorgehoben, könnte man im Spotlight nicht in den Trip-Monat
    // blättern, weil die Abdunklung alle Taps daneben schluckt.
    <div className="cfg-row" data-tour="cfg-calendar">
      <div className="cfg-row-head">
        <div className="cfg-label">{S.config.calendarLabel}</div>
        <div className="cfg-hint">
          {isSelectMode
            ? (pendingStart ? S.config.calendarHintPickEnd : S.config.calendarHintPickStart)
            : S.config.calendarHintView}
        </div>
      </div>
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={goPrev} aria-label="previous month">◀</button>
        <div className="cal-nav-spacer" />
        <button className="cal-nav-btn" onClick={goNext} aria-label="next month">▶</button>
      </div>
      {months.map((m) => (
        <MonthGrid
          key={`${m.getFullYear()}-${m.getMonth()}`}
          tourDayNum={tourDayNum}
          monthDate={m}
          tripStart={start}
          tripEnd={end}
          pendingStart={isSelectMode ? pendingStart : null}
          markedByDayNum={markedByDayNum}
          restaurantSlots={restaurantSlots}
          getDayNum={getDayNum}
          onTapDate={handleTap}
        />
      ))}
    </div>
  )
}
