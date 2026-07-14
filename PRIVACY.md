<!--
  Source of Truth für die Privacy Policy.
  HTML-Variante (public/privacy.html) wird via `npm run privacy:build` automatisch
  aus diesem File generiert (läuft als prebuild-Hook bei jedem `npm run build`).
  Hosted unter https://japeyer.github.io/cape-york-app/privacy.html.

  Bei Änderungen NICHT die HTML-Variante editieren — diese MD-Datei ändern und
  build/deploy laufen lassen. Effective-Datum oben anpassen.

  ⚠ KONTAKT ist ein PLATZHALTER (support@example.com) — vor dem Play-Store-Release
    durch die echte Support-Adresse ersetzen (2 Stellen: Contact-Zeile oben + § 9).
-->

# Privacy Policy — Cape York 2026

**Effective:** 2026-05-03
**Contact:** support@example.com

This is the privacy policy for the **Cape York 2026** trip-planning app
(web app and Android app — both versions covered).

We have written this in plain language. The TL;DR is: **the app does not
collect, transmit, or share any personal data.** Everything you enter
stays on your device.

---

## 1. What data the app handles

When you use Cape York 2026, you enter trip-planning information into the
app — for example:

- Number of days on the road and trip start date
- Number of people in your group, with type (adult / child) and appetite
- Dietary preference (omnivore / vegetarian / vegan)
- Allergies or food preferences (selected from a fixed list)
- Cooking equipment (number of burners, fridge size)
- Resupply stops you plan to make (Cooktown, Coen, Archer River, Bamaga)
- Days you plan to eat at restaurants
- Recipe swaps and shopping-list customizations (added items, deleted
  items, quantity overrides)
- Which shopping items you have ticked off

We refer to this collectively as **trip data**.

The app does **not** ask for, collect, or process any of the following:

- Name, email, phone number, or address
- Account credentials or login information
- Location data (GPS, IP-based geolocation, etc.)
- Photos, contacts, or other device data
- Health information beyond the dietary preferences listed above
- Payment information

---

## 2. Where the data is stored

All trip data is stored **locally on your device** using the browser's
[`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
mechanism (or, in the Android app, the equivalent local app storage).
Specifically, the app uses these storage keys:

- `cfg_v1` — your trip configuration (the items listed in section 1)
- `ck_<item-id>` — which shopping items you have ticked off
- `del_<item-id>` — items you have deleted from the shopping list
- `qty_<item-id>` — quantity overrides you set on items
- `add_<bucket>_<item-id>` — items you added to the shopping list yourself

This data **never leaves your device.** The app does not send it to any
server, ours or anyone else's. There is no backend, no user account, and
no cloud sync.

---

## 3. Who we share it with

**Nobody.** Because the data never leaves your device, there is nothing
to share. We do not sell, license, rent, transfer, or otherwise disclose
trip data to any third party — because we do not have it.

---

## 4. Network connections

The app makes **no network requests during normal use.** It is designed
to work fully offline (Cape York has limited mobile coverage, so this is
a deliberate design choice).

The only network-related component is the **Service Worker**, which is a
standard browser technology that caches the app's own files (HTML, CSS,
JavaScript, icons) so the app loads instantly and works offline. The
Service Worker does not transmit any data outwards.

---

## 5. Cookies and tracking

The app does **not** use:

- Cookies (HTTP cookies)
- Analytics services (Google Analytics, Mixpanel, Amplitude, etc.)
- Advertising networks
- Tracking pixels or beacons
- Third-party fonts (e.g. Google Fonts) or CDN-hosted libraries
- Crash-reporting services (Sentry, Crashlytics, etc.)

We use `localStorage` to remember your trip configuration. This is
technically not a cookie — it cannot be read by any other website and is
not transmitted to any server.

---

## 6. Children

The app contains no advertising, no in-app purchases, and no
communication features. It is suitable for use by children but is not
specifically targeted at them. We do not knowingly collect any data from
anyone of any age — see sections 1–3.

---

## 7. How to delete your data

Because all data is stored locally on your device, you control it
completely:

- **Inside the app:** the home screen has a "Reset & start a new trip"
  button that clears your trip configuration. The trip view has a "Reset
  all" button that additionally clears all shopping checks and
  customizations.
- **At the OS level:** uninstalling the app (Android) or clearing the
  site data in your browser settings (web) removes everything the app
  has stored.

---

## 8. Changes to this policy

If this policy changes, the new version will be published at the same
URL with an updated "Effective" date at the top. Because we do not
collect contact information, we cannot notify you individually — please
re-read the policy if you are concerned about updates.

---

## 9. Contact

If you have questions about this privacy policy or the app's handling of
data, contact:

**support@example.com**

<!-- PLACEHOLDER-KONTAKT: vor/beim Play-Store-Release durch die echte Support-Adresse
     ersetzen (support@example.com → Play-Store-Release-Email). Auch die Contact-Zeile oben. -->
