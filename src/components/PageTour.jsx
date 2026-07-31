import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TOURS } from '../lib/tours.js'
import { S } from '../strings.js'
import { getToursSeen, markTourSeen } from '../hooks/useStorage.js'

// ─────────────────────────────────────────────────────────────────────────
//  SPOTLIGHT-TUTORIAL — einmalig pro Seite, beim ersten Öffnen
// ─────────────────────────────────────────────────────────────────────────
//
// Der Rest der Seite wird ausgegraut, das gerade erklärte Element bleibt hell UND
// bedienbar (die Abdunklung besteht aus vier Panels rings um das Ziel — das Ziel selbst
// ist von nichts überdeckt, Taps gehen direkt an die App). Ein kleines Popup über dem
// abgedunkelten Rest erklärt die Funktion. Sobald der Nutzer die Funktion ausführt
// (Tap auf das hervorgehobene Element), ist der Schritt erledigt: der Spotlight wandert
// zur nächsten Funktion, nach der letzten verschwindet das Tutorial.
//
// „Next" und „Skip tips" sind Notausgänge — niemand soll festhängen, nur weil er die
// Aktion gerade nicht ausführen will.
//
// Robustheit (das hier läuft ÜBER der ganzen App, es darf nie etwas blockieren):
//   • Ziel nicht (mehr) im DOM        → Schritt wird übersprungen (bei `wait` kurz gewartet)
//   • Bottom-Sheet/Dialog offen       → Tutorial pausiert (nichts gerendert), kommt danach zurück
//   • Seite verlassen                 → gilt als gesehen, sobald ein Schritt sichtbar war
//   • gar nichts anzeigbar            → NICHT als gesehen markiert (erscheint beim nächsten Besuch)

const PAD = 6            // Luft zwischen Element und Spotlight-Rand
const GAP = 12           // Abstand Popup ↔ Spotlight
const POP_SPACE = 190    // grobe Popup-Höhe für die Oben/Unten-Entscheidung
const WAIT_MS = 2000     // wie lange auf ein `wait`-Ziel gewartet wird, bevor übersprungen wird
// Offene Bottom-Sheets/Modals der App: Swap, Meal-Status, Rezept-Editor, Shopping-Sheets.
// Solange eines davon offen ist, pausiert das Tutorial (es soll sich nicht drüberlegen).
const OVERLAY_SEL = '[role="dialog"], .sheet-backdrop'

function rectOf(el) {
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}
function sameRect(a, b) {
  if (!a || !b) return a === b
  return Math.abs(a.top - b.top) < 1 && Math.abs(a.left - b.left) < 1
    && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1
}

export default function PageTour({ page }) {
  const steps = TOURS[page] || []
  // -1 = inaktiv (schon gesehen / nichts zu zeigen / fertig)
  const [i, setI] = useState(() => (steps.length && !getToursSeen().includes(page) ? 0 : -1))
  const [spot, setSpot] = useState({ rect: null, paused: false })
  const shownRef = useRef(false)     // wurde überhaupt je ein Schritt sichtbar?
  const pageRef = useRef(page)
  pageRef.current = page

  const active = i >= 0 && i < steps.length
  const step = active ? steps[i] : null

  // Seite verlassen (Tab-Wechsel) — einmal gesehen reicht, sonst poppt der Tipp bei
  // jedem Tab-Wechsel erneut auf.
  useEffect(() => () => { if (shownRef.current) markTourSeen(pageRef.current) }, [])

  const finish = useCallback(() => {
    markTourSeen(pageRef.current)
    setI(-1)
  }, [])

  // Nächster sinnvoller Schritt; ist keiner mehr übrig → Tutorial beenden.
  const advance = useCallback(() => {
    let n = i + 1
    while (n < steps.length && steps[n].skipIf?.()) n++
    if (n >= steps.length) {
      // Nie etwas gezeigt (leere Seite)? Dann NICHT als gesehen abhaken.
      if (shownRef.current) markTourSeen(pageRef.current)
      setI(-1)
      return
    }
    setI(n)
  }, [i, steps])

  // Startschritt kann schon beim Betreten hinfällig sein (skipIf) — erst nach dem Mount
  // prüfbar, weil der Tab-Inhalt im selben Commit gerendert wird.
  const started = useRef(false)
  useEffect(() => {
    if (started.current || !active) return
    started.current = true
    if (step.skipIf?.()) advance()
  }, [active, step, advance])

  // Position des Ziels messen. Läuft bei jeder DOM-Änderung (der Nutzer klappt Karten auf,
  // Sheets gehen auf/zu) und beim Scrollen. setState nur bei echter Änderung → kein Loop.
  const measure = useCallback(() => {
    if (!active) return
    // Schritt schon durch einen Zustandswechsel erledigt (z.B. Datums-Range gewählt)? Weiter.
    if (step.doneWhen?.()) { advance(); return }
    const el = document.querySelector(step.sel)
    // Offene Sheets: liegt das Ziel INNERHALB des Sheets (DaySheet: Resupply-Stop,
    // Restaurant), wird dort weiter erklärt — sonst pausiert das Tutorial, statt sich
    // über ein fremdes Sheet zu legen.
    const dialogs = [...document.querySelectorAll(OVERLAY_SEL)]
    const paused = dialogs.length > 0 && !(el && dialogs.some(d => d.contains(el)))
    // Ziel gar nicht da (Funktion auf dieser Seite nicht sichtbar) → Schritt hat sich erledigt.
    // `wait`-Schritte bekommen stattdessen unten eine kurze Gnadenfrist.
    if (!el && !paused && !step.wait) { advance(); return }
    const rect = el ? rectOf(el) : null
    setSpot(prev => (prev.paused === paused && sameRect(prev.rect, rect) ? prev : { rect, paused }))
  }, [active, step, advance])

  // Bewusst useLayoutEffect: die Messung muss VOR dem Paint sitzen, sonst blitzt beim
  // Schrittwechsel ein Frame mit dem alten Spotlight und dem neuen Text auf.
  useLayoutEffect(() => {
    if (!active) return
    // Ziel außerhalb des Sichtfelds → hinscrollen, sonst leuchtet der Spotlight ins Leere.
    const el = document.querySelector(step.sel)
    if (el) {
      const r = el.getBoundingClientRect()
      if (r.top < 0 || r.bottom > window.innerHeight) {
        try { el.scrollIntoView({ block: 'center', behavior: 'auto' }) } catch {}
      }
    }
    measure()
    const mo = new MutationObserver(measure)
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] })
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      mo.disconnect()
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [active, step, measure])

  // `wait`-Schritte: das Element entsteht erst durch den vorherigen Schritt — kurz warten,
  // dann überspringen (statt den Nutzer vor einem leeren Spotlight sitzen zu lassen).
  useEffect(() => {
    if (!active || !step.wait || spot.rect || spot.paused) return
    const t = setTimeout(advance, WAIT_MS)
    return () => clearTimeout(t)
  }, [active, spot.rect, spot.paused, step, advance])

  // Der eigentliche Abschluss: der Nutzer führt die erklärte Funktion aus.
  //
  // Listener in der CAPTURE-Phase am document — bewusst nicht Bubble: die Sheets rufen auf
  // ihrer Karte `e.stopPropagation()` (Backdrop-Klick soll nicht schließen). React stoppt
  // damit auch das native Event am Root, ein Bubble-Listener am document sähe Taps INNERHALB
  // eines Sheets also nie (Resupply-Stop/Restaurant im DaySheet). Capture läuft vor allem
  // anderen und ist davon unberührt.
  //
  // Weitergeschaltet wird per Microtask, damit Reacts eigener Handler + Re-Render zuerst
  // laufen — sonst sucht der Folgeschritt sein Ziel im noch alten DOM.
  useEffect(() => {
    // `doneWhen`-Schritte enden NICHT am Tap: einen Kalender-Zeitraum wählt man mit zwei
    // Taps — da entscheidet der Zustand, nicht der Klick.
    if (!active || step.doneWhen) return
    const onClick = (e) => {
      const el = document.querySelector(step.sel)
      if (el && (el === e.target || el.contains(e.target))) queueMicrotask(advance)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [active, step, advance])

  const txt = active ? S.tours[page]?.[step.key] : null
  if (!active || spot.paused || !spot.rect || !txt) return null

  const vh = window.innerHeight || 640
  const r = spot.rect
  const hole = {
    top: Math.max(0, r.top - PAD),
    left: Math.max(0, r.left - PAD),
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  }
  const holeBottom = hole.top + hole.height
  // Popup unter das Element, wenn dort Platz ist — sonst darüber; in beide Richtungen so
  // geklemmt, dass es nie halb aus dem Bildschirm ragt (Topbar 56 / Bottom-Nav 64 liegen
  // unter der Abdunklung, dürfen also überdeckt werden).
  const spaceBelow = vh - holeBottom - GAP
  const spaceAbove = hole.top - GAP
  const below = spaceBelow >= POP_SPACE || spaceBelow >= spaceAbove
  const popStyle = below
    ? { top: Math.max(GAP, Math.min(holeBottom + GAP, vh - GAP - POP_SPACE)) }
    : { bottom: Math.max(GAP, Math.min(vh - hole.top + GAP, vh - GAP - POP_SPACE)) }
  const last = i === steps.length - 1

  shownRef.current = true

  return createPortal(
    <div className="tour-layer">
      {/* Abdunklung als vier Panels RINGS um das Ziel — das Ziel selbst bleibt frei
          bedienbar, Taps daneben laufen ins Leere (der Nutzer soll den Schritt machen). */}
      <div className="tour-dim" style={{ top: 0, left: 0, right: 0, height: hole.top }} />
      <div className="tour-dim" style={{ top: holeBottom, left: 0, right: 0, bottom: 0 }} />
      <div className="tour-dim" style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} />
      <div className="tour-dim" style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} />
      <div
        className="tour-ring"
        style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
        aria-hidden="true"
      />

      <div className="tour-pop" style={popStyle} role="note" aria-live="polite">
        <div className="tour-pop-hd">
          <span className="tour-pop-count">{S.tours.ui.stepOf({ cur: i + 1, total: steps.length })}</span>
          <button className="tour-skip" onClick={finish}>{S.tours.ui.skip}</button>
        </div>
        <div className="tour-pop-title">{txt.title}</div>
        <div className="tour-pop-body">{txt.body}</div>
        <div className="tour-pop-foot">
          {/* Schritte ohne Aktion (reine Erklärung) haben keinen `cta`. */}
          <span className="tour-pop-cta">{txt.cta ? `👉 ${txt.cta}` : ''}</span>
          <button className="tour-next" onClick={advance}>
            {last ? S.tours.ui.done : S.tours.ui.next}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
