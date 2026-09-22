import { useEffect, useRef } from 'react'
import { S } from '../strings.js'

// Stop-Auswahl der Einkaufslisten — Popup, das über der Bottom-Nav aufklappt.
//
// Warum: bei voll aktivierten Resupply-Stops (Cairns + Cooktown + Coen + Archer +
// Weipa + Bamaga) standen bis zu 9 Buttons in der Leiste — auf 360 px ~40 px pro
// Button, unbedienbar. Die Stops liegen deshalb hinter EINEM Shopping-Eintrag.
//
// Die Komponente rendert nur die Auswahl. Ob sie überhaupt erscheint, entscheidet
// App.jsx: bei genau einem Stop (nur Cairns) springt der Tap direkt auf dessen Liste.
//
// Props:
//   stops    [{ id, icon, label, locked }] — bereits gefiltert + in Reise-Reihenfolge
//   activeId aktuell geöffneter Stop (oder null, wenn gerade eine andere Seite offen ist)
//   onPick(id) / onClose()
export default function ShopStopSheet({ stops, activeId, onPick, onClose }) {
  const popRef = useRef(null)

  // Esc schliesst. Fokus wandert auf den aktiven (sonst ersten) Eintrag, damit das
  // Popup auch per Tastatur/Screenreader bedienbar ist.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const pop = popRef.current
    const target = pop?.querySelector('.shopnav-row.active') || pop?.querySelector('.shopnav-row')
    target?.focus?.()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="shopnav-backdrop" onClick={onClose}>
      <div
        className="shopnav-pop"
        ref={popRef}
        role="menu"
        aria-label={S.shopping.stopPicker.title}
        onClick={e => e.stopPropagation()}
      >
        <div className="shopnav-title">{S.shopping.stopPicker.title}</div>
        <div className="shopnav-sub">{S.shopping.stopPicker.sub}</div>
        {stops.map(stop => (
          <button
            key={stop.id}
            role="menuitem"
            data-stop={stop.id}
            className={`shopnav-row${stop.id === activeId ? ' active' : ''}`}
            onClick={() => onPick(stop.id)}
          >
            <span className="shopnav-row-icon">{stop.icon}</span>
            <span className="shopnav-row-label">{stop.label}</span>
            {stop.locked && <span className="shopnav-row-lock">🔒</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
