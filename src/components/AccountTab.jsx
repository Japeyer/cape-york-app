import { useState } from 'react'
import { S } from '../strings.js'
import { activateLicense, deactivate, isPremium, activeLicenseKey, formatLicenseDisplay } from '../lib/premium.js'

// License-Key-Eingabe + Status. Ist von Home (👤-Icon) und von der Premium-Info-Seite
// erreichbar.
//
// Props:
//   onChanged  — Callback nachdem Aktivierung/Deaktivierung erfolgreich war.
//                App.jsx setzt damit den Premium-Re-Render in Gang.
//   onBack     — zurück zur Premium-Info-Seite.
export default function AccountTab({ onChanged, onBack }) {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const premium = isPremium()
  const currentKey = premium ? activeLicenseKey() : null

  const handleActivate = async () => {
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      const ok = await activateLicense(input)
      if (ok) {
        setSuccess(S.premium.activateSuccess)
        setInput('')
        onChanged?.()
      } else {
        setError(S.premium.activateError)
      }
    } finally {
      setBusy(false)
    }
  }

  const handleDeactivate = () => {
    if (!window.confirm(S.premium.deactivateConfirm)) return
    deactivate()
    setSuccess('')
    setError('')
    onChanged?.()
  }

  return (
    <div className="account-wrap">
      <button className="account-back-btn" onClick={onBack}>
        {S.premium.backToInfoCta}
      </button>

      <h2 className="account-title">{S.premium.accountTitle}</h2>

      <div className={`account-status ${premium ? 'account-status-premium' : 'account-status-free'}`}>
        {premium ? (
          <>
            <div className="account-status-line">{S.premium.accountStatusPremium}</div>
            {currentKey && (
              <div className="account-status-key">
                {S.premium.accountKeyShown({ key: formatLicenseDisplay(currentKey) })}
              </div>
            )}
          </>
        ) : (
          <div className="account-status-line">{S.premium.accountStatusFree}</div>
        )}
      </div>

      {!premium && (
        <div className="account-activate">
          <label className="account-input-label" htmlFor="license-input">
            {S.premium.activateLabel}
          </label>
          <input
            id="license-input"
            className="account-input"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck="false"
            placeholder={S.premium.activatePlaceholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button
            className="account-activate-btn"
            onClick={handleActivate}
            disabled={busy || !input.trim()}
          >
            {S.premium.activateCta}
          </button>
          {error && <div className="account-error">{error}</div>}
          {success && <div className="account-success">{success}</div>}
        </div>
      )}

      {premium && (
        <button className="account-deactivate-btn" onClick={handleDeactivate}>
          {S.premium.deactivateCta}
        </button>
      )}
    </div>
  )
}
