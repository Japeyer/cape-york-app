import { useState } from 'react'
import {
  getChecked, getManualUsed, setManualUsed,
  getAddedInventory, setAddedInventory, removeAddedInventory,
} from '../hooks/useStorage.js'
import { REGION } from '../data/regions.js'
import { consumedByCooked, subtractAmounts, isDepleted, formatAmount } from '../lib/inventory.js'
import { S } from '../strings.js'

// Erste zählbare Einheit (nicht Masse/Volumen) — dafür gibt es den schnellen "−1"-Button.
function countUnit(amount) {
  return Object.keys(amount || {}).find(u => u !== 'g' && u !== 'ml') || null
}

function newAddId() {
  return 'i-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// Sammelt die eingekauften (abgehakten) Zutaten über ALLE Supply-Points + user-hinzugefügte Items,
// summiert Mengen pro kanonischer Zutat, zieht Mahlzeit-Verbrauch UND manuellen Verbrauch ab.
function buildInventory(shopping, plan, factor) {
  const bought = {}  // key → { name, cat, amount, custom?, addId? }
  for (const sp of REGION.supplyPoints) {
    const bucket = shopping?.[sp.id]
    if (!bucket) continue
    for (const cat of bucket) {
      for (const item of cat.items) {
        if (!item.key || !item.amount) continue          // Essentials/added: kein Zutaten-Inventar
        if (!getChecked(sp.storagePrefix + item.id)) continue
        if (!bought[item.key]) bought[item.key] = { name: item.name, cat: cat.cat, amount: {} }
        for (const [u, q] of Object.entries(item.amount)) {
          bought[item.key].amount[u] = (bought[item.key].amount[u] || 0) + q
        }
      }
    }
  }
  // User-hinzugefügte Items (Snacks von unterwegs) — eigene Kategorie, zählbar.
  for (const it of getAddedInventory()) {
    bought['custom:' + it.id] = { name: it.name, cat: S.inventory.extraCat, amount: { count: it.qty }, custom: true, addId: it.id }
  }

  const consumed = consumedByCooked(plan, factor)
  const inStockByCat = new Map()
  const usedUp = []
  for (const [key, b] of Object.entries(bought)) {
    const manual = getManualUsed(key)
    const remaining = subtractAmounts(subtractAmounts(b.amount, consumed[key]), manual)
    const row = { key, name: b.name, cat: b.cat, remaining, manual, hasManual: Object.keys(manual).length > 0, custom: !!b.custom, addId: b.addId }
    if (isDepleted(remaining)) {
      usedUp.push(row)
    } else {
      if (!inStockByCat.has(b.cat)) inStockByCat.set(b.cat, [])
      inStockByCat.get(b.cat).push(row)
    }
  }
  const categories = [...inStockByCat.entries()]
    .map(([cat, items]) => ({ cat, items: items.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.cat.localeCompare(b.cat))
  usedUp.sort((a, b) => a.name.localeCompare(b.name))
  return { categories, usedUp, boughtCount: Object.keys(bought).length }
}

export default function InventoryTab({ plan, shopping, factor }) {
  const [showUsed, setShowUsed] = useState(false)
  const [, bump] = useState(0)  // Re-Render nach Änderung (liest localStorage neu)
  const refresh = () => bump(n => n + 1)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [qty, setQty] = useState(1)

  const { categories, usedUp, boughtCount } = buildInventory(shopping, plan, factor)

  const decOne = (row) => {
    const unit = countUnit(row.remaining)
    if (!unit) return
    setManualUsed(row.key, { ...row.manual, [unit]: (row.manual[unit] || 0) + 1 })
    refresh()
  }
  const crossOff = (row) => {
    const nm = { ...row.manual }
    for (const [u, q] of Object.entries(row.remaining)) nm[u] = (nm[u] || 0) + q
    setManualUsed(row.key, nm)
    refresh()
  }
  const restore = (row) => { setManualUsed(row.key, {}); refresh() }
  const deleteCustom = (row) => {
    removeAddedInventory(row.addId)
    setManualUsed(row.key, {})   // eventuellen manuellen Verbrauch mit aufräumen
    refresh()
  }
  const saveAdd = () => {
    const n = name.trim()
    if (!n) return
    setAddedInventory(newAddId(), { name: n, qty: Math.max(1, qty) })
    setName(''); setQty(1); setAdding(false); refresh()
  }

  const actionBtns = (row) => (
    <>
      {!isDepleted(row.remaining) && countUnit(row.remaining) && (
        <button className="inv-btn inv-dec" aria-label={S.inventory.minusOneAria({ name: row.name })} onClick={() => decOne(row)}>−1</button>
      )}
      {!isDepleted(row.remaining) && (
        <button className="inv-btn inv-off" aria-label={S.inventory.usedUpAria({ name: row.name })} onClick={() => crossOff(row)}>✕</button>
      )}
      {isDepleted(row.remaining) && row.hasManual && (
        <button className="inv-btn inv-restore" aria-label={S.inventory.restoreAria({ name: row.name })} onClick={() => restore(row)}>↺</button>
      )}
      {row.custom && (
        <button className="inv-btn inv-del" aria-label={S.inventory.deleteAria({ name: row.name })} onClick={() => deleteCustom(row)}>🗑</button>
      )}
    </>
  )

  const addForm = (
    <div className="inv-add">
      {adding ? (
        <div className="inv-add-form">
          <input
            className="inv-add-name" autoFocus
            placeholder={S.inventory.addPlaceholder}
            value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveAdd() }}
          />
          <div className="inv-add-stepper">
            <button aria-label={S.inventory.qtyMinus} onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
            <span>{qty}</span>
            <button aria-label={S.inventory.qtyPlus} onClick={() => setQty(q => q + 1)}>+</button>
          </div>
          <button className="inv-add-save" disabled={!name.trim()} onClick={saveAdd}>{S.inventory.addSave}</button>
          <button className="inv-add-cancel" onClick={() => { setAdding(false); setName(''); setQty(1) }}>{S.inventory.addCancel}</button>
        </div>
      ) : (
        <button className="inv-add-btn" onClick={() => setAdding(true)}>{S.inventory.addBtn}</button>
      )}
    </div>
  )

  if (boughtCount === 0) {
    return (
      <div className="inv-wrap">
        <div className="inv-empty">
          <div className="inv-empty-icon">📦</div>
          <div className="inv-empty-title">{S.inventory.emptyTitle}</div>
          <div className="inv-empty-sub">{S.inventory.emptySub}</div>
        </div>
        {addForm}
      </div>
    )
  }

  const inStockCount = categories.reduce((n, c) => n + c.items.length, 0)

  return (
    <div className="inv-wrap">
      <div className="inv-intro">{S.inventory.intro}</div>

      {categories.map(({ cat, items }) => (
        <div key={cat} className="inv-cat">
          <div className="inv-cat-hd">{cat}</div>
          {items.map(row => (
            <div key={row.key} className="inv-row">
              <span className="inv-name">{row.name}</span>
              <span className="inv-qty">{formatAmount(row.remaining)}</span>
              {actionBtns(row)}
            </div>
          ))}
        </div>
      ))}

      {inStockCount === 0 && (
        <div className="inv-allused">{S.inventory.allUsed}</div>
      )}

      {addForm}

      {usedUp.length > 0 && (
        <div className="inv-used">
          <button className="inv-used-hd" onClick={() => setShowUsed(s => !s)}>
            <span>{S.inventory.usedUp({ n: usedUp.length })}</span>
            <span className={`inv-used-arrow${showUsed ? ' open' : ''}`}>▾</span>
          </button>
          {showUsed && usedUp.map(row => (
            <div key={row.key} className="inv-row inv-row-used">
              <span className="inv-name">{row.name}</span>
              <span className="inv-qty">{S.inventory.gone}</span>
              {actionBtns(row)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
