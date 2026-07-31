import { useState } from 'react'
import { S } from '../strings.js'
import { parseISO, addDays } from '../lib/dates.js'

// Startseite: Liste gespeicherter Trips (Premium: mehrere; Free: 1). Jede Karte: Name (editierbar),
// Datum + Kurz-Summary, Open/Edit/Delete. Ohne Trips: Create-CTA.
function formatDate(iso) {
  if (!iso) return ''
  const d = parseISO(iso)
  const wd = S.config.calendar.weekdaysFull[(d.getDay() + 6) % 7]
  const mo = S.config.calendar.monthNames[d.getMonth()]
  return `${wd}, ${mo} ${d.getDate()}, ${d.getFullYear()}`
}

function TripCard({ trip, onOpen, onEdit, onDelete, onRename }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(trip.name)
  const cfg = trip.config || {}
  const done = cfg.completed && cfg.days >= 1
  const persons = cfg.people?.length || 0
  const dietLabel = S.config.dietOptions[cfg.diet]?.label || cfg.diet || ''
  const start = cfg.startDate ? formatDate(cfg.startDate) : ''
  const end = cfg.startDate && cfg.days
    ? formatDate(addDays(parseISO(cfg.startDate), cfg.days - 1).toISOString().slice(0, 10))
    : ''

  const saveName = () => {
    const n = name.trim()
    if (n && n !== trip.name) onRename(trip.id, n)
    else setName(trip.name)
    setEditing(false)
  }

  return (
    <div className="home-trip-card">
      <div className="home-trip-namerow">
        {editing ? (
          <input
            className="home-trip-name-input" autoFocus
            value={name} onChange={e => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => {
              if (e.key === 'Enter') saveName()
              if (e.key === 'Escape') { setName(trip.name); setEditing(false) }
            }}
          />
        ) : (
          <button className="home-trip-name" onClick={() => setEditing(true)} aria-label={S.home.renameAria({ name: trip.name })}>
            <span className="home-trip-name-txt">{trip.name}</span>
            <span className="home-trip-name-edit">✎</span>
          </button>
        )}
      </div>

      {done ? (
        <button className="home-trip-body" data-tour="home-open" onClick={() => onOpen(trip.id)}>
          <div className="home-trip-dates">{start}{end && ` → ${end}`}</div>
          <div className="home-trip-summary">{S.home.tripStats({ days: cfg.days, persons, dietLabel })}</div>
          <div className="home-trip-cta">{S.home.openCta} →</div>
        </button>
      ) : (
        <button className="home-trip-body home-trip-draft" onClick={() => onEdit(trip.id)}>
          {S.home.draftLabel}
        </button>
      )}

      <div className="home-trip-actions">
        <button className="home-trip-edit-btn" onClick={() => onEdit(trip.id)}>✎ {S.home.editCta}</button>
        <button
          className="home-trip-delete-btn"
          onClick={() => { if (window.confirm(S.home.deleteConfirm({ name: trip.name }))) onDelete(trip.id) }}
        >
          🗑 {S.home.deleteCta}
        </button>
      </div>
    </div>
  )
}

export default function HomeTab({ trips = [], premium = false, maxFreeTrips = 1, onOpenTrip, onEditTrip, onCreateNew, onDeleteTrip, onRenameTrip }) {
  if (!trips.length) {
    return (
      <div className="home-wrap">
        <div className="home-empty">
          <div className="home-empty-icon">🦘</div>
          <h2 className="home-empty-title">{S.home.emptyTitle}</h2>
          <p className="home-empty-sub">{S.home.emptySub}</p>
          <button className="home-create-btn" data-tour="home-create" onClick={onCreateNew}>{S.home.createCta}</button>
        </div>
      </div>
    )
  }

  const atLimit = !premium && trips.length >= maxFreeTrips

  return (
    <div className="home-wrap">
      <div className="home-section-label">{S.home.yourTripsLabel}</div>

      {trips.map(t => (
        <TripCard
          key={t.id}
          trip={t}
          onOpen={onOpenTrip}
          onEdit={onEditTrip}
          onDelete={onDeleteTrip}
          onRename={onRenameTrip}
        />
      ))}

      <button className={`home-create-secondary${atLimit ? ' locked' : ''}`} data-tour="home-create" onClick={onCreateNew}>
        {atLimit ? `🔒 ${S.home.newTripLocked}` : `+ ${S.home.createNewCta}`}
      </button>
      <div className="home-create-hint">{atLimit ? S.home.upgradeHint : S.home.createNewHint}</div>
    </div>
  )
}
