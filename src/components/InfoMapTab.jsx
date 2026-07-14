import { useState } from 'react'
import { S } from '../strings.js'
import { LAYERS } from '../data/cape-york-pois.js'
import CapeYorkMap from './CapeYorkMap.jsx'
import { Sheet } from './DaySheet.jsx'

// Info-Tab mit interaktiver Cape-York-Karte. Layer-Toggles unten erlauben Ein-/Ausblenden
// von Tankstellen, Stränden, Camp-Plätzen, etc. Premium-Layer sind für Free-User gegated:
// Toggle-Pill ist sichtbar (= Marketing!) aber inaktiv und mit Schloss-Icon — Tap öffnet
// PremiumInfoTab. Free-User sieht also welche Layer existieren ohne sie nutzen zu können.
//
// Tap auf einen Karten-Marker öffnet ein Bottom-Sheet mit dem Detail-Blurb des POI.

export default function InfoMapTab({ premium, onUpgrade, tripConfig }) {
  // Default: alle Free-Layer an, Premium-Layer aus.
  const [activeLayers, setActiveLayers] = useState(() => {
    const initial = new Set()
    for (const l of LAYERS) if (!l.premium) initial.add(l.id)
    return initial
  })
  const [selectedPoi, setSelectedPoi] = useState(null)

  function toggleLayer(layer) {
    if (layer.premium && !premium) {
      onUpgrade?.()
      return
    }
    setActiveLayers(prev => {
      const next = new Set(prev)
      if (next.has(layer.id)) next.delete(layer.id)
      else next.add(layer.id)
      return next
    })
  }

  return (
    <div className="map-tab-wrap">
      <div className="map-intro">
        <h2 className="map-intro-title">{S.map.title}</h2>
        <p className="map-intro-sub">{S.map.subtitle}</p>
      </div>

      <div className="map-canvas-wrap">
        <CapeYorkMap
          activeLayers={activeLayers}
          onMarkerTap={setSelectedPoi}
          premium={premium}
          tripConfig={tripConfig}
        />
      </div>

      <div className="map-layers-heading">{S.map.layersHeading}</div>
      <div className="map-layers-grid">
        {LAYERS.map(layer => {
          const active = activeLayers.has(layer.id)
          const locked = layer.premium && !premium
          return (
            <button
              key={layer.id}
              className={`map-layer-pill${active ? ' active' : ''}${locked ? ' locked' : ''}`}
              onClick={() => toggleLayer(layer)}
              style={active ? { borderColor: layer.color, background: hexToTint(layer.color) } : null}
              aria-pressed={active}
            >
              <span className="map-layer-icon">{layer.icon}</span>
              <span className="map-layer-label">{layer.label}</span>
              {locked && <span className="map-layer-lock">🔒</span>}
            </button>
          )
        })}
      </div>

      <div className="map-attribution">{S.map.attribution}</div>

      {selectedPoi && (
        <Sheet
          title={selectedPoi.name || S.map.unnamedPoi}
          onClose={() => setSelectedPoi(null)}
        >
          <div className="map-poi-meta">
            {selectedPoi.kmFromCairns != null && (
              <span className="map-poi-km">📍 km {selectedPoi.kmFromCairns} from Cairns</span>
            )}
            {selectedPoi.layer && (
              <span className="map-poi-layer">
                {LAYERS.find(l => l.id === selectedPoi.layer)?.icon} {LAYERS.find(l => l.id === selectedPoi.layer)?.label}
              </span>
            )}
          </div>
          {selectedPoi.blurb && (
            <p className="map-poi-blurb">{selectedPoi.blurb}</p>
          )}
        </Sheet>
      )}
    </div>
  )
}

// Hex-Farbe → tint-Variante für Pill-Hintergrund (auf 12% Opacity gemischt mit weiß).
// Inline weil die Layer-Farben aus den Daten kommen und nicht alle als CSS-Variablen
// vorab definiert werden — würde sonst CSS doppelt führen.
function hexToTint(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#fff'
  const num = parseInt(m[1], 16)
  const r = (num >> 16) & 0xff
  const g = (num >> 8) & 0xff
  const b = num & 0xff
  // 12% von Layer-Farbe + 88% weiß = sehr leichter Tint.
  const mix = (c) => Math.round(c * 0.12 + 255 * 0.88)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}
