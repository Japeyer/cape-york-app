import { S } from '../strings.js'
// Hinweis: Die früher hier eingebundene Fuel-Section + estimateRoutePosition()-Schätzung
// wurde im (k)-Release entfernt. Die lineare km-Interpolation Cairns→Bamaga war
// für realistische Trips (Pausen, Side-Trips) zu ungenau, was Kunden missverständliche
// Distanz-Schätzungen lieferte. Tankstellen leben jetzt im 🗺️-Map-Tab als sortierte
// Liste auf der Strecke — User schätzt selbst was er an Tag X erreicht.

// Generischer Modal-Sheet (Bottom-Sheet auf Mobile). Closes on backdrop tap or "Done".
function Sheet({ title, onClose, children }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet-card" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <div className="sheet-title">{title}</div>
          <button className="sheet-close" onClick={onClose} aria-label="close">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
        <div className="sheet-foot">
          <button className="sheet-done-btn" onClick={onClose}>{S.config.daySheet.done}</button>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ icon, label, sub, active, onClick }) {
  return (
    <button className={`sheet-toggle${active ? ' active' : ''}`} onClick={onClick}>
      <div className="sheet-toggle-text">
        <div className="sheet-toggle-label">
          {icon && <span className="sheet-toggle-icon">{icon}</span>}
          {label}
        </div>
        {sub && <div className="sheet-toggle-sub">{sub}</div>}
      </div>
      <div className={`sheet-toggle-box${active ? ' active' : ''}`}>{active ? '✓' : ''}</div>
    </button>
  )
}

// Props:
//  stopRows: [{ stopId, icon, label, sub, active }] — vorgebaut vom Configurator.
//            Enthält ALLE optionalen Stops (Bamaga + Cooktown + Coen + Archer); active
//            = derzeit auf diesen Tag gesetzt. Tap (de)aktiviert oder verschiebt.
//            Leer wenn der Tag Cairns-Start oder Rückkehr ist (kein Resupply sinnvoll).
//  onToggleStop(stopId): tap → enable+assign / disable / move auf den aktuellen Tag
export default function DaySheet({
  open, dayNum, dateLabel,
  stopRows, restaurantSlots,
  onToggleStop, onToggleRestaurant, onClose,
}) {
  if (!open) return null
  const slots = restaurantSlots?.[dayNum] || {}
  const hasResupplyOptions = stopRows && stopRows.length > 0


  return (
    <Sheet
      title={S.config.daySheet.title({ day: dayNum, dateStr: dateLabel })}
      onClose={onClose}
    >
      {hasResupplyOptions && (
        <>
          <div className="sheet-section-label">{S.config.daySheet.resupplyHeading}</div>
          <div className="sheet-section-hint">{S.config.daySheet.resupplyHint}</div>
          {stopRows.map(row => (
            <ToggleRow
              key={row.stopId}
              icon={row.icon}
              label={row.label}
              sub={row.sub}
              active={row.active}
              onClick={() => onToggleStop(row.stopId)}
            />
          ))}
        </>
      )}

      <div className="sheet-section-label">{S.config.daySheet.restaurantHeading}</div>
      <ToggleRow
        label={S.config.daySheet.breakfast}
        active={slots.f === true}
        onClick={() => onToggleRestaurant('f')}
      />
      <ToggleRow
        label={S.config.daySheet.lunch}
        active={slots.m === true}
        onClick={() => onToggleRestaurant('m')}
      />
      <ToggleRow
        label={S.config.daySheet.dinner}
        active={slots.ab === true}
        onClick={() => onToggleRestaurant('ab')}
      />

    </Sheet>
  )
}

export { Sheet }
