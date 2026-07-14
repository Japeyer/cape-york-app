// Checkout-Abstraktion: Single-Source für „wie kauft der User Premium?".
//
// Plattform-Erkennung + Konfigurations-Check ergeben den richtigen Pfad
// für den „Buy Premium"-Button. Heute (Stufe 1) gibt es zwei Pfade:
//
//   1. Stripe Payment Link (Web/PWA) — wenn STRIPE_PAYMENT_LINK gesetzt ist,
//      öffnet ein neues Tab mit dem Hosted Checkout. Käufer gibt die Email
//      ein, zahlt, kriegt License-Key per Mail (manuell oder via Webhook).
//   2. Email-Fallback — `mailto:`-Link mit vorgefülltem Subject. Funktioniert
//      auf jedem Gerät, kostet nichts, taugt für Pitch + Eigen-Trip-Phase.
//
// Stufe 2 (nach Eigen-Trip) ergänzt einen dritten Pfad:
//   3. Native Google Play Billing (via Capacitor-Plugin) — sobald die App
//      im Play Store ist, ist Play-Billing für Android-Käufer verpflichtend.
//      `isNative()` checkt das. Kein UI-Refactor nötig — der Aufrufer
//      verlangt nur `getCheckout()` und kriegt den richtigen Action-Type.
//
// Kein Webhook in dieser Datei — die Worker-Logik (Stripe → License-Key →
// Email) lebt in `cloudflare-worker/` (Stufe-1b, deploy-ready aber nicht
// deployed bis User Stripe-Account angelegt hat).

import { S } from '../strings.js'

// ── Konfiguration ────────────────────────────────────────────────

// Stripe Payment Link.  Leer bis User Stripe-Account anlegt + Link erzeugt.
// Setup-Anleitung: docs/STRIPE_SETUP.md (TODO).
//
// Wenn leer, fällt der Buy-Button auf Email-Pfad zurück.
// Wenn gesetzt, MUSS `https://buy.stripe.com/…` sein — keine HTTP-Links,
// kein Drittanbieter (würde Phishing-Vertrauen brechen).
export const STRIPE_PAYMENT_LINK = ''

// Preis (Cape-York-spezifisch im MVP — nur AUD).
// Stufe 2: pro Region/Sprache übersetzbar via i18n.
//
// Pricing-Logik: 7 CHF Netto-Floor, Play-Billing nimmt 15% Fee. Brutto-Preis
// AUD$15.99 → ca. AUD$13.60 netto ≈ 7.80 CHF (über Floor mit Sicherheitsmarge).
// Charm-Pricing $X.99 wird von Play-Console-Templates direkt unterstützt und
// konvertiert nach Studien 10–20% besser als runde Zahlen.
export const PRICE = {
  amount: 15.99,
  currency: 'AUD',
  display: 'AUD$15.99',
}

// ── Plattform-Erkennung ───────────────────────────────────────────

// True wenn die App in einem Capacitor-Container läuft (= Android-APK / iOS).
// In Stufe 1 immer false (PWA-only).
function isNative() {
  if (typeof window === 'undefined') return false
  // Capacitor injected `window.Capacitor.isNativePlatform()` ab v3+.
  // Defensive: wenn es nicht da ist, sind wir im Browser.
  const cap = window.Capacitor
  return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform())
}

function hasStripeLink() {
  return typeof STRIPE_PAYMENT_LINK === 'string' && STRIPE_PAYMENT_LINK.startsWith('https://buy.stripe.com/')
}

// ── Public API ────────────────────────────────────────────────────

// Liefert den Action-Plan für den „Buy Premium"-Button.
//
// Returnt eines von:
//   { type: 'native', execute: () => Promise<...> }   ← Play-Billing (Stufe 2)
//   { type: 'stripe', url: 'https://buy.stripe.com/…' }
//   { type: 'mailto', url: 'mailto:…?subject=…' }
//
// Konsumenten rendern den Button entsprechend (Link für stripe/mailto, Click-
// Handler für native). UI-Code muss nicht zwischen den Pfaden unterscheiden,
// nur zwischen „Link öffnen" vs. „Async-Flow starten".
export function getCheckout() {
  // 1. Native Play-Billing — Stufe 2, deferred.
  if (isNative()) {
    return {
      type: 'native',
      execute: async () => {
        // Capacitor-Plugin (z.B. @squareetlabs/capacitor-google-play-billing)
        // wird hier eingehängt, sobald Stufe 2 startet. Bis dahin Fallback.
        return { ok: false, reason: 'native-billing-not-implemented' }
      },
    }
  }
  // 2. Stripe Payment Link — Stufe 1b, sobald STRIPE_PAYMENT_LINK gesetzt.
  if (hasStripeLink()) {
    return { type: 'stripe', url: STRIPE_PAYMENT_LINK }
  }
  // 3. Kein In-App-Kaufpfad konfiguriert (kein Stripe, kein Play-Billing) → Kauf nicht verfügbar.
  //    Früher gab es hier einen mailto-Fallback an eine private Adresse — bewusst entfernt
  //    (keine Identität/private Kontaktdaten in der App). Lizenzschlüssel-Aktivierung bleibt möglich.
  return { type: 'unavailable' }
}

// Hilfs-Render: liefert das passende CTA-Label für den Buy-Button je nach
// Pfad. UI-Code kann das ignorieren und sein eigenes Label nehmen — diese
// Funktion ist für Konsistenz zwischen PremiumInfoTab und PremiumGate-Stickern.
export function buyCtaLabel() {
  return S.premium.buyCta
}
