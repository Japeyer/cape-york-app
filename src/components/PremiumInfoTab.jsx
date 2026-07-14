import { useState } from 'react'
import { S } from '../strings.js'
import { isPremium } from '../lib/premium.js'
import { getCheckout } from '../lib/checkout.js'

// Erklärungs-Seite: was Premium beinhaltet, wie man es bekommt.
// Erreichbar über das 👤-Topbar-Icon (von Home aus) und über den Premium-Sticker
// auf jedem geblurrten Inhalt.
//
// Buy-Pfad ist über `lib/checkout.js` abstrahiert — heute Stripe-Link (sobald
// gesetzt) oder Email-Fallback, morgen ggf. Play-Billing (Stufe 2).
//
// Props:
//   onActivate  — Wechsel zur AccountTab (License-Key eingeben)
export default function PremiumInfoTab({ onActivate }) {
  const premium = isPremium()
  const checkout = getCheckout()
  const [nativeStatus, setNativeStatus] = useState(null)

  async function handleNativeBuy() {
    setNativeStatus('pending')
    const res = await checkout.execute()
    setNativeStatus(res?.ok ? 'ok' : 'fallback')
  }

  return (
    <div className="premium-info-wrap">
      <h2 className="premium-info-title">{S.premium.infoTitle}</h2>
      <p className="premium-info-lead">{S.premium.infoLead}</p>

      <div className="premium-info-features-heading">{S.premium.featuresHeading}</div>
      <ul className="premium-info-features">
        {S.premium.featuresList.map((feat, i) => (
          <li key={i} className="premium-info-feature">
            <span className="premium-info-feature-icon">{feat.icon}</span>
            <div className="premium-info-feature-text">
              <div className="premium-info-feature-label">{feat.label}</div>
              <div className="premium-info-feature-sub">{feat.sub}</div>
            </div>
          </li>
        ))}
      </ul>

      <div className="premium-info-pricing">
        <div className="premium-info-pricing-heading">{S.premium.pricingHeading}</div>
        <div className="premium-info-price-line">{S.premium.priceLine}</div>
        <p className="premium-info-pricing-body">{S.premium.pricingBody}</p>

        {!premium && checkout.type === 'stripe' && (
          <a
            className="premium-info-buy-btn"
            href={checkout.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {S.premium.buyCta}
          </a>
        )}
        {!premium && checkout.type === 'native' && (
          <button className="premium-info-buy-btn" onClick={handleNativeBuy}>
            {S.premium.buyCta}
          </button>
        )}

        {!premium && (
          <button className="premium-info-have-key-btn" onClick={onActivate}>
            {S.premium.haveKeyCta}
          </button>
        )}

        {premium && (
          <button className="premium-info-have-key-btn" onClick={onActivate}>
            {S.premium.accountStatusPremium} →
          </button>
        )}

        {nativeStatus === 'fallback' && (
          <div className="premium-info-native-fallback">
            In-app purchase isn’t available yet. If you already have a license key, activate it below.
          </div>
        )}
      </div>
    </div>
  )
}
