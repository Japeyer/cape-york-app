import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import HomeTab from './components/HomeTab.jsx'
import AboutTab from './components/AboutTab.jsx'
import AccountTab from './components/AccountTab.jsx'
import PremiumInfoTab from './components/PremiumInfoTab.jsx'
import ConfiguratorTab from './components/ConfiguratorTab.jsx'
import MenuTab from './components/MenuTab.jsx'
import RecipesTab from './components/RecipesTab.jsx'
import InventoryTab from './components/InventoryTab.jsx'
import InfoMapTab from './components/InfoMapTab.jsx'
import ShoppingTab from './components/ShoppingTab.jsx'
import { REGION } from './data/regions.js'
import { generate } from './lib/generator.js'
import {
  saveConfig, defaultConfig, resetAllShoppingState,
  loadTripStore, saveTripStore, setActiveNamespace, wipeTripVolatile, defaultTripName,
  getActiveTrip, createTripInStore, deleteTripFromStore, renameTripInStore, setActiveInStore,
  getUserRecipes, upsertUserRecipe, deleteUserRecipe,
} from './hooks/useStorage.js'
import { setUserRecipes } from './lib/recipe-pool.js'
import { isPremium, FREE_LIMITS, MONETIZATION_ENABLED } from './lib/premium.js'
import { S } from './strings.js'
import './App.css'

// Map-Feature für den ersten Release deaktiviert (noch nicht gebraucht). Code + Daten
// bleiben vollständig erhalten — Reaktivierung = dieses Flag auf true. Blendet den
// Map-Tab in der Bottom-Nav UND den 🗺️-Button in der Topbar aus.
const MAP_ENABLED = false

// View-State-Machine:
//   'home'         → Startseite mit Trip-Card (oder Create-CTA)
//   'about'        → App-Info, Datenschutz, Quellen-Attribution, Disclaimer
//   'trip-config'  → Configurator full-screen, keine Bottom-Tabs (Edit-Modus)
//   'trip-active'  → Inside-Trip mit Menu/Recipes/Shopping-Tabs (Trip ist "fixiert")
//
// Der Configurator-Tab ist absichtlich NICHT in der Tab-Leiste — Trip-Edit geht nur via
// "Edit trip" auf der Home-Card. So fühlt sich der geplante Trip "definitiver" an und
// Listen sind verlässlich (keine versehentlichen Re-Generierungen durch Tab-Klicks).
function buildActiveTripTabs(bamagaStop, enabledStops, days, premium) {
  // Aktivierte Shopping-Stops bleiben in der Bottom-Nav sichtbar — Free-User
  // sehen Bamaga/Cooktown/etc. mit 🔒-Marker (locked: true), ShoppingTab rendert
  // den Inhalt dann geblurrt mit Premium-Sticker. So merkt der User in der Tab-
  // Leiste schon, was er mit Premium kriegen würde.
  return [
    { id: 'menu',      icon: '📅',   label: S.app.tabs.menu,      supplyPoint: null, locked: false },
    { id: 'recipes',   icon: '👨‍🍳', label: S.app.tabs.recipes,   supplyPoint: null, locked: false },
    { id: 'inventory', icon: '📦',   label: S.app.tabs.inventory, supplyPoint: null, locked: false },
    ...(MAP_ENABLED
      ? [{ id: 'map', icon: '🗺️', label: S.app.tabs.map, supplyPoint: null, locked: false }]
      : []),
    ...REGION.supplyPoints
      .filter(sp => {
        if (!sp.optional) return true
        // Stops, die für die aktuelle Trip-Länge nicht erreichbar sind, blenden ihre Tabs aus.
        if (sp.minTripDays && Number(days) < sp.minTripDays) return false
        if (sp.id === 'bamaga') return bamagaStop
        return enabledStops?.[sp.id] === true
      })
      .map(sp => ({
        id: sp.id, icon: sp.icon, label: sp.name, supplyPoint: sp,
        locked: !premium && !FREE_LIMITS.shoppingAllowedStopIds.includes(sp.id),
      })),
  ]
}

export default function App() {
  // Multi-Trip-Store: { trips:[{id,name,config}], activeTripId }. Namespace für volatile Keys
  // (Checkboxen/Inventar) wird auf den aktiven Trip gesetzt, BEVOR irgendein Tab liest.
  const [store, setStore] = useState(() => {
    const s = loadTripStore()
    setActiveNamespace(s.activeTripId || 't1')
    return s
  })
  // Arbeitskopie der Config des aktiven Trips (Generator-Input). Mutationen schreiben via
  // saveConfig() in den aktiven Trip des Stores zurück.
  const [config, setConfig] = useState(() => getActiveTrip(store)?.config ?? defaultConfig())

  // User-eigene Rezepte (globale Bibliothek). Registry für Generator/Swap SYNCHRON hier setzen,
  // damit der Generator (useMemo unten) + Kinder (SwapSheet) sie bereits sehen.
  const [userRecipes, setUserRecipesState] = useState(getUserRecipes)
  setUserRecipes(userRecipes)
  const userRecipesHash = JSON.stringify(userRecipes)

  // Generator-Output deterministisch aus Config — useMemo rebuilds nur bei
  // tatsächlicher Änderung. people-Array wird per JSON-Hash verglichen,
  // damit nicht jeder unrelated Render den Generator neu triggert.
  const peopleHash = JSON.stringify(config.people)
  const effectiveAllergens = config.allergiesEnabled ? (config.allergens || []) : []
  const allergensHash = JSON.stringify(effectiveAllergens)
  const restaurantHash = JSON.stringify(config.restaurantSlots || {})
  const overridesHash  = JSON.stringify(config.overrides || {})
  const enabledStopsHash = JSON.stringify(config.enabledStops || {})
  const stopDaysHash   = JSON.stringify(config.stopDays || {})
  const mealStatusHash = JSON.stringify(config.mealStatus || {})
  const result = useMemo(
    () => generate({
      days: config.days,
      people: config.people,
      diet: config.diet,
      cookEffort: config.cookEffort,
      burners: config.burners,
      fridgeSize: config.fridgeSize,
      fridgeCompressor: config.fridgeCompressor,
      bamagaStop: config.bamagaStop,
      bamagaDay: config.bamagaDay,
      allergens: effectiveAllergens,
      seed: config.shuffleSeed,
      restaurantSlots: config.restaurantSlots,
      overrides: config.overrides,
      mealStatus: config.mealStatus,
      enabledStops: config.enabledStops,
      stopDays: config.stopDays,
    }),
    [config.days, peopleHash, config.diet, config.cookEffort, config.burners, config.fridgeSize, config.fridgeCompressor, config.bamagaStop, config.bamagaDay, allergensHash, config.shuffleSeed, restaurantHash, overridesHash, mealStatusHash, enabledStopsHash, stopDaysHash, userRecipesHash]
  )

  // Override-Mutator für SwapSheet — schreibt direkt in cfg_v1 und triggert Re-Generate.
  const setOverride = useCallback((dayNum, slot, recipeId) => {
    setConfig(prev => {
      const overrides = { ...(prev.overrides || {}) }
      const dayOvr = { ...(overrides[dayNum] || {}) }
      if (recipeId) dayOvr[slot] = recipeId
      else delete dayOvr[slot]
      if (Object.keys(dayOvr).length) overrides[dayNum] = dayOvr
      else delete overrides[dayNum]
      const next = { ...prev, overrides }
      saveConfig(next)
      return next
    })
  }, [])

  const resetAllOverrides = useCallback(() => {
    setConfig(prev => {
      const next = { ...prev, overrides: {} }
      saveConfig(next)
      return next
    })
  }, [])

  // Reaktiver Meal-Status-Mutator (Menu-Tab) — markiert eine Mahlzeit als eaten-out/skipped/
  // leftovers (oder räumt die Markierung mit status=null). Schreibt cfg_v1, triggert Re-Generate,
  // wodurch die (Rest-)Einkaufsliste + Kostenschätzung neu berechnet werden.
  const setMealStatus = useCallback((dayNum, slot, status) => {
    setConfig(prev => {
      const mealStatus = { ...(prev.mealStatus || {}) }
      const dayMs = { ...(mealStatus[dayNum] || {}) }
      if (status) dayMs[slot] = status
      else delete dayMs[slot]
      if (Object.keys(dayMs).length) mealStatus[dayNum] = dayMs
      else delete mealStatus[dayNum]
      const next = { ...prev, mealStatus }
      saveConfig(next)
      return next
    })
  }, [])

  // ── User-Rezepte (Recipes-Tab-Editor) ──
  const handleSaveUserRecipe = useCallback((recipe) => {
    const next = upsertUserRecipe(recipe)
    setUserRecipes(next)          // Registry (Generator/Swap)
    setUserRecipesState(next)     // React-State
  }, [])
  const handleDeleteUserRecipe = useCallback((id) => {
    const next = deleteUserRecipe(id)
    setUserRecipes(next)
    setUserRecipesState(next)
    // Dangling-Overrides räumen: alle Tage, die auf dieses Rezept zeigten, freigeben.
    setConfig(prev => {
      let changed = false
      const overrides = {}
      for (const [day, slots] of Object.entries(prev.overrides || {})) {
        const kept = {}
        for (const [slot, rid] of Object.entries(slots || {})) {
          if (rid === id) { changed = true; continue }
          kept[slot] = rid
        }
        if (Object.keys(kept).length) overrides[day] = kept
      }
      if (!changed) return prev
      const nextCfg = { ...prev, overrides }
      saveConfig(nextCfg)
      return nextCfg
    })
  }, [])

  // Initial-View: existierender Trip → Home, sonst auch Home (zeigt dort den Create-CTA).
  // Das ist der neue "Source of Truth"-Einstieg. Tab-State wird nur in trip-active genutzt.
  const [view, setView] = useState('home')
  const [activeTab, setActiveTab] = useState('menu')

  // Sprung zu einem bestimmten Rezept (aus MenuTab "See recipe" oder dem "Wo verwendet?"-Dropdown
  // in der Einkaufsliste): Recipes-Tab öffnen + das Rezept fokussiert aufklappen/scrollen.
  const [recipeFocus, setRecipeFocus] = useState(null)
  const openRecipe = useCallback((id) => {
    if (!id) return
    setRecipeFocus(id)
    setActiveTab('recipes')
  }, [])

  // Premium-Status: re-evaluated on demand. Tick triggert Re-Render nach
  // Aktivierung/Deaktivierung in AccountTab.
  const [premiumTick, setPremiumTick] = useState(0)
  const premium = useMemo(() => isPremium(), [premiumTick])
  const handlePremiumChanged = useCallback(() => setPremiumTick(t => t + 1), [])

  const TABS = useMemo(
    () => buildActiveTripTabs(result.config.bamagaStop, config.enabledStops, result.config.days, premium),
    [result.config.bamagaStop, enabledStopsHash, result.config.days, premium]
  )
  const activeSupplyPoint = TABS.find(t => t.id === activeTab)?.supplyPoint

  // Wenn der User vorher auf einem Supply-Tab war und ihn gerade ausgeschaltet hat
  // (z.B. Cooktown deactiviert beim Edit), existiert der Tab nicht mehr → zurück auf Menu.
  useEffect(() => {
    if (view !== 'trip-active') return
    if (!TABS.some(t => t.id === activeTab)) setActiveTab('menu')
  }, [TABS, activeTab, view])

  // Scroll-Reset bei Navigation:
  //   • View-Wechsel (home/about/trip-config/trip-active) → immer oben starten
  //   • Innerhalb trip-active: Menu/Recipes starten oben; Shopping-Tabs (Cairns/Bamaga/…)
  //     behalten ihre letzte scroll-Position (User soll dort weitermachen wo er aufgehört hat).
  // scrollPositionsRef merkt pro Shopping-Tab die scrollTop für Re-Visit.
  const contentRef = useRef(null)
  const scrollPositionsRef = useRef({})
  const prevKeyRef = useRef(null)
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const isShoppingTab = (tabId) => {
      const tab = TABS.find(t => t.id === tabId)
      return !!tab?.supplyPoint
    }
    // Nav-Key kombiniert view + (trip-active-spezifischer activeTab).
    const navKey = view === 'trip-active' ? `tab:${activeTab}` : `view:${view}`
    const prevKey = prevKeyRef.current
    if (prevKey && prevKey.startsWith('tab:')) {
      // Verlassener Tab war ein Trip-Tab → seine Position merken (für Re-Visit-Restore).
      const prevTab = prevKey.slice(4)
      if (isShoppingTab(prevTab)) {
        scrollPositionsRef.current[prevTab] = el.scrollTop
      }
    }
    if (view === 'trip-active' && isShoppingTab(activeTab)) {
      // Shopping-Tab geöffnet → letzte Position restoren (oder 0 beim ersten Mal).
      el.scrollTop = scrollPositionsRef.current[activeTab] || 0
    } else {
      // Sonst: immer oben starten.
      el.scrollTop = 0
    }
    prevKeyRef.current = navKey
  }, [view, activeTab, TABS])

  // Trip-Edit-Submit: Config speichern und ZURÜCK in trip-active. Vorher-Tab beibehalten
  // wenn er noch existiert; sonst Menu.
  const handleConfigSubmit = useCallback((next) => {
    saveConfig(next)
    setConfig(next)
    setView('trip-active')
    setActiveTab(prev => prev || 'menu')
  }, [])

  // Voller Wipe + Onboarding-View. Wird vom Home-Screen ("Reset & start new") UND
  // vom ConfiguratorTab-Reset-Button benutzt.
  const resetAll = useCallback(() => {
    resetAllShoppingState()
    const fresh = { ...defaultConfig(), shuffleSeed: genSeed() }
    saveConfig(fresh)
    setConfig(fresh)
    setView('trip-config')
    setActiveTab('menu')  // für später wenn er fertig ist
  }, [])

  // ── Multi-Trip-Aktionen ──────────────────────────────────────────
  const genTripId = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  // Frischer Zufalls-Seed pro Trip: der Generator würfelt daraus eine andere (immer regel-
  // konforme) Rezept-Auswahl. So bekommen zwei Trips nicht denselben Plan. Der Seed wird EINMAL
  // bei der Erstellung vergeben und mit der Trip-Config persistiert → beim Neuladen/Editieren
  // stabil (kein Umwürfeln bei jedem Reload). Positiv (>0), sonst greift der Generator-Default.
  const genSeed = () => (Math.floor(Math.random() * 0x7fffffff) + 1) >>> 0

  // Trip tatsächlich anlegen + in den Configurator wechseln (ohne Limit-/Tutorial-Checks).
  const doCreateNew = useCallback(() => {
    const cur = loadTripStore()
    const id = genTripId()
    const fresh = { ...defaultConfig(), shuffleSeed: genSeed() }
    const next = createTripInStore(cur, { id, name: defaultTripName(), config: fresh })
    saveTripStore(next)
    setActiveNamespace(id)          // Namespace umschalten BEVOR Tabs den (leeren) State lesen
    setStore(next)
    setConfig(fresh)
    setView('trip-config')
    setActiveTab('menu')
  }, [])

  // Neuen Trip anlegen. Premium: unbegrenzt; Free: max FREE_LIMITS.maxTrips → sonst Upgrade-Seite.
  // Die Erklärungen laufen jetzt kontextuell im Configurator-Wizard (Intro-Karte pro Schritt),
  // nicht mehr als Vorab-Carousel.
  const handleCreateNew = useCallback(() => {
    const cur = loadTripStore()
    if (!premium && cur.trips.length >= (FREE_LIMITS.maxTrips ?? 1)) {
      setView('premium-info')
      return
    }
    doCreateNew()
  }, [premium, doCreateNew])

  // Aktiven Trip + Namespace umschalten und dessen Config laden.
  const switchToTrip = useCallback((id, targetView) => {
    setActiveNamespace(id)
    const next = setActiveInStore(loadTripStore(), id)
    saveTripStore(next)
    setStore(next)
    setConfig(getActiveTrip(next)?.config ?? defaultConfig())
    setView(targetView)
    setActiveTab('menu')
  }, [])
  const handleOpenTrip = useCallback((id) => switchToTrip(id, 'trip-active'), [switchToTrip])
  const handleEditTrip = useCallback((id) => switchToTrip(id, 'trip-config'), [switchToTrip])

  // Trip löschen (samt seinem Shopping/Inventar-State) — andere Trips bleiben unberührt.
  const handleDeleteTrip = useCallback((id) => {
    wipeTripVolatile(id)
    const next = deleteTripFromStore(loadTripStore(), id)
    saveTripStore(next)
    setStore(next)
    if (next.activeTripId) {
      setActiveNamespace(next.activeTripId)
      setConfig(getActiveTrip(next)?.config ?? defaultConfig())
    }
  }, [])

  const handleRenameTrip = useCallback((id, name) => {
    const next = renameTripInStore(loadTripStore(), id, name)
    saveTripStore(next)
    setStore(next)
  }, [])

  // Home zeigt den Store — nach Config-Mutationen (die nur via saveConfig persistieren) den
  // Store aus localStorage auffrischen, damit die Trip-Karten aktuelle Summaries zeigen.
  useEffect(() => { if (view === 'home') setStore(loadTripStore()) }, [view])

  // About-View öffnen (Privacy + Quellen + Disclaimer). Reachable nur von Home.
  const handleOpenAbout = useCallback(() => {
    setView('about')
  }, [])

  // Premium-Info-Seite öffnen — entweder via Topbar-👤-Icon oder via Klick
  // auf einen Premium-Gate-Sticker.
  const handleOpenPremium = useCallback(() => {
    setView('premium-info')
  }, [])

  // Account-View (License-Key-Eingabe) — von der Premium-Info-Seite aus.
  const handleOpenAccount = useCallback(() => {
    setView('account')
  }, [])

  // Aus Trip-Active/About/Configurator zurück zur Home-Übersicht
  const handleBackHome = useCallback(() => {
    setView('home')
  }, [])

  // Map-View — von Home aus, ohne Trip-Konfiguration. Marketing-Asset für Pitch:
  // Vermieter / Pre-Sale-Kunden können die Karte direkt sehen ohne erst Trip planen.
  const handleOpenMap = useCallback(() => {
    setView('map')
  }, [])

  const dietLabel = S.config.dietOptions[result.config.dietApplied].label
  const tripSummary = config.completed && config.days >= 1
    ? S.config.summary({
        days: result.config.days,
        persons: result.config.persons,
        dietLabel,
        dailyKcal: result.config.dailyKcal,
      })
    : ''

  // Topbar-Inhalt je nach View
  const isHome = view === 'home'
  const isAbout = view === 'about'
  const isConfig = view === 'trip-config'
  const isPremiumInfo = view === 'premium-info'
  const isAccount = view === 'account'
  const isMap = view === 'map'
  const showBackBtn = !isHome
  // 👤-Icon nur auf Home — und nur wenn Monetarisierung aktiv ist. Beim Gratis-Launch
  // (MONETIZATION_ENABLED=false) gibt es keinen Kauf/Account → Einstieg ausgeblendet,
  // damit kein toter Premium-Bezug in der UI steht. Die Views bleiben im Code für Stufe 2.
  const showAccountBtn = isHome && MONETIZATION_ENABLED
  const showAboutBtn = isHome
  const showMapBtn = MAP_ENABLED && isHome  // 🗺️-Icon nur auf Home — Map-View direkter Zugang
  const topbarTitle = isHome
    ? S.app.title
    : isAbout
      ? S.about.appName
      : isPremiumInfo
        ? S.premium.infoTitle
        : isAccount
          ? S.premium.accountTitle
          : isMap
            ? S.map.title
            : (isConfig ? (config.completed ? S.app.titleEditing : S.app.titleNewTrip) : S.home.tripDefaultName)
  const topbarSub = isHome
    ? S.home.subtitle
    : (isAbout || isPremiumInfo || isAccount || isMap)
      ? ''
      : (isConfig ? S.app.subEditing : tripSummary)

  return (
    <div className={`app${view !== 'trip-active' ? ' app-no-nav' : ''}`}>
      <header className="topbar">
        {showBackBtn && (
          <button className="topbar-back" onClick={handleBackHome} aria-label="back to home">
            ←
          </button>
        )}
        <div className="topbar-titles">
          <div className="topbar-title">🦘 {topbarTitle}</div>
          {topbarSub && <div className="topbar-sub">{topbarSub}</div>}
        </div>
        {showAccountBtn && (
          <button
            className={`topbar-account${premium ? ' topbar-account-premium' : ''}`}
            onClick={handleOpenPremium}
            aria-label="account and premium"
          >
            👤
          </button>
        )}
        {showMapBtn && (
          <button className="topbar-map" onClick={handleOpenMap} aria-label="explore the map">
            🗺️
          </button>
        )}
        {showAboutBtn && (
          <button className="topbar-about" onClick={handleOpenAbout} aria-label="about this app">
            ⓘ
          </button>
        )}
      </header>

      <main className="content" ref={contentRef}>
        {result.warnings.length > 0 && view === 'trip-active' && (
          <div className="warning-banner">
            {result.warnings.map((w, i) => (
              <div key={i}>{S.app.warningPrefix}{w}</div>
            ))}
          </div>
        )}

        {view === 'home' && (
          <HomeTab
            trips={store.trips}
            premium={premium}
            maxFreeTrips={FREE_LIMITS.maxTrips ?? 1}
            onOpenTrip={handleOpenTrip}
            onEditTrip={handleEditTrip}
            onCreateNew={handleCreateNew}
            onDeleteTrip={handleDeleteTrip}
            onRenameTrip={handleRenameTrip}
          />
        )}

        {view === 'about' && <AboutTab />}

        {view === 'premium-info' && (
          <PremiumInfoTab onActivate={handleOpenAccount} />
        )}

        {view === 'account' && (
          <AccountTab
            onChanged={handlePremiumChanged}
            onBack={handleOpenPremium}
          />
        )}

        {view === 'trip-config' && (
          <ConfiguratorTab
            key={config.completed ? 'edit' : 'fresh'}
            config={config}
            onSubmit={handleConfigSubmit}
            onResetAll={resetAll}
            premium={premium}
            onUpgrade={handleOpenPremium}
          />
        )}

        {view === 'trip-active' && activeTab === 'menu' && (
          <MenuTab
            plan={result.plan}
            // Merge: raw config (overrides, restaurantSlots) + Generator-Output-Felder
            // (dietApplied, meatAllowedDays, meatClusterDays). Beides braucht der Tab.
            config={{ ...config, ...result.config }}
            allergens={effectiveAllergens}
            onSetOverride={setOverride}
            onResetAllOverrides={resetAllOverrides}
            onSetMealStatus={setMealStatus}
            onJumpToRecipe={openRecipe}
            userRecipes={userRecipes}
            premium={premium}
            onUpgrade={handleOpenPremium}
          />
        )}
        {view === 'trip-active' && activeTab === 'recipes' && (
          <RecipesTab
            plan={result.plan}
            persons={result.config.persons}
            factor={result.config.groupFactor}
            focusRecipeId={recipeFocus}
            onFocusHandled={() => setRecipeFocus(null)}
            userRecipes={userRecipes}
            onSaveRecipe={handleSaveUserRecipe}
            onDeleteRecipe={handleDeleteUserRecipe}
            premium={premium}
            onUpgrade={handleOpenPremium}
          />
        )}
        {view === 'trip-active' && activeTab === 'inventory' && (
          <InventoryTab
            plan={result.plan}
            shopping={result.shopping}
            factor={result.config.groupFactor}
          />
        )}
        {view === 'trip-active' && activeTab === 'map' && (
          <InfoMapTab premium={premium} onUpgrade={handleOpenPremium} tripConfig={config} />
        )}
        {view === 'map' && (
          <InfoMapTab premium={premium} onUpgrade={handleOpenPremium} tripConfig={config} />
        )}
        {view === 'trip-active' && activeSupplyPoint && (
          <ShoppingTab
            supplyPoint={activeSupplyPoint}
            data={result.shopping[activeSupplyPoint.id] || []}
            plan={result.plan}
            onOpenRecipe={openRecipe}
            locked={TABS.find(t => t.id === activeTab)?.locked === true}
            onUpgrade={handleOpenPremium}
          />
        )}
      </main>

      {view === 'trip-active' && (
        <nav className="bottom-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`nav-btn${activeTab === tab.id ? ' active' : ''}${tab.locked ? ' nav-btn-locked' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span className="nav-label">
                {tab.locked && '🔒 '}{tab.label}
              </span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
