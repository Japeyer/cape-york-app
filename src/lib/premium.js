// Free vs. Premium-Tier Logik.
//
// Architektur (siehe CHANGELOG): bewusst KEIN Backend, kein Account-Server.
// Statt dessen License-Keys: Käufer bekommt einen 16-stelligen Code
// (CY26-XXXX-XXXX-CKSM), App verifiziert die letzten 4 Zeichen als
// HMAC-SHA256-Checksum der ersten 12 lokal gegen ein Shared Secret.
//
// Crack-Resistenz: 4-Char-Checksum aus 32 möglichen Zeichen = 1.048.576
// Kombinationen → ~1 Mio Brute-Force-Versuche pro Code, nicht praktikabel
// für ein Indie-Produkt (~5 €). Stufe 2 (Capacitor → Play Store) tauscht
// das gegen Google Play Billing aus, das HMAC-Schema bleibt aber für
// die parallele Web-Version nutzbar.
//
// Generierung neuer Codes: scripts/generate-license.mjs (Node, lokal).

const STORAGE_KEY = 'premium_v1'

// ── Monetarisierungs-Flag (Launch-Strategie) ─────────────────────
// BEWUSST AUS für den ersten Release: die App kommt GRATIS auf den Markt, um Downloads,
// Reviews und Traktion aufzubauen. Bei `false` sind ALLE Premium-Features frei (isPremium()
// → immer true), und der Kauf-/Account-Einstieg wird in der UI ausgeblendet (App.jsx).
// Umlegen auf `true` aktiviert den Free/Premium-Split wieder — zusammen mit dem Play-Billing-
// Plugin (Stufe 2, siehe checkout.js) und einem Play-Console-Produkt. Kein Code-Umbau nötig,
// nur dieser Schalter + das Plugin-Andocken in isPremium()/checkout.js.
export const MONETIZATION_ENABLED = false

// SHARED SECRET — dasselbe in scripts/generate-license.mjs.
// Bei Compromise: Secret rotieren + neue Codes ausstellen, alte Codes
// werden im Format weiter erkannt aber bei Re-Verifikation abgelehnt.
// Format: zweite Hälfte ist absichtlich nicht-trivial damit Reverse-Engineering
// aufwändig ist (Stufe 1 Threat-Model = Casual-Cracking, kein State-Actor).
const SECRET = 'cape-york-2026-rev1-7Q4mZ8Lk'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  // base32 ohne 0/O/1/I (Tippfehler-Resistenz)
const PAYLOAD_LENGTH = 12   // 12 Chars vor Checksum
const CHECKSUM_LENGTH = 4
const KEY_LENGTH = PAYLOAD_LENGTH + CHECKSUM_LENGTH  // 16

// Free-Limits — zentrale Konstanten, von UI-Gates konsumiert.
export const FREE_LIMITS = {
  // Plan-Anzeige in MenuTab: nur Tage 1..maxPlanDays sichtbar, Rest geblurrt.
  maxPlanDays: 5,
  // Rezepte in RecipesTab: nur jene, die in den Free-Plan-Tagen erscheinen.
  // (Implementierung: filtere RECIPES auf die Set der Recipe-IDs in plan[0..maxPlanDays-1].)
  recipesFollowPlanLimit: true,
  // Shopping-Tabs sichtbar in der Free-Version. Alle anderen sind geblurrt.
  shoppingAllowedStopIds: ['cairns'],
  // Configurator-Pills die geblurrt werden (Default-Werte gelten weiter).
  lockedConfigPills: ['fridgeSize', 'fridgeCompressor', 'allergies'],
  // Multi-Trip: Free-User können 1 Trip speichern; Premium unbegrenzt (App behandelt Premium
  // als kein Limit — dieser Wert gilt nur für Free).
  maxTrips: 1,
}

// ── HMAC-SHA256 → 4-Char base32 Checksum ─────────────────────────

async function hmacSha256(secret, message) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return new Uint8Array(sigBuf)
}

// Map die ersten 4 Bytes des HMAC-Outputs auf 4 base32-Chars.
// 4 Chars * 5 Bits = 20 Bits effektive Sicherheit (1.048.576 Kombinationen).
function bytesToChecksum(bytes) {
  // 4 Bytes = 32 Bits → take 20 Bits (= 4 Chars à 5 Bits).
  let out = ''
  let buffer = 0
  let bits = 0
  let i = 0
  while (out.length < CHECKSUM_LENGTH) {
    if (bits < 5) {
      buffer = (buffer << 8) | bytes[i++]
      bits += 8
    }
    bits -= 5
    out += ALPHABET[(buffer >> bits) & 0x1f]
  }
  return out
}

async function checksumFor(payload) {
  const bytes = await hmacSha256(SECRET, payload)
  return bytesToChecksum(bytes)
}

// ── Format ───────────────────────────────────────────────────────

// Normalisierung: Eingabe → 16 ALPHABET-Zeichen (Bindestriche/Spaces/Lowercase
// werden toleriert, ähnliche Zeichen 0/O/1/I/L verworfen — der User merkt am
// "ungültig" dass er einen Tippfehler hat).
function normalize(input) {
  if (!input || typeof input !== 'string') return null
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const filtered = cleaned.split('').filter(c => ALPHABET.includes(c)).join('')
  if (filtered.length !== KEY_LENGTH) return null
  return filtered
}

// Format-Display: 4-4-4-4 mit Bindestrichen.
export function formatLicenseDisplay(key) {
  const n = normalize(key)
  if (!n) return ''
  return `${n.slice(0, 4)}-${n.slice(4, 8)}-${n.slice(8, 12)}-${n.slice(12, 16)}`
}

// ── Validierung + Aktivierung ────────────────────────────────────

// Validiert Format + Checksum. Async wegen WebCrypto-API.
// Returnt true bei gültigem Code, false sonst.
export async function isLicenseValid(input) {
  const n = normalize(input)
  if (!n) return false
  const payload = n.slice(0, PAYLOAD_LENGTH)
  const checksum = n.slice(PAYLOAD_LENGTH)
  const expected = await checksumFor(payload)
  return checksum === expected
}

// Aktiviert eine Lizenz: prüft, schreibt in localStorage, gibt true/false zurück.
export async function activateLicense(input) {
  const n = normalize(input)
  if (!n) return false
  const valid = await isLicenseValid(n)
  if (!valid) return false
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      key: n,
      activatedAt: new Date().toISOString(),
    }))
  } catch { /* localStorage voll/disabled — Premium nur für die Session */ }
  return true
}

// Deaktiviert (für Tests oder bei User-Wunsch).
export function deactivate() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

// "Hat der Nutzer eine Lizenz aktiviert?" — die reine KAUF-Frage (Web/PWA-Lizenzschlüssel,
// localStorage-Key). Bewusst getrennt von isPremium(), damit das Monetarisierungs-Flag den
// tatsächlichen Kauf-Status nicht verfälscht (z.B. für die Anzeige im AccountTab).
// Macht KEINE Re-Verifikation der Checksum bei jedem Read — Verifikation passiert beim
// Aktivieren; danach gilt der Eintrag als trusted bis zum Deaktivieren.
// Risiko: User editiert localStorage manuell. Akzeptabel — wer das Browser-DevTools öffnet,
// will offensichtlich Premium "ohne zu bezahlen"; persönliche Entscheidung in einem Indie-Produkt.
export function hasActiveLicense() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return typeof parsed?.key === 'string' && parsed.key.length === KEY_LENGTH
  } catch {
    return false
  }
}

// "Sind die Premium-Features freigeschaltet?" — DIE zentrale Entitlement-Frage, die alle
// UI-Gates konsumieren (App.jsx `premium = isPremium()`).
//  - Monetarisierung AUS (Gratis-Launch): immer true → alles frei.
//  - Monetarisierung AN: hängt am Kauf-Status.
// Stufe-2-Andockpunkt für Play Billing: hier kommt die native Entitlement-Quelle dazu, z.B.
//   return !MONETIZATION_ENABLED || hasActiveLicense() || hasPlayBillingEntitlement()
// wobei hasPlayBillingEntitlement() den vom Play Store gecachten Besitzstand liest (offline-fähig).
export function isPremium() {
  if (!MONETIZATION_ENABLED) return true
  return hasActiveLicense()
}

// Gibt den aktivierten Key zurück (für Anzeige in AccountTab) oder null.
export function activeLicenseKey() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return typeof parsed?.key === 'string' ? parsed.key : null
  } catch {
    return null
  }
}

// ── Dev-Helper (nur für lokale Tests, nicht ins Production-UI) ───
// Exportiert die Checksum-Berechnung damit das Generator-Script + Tests
// ohne Code-Duplikation darauf zugreifen können.
export const __internal = { checksumFor, normalize, ALPHABET, PAYLOAD_LENGTH, KEY_LENGTH, SECRET }
