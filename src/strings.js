// User-facing Strings (Englisch).
// Auslagerung gemäss CLAUDE.md § Architektur-Vorgaben (i18n-ready).
// Stufe 2: aus dieser Datei wird src/strings/en.js, daneben src/strings/de.js etc.

export const S = {
  app: {
    title: 'Cape York 2026',
    titleNewTrip: 'New trip',
    titleEditing: 'Edit trip',
    subEditing: 'Tap "Update plan" to save changes',
    // Tabs für Supply Points (Cairns/Bamaga/…) kommen aus REGION.supplyPoints[*].name (regions.js).
    tabs: {
      menu: 'Menu',
      recipes: 'Recipes',
      map: 'Map',
      inventory: 'Stock',
    },
    warningPrefix: 'ℹ️ ',
  },

  // Fallback-Screen der Error Boundary (globales Absturz-Netz). Erscheint statt eines
  // weißen Bildschirms, wenn irgendeine Komponente beim Rendern crasht.
  error: {
    title: 'Something went wrong',
    body: 'The app hit an unexpected problem. Your saved trips are still stored on this device — try again, or reset the app if the problem keeps happening.',
    retry: 'Try again',
    reset: 'Reset app & reload',
    resetConfirm: 'This clears all trips and checklists stored on this device. Continue?',
    detailsSummary: 'Technical details (for a bug report)',
  },

  home: {
    subtitle: 'Your Cape York trips',
    yourTripsLabel: 'Your trips',
    tripDefaultName: 'Cape York Trip',
    openCta: 'Open',
    editCta: 'Edit',
    createCta: 'Plan your Cape York trip',
    createNewCta: 'New trip',
    createNewHint: 'Each trip keeps its own plan, shopping checks and inventory.',
    createNewConfirm: 'Discard the current trip and start a new one? Settings, swaps, and shopping checks will be cleared.',
    emptyTitle: 'No trip planned yet',
    emptySub: 'Set days, group, dietary preferences and resupply stops — we\'ll generate the menu and shopping list.',
    // Multi-Trip
    tripStats: ({ days, persons, dietLabel }) =>
      `${days} ${days === 1 ? 'day' : 'days'} · ${persons} ${persons === 1 ? 'person' : 'people'}${dietLabel ? ' · ' + dietLabel : ''}`,
    draftLabel: 'Not set up yet — tap to finish planning',
    deleteCta: 'Delete',
    deleteConfirm: ({ name }) => `Delete "${name}"? This removes its plan, shopping checks and inventory.`,
    renameAria: ({ name }) => `Rename trip "${name}"`,
    newTripLocked: 'New trip (Premium)',
    upgradeHint: 'Free plan keeps 1 trip. Go Premium to save several trips at once.',
  },

  // Einmaliges Onboarding beim ersten "Create trip" (TutorialOverlay).
  tutorial: {
    skip: 'Skip',
    back: 'Back',
    next: 'Next',
    done: "Let's plan",
    slides: [
      { icon: '🦘', title: 'Welcome to Cape York',
        body: "This app plans your whole trip — a day-by-day menu, offline recipes and a shopping list scaled to your group. Here's a quick tour." },
      { icon: '🧭', title: 'Set up your trip',
        body: "Pick your dates, who's eating, dietary preferences and how much cooking effort you want. Everything is built from that." },
      { icon: '📅', title: 'Your daily menu',
        body: "You get a meal for every day. Tap any meal to swap in another recipe, mark a night eating out, or drop in your own recipe." },
      { icon: '👨‍🍳', title: 'Recipes, offline',
        body: "Every meal has full ingredients and steps, saved on your phone — so they work with no signal up the Cape." },
      { icon: '🛒', title: 'Smart shopping list',
        body: "Quantities are scaled to your group and split across Cairns and resupply stops. Tick items off as you buy — it remembers." },
      { icon: '📦', title: 'Track your stock',
        body: "The Stock tab shows what you've bought and what gets used up as you cook, so you always know what's in the fridge." },
    ],
  },

  // ── Seiten-Tutorials (Spotlight-Tipps) ──
  // Struktur/Selektoren stehen in `lib/tours.js`; hier nur die Texte, gekeyt nach
  // `S.tours[page][step.key]`. `cta` = die Aktion, die den Schritt abschließt.
  tours: {
    ui: {
      skip: 'Skip tips',
      next: 'Next',
      done: 'Got it',
      stepOf: ({ cur, total }) => `${cur} of ${total}`,
    },
    // Trip-Erstellung — Schlüssel = 'config-' + S.config.steps[].key
    'config-dates': {
      calendar: {
        title: 'Pick your dates',
        body: 'Tap the day you leave Cairns, then the day you get back. Everything — menu, portions, shopping list — is built from this range.',
        cta: 'Tap your start day, then your last day',
      },
      day: {
        title: 'Plan a single day',
        body: 'Every day of your trip can be adjusted. Tap one to mark a resupply stop or a night eating out.',
        cta: 'Tap the highlighted day',
      },
      stop: {
        title: 'Resupply stops',
        body: 'Mark the day you pass a shop — Bamaga, Cooktown, Coen, Archer River. Fresh meat, veg and fruit for the days after it then move onto that stop\'s own shopping list, so you buy them there instead of hauling them from Cairns. You get one list per stop.',
        cta: 'Tap a stop to put it on this day',
      },
      restaurant: {
        title: 'Eating out',
        body: 'Roadhouse burger or a pub night? Mark that meal as eating out and it drops out of the plan — no recipe, and its ingredients disappear from your shopping list.',
        cta: 'Tap a meal you plan to eat out',
      },
    },
    'config-group': {
      people: {
        title: 'Who is eating',
        body: 'Add everyone on the trip. Each person gets an appetite — portions and shopping quantities are scaled to exactly this group, not to a rough headcount.',
        cta: 'Set the people in your group',
      },
      diet: {
        title: 'Diet',
        body: 'Omnivore, vegetarian or vegan. This is a hard filter: no recipe that breaks it can end up in your plan.',
        cta: 'Pick your diet',
      },
      allergies: {
        title: 'Allergies',
        body: 'Turn this on to exclude recipes containing an allergen. Ingredients that are only a topping are flagged with a warning instead of dropping the whole recipe.',
        cta: 'Choose yes or no',
      },
    },
    'config-kitchen': {
      effort: {
        title: 'How much cooking?',
        body: 'Easy keeps every meal simple. More lets the bigger recipes in — useful for a base camp, less so for a long driving day.',
        cta: 'Pick your cooking effort',
      },
      fridge: {
        title: 'Your fridge',
        body: 'Fridge size decides how many days of fresh meat fit on board. That is what groups the meat days together right after Cairns and after each resupply stop — so nothing spoils.',
        cta: 'Pick your fridge size',
      },
      generate: {
        title: 'Build the trip',
        body: 'This creates your day-by-day menu, the recipes and one shopping list per stop. You can come back and change anything later — already-ticked items are kept.',
        cta: 'Tap to generate your plan',
      },
    },
    home: {
      create: {
        title: 'Plan a trip',
        body: 'Everything starts here: tell us your dates, your group and your gear, and the app builds your menu, recipes and shopping list.',
        cta: 'Tap to start planning',
      },
      open: {
        title: 'Your trip',
        body: 'Open a trip to see its menu, recipes and shopping lists. Use ✎ Edit to change dates, people or gear at any time.',
        cta: 'Tap the card to open it',
      },
    },
    menu: {
      day: {
        title: 'Your day-by-day plan',
        body: 'Every day has breakfast, lunch and dinner. Tap a day to see what is planned.',
        cta: 'Tap the day to open it',
      },
      swap: {
        title: 'Not in the mood?',
        body: 'Swap any meal for another recipe that still fits your diet, gear and fresh-food limits. Your shopping list updates with it.',
        cta: 'Tap Swap to see the options',
      },
      log: {
        title: 'Log what you cooked',
        body: 'After a meal, log it as cooked — or tick only the ingredients you actually used. That keeps your Stock tab honest.',
        cta: 'Tap Log to try it',
      },
    },
    recipes: {
      card: {
        title: 'Recipes work offline',
        body: 'Tap a recipe for ingredients and steps. Quantities are already scaled to your group — no signal needed up the Cape.',
        cta: 'Tap a recipe to open it',
      },
      own: {
        title: 'Add your own',
        body: 'Save your own recipes here. They stay on your phone and you can drop them into any day from the menu.',
        cta: 'Tap to add a recipe',
      },
    },
    shopping: {
      tick: {
        title: 'Tick as you shop',
        body: 'Quantities are scaled to your group and split across your resupply stops. Tap a line to tick it off — it is remembered offline.',
        cta: 'Tap an item to tick it off',
      },
      uses: {
        title: 'Why is this on the list?',
        body: 'The 🍽 button shows which meals use this ingredient and on which days — handy when you are deciding what to skip.',
        cta: 'Tap 🍽 to see the meals',
      },
      share: {
        title: 'Share the list',
        body: 'Send the whole list as text to whoever is doing the shopping, or keep a copy for yourself.',
        cta: 'Tap Share to try it',
      },
    },
    inventory: {
      // Vor dem ersten Einkauf ist der Tab leer — dann wird genau das erklärt (der "−1"-
      // Schritt hat kein Ziel und entfällt automatisch).
      empty: {
        title: 'Your stock, tracked for you',
        body: 'Nothing here yet — this list fills itself. Every item you tick off on a shopping list shows up here as on board. Log a meal as cooked in the menu and its ingredients come straight back off, so this stays what is actually in the car.',
      },
      row: {
        title: 'What is left',
        body: 'Everything you tick off on a shopping list lands here automatically. When you log a meal as cooked in the menu, its ingredients are subtracted again — used up completely, and the item disappears into "Used up". Tap −1 for a snack, or ✕ when something is gone.',
        cta: 'Tap −1 to take one off',
      },
      add: {
        title: 'Bought on the road?',
        body: 'Add anything you picked up along the way — a bag of mangoes at a roadside stall — so your stock stays accurate.',
        cta: 'Tap to add an item',
      },
    },
  },

  config: {
    welcome: 'Welcome — let\'s plan your Cape York trip.',
    welcomeSub: 'Set how long you\'re out, how many people you\'re feeding, and any dietary preferences. We\'ll generate a menu and a shopping list scaled for you.',
    editTitle: 'Trip settings',
    editSub: 'Update any value to regenerate your plan and shopping list. Items you already checked off will be marked instead of erased.',
    // ── Mehr-Schritt-Wizard: geführte Seiten mit Weiter/Zurück statt einer langen Seite ──
    wizard: {
      back: '← Back',
      next: 'Next →',
      stepOf: ({ cur, total }) => `Step ${cur} of ${total}`,
    },
    // Ein Eintrag pro Wizard-Schritt. `key` steuert AUCH das Seiten-Tutorial des Schritts
    // (`S.tours['config-' + key]`) — Schlüssel hier ändern heißt: dort mit ändern.
    steps: [
      { key: 'dates',   title: 'Dates & route' },
      { key: 'group',   title: 'Group & diet' },
      { key: 'kitchen', title: 'Cooking & gear' },
    ],
    daysLabel: 'Trip length',
    daysNotSelected: 'Tap a start day in the calendar, then your end day.',
    daysSelected: ({ days }) => `${days} ${days === 1 ? 'day' : 'days'} selected`,
    repickDates: '↺ Re-pick dates',
    groupLabel: 'Who\'s eating',
    groupHint: '1–8 people, individual portions',
    addPerson: '+ Add person',
    typeOptions: {
      'adult-m': { label: 'Man',   icon: '👨' },
      'adult-f': { label: 'Woman', icon: '👩' },
      'child':   { label: 'Child', icon: '🧒' },
    },
    appetiteOptions: {
      light:  { label: 'Light',  sub: 'Eats less' },
      medium: { label: 'Medium', sub: 'Average' },
      heavy:  { label: 'Heavy',  sub: 'Big eater' },
      custom: { label: 'Custom', sub: 'Set kcal' },
    },
    customKcalUnit: 'kcal/day',
    dailyKcalLabel: 'Daily target',
    dietLabel: 'Dietary preference',
    dietOptions: {
      omnivore: { label: 'Omnivore',   sub: 'Everything goes' },
      vegetarian: { label: 'Vegetarian', sub: 'No meat or fish' },
      vegan: { label: 'Vegan',     sub: 'No animal products' },
    },
    effortLabel: 'Cooking effort',
    effortHint: 'How much cooking you want on the road',
    effortOptions: {
      low:    { label: 'Easy',   sub: 'Quick, simple meals' },
      medium: { label: 'Medium', sub: 'Easy + some cooking' },
      high:   { label: 'More',   sub: 'Elaborate recipes too' },
    },
    burnersLabel: 'Cooking burners',
    burnersHint: 'How many you can run at once',
    burnersOptions: {
      1: { label: '1 burner',  sub: 'Single hob' },
      2: { label: '2 burners', sub: 'Pot + pan parallel' },
      3: { label: '3 burners', sub: 'Big rig / family camper' },
    },
    fridgeLabel: 'Fridge size',
    fridgeHint: 'Cold storage capacity',
    fridgeOptions: {
      small:  { label: 'Small',  sub: '< 60 L' },
      medium: { label: 'Medium', sub: '60–100 L' },
      large:  { label: 'Large',  sub: '100 L +' },
    },
    compressorLabel: 'Compressor fridge?',
    compressorHint: 'Compressor fridges (Engel, Waeco) need no ice. Cooler boxes do.',
    compressorOptions: {
      yes: { label: 'Yes', sub: 'No ice needed' },
      no:  { label: 'No',  sub: 'Ice required' },
    },
    calendarLabel: 'Trip dates',
    calendarHintPickStart: 'Tap your departure day.',
    calendarHintPickEnd: 'Now tap your return day. Tap the same day twice for a single-day trip.',
    calendarHintView: 'Tap any trip day to mark resupply stops or eating out.',
    calendarTip: '💡 Tap any trip day to plan eating out or mark a resupply stop.',
    specialHint: ({ count }) =>
      count === 1
        ? '✨ Your plan will include 1 special evening dinner — a premium meal for variety.'
        : `✨ Your plan will include ${count} special evening dinners — premium meals for variety.`,
    calendar: {
      monthNames: ['January','February','March','April','May','June','July','August','September','October','November','December'],
      weekdays:     ['Mo','Tu','We','Th','Fr','Sa','Su'],
      weekdaysFull: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
    },
    daySheet: {
      title: ({ day, dateStr }) => `Day ${day} — ${dateStr}`,
      done: 'Done',
      resupplyHeading: 'Resupply stops',
      resupplyHint: 'Tap to mark this day as the arrival. Tap again to remove.',
      stopArrival: ({ name }) => `${name} arrival`,
      stopArrivalSub: ({ km }) => `~${km}km from Cairns`,
      stopElsewhere: ({ name, day }) => `${name} arrival · currently day ${day} — tap to move here`,
      restaurantHeading: 'Eating out',
      breakfast: '🍳 Breakfast at restaurant',
      lunch: '🌯 Lunch at restaurant',
      dinner: '🍽 Dinner at restaurant',
    },
    allergiesLabel: 'Allergies or preferences?',
    allergiesHint: 'Filter recipes for the whole group',
    allergiesOptions: {
      yes: { label: 'Yes', sub: 'Pick what to avoid' },
      no:  { label: 'No',  sub: 'No restrictions' },
    },
    allergiesPickLabel: 'What to avoid',
    allergiesPickHint: 'Tap each item that should be filtered out',
    allergenOptions: {
      nuts:      { label: 'Nuts',       sub: 'All tree nuts + peanuts' },
      gluten:    { label: 'Gluten',     sub: 'Bread, pasta, oats…' },
      dairy:     { label: 'Dairy',      sub: 'Milk, cheese, butter' },
      eggs:      { label: 'Eggs',       sub: '' },
      soy:       { label: 'Soy',        sub: 'Tofu, soy sauce' },
      fish:      { label: 'Fish',       sub: 'Tuna, sardines…' },
      shellfish: { label: 'Shellfish',  sub: 'Prawns, mussels…' },
      pork:      { label: 'Pork',       sub: 'Bacon, ham, sausage' },
      garlic:    { label: 'Garlic',     sub: 'Leave out — recipes still work' },
    },
    generateCta: 'Generate plan',
    updateCta: 'Update plan',
    resetAll: 'Reset all',
    resetAllHint: 'Clears all settings, swaps, restaurant slots and shopping checks.',
    resetAllConfirm: 'Reset everything — settings, swaps, restaurants and shopping checks?',
    summary: ({ days, persons, dietLabel, dailyKcal }) =>
      `${days} days · ${persons} ${persons === 1 ? 'person' : 'people'} · ${dietLabel} · ${dailyKcal} kcal/day`,
  },

  menu: {
    meals: {
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      dinner: 'Dinner',
    },
    summary: {
      restaurant: 'Restaurant',
      breakfasts: 'Breakfasts',
      lunches: 'Lunches',
      dinners: 'Dinners',
    },
    tags: {
      new: 'NEW ✓',
      special: '✨ Special',
      sequential: '🕐 Cook in sequence',
    },
    sequentialHint: 'This recipe normally uses multiple burners — cook the components one after another and keep finished parts covered to stay warm.',
    // Phase-Header werden aus dem Bamaga-Tag-Index dynamisch zusammengesetzt.
    phases: {
      beforeBamaga: ({ from, to }) => `Phase 1: Cairns → Bamaga · Days ${from}–${to}`,
      afterBamaga:  ({ from, to }) => `Phase 2: Bamaga → Cairns · Days ${from}–${to}`,
      single:       ({ from, to }) => `Days ${from}–${to}`,
    },
    empty: 'No plan yet — open the Trip tab to configure.',
    skipPickup: 'Vehicle pickup — most rentals are released after 10am.',
    skipDropoff: 'Vehicle drop-off — most rentals must be returned by 5pm.',
    recipeLink: '→ Recipe',
    // Banner an Mahlzeiten/Rezepten mit Topping-Allergen — User wurde gewarnt aber
    // das Rezept blieb im Pool weil es sonst zu wiederholend würde. Topping kann er
    // beim Kochen weglassen.
    toppingWarning: ({ allergenLabels }) =>
      `⚠ Contains ${allergenLabels.join(', ')} as topping/optional — skip if allergic.`,
    swap: {
      btn: '⟳ Swap',
      reset: '↺ Reset to default',
      title: ({ day, slot }) => `Swap ${slot} for day ${day}`,
      hint: 'Pick a replacement from the recipe pool. The shopping list updates automatically.',
      empty: 'No alternative recipes match your settings.',
      ovrTag: 'Manually picked',
      resetAll: ({ count }) => `↺ Reset all swaps (${count})`,
      resetAllConfirm: ({ count }) =>
        `Undo all ${count} manually picked recipe${count === 1 ? '' : 's'}?`,
      // Hinweis im Swap-Sheet wenn ein Off-Cluster-Tag das Frischfleisch ausfiltert.
      noFreshMeatHint: 'ℹ️ Fresh meat (chicken, beef, lamb, sausages) is hidden for this day — it would have spoiled in your cooler by now. Pick from canned, vegetarian or vegan options below.',
      specialBadge: '✨ Special',
      specialSection: '✨ Special occasion dinners',
      regularSection: 'All recipes',
      myRecipesSection: '👨‍🍳 My recipes',
    },
    // Auto-Leftover: der Generator plant manche Dinner als Großansatz, der Folgetag isst die Reste.
    leftover: {
      lunch: ({ fromDay }) => `♻️ Leftovers from Day ${fromDay}`,
      batchHint: 'Cook extra — tomorrow\'s lunch is leftovers',
    },
    // Reaktiver Ist-Status: im Trip antippen was wirklich passiert ist. „Cooked as planned"
    // (alle Zutaten) oder „Deviation" mit Zutaten-Häkchen — nur angehakte Zutaten zählen für
    // die Rest-Einkaufsliste + Kosten; nichts angehakt = gar nicht gekocht.
    status: {
      markBtn: '✎ Log',
      close: 'Close',
      sheetTitle: 'How did this meal go?',
      cooked: '✅ Cooked as planned',
      deviation: '✎ Deviation — tick what you used',
      deviationHint: "Tick the ingredients you actually used. Tick nothing = you didn't cook this.",
      save: 'Save',
      clear: '↺ Clear (not reviewed)',
      noneCooked: 'Nothing ticked — counts as not cooked.',
      usedCount: ({ n }) => `${n} ingredient${n === 1 ? '' : 's'} used`,
      badgeCooked: '✓ Cooked',
      badgePartial: '✎ Deviation',
      badgeNotCooked: '⤫ Not cooked',
    },
    // Erklärungs-Banner im MenuTab, kollabierbar, nur für Omnivore-Diät mit Off-Cluster-Tagen.
    // Adressiert die häufigste Kunden-Frage: "Wo ist das Fleisch an späteren Tagen?"
    meatCluster: {
      tagline: ({ meatDays, totalDays }) =>
        `Fresh meat scheduled on ${meatDays} of ${totalDays} days — tap for why`,
      body1: ({ clusterDays, fridgeSize }) =>
        `With your ${fridgeSize} fridge, fresh meat (chicken, beef, lamb, sausages) is safe for about ${clusterDays} consecutive days after each shopping stop. After that, it would spoil — even in a compressor fridge, raw meat doesn't last more than 5–6 days at outback temperatures.`,
      body2: 'On the remaining days, your plan switches to:',
      shelfStableExamples: [
        '🌿 Vegetarian or vegan meals (rice, pasta, beans, lentils)',
        '🥫 Shelf-stable protein: canned tuna, salmon, sardines, Spam, Bully beef, salami',
        '🥚 Eggs, hard cheese, halloumi (which keep longer than fresh meat)',
      ],
      body3WithBamaga:
        'When you resupply at Bamaga (mid-trip), the fresh-meat clock resets and another cluster begins. You can swap any day yourself — just tap ⟳ on a meal to override.',
      body3NoBamaga:
        'Want more fresh-meat days? Add a mid-trip resupply stop (Bamaga, Coen, Cooktown, Archer River) — each one resets the cluster. You can also swap any day yourself by tapping ⟳ on a meal.',
    },
  },

  recipes: {
    sections: {
      breakfast: '🌅 Breakfast',
      lunch: '☀️ Lunch',
      dinner: '🌙 Dinner',
    },
    ingredients: ({ persons }) =>
      `Ingredients for ${persons} ${persons === 1 ? 'person' : 'people'}`,
    steps: 'Preparation',
    empty: 'No recipes for the current plan.',
    premiumDivider: ({ count }) =>
      `${count} more ${count === 1 ? 'recipe' : 'recipes'} with Premium`,
    // Eigene Rezepte (Editor + Bibliothek)
    myRecipesLabel: '👨‍🍳 My recipes',
    myRecipesEmpty: 'Add your own meals here — then swap them onto any day in the planner.',
    newRecipeCta: 'New recipe',
    deleteConfirm: ({ name }) => `Delete your recipe "${name}"? It will be removed from any day it's on.`,
    editor: {
      newTitle: 'New recipe',
      editTitle: 'Edit recipe',
      close: 'Close',
      nameLabel: 'Name',
      namePh: 'e.g. Dad\'s camp curry',
      iconLabel: 'Emoji',
      mealTypeLabel: 'Meal type',
      dietLabel: 'Diet',
      burnersLabel: 'Burners needed',
      ingLabel: 'Ingredients',
      ingNamePh: 'Ingredient',
      ingAmtPh: 'Amount (e.g. 200g/person)',
      ingHint: 'Add "/person" to scale per head (200g/person). A plain amount (1 can) counts as a serving for 2 — we scale it to your group.',
      addIng: 'Add ingredient',
      removeIng: 'Remove ingredient',
      stepsLabel: 'Steps (one per line)',
      stepsPh: 'Sear the meat\nAdd everything else\nSimmer 20 min',
      save: 'Save recipe',
      editBtn: 'Edit',
      deleteBtn: 'Delete',
    },
  },

  premium: {
    // Sticker auf den geblurrten Bereichen
    badge: 'Premium',
    unlockCta: 'Tap to unlock',
    unlockAria: 'Premium feature — tap for details',

    // Premium-Info-Seite
    infoTitle: 'Cape York Premium',
    infoLead: 'The free version lets you preview your Cape York trip — the first 5 days, Cairns shopping, and a basic menu. Premium unlocks the full plan.',
    featuresHeading: 'What you get with Premium',
    featuresList: [
      { icon: '📅', label: 'Full plan for trips up to 31 days', sub: 'Free shows the first 5 days only.' },
      { icon: '🛒', label: 'Shopping lists for every resupply stop', sub: 'Bamaga, Cooktown, Coen, Archer River. Free shows Cairns only.' },
      { icon: '👨‍🍳', label: 'All 51 curated recipes', sub: 'Free filters to recipes from your first 5 days.' },
      { icon: '🧊', label: 'Fridge size + compressor toggle', sub: 'Right-size ice and meat clusters for your gear.' },
      { icon: '⚠️', label: 'Allergy & preference filters', sub: 'Skip nuts, gluten, dairy, eggs, soy, fish, shellfish, pork, garlic — group-wide.' },
      { icon: '⟳', label: 'Recipe swaps for every day', sub: 'Free allows swaps within the first 5 days only.' },
    ],
    pricingHeading: 'Unlock the full plan',
    priceLine: 'AUD$15.99 · one-time purchase, this device',
    pricingBody: 'No subscription. No account. The license key activates Premium offline — the app never phones home.',
    // Primärer CTA — wird mit checkout.js dynamisch zur Stripe-/Mailto-/Native-Aktion verdrahtet.
    buyCta: 'Unlock the full plan — AUD$15.99',
    haveKeyCta: 'Already have a key? Activate it →',

    // Account-Seite (Activate / Status)
    accountTitle: 'Premium account',
    accountStatusFree: 'You are on the free version.',
    accountStatusPremium: 'Premium is active on this device.',
    accountKeyShown: ({ key }) => `License key: ${key}`,
    activateLabel: 'Enter license key',
    activatePlaceholder: 'CY26-XXXX-XXXX-XXXX',
    activateCta: 'Activate',
    activateSuccess: '✓ Premium activated.',
    activateError: 'Invalid license key. Check your email or contact support.',
    deactivateCta: 'Deactivate Premium on this device',
    deactivateConfirm: 'Remove Premium from this device? You can re-activate any time with the same key.',
    backToInfoCta: '← Back to Premium overview',
  },

  map: {
    // InfoMapTab — interaktive Cape-York-Karte mit Layer-Toggles.
    title: 'Cape York Map',
    subtitle: 'Tap a marker for details. Toggle the layers below to show or hide what matters to you.',
    layersHeading: 'Show on map',
    unnamedPoi: 'Point of interest',
    attribution: 'Data © OpenStreetMap contributors (ODbL) + curated Cape York references. Schematic — distances and shapes are approximate.',
    // Sub-Labels für POI-Details (km-Marker, Layer-Tag) werden inline in der Komponente gebaut.
  },

  about: {
    appName: 'Cape York 2026',
    tagline: 'Trip planner for Cape York 4WD camping — menu, recipes, shopping list.',

    privacyHeading: 'Your data',
    privacyBody: 'Everything you enter — your trip configuration, shopping checks, recipe swaps — stays on this device. The app does not collect, transmit, or share any personal data. There is no account, no cloud sync, no analytics, no tracking.',
    privacyCta: 'Read the full privacy policy',
    privacyUrl: 'https://japeyer.github.io/cape-york-app/privacy.html',

    tipsHeading: 'Tips',
    tipsBody: 'Each screen shows a short tip the first time you open it. You can bring them all back.',
    tipsCta: '↺ Show tips again',
    tipsDone: '✓ Tips will show again',

    disclaimerHeading: 'Important',
    disclaimerBody: 'This app is a planning aid, not a substitute for trip preparation. Always carry adequate water, fuel, and emergency supplies, and confirm fuel availability and opening hours before you set out. Allergen filtering is heuristic — always check ingredient lists yourself if you have a serious allergy.',
  },

  inventory: {
    intro: 'What you have on board — checked-off shopping items, minus what your cooked meals used up.',
    emptyTitle: 'Nothing in stock yet',
    emptySub: 'Tick items off on your shopping lists as you buy them — they show up here, and shrink as you mark meals cooked.',
    usedUp: ({ n }) => `Used up (${n})`,
    gone: 'used up',
    allUsed: 'Everything you bought has been used up. 🍽',
    minusOneAria: ({ name }) => `Use one ${name}`,
    usedUpAria: ({ name }) => `Mark ${name} as used up`,
    restoreAria: ({ name }) => `Restore ${name} to stock`,
    deleteAria: ({ name }) => `Delete ${name}`,
    extraCat: '🛒 Grabbed on the road',
    addBtn: '+ Add an item',
    addPlaceholder: 'e.g. Muesli bar, chips, cold drink',
    addSave: 'Add',
    addCancel: 'Cancel',
    qtyMinus: 'Fewer',
    qtyPlus: 'More',
  },
  shopping: {
    notes: {
      cairns: '🏪 Last big supermarket! Woolworths or Coles in Cairns. Buy everything you can.',
      bamaga: '🌿 Small store in Bamaga / Seisia. Go early! Prices high, selection limited. Freeze meat immediately.',
    },
    progress: {
      cairns: 'Shopping Cairns',
      bamaga: 'Shopping Bamaga',
    },
    hideChecked: ({ count }) => `👁 Hide ${count} checked`,
    showChecked: ({ count }) => `👁 Show ${count} checked`,
    dismissAria: 'Dismiss this note',
    actions: {
      reset: 'Reset',
      checkAll: 'Check all ✓',
      share: '↗ Share',
      confirmReset: 'Remove all checks?',
    },
    share: {
      sheetTitle: 'Share shopping list',
      sheetSub: 'Send the list to a co-driver. Their ticks stay on their phone — no sync.',
      whatsapp: '💬 WhatsApp',
      email: '✉ Email',
      copy: '📋 Copy to clipboard',
      copied: 'Copied to clipboard',
      copyFailed: 'Could not copy — try Email or WhatsApp instead',
      emailSubject: ({ name }) => `Cape York shopping — ${name}`,
    },
    orphans: {
      title: 'Already bought (from previous plan)',
      sub: 'These items were checked off but aren\'t in your current list. Tap to clear.',
    },
    hidden: {
      title: 'Hidden items',
      sub: 'You removed these from the list. Tap to restore.',
      tapRestore: 'tap to restore',
    },
    addBtn: 'Add item',
    addOtherBtn: 'Add custom item to a new category',
    // "Wo wird das verwendet?"-Dropdown pro Item — zeigt die Rezepte im Plan mit Link.
    usedInLabel: 'Used in these menus:',
    usedInAria: ({ n }) => `Show the ${n} recipe${n === 1 ? '' : 's'} that use this item`,
    editSheet: {
      title: 'Edit item',
      nameLabel: 'Name',
      namePh: 'e.g. Mango',
      qtyLabel: 'Quantity',
      qtyPh: 'e.g. 2 kg, 1 pack, 6',
      delete: '🗑 Delete',
      save: 'Save',
      deleteConfirm: 'Remove this item from the list?',
    },
    addSheet: {
      title: ({ cat }) => `Add to ${cat}`,
      nameLabel: 'Name',
      namePh: 'e.g. Pineapple',
      qtyLabel: 'Quantity (optional)',
      qtyPh: 'e.g. 1, 2 kg, 1 pack',
      save: 'Add',
    },
    empty: 'No items for this stop with the current plan.',
    done: 'All bought — Cape York, here we come!',
    lockedIntro: ({ name, count }) =>
      `Sample of your ${name} resupply list — ${count} items total, all scaled to your group:`,
    lockedCta: ({ remaining, name }) =>
      remaining > 0
        ? `Unlock ${remaining} more items + checkboxes, edits, and ${name} essentials →`
        : `Unlock the full ${name} list with checkboxes and edits →`,
  },

  menuJump: {
    todayPill: 'Today',
    jumpAria: ({ d }) => `Jump to day ${d}`,
    dismissAria: 'Dismiss this note',
  },
}
