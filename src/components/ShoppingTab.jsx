import { useState, useCallback, useMemo } from 'react'
import {
  getChecked, setChecked, resetPrefix, getAllCheckedIds,
  isItemDeleted, setItemDeleted, getAllDeletedIds,
  getQtyOverride, setQtyOverride,
  getAddedItems, setAddedItem, removeAddedItem,
} from '../hooks/useStorage.js'
import { S } from '../strings.js'
import { Sheet } from './DaySheet.jsx'
import PremiumGate from './PremiumGate.jsx'
import { recipeUsageMap } from '../lib/inventory.js'
import {
  formatShoppingListAsText, tryWebShare,
  buildWhatsAppUrl, buildMailtoUrl, copyToClipboard,
} from '../lib/share.js'

function buildInitialState(data, prefix) {
  const state = {}
  data.forEach(cat => cat.items.forEach(item => {
    state[item.id] = getChecked(prefix + item.id)
  }))
  return state
}

// Wendet User-Customizations auf die generator-Daten an:
//   - Items in del_*       werden ausgeblendet
//   - Items mit qty_*       bekommen die Override-Menge
//   - Items in add_<prefix>_* werden in ihre Kategorie injiziert (oder eine neue erstellt)
// Leere Kategorien (alle Items gelöscht) werden dropped.
function applyCustomizations(data, prefix) {
  const deleted = new Set(getAllDeletedIds())
  const added = getAddedItems(prefix)

  const cats = data.map(cat => ({
    cat: cat.cat,
    items: cat.items
      .filter(it => !deleted.has(it.id))
      .map(it => {
        const ovr = getQtyOverride(it.id)
        return ovr != null ? { ...it, qty: ovr, edited: true } : it
      }),
  }))

  // User-added items: in passende Kategorie einfügen, ggf. neue Kategorie anlegen.
  const catMap = new Map(cats.map(c => [c.cat, c]))
  for (const ai of added) {
    const target = ai.cat || '📦 Other'
    let cat = catMap.get(target)
    if (!cat) {
      cat = { cat: target, items: [] }
      catMap.set(target, cat)
      cats.push(cat)
    }
    cat.items.push({ id: ai.id, name: ai.name, qty: ai.qty, added: true })
  }

  // Items in jeder Kategorie alphabetisch sortieren — bleibt stabil bei Add/Edit.
  for (const cat of cats) {
    cat.items.sort((a, b) => a.name.localeCompare(b.name))
  }

  return cats.filter(c => c.items.length > 0)
}

// Einfache eindeutige ID für user-added items (per-bucket gespeichert).
function newAddedId() {
  return 'u-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// Dismissible Stop-Note ("🏪 Last big supermarket! …" / "🌿 Small store in Bamaga …").
// Pro Bucket persistent unter `ui_dismissed_note_<spId>` — User kann die Hint pro Stop
// einmal wegklicken. `ui_`-Prefix wird vom resetAllShoppingState-Wipe nicht erfasst
// (UI-Pref, nicht Trip-State).
function DismissibleNote({ supplyPoint }) {
  const KEY = `ui_dismissed_note_${supplyPoint.id}`
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(KEY) === 'true' } catch { return false }
  })
  if (dismissed) return null
  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(KEY, 'true') } catch {}
  }
  const isStart = supplyPoint.role === 'start'
  const text = S.shopping.notes[supplyPoint.id] || `${supplyPoint.name} resupply list`
  return (
    <div className={`note ${isStart ? 'note-w' : 'note-s'}`}>
      <span className="note-text">{text}</span>
      <button className="note-close" onClick={dismiss} aria-label={S.shopping.dismissAria}>✕</button>
    </div>
  )
}

// Fallback-Sheet wenn Web-Share-API nicht verfügbar ist (Desktop-Browser).
// Bietet drei Channels: WhatsApp-Link (öffnet App/Web), mailto-Link, Clipboard-Copy.
// User wählt selbst — die App selbst verschickt nichts und kennt den Empfänger nicht.
function ShareSheet({ text, supplyPoint, onClose, onToast }) {
  const subject = S.shopping.share.emailSubject({ name: supplyPoint.name })
  const handleCopy = async (e) => {
    e.preventDefault()
    const ok = await copyToClipboard(text)
    onToast(ok ? S.shopping.share.copied : S.shopping.share.copyFailed)
    if (ok) onClose()
  }
  return (
    <Sheet title={S.shopping.share.sheetTitle} onClose={onClose}>
      <p className="share-sub">{S.shopping.share.sheetSub}</p>
      <div className="share-list">
        <a
          className="share-btn"
          href={buildWhatsAppUrl(text)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
        >
          {S.shopping.share.whatsapp}
        </a>
        <a
          className="share-btn"
          href={buildMailtoUrl({ subject, text })}
          onClick={onClose}
        >
          {S.shopping.share.email}
        </a>
        <button className="share-btn" onClick={handleCopy}>
          {S.shopping.share.copy}
        </button>
      </div>
    </Sheet>
  )
}

function CheckItem({ item, checked, onToggle, onEdit, usage, onOpenRecipe }) {
  const [showUse, setShowUse] = useState(false)
  const uses = usage || []
  return (
    <div className={`chk-item${checked ? ' done' : ''}`}>
      <div className="chk-item-top">
        <div className="chk-row" data-tour="shop-tick" onClick={() => onToggle(item.id)}>
          <div className={`chk-box${checked ? ' checked' : ''}`}>
            {checked ? '✓' : ''}
          </div>
          <span className={`chk-name${checked ? ' done' : ''}`}>
            {item.added && <span className="chk-badge" title="custom">+</span>}
            {item.name}
          </span>
          <span className={`chk-qty${checked ? ' done' : ''}${item.edited ? ' chk-qty-edited' : ''}`}>
            {item.qty}
          </span>
        </div>
        {uses.length > 0 && (
          <button
            className={`chk-use-btn${showUse ? ' open' : ''}`}
            data-tour="shop-uses"
            onClick={() => setShowUse(s => !s)}
            aria-expanded={showUse}
            aria-label={S.shopping.usedInAria({ n: uses.length })}
          >
            🍽 {uses.length}<span className="chk-use-arrow">▾</span>
          </button>
        )}
        <button className="chk-edit" onClick={() => onEdit(item)} aria-label="edit item">✎</button>
      </div>
      {showUse && uses.length > 0 && (
        <div className="chk-use-list">
          <div className="chk-use-hd">{S.shopping.usedInLabel}</div>
          {uses.map(u => (
            <button key={u.id} className="chk-use-row" onClick={() => onOpenRecipe?.(u.id)}>
              <span className="chk-use-icon">{u.icon}</span>
              <span className="chk-use-name">{u.name}</span>
              <span className="chk-use-amt">{u.amount}</span>
              <span className="chk-use-go" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Sheet zum Editieren eines bestehenden Items (qty editierbar, name read-only für generated,
// editable für added). Plus delete button. Inputs werden lokal gehalten und auf Save geschrieben.
function EditItemSheet({ item, prefix, onClose, onChanged }) {
  const isAdded = item.added === true
  const [name, setName] = useState(item.name)
  const [qty, setQty]   = useState(item.qty || '')

  const save = () => {
    if (isAdded) {
      // User-added: payload komplett überschreiben
      setAddedItem(prefix, item.id, { name: name.trim() || item.name, qty: qty.trim(), cat: item._cat || '' })
    } else {
      // Generator-Item: nur qty als Override; name bleibt original
      setQtyOverride(item.id, qty.trim() || null)
    }
    onChanged()
    onClose()
  }

  const remove = () => {
    if (!window.confirm(S.shopping.editSheet.deleteConfirm)) return
    if (isAdded) removeAddedItem(prefix, item.id)
    else         setItemDeleted(item.id, true)
    onChanged()
    onClose()
  }

  return (
    <Sheet title={S.shopping.editSheet.title} onClose={onClose}>
      <div className="sheet-form">
        <label className="sheet-form-label">{S.shopping.editSheet.nameLabel}</label>
        <input
          className="sheet-form-input"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={!isAdded}
          placeholder={S.shopping.editSheet.namePh}
        />
        <label className="sheet-form-label">{S.shopping.editSheet.qtyLabel}</label>
        <input
          className="sheet-form-input"
          value={qty}
          onChange={e => setQty(e.target.value)}
          placeholder={S.shopping.editSheet.qtyPh}
        />
        <div className="sheet-form-row">
          <button className="sheet-form-del" onClick={remove}>
            {S.shopping.editSheet.delete}
          </button>
          <button className="sheet-form-save" onClick={save}>
            {S.shopping.editSheet.save}
          </button>
        </div>
      </div>
    </Sheet>
  )
}

// Sheet zum Hinzufügen eines neuen Items in eine Kategorie. Cat ist preset vom Tap-Origin.
function AddItemSheet({ cat, prefix, onClose, onChanged }) {
  const [name, setName] = useState('')
  const [qty, setQty]   = useState('')

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const id = newAddedId()
    setAddedItem(prefix, id, { name: trimmed, qty: qty.trim(), cat })
    onChanged()
    onClose()
  }

  return (
    <Sheet title={S.shopping.addSheet.title({ cat })} onClose={onClose}>
      <div className="sheet-form">
        <label className="sheet-form-label">{S.shopping.addSheet.nameLabel}</label>
        <input
          className="sheet-form-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={S.shopping.addSheet.namePh}
          autoFocus
        />
        <label className="sheet-form-label">{S.shopping.addSheet.qtyLabel}</label>
        <input
          className="sheet-form-input"
          value={qty}
          onChange={e => setQty(e.target.value)}
          placeholder={S.shopping.addSheet.qtyPh}
        />
        <div className="sheet-form-row">
          <div style={{ flex: 1 }} />
          <button className="sheet-form-save" onClick={save} disabled={!name.trim()}>
            {S.shopping.addSheet.save}
          </button>
        </div>
      </div>
    </Sheet>
  )
}

export default function ShoppingTab({ supplyPoint, data, plan, onOpenRecipe, locked = false, onUpgrade }) {
  // Map Zutat → Rezepte im Plan (für das "Wo wird das verwendet?"-Dropdown pro Item).
  const usageMap = useMemo(() => recipeUsageMap(plan || []), [plan])
  // Free-Mode bei Premium-Stop: konkrete Vorschau mit echten Items (lesbar) plus
  // Premium-Sticker am Ende. Lieferung von Verkaufsargument: User sieht "ja diese
  // Items brauche ich auch" statt einer abstrakten Anzahl.
  // Hooks UNTER diesem Early-Return würden React's Rules-of-Hooks brechen, also
  // kommt der Return als allererstes.
  if (locked) {
    const itemCount = data.reduce((acc, cat) => acc + (cat.items?.length || 0), 0)
    const PREVIEW_ITEM_COUNT = 5
    // Wir nehmen die ersten N Items quer durch alle Kategorien — das gibt mehr
    // Variation als 5 Items aus derselben Kategorie. Camping-Essentials sind oft
    // die erste Kategorie und gut zur Demo (Wasser, Eis, Müllsäcke).
    const preview = []
    for (const cat of data) {
      for (const item of cat.items || []) {
        if (preview.length >= PREVIEW_ITEM_COUNT) break
        preview.push({ ...item, cat: cat.cat })
      }
      if (preview.length >= PREVIEW_ITEM_COUNT) break
    }
    const remaining = Math.max(0, itemCount - preview.length)
    return (
      <div className="locked-shop-wrap">
        <DismissibleNote supplyPoint={supplyPoint} />
        <div className="locked-shop-intro">
          {S.shopping.lockedIntro({ name: supplyPoint.name, count: itemCount })}
        </div>
        <ul className="locked-shop-preview">
          {preview.map(item => (
            <li key={item.id} className="locked-shop-preview-row">
              <span className="locked-shop-preview-name">{item.name}</span>
              <span className="locked-shop-preview-qty">{item.qty}</span>
            </li>
          ))}
        </ul>
        <button className="locked-shop-cta" onClick={onUpgrade}>
          <span className="locked-shop-cta-badge">🔒 {S.premium.badge}</span>
          <span className="locked-shop-cta-label">
            {S.shopping.lockedCta({ remaining, name: supplyPoint.name })}
          </span>
        </button>
      </div>
    )
  }

  const prefix = supplyPoint.storagePrefix

  // Bump bei jeder Customization (delete/edit/add) damit useMemo neu rechnet.
  const [customVersion, setCustomVersion] = useState(0)
  const bump = useCallback(() => setCustomVersion(v => v + 1), [])

  const customData = useMemo(
    () => applyCustomizations(data, prefix),
    [data, prefix, customVersion]
  )

  // Plan-Identitäts-Key inklusive Customizations — Storage-State muss neu eingelesen werden
  // wenn sich die Item-Liste ändert (sonst hängt checkbox-Map an alten IDs).
  const planKey = useMemo(
    () => customData.flatMap(c => c.items.map(i => i.id)).sort().join('|'),
    [customData]
  )

  const [checked, setCheckedState] = useState(() => buildInitialState(customData, prefix))
  const [lastKey, setLastKey] = useState(planKey)
  if (lastKey !== planKey) {
    setCheckedState(buildInitialState(customData, prefix))
    setLastKey(planKey)
  }

  // Orphans = abgehakt im Storage, aber nicht (mehr) in der aktuellen Liste UND nicht gelöscht.
  // (Gelöschte Items sind in einer separaten "Hidden items" Sektion.)
  const orphans = useMemo(() => {
    const inList = new Set(customData.flatMap(c => c.items.map(i => i.id)))
    const deleted = new Set(getAllDeletedIds())
    return getAllCheckedIds(prefix).filter(id => !inList.has(id) && !deleted.has(id))
  }, [customData, prefix, planKey, customVersion])

  // Hidden items = im aktuellen Original-Plan vorhanden, aber vom User gelöscht.
  // Tap → restore (del_-Key löschen). Nur Items aus DIESEM Bucket zeigen.
  const hiddenItems = useMemo(() => {
    const deleted = new Set(getAllDeletedIds())
    if (!deleted.size) return []
    return data.flatMap(c => c.items.filter(it => deleted.has(it.id)))
  }, [data, customVersion])

  const [orphanVersion, setOrphanVersion] = useState(0)
  const visibleOrphans = useMemo(() => orphans, [orphans, orphanVersion])

  const allItems = customData.flatMap(c => c.items)
  const checkedCount = allItems.filter(it => checked[it.id]).length
  const total = allItems.length
  const pct = total > 0 ? Math.round(checkedCount / total * 100) : 0

  // "Hide checked" Toggle pro Bucket — UI-Pref, persistiert in localStorage.
  // Liegt unter `ui_`-Prefix, wird also von resetAllShoppingState() NICHT gewiped
  // (Pref ist Komfort, nicht Trip-State).
  const HIDE_KEY = `ui_hide_checked_${supplyPoint.id}`
  const [hideChecked, setHideChecked] = useState(() => {
    try { return localStorage.getItem(HIDE_KEY) === 'true' } catch { return false }
  })
  const toggleHideChecked = useCallback(() => {
    setHideChecked(prev => {
      const next = !prev
      try { localStorage.setItem(HIDE_KEY, String(next)) } catch {}
      return next
    })
  }, [HIDE_KEY])

  // Sichtbare Daten = customData minus checked items wenn Toggle aktiv. Leere
  // Kategorien werden gedropt, damit der Cat-Header nicht alleine stehen bleibt.
  const visibleData = useMemo(() => {
    if (!hideChecked) return customData
    return customData
      .map(cat => ({ ...cat, items: cat.items.filter(it => !checked[it.id]) }))
      .filter(cat => cat.items.length > 0)
  }, [customData, hideChecked, checked])

  const toggle = useCallback((id) => {
    setCheckedState(prev => {
      const val = !prev[id]
      setChecked(prefix + id, val)
      return { ...prev, [id]: val }
    })
  }, [prefix])

  const clearOrphan = useCallback((id) => {
    setChecked(prefix + id, false)
    setOrphanVersion(v => v + 1)
  }, [prefix])

  const restoreHidden = useCallback((id) => {
    setItemDeleted(id, false)
    bump()
  }, [bump])

  const resetAll = () => {
    if (!confirm(S.shopping.actions.confirmReset)) return
    resetPrefix(prefix)
    setCheckedState(buildInitialState(customData, prefix))
    setOrphanVersion(v => v + 1)
  }

  const checkAll = () => {
    const next = {}
    allItems.forEach(it => {
      next[it.id] = true
      setChecked(prefix + it.id, true)
    })
    setCheckedState(next)
  }

  // Sheet-State: editing einzelnes Item, oder adding in Kategorie
  const [editing, setEditing] = useState(null)   // item-Objekt oder null
  const [adding, setAdding]   = useState(null)   // cat-String oder null
  const [shareText, setShareText] = useState(null)  // string oder null = Fallback-Sheet zeigen
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }, [])

  const handleShare = useCallback(async () => {
    const text = formatShoppingListAsText({
      data: customData,
      checked,
      supplyPoint,
    })
    const title = S.shopping.share.emailSubject({ name: supplyPoint.name })
    const result = await tryWebShare({ title, text })
    if (result.ok || result.reason === 'cancelled') return
    // Web Share nicht verfügbar (Desktop) oder fehlgeschlagen → Fallback-Sheet
    setShareText(text)
  }, [customData, checked, supplyPoint])

  const openEdit = (item, catName) => setEditing({ ...item, _cat: catName })

  if (total === 0 && visibleOrphans.length === 0 && hiddenItems.length === 0) {
    return (
      <div style={{ paddingTop: 8 }}>
        <DismissibleNote supplyPoint={supplyPoint} />
        <div className="empty-state">{S.shopping.empty}</div>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <DismissibleNote supplyPoint={supplyPoint} />

      <div className="progress-card">
        <div className="progress-row">
          <span className="progress-label">{S.shopping.progress[supplyPoint.id]}</span>
          <span className="progress-count">{checkedCount} / {total}</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: pct + '%' }} />
        </div>
        {checkedCount > 0 && (
          <div className="progress-hide">
            <button className="progress-hide-btn" onClick={toggleHideChecked}>
              {hideChecked
                ? S.shopping.showChecked({ count: checkedCount })
                : S.shopping.hideChecked({ count: checkedCount })}
            </button>
          </div>
        )}
        <div className="progress-actions">
          <button className="progress-btn" onClick={resetAll}>{S.shopping.actions.reset}</button>
          {total > 0 && (
            <button className="progress-btn share" data-tour="shop-share" onClick={handleShare}>
              {S.shopping.actions.share}
            </button>
          )}
          <button className="progress-btn all" onClick={checkAll}>{S.shopping.actions.checkAll}</button>
        </div>
      </div>

      {pct === 100 && total > 0 && (
        <div className="celebrate">
          <div>🎉</div>
          <p>{S.shopping.done}</p>
        </div>
      )}

      {visibleData.map(cat => (
        <div key={cat.cat} className="cat-card">
          <div className="cat-hdr">
            <span className="cat-hdr-label">{cat.cat}</span>
            <button
              className="cat-add-btn"
              onClick={() => setAdding(cat.cat)}
              aria-label={`add item to ${cat.cat}`}
            >
              + {S.shopping.addBtn}
            </button>
          </div>
          {cat.items.map(item => (
            <CheckItem
              key={item.id}
              item={item}
              checked={!!checked[item.id]}
              onToggle={toggle}
              onEdit={(it) => openEdit(it, cat.cat)}
              usage={item.key ? usageMap.get(item.key) : null}
              onOpenRecipe={onOpenRecipe}
            />
          ))}
        </div>
      ))}

      {/* "Add to other category"-Fallback: wenn der User einen Eintrag will,
          dessen Kategorie noch gar nicht in der Liste ist (z.B. erste Frucht in Bamaga). */}
      <div className="cat-card cat-card-other">
        <button
          className="cat-add-btn-block"
          onClick={() => setAdding('📦 Other')}
        >
          + {S.shopping.addOtherBtn}
        </button>
      </div>

      {hiddenItems.length > 0 && (
        <div className="cat-card hidden-section">
          <div className="cat-hdr">{S.shopping.hidden.title}</div>
          <div className="orphan-sub">{S.shopping.hidden.sub}</div>
          {hiddenItems.map(it => (
            <div key={it.id} className="chk-item orphan-item" onClick={() => restoreHidden(it.id)}>
              <div className="chk-box orphan-box">↺</div>
              <span className="chk-name done">{it.name}</span>
              <span className="chk-qty done">{S.shopping.hidden.tapRestore}</span>
            </div>
          ))}
        </div>
      )}

      {visibleOrphans.length > 0 && (
        <div className="cat-card orphan-section">
          <div className="cat-hdr">{S.shopping.orphans.title}</div>
          <div className="orphan-sub">{S.shopping.orphans.sub}</div>
          {visibleOrphans.map(id => (
            <div key={id} className="chk-item orphan-item" onClick={() => clearOrphan(id)}>
              <div className="chk-box checked orphan-box">✓</div>
              <span className="chk-name done">{prettyOrphanName(id)}</span>
              <span className="chk-qty done">tap to clear</span>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditItemSheet
          item={editing}
          prefix={prefix}
          onClose={() => setEditing(null)}
          onChanged={bump}
        />
      )}
      {adding && (
        <AddItemSheet
          cat={adding}
          prefix={prefix}
          onClose={() => setAdding(null)}
          onChanged={bump}
        />
      )}
      {shareText !== null && (
        <ShareSheet
          text={shareText}
          supplyPoint={supplyPoint}
          onClose={() => setShareText(null)}
          onToast={showToast}
        />
      )}
      {toast && <div className="share-toast">{toast}</div>}
    </div>
  )
}

// Slug → Anzeigename. Alte numerische IDs aus pre-pivot ('c0', 'b3') passieren durch.
function prettyOrphanName(id) {
  if (/^[cb]?\d+/.test(id)) return id
  return id
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
