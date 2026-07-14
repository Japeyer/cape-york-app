// Share-Helfer für die Einkaufsliste.
// Formatiert die Liste als lesbaren Text und kapselt Web-Share-API + Fallbacks
// (WhatsApp-Link, mailto, Clipboard). Kein Backend, kein Netzwerk-Call —
// die Liste bleibt im Gerät, der User wählt selbst den Channel.

// Liefert formatierten Text-Block mit Header und Kategorien.
// data: [{ cat, items: [{id, name, qty}] }]
// checked: { [id]: boolean }
export function formatShoppingListAsText({
  data,
  checked = {},
  supplyPoint,
}) {
  const allItems = data.flatMap(c => c.items)
  const total = allItems.length
  const checkedCount = allItems.filter(it => checked[it.id]).length

  const lines = []
  lines.push(`🛒 Cape York shopping — ${supplyPoint.name}`)
  lines.push(`${checkedCount} / ${total} done`)
  lines.push('')

  for (const cat of data) {
    if (!cat.items.length) continue
    lines.push(cat.cat)
    for (const item of cat.items) {
      const mark = checked[item.id] ? '✓' : '☐'
      const qty = item.qty ? ` — ${item.qty}` : ''
      lines.push(`${mark} ${item.name}${qty}`)
    }
    lines.push('')
  }

  lines.push('— Cape York Trip Planner')
  return lines.join('\n')
}

// True wenn der Browser Web-Share-API mit Text supportet.
// Wir prüfen canShare wenn vorhanden (Chrome/Edge), sonst Existenz von share.
// Safari iOS hat share aber kein canShare — dort gehen wir mit dem optimistischen
// Pfad und fangen Fehler ab.
export function canUseWebShare(text) {
  if (typeof navigator === 'undefined') return false
  if (typeof navigator.share !== 'function') return false
  if (typeof navigator.canShare === 'function') {
    try { return navigator.canShare({ text }) } catch { return false }
  }
  return true
}

// Versucht Web-Share-API. Returnt:
//   { ok: true }                          — User hat geteilt
//   { ok: false, reason: 'cancelled' }    — User hat im Native-Sheet abgebrochen
//   { ok: false, reason: 'unsupported' }  — Browser kann nicht
//   { ok: false, reason: 'error', err }   — sonstiger Fehler
export async function tryWebShare({ title, text }) {
  if (!canUseWebShare(text)) return { ok: false, reason: 'unsupported' }
  try {
    await navigator.share({ title, text })
    return { ok: true }
  } catch (err) {
    if (err && (err.name === 'AbortError' || err.name === 'CancelError')) {
      return { ok: false, reason: 'cancelled' }
    }
    return { ok: false, reason: 'error', err }
  }
}

// Baut deep-link für WhatsApp (wa.me/?text=). Funktioniert auf Mobile (öffnet App)
// und Desktop (öffnet WhatsApp Web).
export function buildWhatsAppUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

// Baut mailto-Link mit Subject und Body. Body wird gekürzt falls > 1800 Zeichen
// (manche Email-Clients kappen lange mailtos).
export function buildMailtoUrl({ subject, text }) {
  const MAX = 1800
  const body = text.length > MAX ? text.slice(0, MAX) + '\n\n…(truncated, see attached or App)' : text
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// Versucht Clipboard-Copy. Returnt true bei Erfolg, false sonst.
// Kein Throw — Caller entscheidet Feedback.
export async function copyToClipboard(text) {
  if (typeof navigator === 'undefined') return false
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }
  return false
}
