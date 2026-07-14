import { S } from '../strings.js'

// Wraps Children und zeigt sie geblurrt mit einem Premium-Sticker, wenn der User
// kein Premium hat. Tap auf den Sticker → Account/Premium-Info-View.
//
// Props:
//   active     — Wenn false: Children werden normal gerendert (Premium oder n/a).
//                Wenn true: Children werden geblurrt + Sticker overlayed.
//   onUpgrade  — Click-Handler, üblicherweise Wechsel zur Premium-Info-View.
//   variant    — 'card' (Default, voll-flächig, dashed border + großer Sticker)
//                | 'inline' (kompakte Variante, weniger Padding, kleiner Sticker)
//   header     — Optionales Element, das ÜBER dem geblurrten Body lesbar bleibt.
//                Use-Case: Pill-Picker im Configurator, wo Label/Hint sichtbar
//                sein sollen aber nur die Pills selbst gegated.
//
// Children werden bewusst noch gerendert (statt ausgeblendet) — der User soll
// "sehen was er bekäme" als Verkaufsanreiz.
export default function PremiumGate({ active, onUpgrade, variant = 'card', header, children }) {
  if (!active) {
    // Im inaktiven Zustand wird der Header außerhalb der Gate-Hülle gerendert
    // (sonst hätten Premium-User unnötiges Wrapping-Markup).
    return header ? <>{header}{children}</> : children
  }
  return (
    <>
      {header}
      <div className={`premium-gate premium-gate-${variant}`}>
        <div className="premium-gate-content" aria-hidden="true">
          {children}
        </div>
        <button
          className="premium-gate-overlay"
          onClick={onUpgrade}
          aria-label={S.premium.unlockAria}
        >
          <span className="premium-gate-badge">
            <span className="premium-gate-icon">🔒</span>
            <span className="premium-gate-label">{S.premium.badge}</span>
          </span>
          <span className="premium-gate-cta">{S.premium.unlockCta}</span>
        </button>
      </div>
    </>
  )
}
