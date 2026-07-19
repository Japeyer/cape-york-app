// Rezept-Pool (Seed). Inhalt englisch, Kommentare deutsch (CLAUDE.md § Coding-Regeln).
//
// Tags pro Rezept (CLAUDE.md § Architektur-Vorgaben):
//   diet:    'omnivore' | 'vegetarian' | 'vegan'
//   cooling: 'none' | 'low' | 'medium' | 'high'   (Kühlbedarf der Zutaten)
//   effort:  'easy' | 'medium' | 'hard'           (Aufwand)
//   burners: 1 | 2 | 3                            (Mindest-Anzahl gleichzeitig laufender Kochstellen)
//
// Mengenangaben sind weiterhin Pro-Person ("/person"). Generator skaliert × Personenzahl.
//
// Kategorien:
//   f = breakfast  (15 Rezepte: 4 omnivore, 4 vegetarian, 7 vegan)
//   m = lunch      (25 Rezepte: 8 omnivore, 5 vegetarian, 12 vegan)
//   a = dinner     (41 Rezepte: 19 omnivore, 9 vegetarian, 13 vegan)
// Total 81 Rezepte. Burner-Verteilung: 47 single, 21 two, 13 three.
//
// Vegan-Convenience-Rezepte (mit Plant-based Faux-Meat / Plant Cream / Plant Bacon):
//   f14 Vegan sausages + beans, f15 Plant-bacon avocado wrap, m24 Vegan schnitzel sandwich,
//   m25 Plant-based BLT, a33 Plant-based bolognese, a34 Vegan creamy mushroom pasta, a35 Vegan
//   schnitzel with mash. Generator klassifiziert Plant-based Produkte NICHT als Frischfleisch
//   (containsFreshMeat ignoriert "vegan|plant|plant-based"-Marker), damit sie keinen Cluster-Slot
//   blockieren. Cooling-Tag bleibt 'high' weil die Produkte ähnlich kurz halten wie echtes Fleisch.
//
// Special-Occasion-Rezepte (Tag `occasion: 'special'`, alle Dinner-Kategorie):
//   omnivore:    a36 Ribeye steak + wedges, a37 BBQ pork ribs + corn + slaw
//   vegetarian:  a38 Aubergine parmigiana, a39 Halloumi mezze platter
//   vegan:       a40 Jackfruit "pulled pork" tacos, a41 Stuffed butternut roast
// Generator behandelt Specials separat (computeSpecialAssignments) — pro Trip max 0–3 je nach
// Trip-Länge (<5d: 0, 5-12d: 1, 13-21d: 2, 22+d: 3), max 1 pro Cluster, in Cluster-Mitte
// platziert. User-Override > Special > Round-Robin. Premium-Zutaten wie Ribeye / Halloumi /
// Jackfruit werden in Cairns eingekauft (gut verfügbar), Bamaga-Cluster nutzt Standard-Pool.
//
// Shelf-stable Protein-Rezepte (omnivore, off-cluster-fähig — Generator klassifiziert
// sie automatisch als nonMeat weil canned/in-oil-Marker SHELF_STABLE_RX matcht):
//   m6 Tuna crackers, m11 Sardines on toast, m22 Spam fried rice, m23 Salmon rice bowl,
//   a3 Tuna pasta, a30 Smoky tuna stew, a31 Bully beef hash, a32 Sardine spaghetti.
//   → diese Rezepte erscheinen auch jenseits des Frischfleisch-Cluster im Plan.

export const RECIPES = [
  // ── BREAKFAST ─────────────────────────────
  {id:'f1',cat:'f',icon:'🍳',
   name:'Scrambled eggs with toast and tomatoes',
   time:'10 min',tools:'1 pan',kcal:'~650 kcal/person',
   diet:'omnivore',cooling:'medium',effort:'easy',burners:1,
   ing:[['Eggs','3 per person'],['Sandwich bread','2 slices/person'],['Butter','20g'],['Tomato','2, halved'],['Salt & pepper','to taste']],
   steps:['Heat pan over medium, melt 10g butter.','Add halved tomatoes. Fry 3–4 min, season lightly. Push aside or remove briefly.','Toast bread directly in the pan (1–2 min per side) or separately.','Add remaining butter to the pan. Crack and beat eggs, season. Stir slowly over medium heat for ~2 min until creamy. Don\'t overcook!','Plate everything together.'],
   tip:'Use Queensland mangos and bananas in the first days — enjoy fresh fruit at breakfast for the first 4–5 days! Beat eggs with a splash of milk to fluff the scramble. With 40°C outside: always store eggs in the fridge!'},

  {id:'f2',cat:'f',icon:'🥣',
   name:'Porridge with honey and nuts',
   time:'8 min',tools:'1 pot',kcal:'~600 kcal/person',
   diet:'vegetarian',cooling:'none',effort:'easy',burners:1,
   ing:[['Rolled oats','100g per person'],['Water','300ml per person'],['Honey','30ml/person'],['Protein bar','1/person'],['Dried fruit','30g/person']],
   steps:['Bring water to a boil in a pot.','Stir in oats, reduce heat to medium-low.','Simmer for 5 min, stirring occasionally, until creamy. Add a splash of water if too thick.','Stir in cinnamon. Divide into bowls.','Drizzle with honey, scatter nuts and dried fruit generously on top.'],
   tip:'Nuts and dried fruit are calorie boosters — don\'t skimp! 40g of nuts = ~240 extra kcal. Porridge can also be cooked with UHT milk instead of water for more calories.'},

  {id:'f3',cat:'f',icon:'🥞',
   name:'Pancakes with honey',
   time:'20 min',tools:'1 pan',kcal:'~700 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'easy',burners:1,
   ing:[['Flour','80g per person'],['Eggs','1 per person'],['UHT milk','100ml/person'],['Baking powder','1 tsp (for both)'],['Sugar','1 tsp (for both)'],['Butter (in batter)','15g (for both)'],['Honey','40ml/person'],['Nuts / peanut butter','30g/person']],
   steps:['In a large bowl, mix flour, baking powder, sugar and a pinch of salt.','Add egg, milk and melted butter. Stir until smooth. Batter should be thick.','Heat pan over medium, lightly grease.','Per pancake, spoon ~2–3 tbsp batter into the pan. Wait for bubbles to form (~2 min), flip and cook another 1–2 min.','Keep warm while baking the rest. Serve with honey and nuts.'],
   tip:'Mix the batter directly in your camping bowl — less washing up. For extra calories: spread peanut butter generously between pancakes.'},

  {id:'f4',cat:'f',icon:'🥗',
   name:'Muesli with UHT milk and nuts',
   time:'2 min',tools:'Bowl',kcal:'~750 kcal/person',
   diet:'vegetarian',cooling:'low',effort:'easy',burners:1,
   ing:[['Muesli (high-calorie)','100g/person'],['UHT milk','200ml/person'],['Protein bar','1/person'],['Dried fruit','20g/person']],
   steps:['Pour muesli into a bowl.','Add nuts and dried fruit.','Top with cold UHT milk. Done!'],
   tip:'The simplest breakfast — ideal when you need to be quick. UHT milk doesn\'t need refrigeration before opening — saves space in the cooler.'},

  {id:'f5',cat:'f',icon:'🥥',
   name:'Coconut porridge with peanut butter',
   time:'10 min',tools:'1 pot',kcal:'~700 kcal/person',
   diet:'vegan',cooling:'none',effort:'easy',burners:1,
   ing:[['Rolled oats','100g per person'],['Coconut milk','150ml/person + 100ml water'],['Peanut butter','1 tbsp (20g)/person'],['Maple syrup','30ml/person'],['Dried fruit','30g/person'],['Chopped nuts','30g/person'],['Salt','1 pinch']],
   steps:['Bring coconut milk and water to a gentle boil in a pot.','Stir in oats and a pinch of salt. Reduce heat to low.','Simmer 5 min, stirring, until creamy. Add splash of water if thick.','Off heat, swirl in peanut butter — it\'ll melt creamy into the porridge.','Divide into bowls. Top with maple syrup, dried fruit, nuts, cinnamon.'],
   tip:'Full-fat coconut milk is the calorie-packed move — vegan but rich. Maple syrup keeps better than honey on the road and is fully plant-based. Add cocoa powder for chocolate-coconut version.'},

  {id:'f6',cat:'f',icon:'🍌',
   name:'Banana pancakes',
   time:'20 min',tools:'1 pan',kcal:'~700 kcal/person',
   diet:'vegan',cooling:'low',effort:'easy',burners:1,
   ing:[['Flour','80g per person'],['Banana','1/person, mashed'],['Oat milk','100ml/person'],['Baking powder','1 tsp (for both)'],['Brown sugar','1 tbsp (for both)'],['Coconut oil (in batter + for pan)','2 tbsp (for both)'],['Maple syrup to serve','40ml/person'],['Chopped nuts','30g/person'],['Salt','1 pinch']],
   steps:['Mash bananas thoroughly in a bowl with a fork.','Add flour, baking powder, sugar, salt. Mix.','Pour in plant milk and 1 tbsp melted coconut oil. Stir until smooth — batter should be thick.','Heat pan medium, grease lightly with coconut oil. Spoon ~3 tbsp batter per pancake. Cook 2 min until bubbles form, flip, cook 1–2 min more.','Stack and serve with maple syrup and nuts.'],
   tip:'Ripe (spotty!) bananas are essential — they give sweetness without sugar. Add cocoa powder or mashed berries to the batter for variety. Keeps bananas useful even when overripe.'},

  {id:'f7',cat:'f',icon:'🥑',
   name:'Avocado toast with tomato',
   time:'5 min',tools:'1 pan or knife',kcal:'~650 kcal/person',
   diet:'vegan',cooling:'medium',effort:'easy',burners:1,
   ing:[['Sandwich bread','2 slices/person'],['Avocado','1 ripe/person'],['Tomato','1/person, sliced'],['Lemon juice','1 tbsp'],['Olive oil','2 tbsp'],['Chili flakes','to taste'],['Salt & pepper','to taste']],
   steps:['Toast bread in a dry pan over medium heat 1–2 min per side, or eat untoasted if no gas.','Halve avocado, scoop into bowl, mash with fork. Add lemon juice, salt.','Spread avocado generously and thickly on the toast.','Top with tomato slices, drizzle olive oil, scatter chili flakes.','Season with pepper.'],
   tip:'Pile the avocado thick — the calories are the point. Buy avocados slightly underripe in Cairns and let them ripen in the heat. Add Vegemite under the avocado for an Aussie twist.'},

  {id:'f8',cat:'f',icon:'🥓',
   name:'Bacon and egg roll',
   time:'12 min',tools:'1 pan',kcal:'~850 kcal/person',
   diet:'omnivore',cooling:'high',effort:'easy',burners:1,
   ing:[['Bread roll','1/person'],['Bacon','60g/person'],['Eggs','2/person'],['BBQ sauce','1 tbsp/person'],['Butter','15g/person'],['Cheese slices','1/person'],['Onion (optional)','0.25, sliced rings']],
   steps:['Fry bacon in pan over medium heat 4–5 min until crispy. Remove, keep fat in pan.','Crack eggs into the bacon fat. Fry sunny-side or break yolks for over-easy. 2–3 min.','Halve roll, butter inside. Toast cut-side down in the bacon fat 1 min until golden.','Build: bottom roll, BBQ sauce, bacon, egg, cheese (if using), onion, top roll. Press down.','Eat hot — the iconic Aussie tradie breakfast.'],
   tip:'Bacon fat in the pan is the secret — don\'t pour it out. Drizzle BBQ sauce generously. Add hash browns from a freezer bag for ultimate calorie loading.'},

  {id:'f9',cat:'f',icon:'🌱',
   name:'Overnight oats with chia',
   time:'5 min prep night before',tools:'Bowl',kcal:'~700 kcal/person',
   diet:'vegan',cooling:'low',effort:'easy',burners:1,
   ing:[['Rolled oats','80g per person'],['Plant milk (oat/almond UHT)','200ml/person'],['Chia seeds','1 tbsp (10g)/person'],['Peanut butter','1 tbsp (20g)/person'],['Maple syrup','15ml/person'],['Dried fruit (raisins, apricots)','30g/person'],['Banana','1/person, sliced (morning of)']],
   steps:['Night before: combine oats, plant milk, chia, peanut butter, maple syrup, dried fruit, cinnamon in a bowl or jar.','Stir well, cover, store in cooler/fridge overnight.','Morning: stir to loosen, add splash of plant milk if thick.','Top with banana slices and serve.','Eat cold — perfect when you want to break camp fast.'],
   tip:'Prep at night while dinner cooks — saves 15 min in the morning. Chia thickens and adds protein. In 40°C heat, eat within 24 hours of prep — don\'t leave overnight at room temp.'},

  {id:'f10',cat:'f',icon:'🌯',
   name:'Sausage and egg breakfast wrap',
   time:'12 min',tools:'1 pan',kcal:'~850 kcal/person',
   diet:'omnivore',cooling:'high',effort:'easy',burners:1,
   ing:[['Tortilla wraps','1/person'],['Sausages','2/person'],['Eggs','2/person'],['Cheese, grated','30g/person'],['BBQ sauce','1 tbsp/person'],['Onion','0.25, in rings'],['Butter','10g/person'],['Salt & pepper','to taste']],
   steps:['Slice sausages lengthwise. Fry in pan medium heat 6–7 min, turning, until crispy. Remove.','In sausage fat, fry onion 2 min. Push aside.','Beat eggs with salt and pepper, scramble in the pan with the onion 2 min until just set.','Warm tortilla in the pan briefly — 30 sec per side.','Build: tortilla, BBQ sauce, eggs, sausage, cheese. Roll tight, cut diagonally.'],
   tip:'Pre-cook sausages the night before to halve morning prep. Add hash browns or sliced potato leftovers. The wrap holds up well for breakfast-on-the-trail too.'},

  {id:'f11',cat:'f',icon:'🍳',
   name:'Big Aussie breakfast (full grill)',
   time:'25 min',tools:'2 pans + 1 pot',kcal:'~1100 kcal/person',
   diet:'omnivore',cooling:'high',effort:'medium',burners:3,
   ing:[['Bacon','60g/person'],['Eggs','2/person'],['Sausages','2/person'],['Tomato','1/person, halved'],['Mushrooms','100g/person, sliced'],['Baked beans (canned)','0.5 × 400g can/person'],['Sandwich bread','2 slices/person'],['Butter','15g/person'],['BBQ sauce','1 tbsp/person'],['Salt & pepper','to taste']],
   steps:['Burner 1 (pan): Fry sausages medium-high 8–10 min, turning, until browned through. Push to one side, add bacon, fry 4 min till crisp.','Burner 2 (pan): Heat butter, fry mushrooms 5 min until golden. Add halved tomatoes cut-side down, season, fry 3 min more. Push aside.','Burner 3 (pot): Empty beans into a small pot, warm gently 5 min, stirring.','Back to burner 2: in the same pan after veggies, fry eggs to liking — sunny-side, 3 min.','Toast bread in the now-empty bacon pan (residual fat = best toast of your life).','Plate generously: sausages, bacon, mushrooms, tomatoes, beans, eggs, toast. BBQ sauce on the side.'],
   tip:'The legendary Aussie cooked breakfast — needs 3 burners to land everything hot at once. Solo cook? Stagger: beans first (keep warm under foil), then sausages-bacon, then eggs-mushrooms last. Worth the effort on a layover day.'},

  {id:'f12',cat:'f',icon:'🌯',
   name:'Tofu scramble breakfast wrap',
   time:'12 min',tools:'1 pan',kcal:'~700 kcal/person',
   diet:'vegan',cooling:'low',effort:'easy',burners:1,
   ing:[['Firm tofu','150g/person, drained'],['Tortilla wraps','1/person'],['Avocado','0.5/person, mashed'],['Cherry tomatoes','80g/person, halved'],['Spinach','30g/person'],['Nutritional yeast','1 tbsp/person'],['Curry powder','0.5 tsp'],['Smoked paprika','0.5 tsp'],['Olive oil','2 tbsp'],['Salsa','1 tbsp/person'],['Salt','to taste']],
   steps:['Crumble tofu with hands directly into the pan — chunks should look like scrambled egg curds.','Add olive oil, turmeric, paprika, garlic powder. Stir over medium heat 5 min until tofu picks up colour and crisps lightly at edges.','Stir in nutritional yeast, salt (and a pinch of black salt for an eggy hit if you packed it). 1 min more.','Warm tortilla in a dry corner of the pan 30 sec per side.','Build: tortilla, mashed avocado, tofu scramble, cherry tomatoes, spinach, salsa. Roll tight, cut.'],
   tip:'Black salt (kala namak, Indian shop in Cairns) gives this the sulfur tang of real eggs — vegans swear by it. The tofu chunks are key — don\'t over-mash, you want texture. Fast, vegan, calorie-loaded.'},

  {id:'f13',cat:'f',icon:'🍅',
   name:'Shakshuka with crusty toast',
   time:'20 min',tools:'1 pan + 1 pot/toaster',kcal:'~750 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'medium',burners:2,
   ing:[['Eggs','2/person'],['Diced tomatoes (canned)','1 × 400g can (for both)'],['Red capsicum','1 (for both), diced'],['Onion','1, diced'],['Garlic','3 cloves, sliced'],['Tomato paste','1 tbsp'],['Cumin','1 tsp'],['Smoked paprika','1 tsp'],['Chili flakes','0.5 tsp'],['Olive oil','3 tbsp'],['Feta','40g/person, crumbled (optional)'],['Crusty bread','3 slices/person'],['Parsley','to garnish'],['Salt & pepper','to taste']],
   steps:['Burner 1 (pan, deep): Heat olive oil. Sauté onion + capsicum 5 min until softened.','Add garlic, tomato paste, cumin, paprika, chili flakes. Stir 1 min until fragrant.','Pour in diced tomatoes. Simmer 8 min, stirring, until thick. Season.','Make 4 wells in the sauce with a spoon. Crack one egg into each. Reduce heat, cover (foil if no lid), cook 5–7 min until whites set, yolks still soft.','Burner 2: toast bread in a dry pan 1 min/side, or grill over the campfire.','Sprinkle feta and parsley over the shakshuka. Serve straight from the pan with toast for dunking.'],
   tip:'Middle-Eastern one-pan magic — the runny yolk + spiced tomato + bread combo is unbeatable. No feta? Add a dollop of cream cheese instead. Make extra sauce and freeze portions for the road if your fridge has freezer space.'},

  // ── LUNCH ─────────────────────────────────
  {id:'m1',cat:'m',icon:'🌯',
   name:'Chicken-avocado wrap',
   time:'5 min',tools:'Knife',kcal:'~700 kcal/person',
   diet:'omnivore',cooling:'high',effort:'easy',burners:1,
   ing:[['Tortilla wraps','2/person'],['Canned chicken','100g/person'],['Avocado','1/person'],['Cheddar cheese','50g/person'],['Lettuce','1 handful'],['Mustard','1 tsp/person'],['Salt & pepper','to taste']],
   steps:['Halve the avocado, remove the pit, mash the flesh directly in the skin with a fork. Salt.','Slice or grate the cheese.','Lay the tortilla flat: spread guacamole evenly, top with chicken, cheese, lettuce, mustard.','Roll up tightly. Cut in half and wrap.'],
   tip:'Take the avocado out of the cooler in the morning — by lunch it\'ll be perfectly ripe. No leftovers? Canned tuna is a perfect substitute.'},

  {id:'m2',cat:'m',icon:'🥪',
   name:'Cheese-tomato sandwich',
   time:'5 min',tools:'Knife',kcal:'~750 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'easy',burners:1,
   ing:[['Sandwich bread','3 slices/person'],['Cheddar cheese','80g/person'],['Tomato','1/person'],['Butter','15g/person'],['Optional: mustard / mayo','to taste'],['Chips (snack on the side)','1 packet/person']],
   steps:['Butter the bread.','Slice the cheese; slice the tomato.','Build the sandwich, season with salt and pepper. Close it.','Serve with chips.'],
   tip:'Cheese in a vacuum bag keeps for several weeks when cooled. Always reseal in the vacuum bag right after slicing.'},

  {id:'m3',cat:'m',icon:'🍪',
   name:'Tuna crackers with peanut butter',
   time:'5 min',tools:'Fork',kcal:'~700 kcal/person',
   diet:'omnivore',cooling:'low',effort:'easy',burners:1,
   ing:[['Crispbread','4/person'],['Tuna in oil','1 can (185g)/person'],['Capers','1 tbsp/person'],['Lemon juice','1 tbsp'],['Peanut butter','2 tbsp (40g)/person'],['Optional: cucumber','a few slices']],
   steps:['Drain the tuna and mash it in a bowl with a fork.','Stir in capers and lemon juice. Season with salt and pepper.','Top half the crackers with the tuna mix.','Spread the other half generously with peanut butter.','Serve together. Add cucumber slices if you have them.'],
   tip:'Once opened, transfer canned tuna into a Ziploc bag immediately — keeps it fresh and odour-free. Don\'t throw out the oil from the can — extra calories!'},

  {id:'m4',cat:'m',icon:'♻️',
   name:'Leftover wrap (curry, pasta, tacos)',
   time:'3 min',tools:'None',kcal:'~700 kcal/person',
   diet:'omnivore',cooling:'medium',effort:'easy',burners:1,
   ing:[['Tortilla wraps','2/person'],['Last night\'s leftovers','generous portion/person'],['Cheddar cheese (optional)','30g/person'],['Lettuce (if available)','1 handful']],
   steps:['Take leftovers from the cooler.','Lay out the tortilla, spread leftovers in the middle (cold is fine!).','Optional: top with cheese.','Roll up tightly.'],
   tip:'Curry leftovers are surprisingly good cold in a wrap. Pasta leftovers can be reheated briefly with a splash of water in a pan — 2 min — if you prefer.'},

  {id:'m5',cat:'m',icon:'🌯',
   name:'Cheese-bacon wrap',
   time:'8 min',tools:'1 pan',kcal:'~700 kcal/person',
   diet:'omnivore',cooling:'medium',effort:'easy',burners:1,
   ing:[['Tortilla wraps','2/person'],['Cheddar cheese','60g/person'],['Bacon','50g/person'],['Mustard','1 tsp/person'],['Lettuce','1 handful']],
   steps:['Fry bacon in a dry pan over medium heat until crispy — 3–4 min. Drain.','Warm the tortilla briefly in the hot pan — 30 sec per side.','Spread mustard on the tortilla, layer cheese, fried bacon and lettuce.','Roll up and eat right away.'],
   tip:'This wrap is ideal as a "use-it-up" wrap for bacon that needs to go soon. Add peanut butter crackers on the side to bump up the calories.'},

  {id:'m6',cat:'m',icon:'🥚',
   name:'Egg salad on crispbread',
   time:'12 min',tools:'1 pot',kcal:'~700 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'easy',burners:1,
   ing:[['Eggs','4 per person'],['Crispbread','3/person'],['Butter','20g/person (for spreading)'],['Optional: capers','1 tsp/person'],['Salt & pepper','to taste'],['Nuts on the side','30g/person']],
   steps:['Bring a pot of water to the boil. Carefully lower the eggs in.','Hard-boil for 10 min. Refresh briefly in cold (or lukewarm) water.','Peel the eggs and roughly mash them in a bowl with a fork.','Stir in butter, season with salt and pepper. Add capers if using.','Spread generously on the crispbread. Serve with nuts on the side.'],
   tip:'Save water: boil the eggs in the same water you\'ll use for tonight\'s pasta if you can. Hard-boiled eggs keep for a few hours unrefrigerated — perfect for the road.'},

  {id:'m7',cat:'m',icon:'🍜',
   name:'Instant noodle soup with egg',
   time:'8 min',tools:'1 pot',kcal:'~700 kcal/person',
   diet:'vegetarian',cooling:'low',effort:'easy',burners:1,
   ing:[['Instant noodles','2 packets/person'],['Eggs','1/person'],['Soy sauce','1 tbsp/person'],['Spring onion','2'],['Chili flakes','to taste'],['Peanut butter (optional)','1 tbsp — makes it creamier!']],
   steps:['Bring water to the boil per packet instructions (~500ml/person).','Add noodles and seasoning packet — cook 3 min.','Crack the egg directly into the boiling soup and poach for 2 min (or whisk and stir in).','Add soy sauce, spring onions and chili.','Optional: stir in peanut butter for extra calories and creaminess.'],
   tip:'Two packets per person sounds like a lot — at 5500 kcal/day it\'s the right call. A dash of Sriracha from your stash makes the soup come alive.'},

  {id:'m8',cat:'m',icon:'🫙',
   name:'Sardines on toast',
   time:'5 min',tools:'Knife',kcal:'~650 kcal/person',
   diet:'omnivore',cooling:'low',effort:'easy',burners:1,
   ing:[['Sandwich bread','2 slices/person'],['Sardines in oil','1 can (125g)/person'],['Butter','15g/person'],['Lemon juice','1 tbsp'],['Capers','1 tsp/person'],['Black pepper','to taste']],
   steps:['Butter the bread.','Drain the sardines (save the oil in a Ziploc for later).','Spread the sardines on the toast and lightly mash with a fork.','Scatter capers, squeeze lemon, season with pepper.'],
   tip:'Sardines are extremely calorie- and protein-dense — ideal for Cape York. With chips or crackers on the side you go from ~650 to ~800 kcal.'},

  {id:'m9',cat:'m',icon:'🥜',
   name:'Peanut butter crackers with jerky',
   time:'2 min',tools:'None',kcal:'~700 kcal/person',
   diet:'omnivore',cooling:'none',effort:'easy',burners:1,
   ing:[['Crispbread','4/person'],['Peanut butter','3 tbsp (60g)/person'],['Beef jerky','50g/person'],['70% chocolate','2–3 squares (30g)/person']],
   steps:['Spread crispbread generously with peanut butter.','Lay the jerky next to it.','Chocolate for dessert.'],
   tip:'The "no-cook" lunch — ideal when there\'s no gas/power or you just need to be fast. Peanut butter has ~600 kcal per 100g — the most calorie-dense camp food going.'},

  {id:'m10',cat:'m',icon:'🌯',
   name:'Hummus and veg wrap',
   time:'5 min',tools:'Knife',kcal:'~650 kcal/person',
   diet:'vegan',cooling:'medium',effort:'easy',burners:1,
   ing:[['Tortilla wraps','1/person'],['Hummus (jarred)','60g/person'],['Cucumber','0.5/person, sliced'],['Carrot','1 small/person, grated'],['Tomato','1/person, sliced'],['Lettuce','1 handful'],['Olive oil','2 tbsp'],['Salt & pepper','to taste'],['Optional: olives','4/person']],
   steps:['Spread hummus thickly across the centre of the tortilla.','Layer cucumber, grated carrot, tomato, lettuce.','Drizzle olive oil, season with salt and pepper.','Add olives if using. Roll up tightly. Cut diagonally.'],
   tip:'Jarred hummus keeps unopened for weeks. Olive oil adds the calories vegans need. Tahini-rich hummus is best — read the label. Add sundried tomatoes for umami punch.'},

  {id:'m11',cat:'m',icon:'🍌',
   name:'Peanut butter banana wrap',
   time:'3 min',tools:'None',kcal:'~700 kcal/person',
   diet:'vegan',cooling:'low',effort:'easy',burners:1,
   ing:[['Tortilla wraps','1/person'],['Peanut butter','3 tbsp (60g)/person'],['Banana','1/person'],['Maple syrup','15ml/person']],
   steps:['Spread peanut butter thickly across the tortilla.','Lay banana whole or sliced along the centre.','Drizzle maple syrup, sprinkle cinnamon.','Roll up tightly. Cut diagonally.','Eat fresh — the banana goes brown if you wait.'],
   tip:'Sweet vegan lunch when you\'re craving sugar. Add cocoa nibs for chocolate-banana vibes. Bananas keep 3–4 days unrefrigerated in a cooler bag.'},

  {id:'m12',cat:'m',icon:'🥪',
   name:'Caprese sandwich with basil',
   time:'5 min',tools:'Knife',kcal:'~750 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'easy',burners:1,
   ing:[['Sourdough bread','3 slices/person'],['Mozzarella (vacuum-packed)','80g/person'],['Tomato','1/person, thickly sliced'],['Olive oil','4 tbsp'],['Balsamic vinegar','1 tbsp/person'],['Mixed dried herbs','1 tsp'],['Salt & pepper','to taste']],
   steps:['Slice tomato and mozzarella thick.','Drizzle olive oil generously on bread.','Layer mozzarella, tomato, basil. Season with salt and pepper.','Drizzle balsamic vinegar, top with second slice of bread, close.','Press lightly so the layers compact.'],
   tip:'The Italian classic works on the road. Bocconcini balls in brine are a great alternative. Olive oil is the soul of caprese — be generous. Sub balsamic with lemon juice if you didn\'t pack it.'},

  {id:'m13',cat:'m',icon:'🥗',
   name:'Mediterranean couscous salad',
   time:'10 min',tools:'1 pot (boil only)',kcal:'~700 kcal/person',
   diet:'vegan',cooling:'low',effort:'easy',burners:1,
   ing:[['Couscous','80g per person'],['Boiling water','200ml/person'],['Cherry tomatoes','40g/person, diced'],['Cucumber','0.25/person, diced'],['Black olives','6/person, halved'],['Capers','1 tbsp (for both)'],['Chickpeas (canned, drained)','0.5 × 400g can (for both)'],['Olive oil','4 tbsp'],['Lemon juice','1 tbsp/person'],['Mixed dried herbs','1 tsp'],['Salt & pepper','to taste']],
   steps:['Boil water in a pot or kettle. Pour over couscous in a bowl, cover with plate, let stand 5 min.','Fluff couscous with a fork.','Stir in tomato, cucumber, olives, capers, chickpeas.','Drizzle olive oil and lemon juice. Sprinkle oregano. Season.','Toss well. Eat immediately or chill 30 min for better flavour.'],
   tip:'No real cooking needed beyond boiling water. Couscous is the lightest carb to pack. Add feta if you\'re vegetarian (not vegan). Sun-dried tomatoes from a jar add umami.'},

  {id:'m14',cat:'m',icon:'🌯',
   name:'Curried chickpea wrap',
   time:'7 min',tools:'Fork',kcal:'~700 kcal/person',
   diet:'vegan',cooling:'low',effort:'easy',burners:1,
   ing:[['Tortilla wraps','1/person'],['Chickpeas (canned, drained)','0.5 × 400g can (for both)'],['Mango chutney','2 tbsp/person'],['Curry powder','2 tsp'],['Olive oil','2 tbsp'],['Lemon juice','1 tbsp'],['Lettuce','1 handful'],['Tomato','0.5, diced'],['Salt & pepper','to taste']],
   steps:['Drain chickpeas. Mash roughly with a fork in a bowl — leave some texture.','Mix in mango chutney, curry powder, olive oil, lemon juice. Season.','Spread the mix down the centre of the tortilla.','Top with lettuce and tomato. Roll tightly. Cut diagonally.'],
   tip:'Cold curry wrap — sounds wrong, tastes great. Mango chutney is the secret ingredient: sweet-spicy magic. Use leftover mix on crackers if you skip the tortilla.'},

  {id:'m15',cat:'m',icon:'🧀',
   name:'Cheese quesadilla with tomato',
   time:'8 min',tools:'1 pan',kcal:'~700 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'easy',burners:1,
   ing:[['Tortilla wraps','2/person'],['Cheese, grated','80g/person'],['Tomato','0.5/person, diced'],['Olive oil','2 tbsp'],['Chili flakes','0.5 tsp'],['Salt','to taste'],['Optional: jalapeños','to taste']],
   steps:['Heat dry pan over medium. Place one tortilla, sprinkle cheese, tomato, chili evenly.','Top with second tortilla, press down lightly.','Cook 2–3 min until bottom is golden and cheese starts melting.','Flip carefully (use a plate to help). Cook another 2 min.','Slide onto board, cut into wedges. Salt to taste.'],
   tip:'Easy hot lunch when you need something cooked. Add black beans or salsa for protein. Hot sauce on the side. Works in a dry pan — no oil needed if cheese is fatty.'},

  {id:'m16',cat:'m',icon:'🫒',
   name:'Hummus crackers with olives',
   time:'3 min',tools:'None',kcal:'~650 kcal/person',
   diet:'vegan',cooling:'low',effort:'easy',burners:1,
   ing:[['Crispbread','5/person'],['Hummus (jarred)','80g/person'],['Black olives','6/person'],['Olive oil','2 tbsp'],['Almonds','30g/person'],['Dried apricots','3/person'],['Chili flakes','to taste']],
   steps:['Spread hummus thickly on each crispbread.','Top with olive halves, drizzle olive oil, sprinkle chili flakes.','Serve nuts and dried apricots on the side.','Eat immediately — fully cold lunch.'],
   tip:'Zero-cook lunch — perfect when gas runs low or you\'re packing up camp. Tahini-heavy hummus has more fat = more calories. Sweet apricots balance the savoury.'},

  {id:'m17',cat:'m',icon:'🥗',
   name:'Greek salad with pita',
   time:'8 min',tools:'Knife',kcal:'~750 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'easy',burners:1,
   ing:[['Feta (vacuum-packed)','100g/person'],['Tomato','1 large/person'],['Cucumber','0.5/person'],['Black olives','6/person'],['Red onion','0.25 (for both), thin rings'],['Olive oil','4 tbsp'],['Red wine vinegar','1 tbsp/person'],['Mixed dried herbs','1 tsp'],['Pita bread','2/person'],['Salt & pepper','to taste']],
   steps:['Chop tomato and cucumber into rustic chunks (not diced — Greek style).','Slice red onion into thin rings.','Combine in a bowl with olives. Cube the feta and add.','Drizzle olive oil and vinegar, sprinkle oregano. Season. Toss gently.','Toast pita briefly in a dry pan if you have one. Serve alongside.'],
   tip:'Traditional Greek doesn\'t mince — keep it chunky. Feta in vacuum packs keeps for weeks. Use crispbread if no pita. Drizzle extra olive oil at the table for calorie boost.'},

  {id:'m22',cat:'m',icon:'🍚',
   name:'Spam fried rice',
   time:'15 min',tools:'1 pan',kcal:'~950 kcal/person',
   diet:'omnivore',cooling:'none',effort:'easy',burners:1,
   ing:[['Spam','120g/person, cubed'],['Cooked rice','200g/person'],['Eggs','2/person, beaten'],['Peas','60g/person'],['Onion','0.5/person, diced'],['Garlic','2 cloves, minced'],['Soy sauce','2 tbsp/person'],['Sesame oil','1 tsp/person'],['Vegetable oil','3 tbsp'],['Spring onion','1 stalk/person'],['Chili flakes','to taste'],['Salt & pepper','to taste']],
   steps:['Heat 1 tbsp oil in pan over high heat. Add Spam cubes. Fry 4–5 min until edges crisp and brown. Remove to a plate.','Add 1 tbsp more oil. Pour in beaten eggs, scramble briefly 30 sec, breaking into small curds. Push to one side.','Add remaining oil + onion and garlic. Fry 1 min. Add peas, stir 1 min.','Add cooked rice, breaking up clumps. Toss with everything 2–3 min until rice is hot and lightly toasted at edges.','Return Spam to pan. Pour in soy sauce + sesame oil. Toss to coat 1 min.','Top with chopped spring onions, chili if you like. Serve hot.'],
   tip:'Spam is the camper\'s secret weapon — shelf-stable indefinitely, salty-savoury, fries to crispy edges. Use day-old rice if you have leftovers (firmer, doesn\'t go mushy). Instant rice pouches work too. Add a fried egg on top for extra calories.'},

  {id:'m23',cat:'m',icon:'🐟',
   name:'Canned salmon rice bowl with lemon mayo',
   time:'15 min',tools:'1 pot',kcal:'~850 kcal/person',
   diet:'omnivore',cooling:'low',effort:'easy',burners:1,
   ing:[['Canned salmon','1 × 210g can/person, drained'],['Jasmine rice','120g/person'],['Cucumber','0.5/person, diced'],['Avocado','0.5/person, sliced'],['Mayo','3 tbsp/person'],['Lemon juice','1 tbsp/person'],['Soy sauce','1 tsp/person'],['Sesame seeds','1 tsp/person'],['Nori sheets (optional, torn into strips)','1/person'],['Salt','to taste']],
   steps:['Cook rice — 120g + 1.5× water, boil, cover, low 12 min, rest 5 min.','While rice cooks: drain salmon, flake into a bowl with a fork. Mix gently with 1 tbsp mayo + lemon juice + soy sauce + a pinch of salt.','Whisk remaining mayo with a splash more lemon — that\'s the lemon mayo for drizzling.','Build bowls: rice base, salmon mix on one side, cucumber + avocado on the other.','Drizzle lemon mayo over the salmon. Sesame seeds on top, nori strips for that sushi-bowl feel.'],
   tip:'Canned salmon is severely underrated — high in calcium (soft bones edible, mash through), no cooking needed. Red salmon is the upgrade pick if you can find it. This is a no-fridge-needed meal except for the avocado/cucumber, which keep 4–5 days in the cooler.'},

  {id:'m18',cat:'m',icon:'🍔',
   name:'Smashburger with chips and slaw',
   time:'25 min',tools:'2 pans + 1 pot',kcal:'~1100 kcal/person',
   diet:'omnivore',cooling:'high',effort:'medium',burners:3,
   ing:[['Ground beef','150g/person'],['Burger buns','1/person'],['Cheese slices','1/person'],['Potatoes','250g/person, cut into chips'],['White cabbage','100g/person, finely shredded'],['Carrot','0.5/person, grated'],['Mayo','2 tbsp/person'],['Apple cider vinegar','1 tbsp (for both)'],['Onion','0.5/person, sliced rings'],['Pickles','3 slices/person'],['BBQ sauce','1 tbsp/person'],['Mustard','1 tsp/person'],['Vegetable oil','5 tbsp'],['Salt & pepper','to taste']],
   steps:['Slaw first (no heat): toss shredded cabbage + carrot with mayo, vinegar, salt, pepper. Set aside in cooler.','Burner 1 (pot): Heat oil to medium-hot. Fry chips in batches 6–8 min until golden. Drain on paper towel, salt heavily.','Burner 2 (pan): Heat dry, hot. Form mince into loose balls (no salt yet!). Smash flat with a spatula — paper-thin = max crust. Salt + pepper. 2 min, flip, top with cheese, 1 min more.','Burner 3 (pan): Toast cut-side of buns 30 sec in a dry pan until lightly charred.','Build: bottom bun, mustard, smashburger, BBQ sauce, onion, pickles, top bun. Press.','Serve smashburger + chips + slaw all hot together.'],
   tip:'Smashburger trick: thin patties = more crust = more flavour. NEVER salt the meat before forming — it tightens the protein and ruins the texture. Slaw mayo holds up well in the cooler 24h ahead. Big-camper meal worth the 3-burner setup.'},

  {id:'m19',cat:'m',icon:'🥗',
   name:'Buddha bowl with crispy tofu',
   time:'25 min',tools:'1 pot + 2 pans',kcal:'~950 kcal/person',
   diet:'vegan',cooling:'low',effort:'medium',burners:3,
   ing:[['Firm tofu','150g/person, cubed'],['Jasmine rice','120g/person'],['Broccoli','150g/person, florets'],['Carrot','1/person, cut into ribbons'],['Red capsicum','0.5/person, sliced'],['Cornflour','2 tbsp (for both)'],['Soy sauce','3 tbsp (for both)'],['Sesame oil','1 tbsp (for both)'],['Tahini','2 tbsp/person'],['Lemon juice','1 tbsp/person'],['Maple syrup','5ml/person'],['Garlic','2 cloves, minced'],['Vegetable oil','4 tbsp'],['Sesame seeds','1 tsp/person to garnish'],['Salt','to taste']],
   steps:['Burner 1 (pot): Cook rice — 120g + 1.5× water, boil, cover, low 12 min, rest 5 min.','While rice cooks: toss tofu cubes in cornflour + 1 tbsp soy sauce. Coat evenly.','Burner 2 (pan): Heat vegetable oil hot. Fry tofu 6–8 min, turning, until golden and crisp on all sides. Drizzle remaining 2 tbsp soy sauce + sesame oil at the end.','Burner 3 (pan): Heat splash of oil. Stir-fry broccoli + carrot + capsicum 4 min over high heat — keep crisp.','Whisk tahini + lemon + maple + garlic + 2 tbsp water = sauce.','Build bowls: rice base, veggies on one side, crispy tofu on the other. Drizzle tahini sauce. Sesame seeds on top.'],
   tip:'Buddha bowls win on visual presentation — keep components separate, drizzle sauce last. Cornflour coating is the secret to crispy tofu — never skip it. Brown rice gives more fibre but adds 20 min cook time. The tahini sauce keeps 3 days in the cooler.'},

  {id:'m20',cat:'m',icon:'🥙',
   name:'Roasted veggie hummus pita',
   time:'20 min',tools:'1 pan',kcal:'~750 kcal/person',
   diet:'vegan',cooling:'low',effort:'easy',burners:1,
   ing:[['Pita bread','2/person'],['Hummus','100g/person'],['Zucchini','0.5/person, sliced'],['Red capsicum','0.5/person, sliced'],['Eggplant','0.25/person, cubed'],['Red onion','0.25/person, wedges'],['Olive oil','6 tbsp'],['Cumin','0.5 tsp'],['Smoked paprika','0.5 tsp'],['Lemon juice','1 tbsp/person'],['Tahini','1 tbsp/person'],['Pine nuts','15g/person'],['Salt & pepper','to taste']],
   steps:['Heat 2 tbsp olive oil in pan over medium-high. Add zucchini, capsicum, eggplant, onion. Toss to coat.','Sprinkle cumin, paprika, salt, pepper. Roast in pan 10–12 min, stirring occasionally, until softened and charred at edges.','Off heat, drizzle with lemon juice and remaining olive oil.','Warm pita briefly in the empty pan 30 sec per side.','Slit pita open, slather inside with hummus and a swirl of tahini.','Stuff with roasted veggies. Sprinkle pine nuts. Eat warm.'],
   tip:'Calorie-loaded vegan lunch that doesn\'t skimp — hummus + tahini + pine nuts + olive oil all stack the calories. Tinned hummus keeps 5 days unopened, 3 once cracked. Add chili flakes if you like heat. Leftover roasted veg = breakfast wrap fuel next day.'},

  {id:'m21',cat:'m',icon:'🧀',
   name:'Halloumi & lemon couscous bowl',
   time:'15 min',tools:'1 pot + 1 pan',kcal:'~900 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'easy',burners:2,
   ing:[['Halloumi','120g/person, sliced 1cm thick'],['Couscous','80g/person'],['Cherry tomatoes','100g/person, halved'],['Cucumber','0.5/person, diced'],['Red onion','0.25/person, finely diced'],['Mint leaves','small handful'],['Lemon','1/person, zest + juice'],['Olive oil','6 tbsp'],['Honey','5ml/person'],['Salt & pepper','to taste']],
   steps:['Burner 1 (pot): Bring 100ml/person water + pinch of salt to boil. Pour over couscous in a bowl, cover, rest 5 min. Fluff with fork.','Burner 2 (pan): Heat dry hot. Add halloumi slices. Sear 1.5 min/side until golden and crisp at edges. Don\'t move too soon — let crust form.','Stir tomatoes, cucumber, red onion, mint, lemon zest, lemon juice, olive oil into the couscous. Salt + pepper.','Plate couscous, top with hot halloumi, drizzle honey over the cheese. Serve.'],
   tip:'Halloumi is the camper\'s best friend — vacuum-packed, keeps weeks, never melts away in the pan. Honey on hot halloumi sounds odd but is a Mediterranean classic — sweet-salty perfection. Couscous needs no real cooking, just hot water — perfect for limited-fuel days.'},

  // ── DINNER ────────────────────────────────
  {id:'a1',cat:'a',leftovers:true,icon:'🍝',
   name:'Pasta Bolognese',
   time:'30 min',tools:'1 pot + 1 pan',kcal:'~1050 kcal/person',
   diet:'omnivore',cooling:'high',effort:'medium',burners:2,
   ing:[['Spaghetti','150g/person'],['Ground beef','150g/person'],['Onion','1 medium'],['Garlic','3 cloves'],['Diced tomatoes (canned)','1 × 400g can'],['Tomato paste','1 tbsp'],['Olive oil','2 tbsp'],['Mixed dried herbs','1 tsp'],['Salt & pepper','to taste'],['Parmesan','40g/person to serve']],
   steps:['Bring a large pot of salted water to the boil. Cook spaghetti al dente (per packet, usually 9–11 min). IMPORTANT: save 1 cup of cooking water before draining!','Meanwhile, heat a pan. Olive oil in, sweat diced onion 3 min until translucent.','Add garlic (chopped or pressed), cook 1 min. Add ground beef, brown over high heat, breaking it up — 5–6 min.','Stir in tomato paste, cook 1 min. Add canned tomatoes and seasonings.','Simmer 15 min on low. Loosen with pasta water if needed.','Toss pasta with sauce. Serve with parmesan.'],
   tip:'Don\'t throw out the pasta water! The starch in it makes the sauce silky and binds everything. Add parmesan at the table — it keeps longer in a vacuum bag.'},

  {id:'a2',cat:'a',leftovers:true,icon:'🍛',
   name:'Thai green curry with chicken',
   time:'25 min',tools:'1 pan + 1 pot (rice)',kcal:'~1100 kcal/person',
   diet:'omnivore',cooling:'high',effort:'medium',burners:2,
   ing:[['Chicken breast','150g/person, cubed'],['Jasmine rice','150g/person'],['Coconut milk (full-fat)','1 × 400ml can'],['Curry powder','2 tbsp (more = hotter)'],['Red capsicum','1, sliced'],['Carrot','1, sliced'],['Fish sauce','1 tbsp'],['Soy sauce','1 tbsp'],['Olive oil','1 tbsp'],['Salt','to taste']],
   steps:['Cook rice with 1.5× water in a pot. Bring to a boil, then lowest heat — 15 min covered. Rest 5 min.','In a second pot, heat oil. Fry curry paste 1 min until fragrant.','Add cubed chicken, brown 4–5 min on all sides.','Add veg (pepper, carrot), stir-fry 2 min.','Pour in coconut milk, bring to a boil, then simmer gently 8–10 min until chicken is done.','Stir in fish sauce and soy sauce, taste. Serve with rice.'],
   tip:'Be generous with the curry paste — Cape York heat and humidity calls for spice. Don\'t shake the coconut milk can — fry the cream from the top first for more depth.'},

  {id:'a3',cat:'a',icon:'🌭',
   name:'Bratwurst with potato wedges',
   time:'30 min',tools:'1 pan',kcal:'~1050 kcal/person',
   diet:'omnivore',cooling:'high',effort:'medium',burners:1,
   ing:[['Thick bratwurst','3/person'],['Potatoes','250g/person'],['Olive oil','3 tbsp'],['Smoked paprika','1 tsp'],['Salt & pepper','to taste'],['Mustard','generous, to serve'],['Onion','1 large, in rings']],
   steps:['Cut potatoes into wedges (halve, then halve again). Toss with oil, paprika, garlic, salt.','Fry the wedges in a pan over medium heat for 15–20 min, turning regularly. Use a lid if you have one.','Fry bratwurst in a separate or the same pan over medium heat for 8–10 min, turning regularly.','Add the onions in the last 5 min with the sausages until caramelised.','Serve everything together with plenty of mustard.'],
   tip:'Wrap the potatoes in foil with a splash of oil and start them in the embers/pan for the first 10 min — speeds cooking and frees up pan space for the sausages. Then unwrap and crisp them up.'},

  {id:'a4',cat:'a',icon:'🥩',
   name:'Beef stir-fry with rice noodles',
   time:'20 min',tools:'1 pan + 1 pot',kcal:'~1050 kcal/person',
   diet:'omnivore',cooling:'high',effort:'medium',burners:1,
   ing:[['Beef strips','150g/person'],['Rice noodles (vermicelli)','150g/person'],['Pak choi','1/person'],['Red capsicum','1, sliced'],['Garlic','3 cloves, chopped'],['Soy sauce','3 tbsp'],['Fish sauce','1 tbsp'],['Vegetable oil','2 tbsp'],['Chili flakes','to taste']],
   steps:['Soak rice noodles per packet instructions (usually 3–5 min in hot water, don\'t boil). Drain, set aside.','Slice beef thinly across the grain.','Get pan/wok very hot, add oil. Sear beef in small batches — 2 min. Remove.','In the same oil, fry garlic 30 sec, then pak choi and pepper for 2–3 min.','Return noodles and beef, drizzle soy and fish sauce. Toss for 1–2 min.','Serve with chili flakes.'],
   tip:'The key to a good stir-fry: very hot pan, small batches of meat, fast! Too much meat at once and it boils instead of frying.'},

  {id:'a5',cat:'a',leftovers:true,icon:'🌮',
   name:'Beef tacos with guacamole',
   time:'25 min',tools:'1 pan',kcal:'~1050 kcal/person',
   diet:'omnivore',cooling:'high',effort:'medium',burners:1,
   ing:[['Ground beef','150g/person'],['Taco shells','3/person'],['Avocado','1 large/person'],['Tomato','1, diced'],['Cheddar cheese, grated','60g/person'],['Sour cream','30g/person'],['Onion','0.5, finely diced'],['Smoked paprika','1 tsp each'],['Chili flakes','0.5 tsp each'],['Salt & pepper','to taste'],['Lemon juice','1 tbsp']],
   steps:['Guacamole: mash avocado, mix in lemon juice, salt, a little onion. Combine well.','Salsa: dice tomato, mix with the rest of the onion, salt, chili, lemon juice.','Brown ground beef in a hot pan over high heat for 5–6 min, breaking it up. Season with paprika, cumin, chili, garlic, salt. Cook 2 more minutes.','Warm taco shells briefly in a dry pan — 30 sec per side.','Build: cheese first (melts on the hot shell), then beef, guacamole, salsa, sour cream.'],
   tip:'Warming taco shells in a hot pan makes them crunchier and tastier. Always make guacamole last so it doesn\'t brown. Use leftovers as a lunch wrap the next day!'},

  {id:'a6',cat:'a',icon:'🍝',
   name:'Spaghetti carbonara',
   time:'20 min',tools:'1 pot + 1 pan',kcal:'~1050 kcal/person',
   diet:'omnivore',cooling:'medium',effort:'medium',burners:2,
   ing:[['Spaghetti','150g/person'],['Eggs','3/person (2 whole + 1 yolk)'],['Bacon','80g/person, diced'],['Parmesan, grated','60g/person'],['UHT cream','60ml/person'],['Black pepper','generous'],['Salt','for the pasta water']],
   steps:['Cook spaghetti al dente in plenty of salted water. IMPORTANT: save 1 cup of pasta water!','Whisk eggs, cream and parmesan in a bowl, season with pepper. Keep this mix cool.','Fry bacon in a pan with no oil until crispy — 4–5 min. Take pan off the heat.','Add hot drained pasta to the bacon pan. Pour the egg-cheese mix over the top.','Toss vigorously and immediately — residual heat cooks the eggs. OFF the heat, no more flame! Loosen with pasta water.','Serve right away with extra pepper and parmesan.'],
   tip:'The most common mistake: leaving the pan on the flame when adding the eggs — that gives you scrambled eggs, not carbonara! Heat off, then eggs in, toss fast. Pasta water is essential here.'},

  {id:'a7',cat:'a',icon:'🍗',
   name:'Chicken stir-fry with rice (Bamaga)',
   time:'25 min',tools:'1 pan + 1 pot',kcal:'~1050 kcal/person',
   diet:'omnivore',cooling:'high',effort:'medium',burners:2,parallel:true,
   ing:[['Chicken breast (fresh from Bamaga)','150g/person, in strips'],['Jasmine rice','150g/person'],['Zucchini','1 (fresh from Bamaga)'],['Onion','1'],['Garlic','3 cloves'],['Soy sauce','3 tbsp'],['Oyster sauce','1 tbsp'],['Oil','2 tbsp'],['Salt & pepper','to taste']],
   steps:['Start the rice: 150g/person with 1.5× water, bring to boil, 15 min on low.','Slice chicken into strips. Cut veg into pieces.','Pan very hot, add oil. Sear chicken 5–6 min until golden. Remove.','Fry onion and garlic 2 min. Add veg, stir-fry 3 min.','Return chicken, drizzle sauces, toss 1–2 min.','Serve with rice.'],
   tip:'The first home-cooked meal after a long Bamaga shopping day — keep it simple! Throw in whatever you got fresh from Bamaga. Soy sauce makes everything tasty.'},

  {id:'a8',cat:'a',leftovers:true,icon:'🍛',
   name:'Red curry with ground beef',
   time:'25 min',tools:'1 pot + 1 pot (rice)',kcal:'~1100 kcal/person',
   diet:'omnivore',cooling:'high',effort:'medium',burners:2,
   ing:[['Ground beef (fresh from Bamaga)','150g/person'],['Jasmine rice','150g/person'],['Coconut milk (full-fat)','1 × 400ml can'],['Curry powder','2 tbsp'],['Capsicum','1'],['Onion','1'],['Garlic','3 cloves'],['Diced tomatoes','0.5 can (200g)'],['Fish sauce','1 tbsp'],['Oil','1 tbsp']],
   steps:['Start rice as usual (1:1.5 water, 15 min).','Fry onion and garlic in oil for 3 min. Add curry paste, fry 1 min.','Add ground beef, brown over high heat 5–6 min, breaking it up.','Add bell pepper, fry 2 min. Pour in coconut milk and canned tomatoes.','Simmer gently 15 min. Stir in fish sauce, taste.','Serve with rice.'],
   tip:'Red curry paste is a touch milder than green — perfect for the middle of the trip. Eat leftovers cold as a wrap the next day.'},

  {id:'a9',cat:'a',icon:'🥩',
   name:'Lamb chops with sweet potato mash',
   time:'30 min',tools:'1 pan + 1 pot',kcal:'~1050 kcal/person',
   diet:'omnivore',cooling:'high',effort:'medium',burners:2,
   ing:[['Lamb chops (fresh from Bamaga)','2/person (~200g)'],['Sweet potato','250g/person'],['Butter','30g/person'],['UHT milk','50ml/person (for the mash)'],['Peas (canned)','100g/person'],['Garlic','2 cloves'],['Mixed dried herbs','1 tsp'],['Olive oil','1 tbsp'],['Salt & pepper','to taste']],
   steps:['Peel and dice sweet potatoes, boil in salted water for 15 min until tender. Drain.','Add butter and milk to the sweet potatoes, mash until creamy. Salt.','Warm peas briefly in the same pot or with hot water from the kettle.','Season lamb chops with salt, pepper and oregano.','Pan very hot, olive oil in. Fry chops 3–4 min per side — still pink inside. Rest!','Plate everything together.'],
   tip:'Don\'t overcook lamb chops — well-done is tough. 3–4 min per side over high heat, then 3 min rest. A touch of pink inside is perfect. A generous pat of butter in the sweet potato mash makes it especially calorie-rich.'},

  {id:'a10',cat:'a',icon:'🍝',
   name:'Tuna pasta with capers and olives',
   time:'20 min',tools:'1 pot + 1 pan',kcal:'~1050 kcal/person',
   diet:'omnivore',cooling:'low',effort:'medium',burners:2,
   ing:[['Penne','150g/person'],['Tuna in oil','2 × 185g cans (for both)'],['Capers','2 tbsp'],['Black olives','12, halved'],['Anchovies','3–4 fillets (optional, but excellent!)'],['Diced tomatoes (canned)','0.5 × 400g can'],['Chili flakes','0.5 tsp'],['Garlic','3 cloves'],['Olive oil','3 tbsp'],['Parmesan','30g/person']],
   steps:['Cook pasta al dente in salted water. Save the cooking water!','Olive oil in a pan, fry chopped garlic 1 min on low. Add anchovies, mash with a spoon.','Chili flakes 30 sec, then canned tomatoes. Simmer 5 min.','Stir in tuna (with the oil from the can!), capers and olives. Warm through 2 min.','Drain pasta (save the water!), straight into the sauce. Toss well. Loosen with pasta water.','Serve with parmesan.'],
   tip:'Use the oil from the tuna cans — extra calories and flavour! Anchovies dissolve into the sauce and give a deep umami hit — you don\'t taste them directly.'},

  {id:'a11',cat:'a',leftovers:true,icon:'🌶',
   name:'Chili con carne with rice',
   time:'35 min',tools:'1 pot + 1 pot (rice)',kcal:'~1100 kcal/person',
   diet:'omnivore',cooling:'high',effort:'hard',burners:2,
   ing:[['Ground beef (Bamaga, thawed)','150g/person'],['Jasmine rice','150g/person'],['Kidney beans (canned)','1 × 400g can (for both)'],['Corn (canned)','0.5 × 400g can'],['Diced tomatoes','1 × 400g can'],['Tomato paste','1 tbsp'],['Onion','1 large'],['Garlic','3 cloves'],['Cumin','2 tsp — important!'],['Smoked paprika','1 tsp'],['Curry powder','1 tsp'],['Chili flakes','to taste'],['Beef stock cube','1'],['Oil','2 tbsp'],['Salt & pepper','to taste']],
   steps:['Start rice: 150g/person + 1.5× water, bring to boil, 15 min on low.','Dice the onion, fry over medium heat in oil 3–4 min until translucent.','Add garlic 1 min. Stir in all spices (cumin, paprikas, coriander, chili) — toast 1 min until fragrant.','Add ground beef, brown over high heat 5–6 min, breaking it up.','Stir in tomato paste 1 min. Add canned tomatoes, drained kidney beans, corn and crumbled stock cube.','Simmer 20 min on low, stirring occasionally. Taste — usually wants more cumin.','Serve with rice.'],
   tip:'Chili tastes even better reheated the next day — save leftovers for lunch! Cumin is THE key spice for chili — don\'t skimp. If you still have sour cream: spoon it on top!'},

  {id:'a12',cat:'a',leftovers:true,icon:'🍲',
   name:'Red lentil soup with coconut milk',
   time:'30 min',tools:'1 large pot',kcal:'~1100 kcal/person',
   diet:'vegetarian',cooling:'low',effort:'medium',burners:1,
   ing:[['Red lentils','150g/person'],['Coconut milk (full-fat)','1 × 400ml can'],['Diced tomatoes','1 × 400g can'],['Onion','1 large'],['Garlic','3 cloves'],['Cumin','1.5 tsp'],['Curry powder','1.5 tsp'],['Chili flakes','0.5 tsp'],['Vegetable stock cube','1 + 400ml water'],['Oil','2 tbsp'],['Lemon juice','1 tbsp'],['Naan bread','2 (for both), warmed'],['Salt','to taste']],
   steps:['Dice onion, fry in oil 4 min until golden. Add garlic 1 min.','Stir in spices (cumin, curry, chili) — toast 1 min.','Add lentils (NO need to soak!), canned tomatoes, stock and coconut milk.','Bring to a boil, then simmer 20 min on medium until lentils are soft and creamy.','Blend with a stick blender if you have one — or leave rustic. Lemon, salt to taste.','Warm naan in a dry pan or directly over the gas flame. Serve with the soup.'],
   tip:'Red lentils don\'t need soaking — straight into the pot. The soup goes creamy on its own as the lentils break down. Naan often contains dairy — check the packet if cooking strictly vegan.'},

  {id:'a13',cat:'a',icon:'🍅',
   name:'One-pot pasta with feta and tomato',
   time:'25 min',tools:'1 large pot',kcal:'~1000 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'easy',burners:1,
   ing:[['Penne','150g/person'],['Diced tomatoes (canned)','1 × 400g can'],['Feta','100g/person'],['Garlic','3 cloves, sliced'],['Tomato paste','1 tbsp'],['Olive oil','3 tbsp'],['Mixed dried herbs','1 tsp'],['Chili flakes','0.5 tsp'],['Vegetable stock cube','1 + 400ml water'],['Salt & pepper','to taste']],
   steps:['Heat olive oil in a large pot. Add sliced garlic, fry 1 min on medium.','Stir in tomato paste, basil, chili — toast 30 sec.','Pour in canned tomatoes, stock cube and water. Bring to a boil.','Add pasta. Cook per packet (10–12 min), stirring occasionally so nothing sticks.','In the last 2 min, crumble feta on top. Stir gently — it\'ll partly melt into the sauce. Season.'],
   tip:'Inspired by the famous baked feta pasta — done one-pot. The pasta starch makes it creamy on its own. Add olives or sundried tomatoes for depth. Works just as well with cherry tomatoes if you have them.'},

  {id:'a14',cat:'a',leftovers:true,icon:'🌱',
   name:'Chickpea curry with rice',
   time:'30 min',tools:'1 pot (sequential)',kcal:'~1050 kcal/person',
   diet:'vegan',cooling:'low',effort:'medium',burners:1,
   ing:[['Chickpeas (canned, drained)','1 × 400g can (for both)'],['Coconut milk (full-fat)','1 × 400ml can'],['Diced tomatoes','1 × 400g can'],['Jasmine rice','150g/person'],['Curry powder','2 tbsp'],['Onion','1'],['Garlic','3 cloves'],['Ginger','2cm piece, grated'],['Coconut oil','2 tbsp'],['Soy sauce','1 tbsp'],['Brown sugar','1 tsp'],['Lime juice','1 tbsp'],['Chopped peanuts','30g/person to serve'],['Salt','to taste']],
   steps:['Cook rice first: 150g/person + 1.5× water in pot, boil, cover, low heat 15 min. Set aside (covered, stays warm 20 min).','Wipe pot. Heat coconut oil. Fry diced onion 4 min, add garlic and ginger 1 min.','Stir in curry paste, fry 1 min until fragrant.','Add tomatoes, coconut milk, drained chickpeas. Bring to a simmer, cook 12 min.','Stir in soy sauce, sugar, lime, salt. Taste and adjust.','Serve over warm rice. Top with chopped peanuts.'],
   tip:'Sequential cooking on a single burner — rice first, set aside covered, then curry in the same pot. Most red curry pastes are vegan but check for shrimp paste on the label. Add frozen or canned spinach for extra greens.'},

  {id:'a15',cat:'a',icon:'🧀',
   name:'Mac & cheese',
   time:'25 min',tools:'1 pot + 1 pan',kcal:'~1100 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'medium',burners:2,
   ing:[['Macaroni','200g/person'],['UHT milk','200ml/person'],['Cheddar cheese, grated','100g/person'],['Butter','30g/person'],['Flour','30g (for both)'],['Salt & pepper','to taste'],['Optional: parmesan','20g/person']],
   steps:['Cook pasta in salted water al dente. Drain, save 0.5 cup pasta water.','In a pan, melt butter over medium heat. Whisk in flour, cook 1 min.','Slowly pour in milk, whisking constantly to avoid lumps. Cook 3–4 min until thickened.','Off heat, stir in grated cheese until melted. Add mustard, nutmeg, salt, pepper.','Combine pasta with sauce. Loosen with pasta water if too thick. Top with parmesan.'],
   tip:'Ultimate camping comfort food. Add canned tuna or peas for variety. Use any leftover hard cheese — gruyere, parmesan all work beautifully. Sprinkle breadcrumbs and toast under foil for a crust.'},

  {id:'a16',cat:'a',leftovers:true,icon:'🌶',
   name:'Black bean chili with rice',
   time:'35 min',tools:'1 pot (sequential)',kcal:'~1050 kcal/person',
   diet:'vegan',cooling:'low',effort:'medium',burners:1,
   ing:[['Black beans (canned, drained)','1 × 400g can (for both)'],['Kidney beans (canned, drained)','1 × 400g can (for both)'],['Diced tomatoes','1 × 400g can'],['Corn (canned, drained)','0.5 × 400g can'],['Jasmine rice','150g/person'],['Onion','1 large'],['Garlic','3 cloves'],['Tomato paste','1 tbsp'],['Cumin','2 tsp'],['Smoked paprika','1 tsp'],['Chili flakes','1 tsp'],['Vegetable stock cube','1'],['Olive oil','2 tbsp'],['Lime juice','1 tbsp'],['Avocado','0.25/person to serve'],['Salt','to taste']],
   steps:['Cook rice first: 150g/person + 1.5× water, boil, cover, low 15 min. Set aside covered.','Wipe pot. Heat oil. Fry onion 3 min, add garlic 1 min.','Stir in tomato paste and all spices, toast 1 min.','Add diced tomatoes, both beans, corn, crumbled stock cube + 200ml water.','Simmer 15 min, stirring occasionally. Lime, salt to taste.','Serve over rice with diced avocado on top.'],
   tip:'Hearty and protein-packed without meat — beans + rice = complete protein. Hot sauce or chipotle in adobo elevates it. Leftovers wrap brilliantly in tortillas next day.'},

  {id:'a17',cat:'a',icon:'🍄',
   name:'Mushroom risotto',
   time:'35 min',tools:'1 large pot',kcal:'~1050 kcal/person',
   diet:'vegan',cooling:'low',effort:'medium',burners:1,
   ing:[['Arborio rice','150g/person'],['Dried porcini','30g (for both, rehydrate in 200ml hot water)'],['Onion','1'],['Garlic','3 cloves'],['Olive oil','3 tbsp'],['Vegetable stock cube','1 + 800ml water (for both)'],['Vegan butter','30g (for both, to finish)'],['Nutritional yeast','2 tbsp'],['Mixed dried herbs','0.5 tsp'],['Salt & pepper','to taste'],['Optional: dry white wine','100ml']],
   steps:['Rehydrate porcini in 200ml hot water for 10 min. Drain and chop, save the soaking liquid (= mushroom stock).','Heat oil in pot. Fry diced onion 4 min, add garlic 1 min.','Add rice, stir 1 min to coat in oil. Pour in wine (or first ladle of stock), stir until absorbed.','Add chopped porcini and thyme. Add hot stock + mushroom water, one ladle at a time, stirring, allowing each to absorb before adding the next. About 20 min total.','Off heat, stir in vegan butter and nutritional yeast. Salt and pepper.','Rest 1 min, then serve.'],
   tip:'Vegan risotto sounds wrong but tastes amazing — porcini gives meaty umami, nutritional yeast gives the cheesy hit. No need for parmesan. The mushroom soaking water is liquid gold — never throw it away.'},

  {id:'a18',cat:'a',icon:'🍝',
   name:'Spinach-ricotta pasta',
   time:'20 min',tools:'1 pot + 1 pan',kcal:'~1050 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'medium',burners:2,
   ing:[['Penne','150g/person'],['Ricotta','125g/person'],['Spinach','200g (for both, drained)'],['Parmesan, grated','40g/person'],['Garlic','3 cloves'],['Olive oil','2 tbsp'],['Lemon juice','1 tbsp'],['Salt & pepper','to taste']],
   steps:['Cook pasta al dente in salted water. Save 1 cup pasta water before draining.','In a pan, heat olive oil. Fry chopped garlic 30 sec.','Add drained spinach, cook 2 min until heated through.','Off heat, stir in ricotta, lemon juice, nutmeg. Loosen with pasta water to creamy sauce.','Combine with drained pasta. Top with parmesan.'],
   tip:'Ricotta in vacuum packs keeps cooled for 1–2 weeks. Quick veggie pasta with high protein. If no spinach, frozen peas work. Brown butter instead of olive oil takes it next-level.'},

  {id:'a19',cat:'a',icon:'🌭',
   name:'Sausages with baked beans',
   time:'20 min',tools:'1 pan',kcal:'~1100 kcal/person',
   diet:'omnivore',cooling:'high',effort:'easy',burners:1,
   ing:[['Sausages','4/person'],['Baked beans','1 × 400g can (for both)'],['Sandwich bread','3 slices/person, toasted'],['Onion','1, sliced'],['Tomato paste','1 tbsp'],['Smoked paprika','1 tsp'],['Worcestershire sauce','1 tbsp'],['Brown sugar','1 tsp'],['Olive oil','2 tbsp'],['Salt & pepper','to taste']],
   steps:['Heat oil in pan. Fry sausages over medium heat 8 min, turning, until browned and cooked through. Remove.','In the sausage fat, fry sliced onion 3 min until soft.','Stir in tomato paste, paprika, sugar — 1 min.','Add baked beans and Worcestershire sauce. Simmer 5 min, stirring.','Slice sausages back in to warm. Toast bread in another pan or directly. Serve sausages and beans over toast.'],
   tip:'Peak Aussie camping food. Pan-fried onion in sausage fat transforms a humble can of beans. Toast extra bread to mop up the sauce. Add HP sauce or BBQ sauce on the table.'},

  {id:'a20',cat:'a',icon:'🌱',
   name:'Tofu stir-fry with noodles',
   time:'25 min',tools:'1 pan + 1 pot',kcal:'~1000 kcal/person',
   diet:'vegan',cooling:'medium',effort:'medium',burners:2,parallel:true,
   ing:[['Firm tofu (vacuum-packed)','200g/person'],['Rice noodles','150g/person'],['Red capsicum','1, sliced'],['Carrot','1, julienned'],['Pak choi','1/person'],['Garlic','3 cloves'],['Ginger','2cm piece, grated'],['Soy sauce','3 tbsp'],['Rice vinegar','1 tbsp'],['Brown sugar','1 tbsp'],['Chili flakes','1 tsp'],['Coconut oil','3 tbsp'],['Sesame oil (optional, finish)','1 tsp'],['Chopped peanuts','30g/person to serve']],
   steps:['Soak rice noodles per packet (3–5 min hot water). Drain, set aside.','Press tofu briefly with a paper towel to remove moisture, then cube.','Pan very hot, 2 tbsp coconut oil in. Sear tofu 4–5 min, turning, until golden multiple sides. Remove.','In the same pan with remaining oil, fry garlic and ginger 30 sec. Add veg, stir-fry 3 min on high.','Return tofu and noodles. Drizzle soy, vinegar, sugar, chili. Toss 2 min until heated through.','Finish with sesame oil. Top with peanuts.'],
   tip:'Extra-firm vacuum-packed tofu is a Cape York hero — keeps for weeks unopened. Don\'t crowd the pan when searing tofu — it needs space to colour. Add Sriracha for heat.'},

  {id:'a21',cat:'a',icon:'🍗',
   name:'Chicken and rice one-pot',
   time:'30 min',tools:'1 large pot',kcal:'~1050 kcal/person',
   diet:'omnivore',cooling:'high',effort:'easy',burners:1,
   ing:[['Chicken thighs','200g/person'],['Jasmine rice','150g/person'],['Onion','1'],['Garlic','3 cloves'],['Smoked paprika','1 tsp'],['Curry powder','0.5 tsp'],['Cumin','1 tsp'],['Chicken stock cube','1 + 1.5× rice water'],['Lemon','0.5, sliced'],['Olive oil','2 tbsp'],['Parsley','1 tbsp to serve'],['Salt & pepper','to taste']],
   steps:['Heat oil in pot. Season chicken with salt and pepper. Brown chicken 5 min on multiple sides. Remove.','Same pot, fry diced onion 3 min, add garlic 1 min.','Stir in spices, toast 30 sec. Add rice, stir to coat.','Pour in stock + water (1.5× rice volume). Add lemon slices. Return chicken on top.','Bring to boil, reduce to lowest heat, cover. Cook 18 min undisturbed.','Rest 5 min covered. Fluff with fork. Top with parsley.'],
   tip:'Classic one-pot pilaf. Chicken thighs stay juicy on slow heat — don\'t use breast for this. Don\'t stir during the 18 min cook or the rice goes mushy. Add a handful of frozen peas in the last 3 min if you have them.'},

  {id:'a22',cat:'a',leftovers:true,icon:'🥄',
   name:'Lentil-vegetable stew',
   time:'40 min',tools:'1 large pot',kcal:'~1000 kcal/person',
   diet:'vegan',cooling:'low',effort:'medium',burners:1,
   ing:[['Lentils','100g/person'],['Diced tomatoes','1 × 400g can'],['Carrot','2, diced'],['Onion','1'],['Garlic','3 cloves'],['Tomato paste','1 tbsp'],['Vegetable stock cube','1 + 600ml water (for both)'],['Cumin','2 tsp'],['Smoked paprika','1 tsp'],['Olive oil','2 tbsp'],['Lemon juice','1 tbsp'],['Sandwich bread','2 slices/person'],['Salt & pepper','to taste']],
   steps:['Heat oil in pot. Fry diced onion 4 min, add garlic 1 min, then carrot 3 min.','Stir in tomato paste and spices, toast 1 min.','Add lentils (no soak needed), tomatoes, stock, water, bay leaf.','Bring to boil, reduce heat, simmer 25 min stirring occasionally until lentils are soft. Add splash of water if drying out.','Lemon, salt, pepper to taste. Discard bay leaf. Serve with bread.'],
   tip:'Brown lentils hold their shape; red lentils dissolve. For thicker stew, mash some lentils against the pot side with a spoon. Add Worcestershire sauce (vegan brands exist) for deeper flavour.'},

  {id:'a23',cat:'a',icon:'🌮',
   name:'Cheesy bean quesadillas',
   time:'15 min',tools:'1 pan',kcal:'~1000 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'easy',burners:1,
   ing:[['Tortilla wraps','2/person'],['Cheese, grated','100g/person'],['Refried beans (canned)','0.5 × 400g can (for both)'],['Tomato','0.5/person, diced'],['Onion','0.25 (for both), finely chopped'],['Cumin','0.5 tsp'],['Chili flakes','0.5 tsp'],['Olive oil','2 tbsp'],['Avocado','0.5/person to serve'],['Sour cream (optional)','30g/person'],['Lime juice','1 tbsp'],['Salt','to taste']],
   steps:['Warm refried beans in pan 2 min with cumin and chili. Transfer to a bowl.','Spread bean mix on one tortilla. Top with cheese, tomato, onion. Cover with second tortilla.','Wipe pan, add 1 tbsp oil. Cook quesadilla 2–3 min per side, pressing lightly, until crisp and cheese melted.','Slide onto board, cut into wedges.','Mash avocado with salt and lime. Serve quesadilla with avocado and sour cream.'],
   tip:'Outback Mexican night. If no refried beans, mash kidney beans with cumin and lime. Hot sauce makes everything better. Pre-grated cheese melts faster.'},

  {id:'a24',cat:'a',icon:'🌶',
   name:'Pasta aglio e olio with chili',
   time:'15 min',tools:'1 pot',kcal:'~1000 kcal/person',
   diet:'vegan',cooling:'none',effort:'easy',burners:1,
   ing:[['Spaghetti','150g/person'],['Garlic','5 cloves, sliced thin'],['Chili flakes','1 tsp'],['Olive oil','6 tbsp (for both)'],['Lemon juice','1 tbsp'],['Parsley','1 tbsp'],['Toasted breadcrumbs','30g/person (sub for parmesan)'],['Salt & pepper','to taste']],
   steps:['Cook spaghetti al dente in heavily salted water. SAVE 1 cup pasta water before draining.','While pasta cooks: heat olive oil in cleaned pot over LOW heat. Add sliced garlic, gently fry 4–5 min until golden — do NOT burn.','Add chili flakes, swirl 30 sec.','Drain pasta, add to garlic oil with 0.5 cup pasta water. Toss vigorously 1 min until silky.','Lemon juice, parsley, salt, pepper. Serve immediately with toasted breadcrumbs.'],
   tip:'The simplest Italian pasta — quality olive oil is everything. The pasta water emulsifies the oil into a silky sauce. Toasted breadcrumbs add the crunch parmesan would. Burnt garlic ruins it — keep heat low.'},

  {id:'a25',cat:'a',icon:'🍗',
   name:'Pan-roast chicken with mash and honey carrots',
   time:'45 min',tools:'2 pans + 1 pot',kcal:'~1150 kcal/person',
   diet:'omnivore',cooling:'high',effort:'medium',burners:3,
   ing:[['Chicken thighs','200g/person'],['Potatoes','300g/person, peeled, chunked'],['Carrot','2/person, halved lengthwise'],['Butter','40g/person'],['UHT milk','60ml/person'],['Garlic','4 cloves, smashed'],['Mixed dried herbs','1 tsp'],['Honey','15ml/person'],['Olive oil','3 tbsp'],['Lemon','0.5/person, wedges'],['Chicken stock cube','1'],['Salt & pepper','to taste']],
   steps:['Burner 1 (heavy pan): Heat 2 tbsp oil. Salt + pepper chicken thighs. Place skin-down, do NOT move for 8 min — golden crust forms. Flip, add garlic + thyme, cook 12 min more until juices run clear (~74°C internal).','Burner 2 (pot): Boil potatoes in salted water 15 min until tender. Drain. Mash with butter, milk, salt. Cover to keep warm.','Burner 3 (pan): Heat 1 tbsp oil. Add carrots cut-side down, sear 5 min until charred. Drizzle honey, splash 50ml water + crumbled stock cube. Cover, steam 5 min until tender-glazed.','Rest chicken 3 min.','Plate: mash, carrots, chicken on top. Pour pan juices from chicken over the lot. Lemon wedge on the side.'],
   tip:'Sunday-roast vibes from a 3-burner camp kitchen — possible because chicken thighs are forgiving (unlike breasts). The mash + honey carrots + crispy chicken combo is dinner-party good. Make extra mash — fries beautifully into crispy potato cakes for breakfast.'},

  {id:'a26',cat:'a',icon:'🥥',
   name:'Thai green curry feast with crispy tempeh',
   time:'35 min',tools:'2 pans + 1 pot',kcal:'~1100 kcal/person',
   diet:'vegan',cooling:'medium',effort:'medium',burners:3,
   ing:[['Jasmine rice','150g/person'],['Tempeh','120g/person, sliced'],['Coconut milk (full-fat, canned)','1 × 400ml can/person'],['Curry powder','4 tbsp'],['Eggplant','0.25/person, cubed'],['Green beans','100g/person'],['Bamboo shoots (canned, drained)','100g/person'],['Lime leaves','3 leaves'],['Soy sauce','2 tbsp'],['Brown sugar','1 tbsp'],['Lime juice','1 tbsp/person'],['Roasted peanuts','30g/person'],['Coriander leaves','small handful'],['Vegetable oil','4 tbsp'],['Cornflour','2 tbsp'],['Salt','to taste']],
   steps:['Burner 1 (pot): Cook jasmine rice — 150g + 1.5× water, boil, cover, low 12 min, rest 5 min.','Burner 2 (pan, deep): Heat 2 tbsp oil. Fry curry paste 1 min until fragrant. Pour in coconut milk, stir to combine.','Add eggplant, simmer 8 min. Add bamboo shoots + snow peas, lime leaves, soy sauce, brown sugar. Simmer 4 min more — veggies tender-crisp.','Burner 3 (pan): Toss tempeh slices in cornflour. Heat 2 tbsp oil hot. Fry tempeh 6 min, turning, until crispy on both sides.','Curry off heat: stir in lime juice, salt to taste.','Build bowls: rice, curry over the top, crispy tempeh slices, peanuts and coriander to finish.'],
   tip:'Coconut milk MUST be full-fat — light coconut breaks and tastes thin. Curry paste varies wildly by brand — start with 1 tbsp, taste, add more. Crispy tempeh on top is the textural payoff. Vegan but every bit as comforting as a chicken curry.'},

  {id:'a27',cat:'a',icon:'🍆',
   name:'Mediterranean halloumi feast with roast veg & herb couscous',
   time:'30 min',tools:'2 pans + 1 pot',kcal:'~1050 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'medium',burners:3,
   ing:[['Halloumi','150g/person, sliced 1cm thick'],['Couscous','100g/person'],['Eggplant','0.5/person, cubed'],['Capsicum','1 (for both), cubed'],['Cherry tomatoes','100g/person'],['Red onion','0.5/person, wedges'],['Garlic','3 cloves, sliced'],['Olive oil','5 tbsp'],['Lemon zest + juice','1 lemon'],['Honey','15ml'],['Mixed dried herbs','1 tsp'],['Smoked paprika','0.5 tsp'],['Parsley','small handful'],['Vegetable stock cube','1'],['Salt & pepper','to taste']],
   steps:['Burner 1 (pan, large): Heat 3 tbsp olive oil. Add eggplant, capsicum, onion, garlic. Sear over high heat 12 min, stirring, until charred and softened. Add cherry tomatoes for last 2 min so they blister but hold shape. Salt + pepper, oregano, paprika.','Burner 2 (pot): Bring 1.2× couscous volume of water + crumbled stock cube to boil. Pour over couscous in a bowl, cover, rest 5 min. Fluff with fork. Stir in lemon zest, lemon juice, parsley, 1 tbsp olive oil, salt.','Burner 3 (pan): Heat dry. Sear halloumi 1.5 min/side until golden crust forms. Drizzle honey over hot halloumi off heat.','Plate: couscous base, roasted veg pile, halloumi slices on top. Extra lemon at table.'],
   tip:'Restaurant-quality vegetarian dinner from a 3-burner camp setup. The trio — sweet roasted veg + lemony couscous + salty-honeyed halloumi — is the Mediterranean trick. Halloumi NEVER goes off in vacuum packs (3+ weeks in cooler). Use up any vegetable that looks tired.'},

  {id:'a28',cat:'a',leftovers:true,icon:'🥄',
   name:'Coconut dal with basmati rice',
   time:'30 min',tools:'1 pot (sequential)',kcal:'~950 kcal/person',
   diet:'vegan',cooling:'none',effort:'easy',burners:1,
   ing:[['Red lentils','100g/person'],['Basmati rice','120g/person'],['Coconut milk (full-fat)','200ml/person'],['Onion','1, diced'],['Garlic','4 cloves, minced'],['Ginger','4cm, grated'],['Curry powder','1 tsp'],['Cumin','2 tsp'],['Tomato paste','1 tbsp'],['Vegetable stock cube','1'],['Vegetable oil','3 tbsp'],['Lemon juice','1 tbsp/person'],['Coriander leaves','small handful'],['Chili flakes','to taste'],['Salt','to taste']],
   steps:['Cook rice first: rinse basmati, then 120g + 1.5× water in pot. Boil, cover, low 12 min. Rest covered, transfer to a bowl, cover with foil.','Wipe pot. Heat oil over medium. If using mustard seeds, add and let pop 30 sec.','Add onion, fry 4 min until soft. Add garlic + ginger, 1 min more.','Stir in turmeric, cumin, garam masala, chili flakes, tomato paste — toast 1 min.','Add lentils, coconut milk, crumbled stock cube + 400ml water. Bring to simmer, cook uncovered 18 min, stirring occasionally, until lentils break down into a creamy dal.','Lemon juice + salt to taste. Top with coriander.','Serve dal alongside or over the rice.'],
   tip:'One-pot vegan winner — lentils are the cheapest protein on the trip and stretch the budget. Dal thickens overnight in the cooler — leftovers reheat into next-day lunch. Splash extra coconut milk to loosen if it gets too thick. The best version of this gets better the longer it simmers.'},

  {id:'a29',cat:'a',icon:'🥟',
   name:'Brown butter sage gnocchi with parmesan',
   time:'18 min',tools:'1 pot + 1 pan',kcal:'~1000 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'easy',burners:2,
   ing:[['Potato gnocchi (vacuum-packed)','250g/person'],['Butter','40g/person'],['Mixed dried herbs','1 tsp'],['Garlic','3 cloves, sliced thin'],['Parmesan, grated','40g/person'],['Lemon zest','from 0.5 lemon'],['Salt','for water'],['Black pepper','to taste']],
   steps:['Burner 1 (pot): Bring large pot of well-salted water to a rolling boil.','Burner 2 (pan): Melt butter over medium heat. Add sage leaves and sliced garlic, cook gently 4–5 min until butter turns golden-brown and smells nutty (= brown butter / beurre noisette). Watch closely — burnt butter is bitter.','Drop gnocchi into boiling water. They float in 2–3 min — that\'s done. Lift out with a slotted spoon directly into the brown butter pan.','Toss gnocchi to coat in butter. Add lemon zest, half the parmesan, lots of black pepper.','Plate, top with remaining parmesan.'],
   tip:'15-minute pasta-restaurant dinner. Vacuum-packed gnocchi is shelf-stable, packs flat, and tastes way better than dry pasta when you want comfort. Brown butter (beurre noisette) is the move — it transforms the dish. Don\'t skip the lemon zest, it cuts the richness.'},

  {id:'a30',cat:'a',leftovers:true,icon:'🥫',
   name:'Smoky tuna and white bean stew',
   time:'25 min',tools:'1 pot',kcal:'~950 kcal/person',
   diet:'omnivore',cooling:'none',effort:'easy',burners:1,
   ing:[['Tuna in oil','1 × 185g can/person'],['White beans (cannellini, canned)','1 × 400g can (for both)'],['Diced tomatoes (canned)','1 × 400g can (for both)'],['Onion','1, diced'],['Garlic','4 cloves, sliced'],['Tomato paste','1 tbsp'],['Smoked paprika','2 tsp'],['Cumin','1 tsp'],['Chili flakes','0.5 tsp'],['Olive oil','3 tbsp'],['Vegetable stock cube','1'],['Crusty bread','3 slices/person to serve'],['Lemon juice','1 tbsp'],['Parsley','1 tbsp'],['Salt & pepper','to taste']],
   steps:['Heat olive oil in pot over medium. Sauté onion 4 min until soft. Add garlic, 1 min more.','Stir in tomato paste, smoked paprika, cumin, chili flakes — toast 1 min until fragrant.','Add diced tomatoes, drained beans, bay leaf, crumbled stock cube + 200ml water. Salt + pepper.','Simmer uncovered 12 min, stirring occasionally, until thickened.','Stir in tuna with its oil — break into chunks. Warm through 2 min, do NOT boil hard (turns rubbery).','Off heat: lemon juice, parsley. Adjust seasoning.','Serve in deep bowls with crusty bread for soaking up the sauce.'],
   tip:'Pure pantry meal — works on day 1 or day 25. Smoked paprika is the trick that makes canned tuna taste deeply rich and almost smokey. Add a splash of red wine vinegar at the end for sharpness. The leftovers are even better the next morning on toast.'},

  {id:'a31',cat:'a',icon:'🥩',
   name:'Bully beef hash with crispy eggs',
   time:'20 min',tools:'1 pan',kcal:'~1050 kcal/person',
   diet:'omnivore',cooling:'low',effort:'easy',burners:1,
   ing:[['Canned corned beef (Bully beef)','200g/person, cubed'],['Potatoes','250g/person, diced'],['Onion','1, diced'],['Eggs','2/person'],['Worcestershire sauce','1 tbsp/person'],['Tomato sauce','1 tbsp/person to serve'],['Butter','45g'],['Spring onion','1 stalk/person, chopped'],['Salt & pepper','to taste']],
   steps:['Heat butter in pan medium-high. Add onion, fry 3 min.','Add diced potatoes, season, fry 8 min, stirring, until edges crispy and golden. (If using canned potatoes, drain well first.)','Crumble in corned beef. Splash in Worcestershire and mustard powder. Toss everything 4–5 min until beef warms through and crisps at the edges. Push to one side of the pan.','Crack eggs into the empty space. Cover (lid or foil), cook 3 min until whites set, yolks runny.','Plate hash, eggs on top, dollop of tomato sauce, scatter spring onions.'],
   tip:'Bully beef is the iconic Aussie/British camping protein — keeps forever, salt-cured, transforms into golden crispy bits when fried. Pre-cook potatoes the night before to halve cook time. Add a dash of hot sauce or pickled jalapeños for kick. Eggs over hash = camp comfort food perfection.'},

  {id:'a32',cat:'a',icon:'🐟',
   name:'Sardine spaghetti with chili, lemon and breadcrumbs',
   time:'15 min',tools:'1 pot + 1 pan',kcal:'~1000 kcal/person',
   diet:'omnivore',cooling:'none',effort:'easy',burners:2,
   ing:[['Spaghetti','150g/person'],['Sardines in oil','1 × 120g can/person'],['Garlic','5 cloves, sliced thin'],['Chili flakes','1 tsp'],['Lemon','0.5/person, zest + juice'],['Olive oil','4 tbsp'],['Toasted breadcrumbs (panko)','30g/person'],['Capers','1 tbsp/person'],['Parsley','1 tbsp'],['Salt & pepper','to taste']],
   steps:['Burner 1 (pot): Cook spaghetti al dente in salted water — usual 9–11 min per packet. SAVE 1 cup of pasta water before draining.','Burner 2 (pan): Heat 2 tbsp olive oil over LOW heat. Add sliced garlic + chili flakes, gently fry 3–4 min until garlic is just golden — do NOT burn.','Add sardines with their oil, capers, lemon zest. Mash sardines into the oil with a fork — they\'ll dissolve into a rich sauce. 2 min.','Drain pasta, transfer directly to the sardine pan. Add 0.5 cup pasta water, lemon juice, remaining olive oil. Toss vigorously 1 min until silky.','Plate, top heavily with toasted breadcrumbs and parsley. Black pepper.'],
   tip:'Italian working-class classic that hides its canned-ness brilliantly — sardines disintegrate into a deep umami sauce, you barely taste fish. Toasted breadcrumbs (toast in dry pan with a drizzle of olive oil before you start cooking) replace parmesan and add the crucial crunch. Anchovies work as substitute if you have them.'},

  // ── VEGAN CONVENIENCE PRODUCTS ──────────────
  // Vegane Rezepte mit Plant-based Convenience-Produkten (vegan sausages, plant-based mince,
  // plant-based bacon, vegan schnitzel, plant cream). Erweitern den Vegan-Pool für Nutzer
  // die "Faux Meat"-Variation wollen statt rein Tofu/Hülsenfrüchte. Diese Produkte sind in
  // Coles/Woolworths AU breit verfügbar (v2food, Linda McCartney, Birds Eye Green Cuisine,
  // Beyond Meat etc.) — Generic-Naming, User wählt seine Marke. Cooling 'high' weil die
  // meisten Plant-Convenience-Produkte gekühlt verkauft werden und ähnlich kurz halten wie
  // echtes Frischfleisch. Generator-Logik (containsFreshMeat) klassifiziert sie aber NICHT
  // als Frischfleisch — sie blockieren also keinen Cluster-Slot.

  {id:'f14',cat:'f',icon:'🌭',
   name:'Vegan sausages with baked beans on toast',
   time:'12 min',tools:'1 pan',kcal:'~720 kcal/person',
   diet:'vegan',cooling:'high',effort:'easy',burners:1,
   ing:[['Vegan sausages (e.g. v2food, Linda McCartney)','3/person'],['Baked beans (canned)','0.5 × 400g can/person'],['Sandwich bread','2 slices/person'],['Vegan butter','15g (for both)'],['Tomato sauce','1 tbsp/person to serve'],['Spring onion','1/person'],['Salt & pepper','to taste']],
   steps:['Heat pan medium with 1 tbsp oil. Add vegan sausages, fry 6–8 min, turning occasionally, until browned all over.','Push sausages to one side. Pour baked beans into the empty space, warm through 3 min, stirring.','Toast bread directly in the pan or in a separate pan/over coals. Spread with vegan butter.','Plate: toast on the bottom, beans poured over, sausages stacked alongside.','Garnish with spring onions, dollop of tomato sauce. Pepper.'],
   tip:'Aussie pub-style brekkie, fully plant-based. Most supermarket vegan snags need refrigeration — eat within 4–5 days of Cairns shop or first cluster from Bamaga. v2food breakfast snags or Linda McCartney red onion + rosemary are the standout brands. Pre-grilled at the campfire works great too.'},

  {id:'f15',cat:'f',icon:'🌯',
   name:'Plant-based bacon and avocado breakfast wrap',
   time:'10 min',tools:'1 pan',kcal:'~750 kcal/person',
   diet:'vegan',cooling:'high',effort:'easy',burners:1,
   ing:[['Plant-based bacon strips (e.g. Suzy Spoon, Sunfed)','5 strips/person'],['Tortilla wraps','1/person'],['Avocado','0.5/person, mashed'],['Tomato','0.5/person, sliced'],['Vegan cheese, grated (optional)','30g/person'],['Olive oil','1 tbsp'],['BBQ sauce','1 tbsp/person'],['Lemon juice','1 tbsp'],['Salt & pepper','to taste']],
   steps:['Heat olive oil in pan over medium-high. Lay plant-based bacon strips flat, fry 2–3 min/side until edges crisp and dark.','Push bacon to side. Warm tortilla in the empty space 30 sec/side.','Mash avocado in a bowl with lemon, salt, pepper.','Build: tortilla, avocado spread, hot sauce, plant-bacon strips, tomato slices, vegan cheese if using.','Roll up tightly, cut diagonally. Serve hot.'],
   tip:'Plant-bacon hits the smoky-salty notes that vegans usually miss in brekkie. Suzy Spoon\'s Vegetarian Butcher (NSW) or Sunfed Chicken Free Bacon are both solid. Pan needs to be hot — plant-bacon won\'t crisp on a low flame. Add scrambled tofu (see f12) for extra protein-loaded version.'},

  // ── GLUTEN-FREE / ALLERGY-DEFENSIVE BREAKFASTS ──
  // Strategisch designed: keine Weizen-Produkte, minimal Nüsse (oder als topping),
  // dairy-free möglich. Schließt die Zöliakie-Lücke (vorher: 0 GF-Frühstücke in
  // jeder Diät) und verstärkt den dünnen Vegan-Breakfast-Pool.

  {id:'f16',cat:'f',icon:'🥥',
   name:'Coconut chia pudding with mango and toasted coconut',
   time:'10 min (+ overnight)',tools:'1 bowl',kcal:'~550 kcal/person',
   diet:'vegan',cooling:'medium',effort:'easy',burners:0,
   ing:[['Chia seeds','3 tbsp/person'],['Coconut milk','250ml/person'],['Maple syrup','22ml/person'],['Mango','0.5/person, diced'],['Banana','0.5/person, sliced (optional)'],['Shredded coconut','2 tbsp/person, toasted'],['Lime zest','0.5 lime (for both)'],['Salt','pinch']],
   steps:['Night before: whisk chia + coconut milk + maple syrup + vanilla + salt in a sealable container. Whisk again after 5 min to break up clumps. Cover, fridge overnight (or 4 hrs minimum).','Morning: toast shredded coconut in a DRY pan 2 min over medium, shaking constantly until golden. Cool.','Stir pudding — should be thick like rice pudding. If too thick, splash more coconut milk.','Top each bowl with diced mango, banana slices, toasted coconut, lime zest. Drizzle more maple syrup if you want sweeter.'],
   tip:'Allergy-defensive brekkie at its finest — vegan, gluten-free, soy-free, nut-free, egg-free. The chia gel needs hours to set, so this is a "prep at dinner, eat at sunrise" deal. Canned coconut milk = creamier; UHT in tetra = lighter. Frozen mango works if fresh isn\'t available (Bamaga has frozen). Toasted coconut is non-negotiable — it\'s the texture contrast that makes the bowl.'},

  {id:'f17',cat:'f',icon:'🍓',
   name:'Quinoa breakfast bowl with berries and yogurt',
   time:'20 min',tools:'1 pot',kcal:'~520 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'easy',burners:1,
   ing:[['Quinoa','60g/person, rinsed'],['Coconut milk','200ml/person'],['Maple syrup','22ml/person'],['Greek yogurt','100g/person'],['Mixed berries','100g/person'],['Pumpkin seeds','1 tbsp/person'],['Salt','pinch']],
   steps:['Toast quinoa in a dry pot over medium 2 min until nutty-smelling — boosts flavour, takes 2 min, worth it.','Add coconut/oat milk + cinnamon + maple syrup + vanilla + salt + 100ml water/person. Bring to gentle simmer.','Cover, cook on low 12 min until quinoa absorbs liquid and grains pop open. Off heat, rest 5 min covered.','Stir to fluff. Divide into bowls. Top with yogurt, berries, seeds.','Drizzle more maple syrup if you want sweeter. Eat warm or chilled.'],
   tip:'Gluten-free, nut-free (seeds are not nuts per allergen-detection — pumpkin/sunflower are safe for tree-nut allergies). Toasting the quinoa first is the small step that separates good from great — raw quinoa tastes grassy, toasted is nutty. Use coconut yogurt to make it fully vegan + dairy-free. Frozen berries are fine — they\'ll thaw on contact with warm quinoa.'},

  {id:'f18',cat:'f',icon:'🌽',
   name:'Mexican egg and black bean skillet with corn tortillas',
   time:'15 min',tools:'1 pan',kcal:'~700 kcal/person',
   diet:'omnivore',cooling:'high',effort:'easy',burners:1,
   ing:[['Eggs','2/person'],['Black beans (canned, drained)','0.25 × 400g can/person'],['Corn tortillas (small)','3/person'],['Cherry tomatoes','100g/person, halved'],['Spring onion','1/person, sliced'],['Avocado','0.5/person'],['Coriander leaves','small handful/person'],['Smoked paprika','1 tsp'],['Cumin','1 tsp'],['Lime','0.5/person'],['Hot sauce','to taste'],['Olive oil','2 tbsp'],['Salt & pepper','to taste']],
   steps:['Heat olive oil in pan over medium. Add black beans + smoked paprika + cumin + salt + 2 tbsp water. Mash some of the beans with a fork. Cook 3 min until heated through and slightly creamy. Push to one side of the pan.','Add cherry tomatoes to the empty space, cook 2 min until blistered.','Make wells in the bean mix, crack eggs straight in. Cover pan, cook 4 min until whites are set, yolks still runny (or longer if you prefer).','Warm tortillas: hold each over the flame 5 sec/side, or warm in a dry pan 30 sec/side. Stack under foil.','Plate the bean+egg skillet straight from the pan. Top with avocado slices, spring onion, coriander, hot sauce. Squeeze lime over everything. Eat with tortillas to scoop.'],
   tip:'Gluten-free thanks to corn tortillas (NOT flour tortillas — read the packet). Huevos rancheros-style breakfast that wakes you up. Pre-shred any leftover cheese on top if you want indulgent. Coles + Woolies both stock La Banderita or Mission corn tortillas — keep them sealed, they dry out fast in dry air.'},

  {id:'f19',cat:'f',icon:'🍠',
   name:'Sweet potato hash with eggs and avocado',
   time:'25 min',tools:'1 pan',kcal:'~750 kcal/person',
   diet:'omnivore',cooling:'high',effort:'easy',burners:1,
   ing:[['Sweet potato','200g/person, diced 1cm'],['Eggs','2/person'],['Red onion','0.5/person, diced'],['Capsicum','0.5/person, diced'],['Garlic','2 cloves, minced'],['Avocado','0.5/person'],['Smoked paprika','1 tsp'],['Cumin','0.5 tsp'],['Chili flakes','pinch'],['Olive oil','3 tbsp'],['Lime juice','1 tbsp'],['Coriander leaves','small handful'],['Salt & pepper','to taste']],
   steps:['Heat olive oil in pan over medium-high. Add sweet potato + salt, spread in single layer. Don\'t stir for 4 min — let one side caramelise.','Toss, cook 4 more min until tender and golden on multiple sides.','Add red onion + capsicum + smoked paprika + cumin + chili flakes. Cook 4 min until veggies soften.','Add garlic last minute, stir 1 min.','Make 2 wells per person in the hash. Crack eggs into them. Cover, cook 4 min until whites set.','Avocado: mash with lime + salt or just slice.','Plate from pan. Top with avocado, coriander. Black pepper generous.'],
   tip:'Gluten-free + dairy-free + nut-free + soy-free — extremely allergen-defensive while still being filling and tasty. Sweet potato is naturally sweet, the smoked paprika + cumin balance it savoury. Cube it small enough (1cm) so it cooks through in time. Add a dash of hot sauce or salsa verde if you have it. Leftover hash is amazing in a wrap for lunch next day.'},

  {id:'m24',cat:'m',icon:'🥪',
   name:'Vegan schnitzel sandwich with slaw',
   time:'15 min',tools:'1 pan',kcal:'~850 kcal/person',
   diet:'vegan',cooling:'high',effort:'easy',burners:1,
   ing:[['Vegan schnitzel (e.g. Plant Vibes, Fry\'s)','1/person'],['Burger bun','1/person'],['White cabbage','80g/person, finely shredded'],['Carrot','0.5/person, grated'],['Vegan mayo','2 tbsp/person'],['Apple cider vinegar','1 tsp/person'],['Pickles','3 slices/person'],['Lettuce','1 handful'],['Vegetable oil','3 tbsp'],['Mustard','1 tsp/person'],['Salt & pepper','to taste']],
   steps:['Slaw first: toss shredded cabbage + carrot with 1 tbsp vegan mayo, vinegar, salt, pepper. Set aside.','Heat oil in pan over medium-high. Fry vegan schnitzels 3–4 min/side until deeply golden and crisp. Drain on paper towel briefly.','Slice bun/sourdough open. Toast cut-side in the pan 30 sec.','Build: bottom slice, mustard, lettuce, schnitzel, pickles, slaw, dollop of remaining vegan mayo, top slice.','Press lightly. Cut in half.'],
   tip:'Crispy schnitzel + crunchy slaw = Aussie pub sandwich, fully plant-based. Plant Vibes Schnitty and Fry\'s Vegan Schnitzel are both crisp-when-fried. Vegan mayo (Praise, Hellmann\'s Vegan, or Best Foods Vegan) is the bind. Skip the lettuce if it\'s wilted — slaw does the same job better.'},

  {id:'m25',cat:'m',icon:'🥪',
   name:'Plant-based BLT with vegan mayo',
   time:'8 min',tools:'1 pan',kcal:'~750 kcal/person',
   diet:'vegan',cooling:'high',effort:'easy',burners:1,
   ing:[['Plant-based bacon strips','5 strips/person'],['Sourdough bread','3 slices/person, toasted'],['Lettuce','3 large leaves/person'],['Tomato','1/person, thickly sliced'],['Vegan mayo','3 tbsp/person'],['Olive oil','1 tbsp'],['Black pepper','generous'],['Salt','to taste']],
   steps:['Heat olive oil in pan medium-high. Fry plant-based bacon 2–3 min/side until crispy at edges.','Toast bread in dry pan or directly over flame, 1 min/side until golden.','Spread vegan mayo generously on all toast slices.','Build double-decker: bottom slice, lettuce, tomato, salt + pepper, plant-bacon, middle slice (mayo down), more lettuce, more tomato, more bacon, top slice.','Press, cut diagonally with a sharp knife.'],
   tip:'The classic BLT format works perfectly for plant-bacon — the salty crisp bacon, juicy tomato, cool lettuce, creamy mayo balance is everything. Salt the tomato slices ~2 min before assembling — pulls out water so the bread doesn\'t go soggy. Vegan mayo is now mainstream — Praise and Best Foods both have great versions.'},

  // ── GLUTEN-FREE / ALLERGY-DEFENSIVE LUNCHES ──
  // Salate, Reisbowls, Hülsenfrucht-Kombos — keine Brot-/Pasta-Basis. Erweitert
  // primär den omnivore-GF-Pool (vorher: 4 von 25) und vegan-GF (vorher: 0 von 9).

  {id:'m26',cat:'m',icon:'🥗',
   name:'Greek chicken salad with feta and olives',
   time:'15 min',tools:'1 pan',kcal:'~700 kcal/person',
   diet:'omnivore',cooling:'high',effort:'easy',burners:1,
   ing:[['Chicken breast','180g/person, sliced'],['Mixed lettuce','100g/person'],['Cherry tomatoes','150g/person, halved'],['Cucumber','0.5/person, diced'],['Red onion','0.25/person, thinly sliced'],['Feta','60g/person, crumbled'],['Kalamata olives','40g/person'],['Olive oil','4 tbsp'],['Lemon juice','2 tbsp/person'],['Mixed dried herbs','1 tsp'],['Garlic','2 cloves, minced'],['Red wine vinegar','1 tbsp'],['Salt & pepper','to taste']],
   steps:['Marinade chicken: toss sliced chicken with 1 tbsp olive oil, oregano, garlic, salt, pepper. Rest 5 min.','Heat pan medium-high with 2 tbsp olive oil. Cook chicken 3 min/side until golden and cooked through (165°F internal). Rest 2 min on a plate.','Dressing: whisk remaining olive oil + lemon juice + red wine vinegar + salt + pepper in a small jar or bowl.','Assemble each bowl: lettuce as base, then tomatoes, cucumber, red onion, feta, olives.','Top with warm sliced chicken. Drizzle dressing generously, more oregano on top.'],
   tip:'Gluten-free, nut-free, soy-free — and tastes like a Greek tavern lunch. The chicken can be batch-cooked at dinner the night before (cold chicken is fine here too). Marinade is the key — bland chicken kills the dish. Real Greek feta (made from sheep milk) is salty and crumbly; cow feta is milder. Read the label.'},

  {id:'m27',cat:'m',icon:'🐟',
   name:'Mediterranean tuna and white bean salad',
   time:'10 min',tools:'1 bowl',kcal:'~650 kcal/person',
   diet:'omnivore',cooling:'low',effort:'easy',burners:0,
   ing:[['Tuna in oil','185g can/person, drained'],['Cannellini beans (canned)','150g/person, drained'],['Cherry tomatoes','120g/person, halved'],['Red onion','0.25/person, finely diced'],['Cucumber','0.5/person, diced'],['Capers','1 tbsp/person, drained'],['Parsley','small handful'],['Lemon juice','2 tbsp/person'],['Olive oil','6 tbsp'],['Dijon mustard','1 tsp/person'],['Garlic','1 clove, minced'],['Salt & pepper','to taste']],
   steps:['Drain tuna and beans well. Tip into a large bowl.','Add cherry tomatoes, red onion, cucumber, capers, parsley.','Dressing: whisk olive oil + lemon juice + Dijon + garlic + salt + pepper in a small bowl.','Pour dressing over the salad, toss gently to combine — try not to break up the tuna chunks.','Rest 5 min for flavours to meld. Plate and serve.'],
   tip:'Shelf-stable masterpiece — every ingredient (except cucumber/tomato) keeps for weeks in the camper. Zero burners needed. Naturally gluten-free. Tuna in olive oil > tuna in brine — much more flavour. Sirena and John West both have decent options at Coles. This holds well in a sealed container for 24h — perfect prep-ahead lunch.'},

  {id:'m28',cat:'m',icon:'🍣',
   name:'Cucumber-avocado sushi rice bowl',
   time:'25 min',tools:'1 pot',kcal:'~720 kcal/person',
   diet:'vegan',cooling:'low',effort:'easy',burners:1,
   ing:[['Sushi rice','100g/person, rinsed'],['Cucumber','1/person, julienned'],['Avocado','1/person, sliced'],['Carrot','0.5/person, julienned'],['Edamame (frozen, shelled)','60g/person'],['Nori sheets','1/person, cut into strips'],['Sesame seeds','1 tbsp/person'],['Spring onion','1/person, sliced'],['Rice vinegar','2 tbsp/person'],['Tamari','2 tbsp/person'],['Sugar','1 tsp/person'],['Sesame oil','1 tsp/person'],['Pickled ginger (optional)','1 tbsp/person'],['Sriracha','to taste'],['Salt','to taste']],
   steps:['Cook rice: 100g rice + 130ml water/person in a pot. Boil, lid on, low 12 min. Rest 10 min covered (don\'t peek).','Meanwhile: cook edamame in salted boiling water 3 min, drain.','Sushi vinegar mix: heat rice vinegar + sugar + pinch of salt 30 sec until sugar dissolves (or shake in a jar).','When rice is done, transfer to a wide bowl, drizzle sushi vinegar over while still hot, fold gently. Let cool 5 min.','Sauce: mix tamari + sesame oil + sriracha to taste.','Build each bowl: rice base, then arrange cucumber, carrot, avocado, edamame in sections. Top with sesame seeds, spring onion, nori strips, pickled ginger.','Drizzle the sauce over. Eat with the toppings mixed in.'],
   tip:'Gluten-free if you use TAMARI not regular soy sauce (read the label — most tamari is GF). Vegan, nut-free, dairy-free. Sushi rice is starchy and sticks together — that\'s the point. Don\'t substitute with basmati or long-grain. Frozen edamame is in every supermarket frozen veg section. Add silken tofu cubes or canned chickpeas for extra protein.'},

  {id:'a33',cat:'a',leftovers:true,icon:'🍝',
   name:'Plant-based bolognese with spaghetti',
   time:'25 min',tools:'1 pot + 1 pan',kcal:'~1050 kcal/person',
   diet:'vegan',cooling:'high',effort:'easy',burners:2,
   ing:[['Spaghetti','150g/person'],['Plant-based mince (e.g. v2food, Beyond, Birds Eye)','150g/person'],['Onion','1, diced'],['Garlic','3 cloves'],['Diced tomatoes (canned)','1 × 400g can'],['Tomato paste','2 tbsp'],['Olive oil','3 tbsp'],['Soy sauce','1 tbsp'],['Mixed dried herbs','1 tsp'],['Chili flakes','0.5 tsp'],['Nutritional yeast','2 tbsp/person to serve'],['Salt & pepper','to taste']],
   steps:['Burner 1 (pot): Bring large pot of well-salted water to boil. Cook spaghetti al dente per packet (9–11 min). SAVE 1 cup pasta water before draining.','Burner 2 (pan): Heat 2 tbsp olive oil. Sauté onion 4 min until translucent. Add garlic 1 min.','Crumble in plant-based mince. Brown over high heat 5–6 min, breaking up with a spoon — let it caramelise at edges (= deeper flavour).','Stir in tomato paste, oregano, basil, chili — toast 1 min. Add canned tomatoes, soy sauce, salt + pepper.','Simmer 10 min, stirring occasionally. Loosen with pasta water if too thick.','Toss drained pasta into the sauce. Plate, top generously with nutritional yeast.'],
   tip:'Plant-mince behaves almost identically to beef mince in bolognese — same caramelisation, same texture. v2food Mince is the closest to beef; Beyond is more of a "burger-like" character; Birds Eye Green Cuisine is the budget pick. Soy sauce + tomato paste = umami stack that compensates for the missing meat depth.'},

  {id:'a34',cat:'a',icon:'🍝',
   name:'Vegan creamy mushroom pasta with plant cream',
   time:'20 min',tools:'1 pot + 1 pan',kcal:'~1000 kcal/person',
   diet:'vegan',cooling:'medium',effort:'easy',burners:2,
   ing:[['Tagliatelle','150g/person'],['Mushrooms','200g/person, sliced'],['Plant cream','150ml/person'],['Garlic','4 cloves, sliced'],['Onion','0.5, finely diced'],['Vegan butter','30g (for both)'],['Nutritional yeast','2 tbsp/person'],['Mixed dried herbs','1 tsp'],['White wine (optional)','100ml'],['Lemon juice','1 tbsp'],['Vegan parmesan (optional)','20g/person'],['Salt & pepper','generous'],['Parsley','1 tbsp']],
   steps:['Burner 1 (pot): Cook pasta al dente in salted water. SAVE 1 cup pasta water before draining.','Burner 2 (pan): Melt vegan butter on medium-high. Add mushrooms in a single layer, DON\'T stir for 3 min — let them brown deeply. Then toss, cook 4 min more.','Add onion, fry 2 min until soft. Add garlic + thyme, 1 min more.','Pour in white wine if using, scrape browned bits off the pan, simmer 1 min until almost evaporated.','Pour in plant cream + nutritional yeast. Simmer 3 min until slightly thickened. Salt + pepper generously.','Toss drained pasta into the sauce. Loosen with pasta water if needed. Lemon squeeze, parsley, vegan parmesan on top.'],
   tip:'Oat cream (Oatly) is the closest match to dairy cream — silky, neutral. Soy cream (Vitasoy) is fine but slightly beanier. The mushrooms MUST brown without crowding — moisture release = grey mushrooms. Cook in batches if your pan is small. Nutritional yeast does the parmesan-cheesy job — don\'t skip it.'},

  {id:'a35',cat:'a',icon:'🍽',
   name:'Vegan schnitzel with mash and mushroom gravy',
   time:'30 min',tools:'2 pans + 1 pot',kcal:'~1100 kcal/person',
   diet:'vegan',cooling:'high',effort:'medium',burners:3,
   ing:[['Vegan schnitzel','1–2/person'],['Potatoes','300g/person, peeled, cubed'],['Plant cream','50ml/person (for mash)'],['Vegan butter','40g/person (mash + gravy)'],['Mushrooms','100g/person, sliced'],['Onion','0.5/person, diced'],['Garlic','2 cloves'],['Flour','10g/person (for gravy)'],['Vegetable stock cube','1 + 300ml water'],['Soy sauce','1 tbsp'],['Mixed dried herbs','0.5 tsp'],['Vegetable oil','3 tbsp'],['Lemon wedges','to serve'],['Salt & pepper','to taste']],
   steps:['Burner 1 (pot): Boil potatoes in salted water 15 min until fork-tender. Drain. Mash with vegan butter + plant cream + salt + pepper. Cover, set aside.','Burner 2 (pan): Heat vegetable oil medium-high. Fry vegan schnitzels 3–4 min/side until deeply golden and crisp. Hold warm in foil.','Burner 3 (pan): Melt vegan butter. Add mushrooms, sear 4 min until browned. Add onion + garlic + thyme, 2 min more.','Sprinkle flour over the mushrooms, stir to coat — toast 1 min. Slowly pour in stock + soy sauce, whisking. Simmer 3 min until thickened. Salt + pepper.','Plate: mound of mash, schnitzel leaning against it, gravy spooned generously over. Lemon wedge on the side.'],
   tip:'Sunday-roast vegan dinner — needs 3 burners to land everything hot. Solo cook? Mash first (covers warm), then schnitzel, then gravy. Plant Vibes makes a massive Schnitty perfect for this. Lemon wedge cuts the richness — don\'t skip. The gravy works without flour too (just simmer down longer) if you prefer gluten-free.'},

  // ── GLUTEN-FREE / ALLERGY-DEFENSIVE DINNERS ──
  // Reis-, Curry- und Stir-Fry-Basis statt Pasta/Brot. Stärkt primär die
  // vegetarian-Dinner-Lücke (vorher: 7 regulär), die vegan-1-Burner-Lücke und
  // die GF-Coverage über alle Diäten.

  {id:'a45',cat:'a',icon:'🌶',
   name:'Thai basil chicken stir-fry over jasmine rice',
   time:'25 min',tools:'1 pot + 1 pan',kcal:'~950 kcal/person',
   diet:'omnivore',cooling:'high',effort:'easy',burners:2,parallel:true,
   ing:[['Chicken thighs','200g/person, sliced thin'],['Jasmine rice','100g/person'],['Basil','small handful/person'],['Garlic','4 cloves, minced'],['Red chili','1, sliced (more for spicy)'],['Green beans','80g/person, cut 5cm'],['Red capsicum','0.5/person, sliced'],['Shallots','2, sliced'],['Tamari','3 tbsp/person'],['Oyster sauce','2 tbsp/person'],['Fish sauce','1 tbsp/person'],['Sugar','1 tsp'],['Vegetable oil','3 tbsp'],['Lime wedges','to serve']],
   steps:['Burner 1 (pot): Cook jasmine rice — 100g + 150ml water/person. Boil, lid on, low 12 min. Rest 10 min covered.','Burner 2 (pan or wok, screaming hot): Heat 2 tbsp oil. Add chicken in single layer. Don\'t stir for 90 sec — let it sear. Toss, cook 2 min more until almost cooked through. Remove to plate.','Same pan: 1 tbsp more oil. Add shallots + garlic + chili, 30 sec.','Add long beans + capsicum, stir-fry 3 min (still some crunch).','Return chicken to pan. Add tamari + oyster sauce + fish sauce + sugar. Toss 1 min.','Off heat: tear basil leaves in, toss until just wilted. Don\'t cook the basil — heat from the pan is enough.','Serve over jasmine rice. Lime wedges on the side.'],
   tip:'Gluten-free if you use TAMARI not soy sauce — and check the oyster sauce label (some are GF, e.g. Kikkoman tamari versions). Dairy-free, nut-free, egg-free, soy-free if you skip tamari (but it loses umami). The "screaming hot wok" is the secret — gentle heat = stir-FRY becomes stir-STEW. Thai basil from Asian grocers has anise notes; regular Italian basil works in a pinch.'},

  {id:'a46',cat:'a',icon:'🌯',
   name:'Chicken fajita bowls with avocado crema',
   time:'25 min',tools:'1 pan',kcal:'~900 kcal/person',
   diet:'omnivore',cooling:'high',effort:'easy',burners:1,
   ing:[['Chicken breast','200g/person, sliced'],['Long-grain rice','80g/person'],['Black beans (canned, drained)','0.25 × 400g can/person'],['Capsicum','1 total/person, sliced'],['Onion','0.5/person, sliced'],['Avocado','0.5/person'],['Sour cream','30g/person'],['Lime','1/person'],['Garlic','3 cloves, minced'],['Smoked paprika','3 tsp'],['Cumin','2 tsp'],['Chili flakes','1 tsp'],['Olive oil','3 tbsp'],['Coriander leaves','small handful'],['Salt & pepper','to taste']],
   steps:['Cook rice first or in parallel if you have 2 burners: 80g rice + 130ml water + pinch of salt per person, boil, low 12 min, rest 10.','Marinade chicken: toss with 1 tbsp olive oil, half the smoked paprika, cumin, chili, garlic, salt, pepper. Rest 5 min.','Heat 2 tbsp oil in pan medium-high. Sear chicken 3 min/side until golden and cooked. Remove.','Same pan: 1 tbsp oil. Add onion + capsicum + remaining spices. Cook 6 min until veggies softened and edges charred. Salt.','Black beans: drain, warm in microwave or in the pan for 1 min with veggies.','Crema: mash avocado in a bowl with sour cream + half a lime\'s juice + salt.','Build bowls: rice base, beans, fajita veggies, sliced chicken on top. Dollop crema, scatter coriander. Lime wedge.'],
   tip:'Naturally gluten-free (skip the tortillas — bowl format). The crema sub: use dairy-free coconut yogurt + mashed avocado for dairy-free version. The smoked paprika is the workhorse spice — don\'t skip. Pre-cooked rice from a packet (e.g. SunRice microwave pouches) saves 15 min on a tired day. Kids love this — let them assemble their own bowl.'},

  {id:'a47',cat:'a',leftovers:true,icon:'🍛',
   name:'Chana masala with coconut basmati rice',
   time:'30 min',tools:'1 pot + 1 pan',kcal:'~850 kcal/person',
   diet:'vegan',cooling:'low',effort:'easy',burners:2,
   ing:[['Chickpeas (canned, drained)','0.6 × 400g can/person'],['Basmati rice','90g/person'],['Coconut milk','100ml/person (for rice)'],['Onion','1, diced'],['Garlic','4 cloves, minced'],['Ginger','2cm piece, grated'],['Diced tomatoes (canned)','1 × 400g can (for both)'],['Tomato paste','2 tbsp'],['Curry powder','4 tsp'],['Cumin','2 tsp'],['Chili flakes','1 tsp'],['Vegetable oil','3 tbsp'],['Lemon juice','1 tbsp/person'],['Coriander leaves','small handful'],['Salt','to taste']],
   steps:['Burner 1 (pot): Combine basmati + coconut milk + 150ml water/person + pinch salt. Boil, lid on, low 12 min. Rest 10 min covered. Fluff with fork.','Burner 2 (pan): Heat oil medium-high. Sauté onion 5 min until golden at edges.','Add garlic + ginger, 1 min. Add all spices (garam masala, cumin, coriander, turmeric, chili), toast 30 sec — should smell intensely fragrant.','Stir in tomato paste, 1 min. Pour in diced tomatoes, simmer 5 min until it darkens and oil starts to separate (= properly cooked).','Add chickpeas, 200ml water, salt. Simmer 8 min, mashing some chickpeas with the back of a spoon to thicken the sauce.','Off heat: lemon juice + fresh coriander. Taste, adjust salt.','Serve chana masala over coconut rice.'],
   tip:'The Indian comfort-food classic — vegan, gluten-free, nut-free, soy-free, dairy-free. The trick is TOASTING the spices in oil (Indian "tadka") — raw spices taste flat, toasted ones bloom. Coconut basmati > plain rice for this dish — the sweetness balances the heat. Leftovers are even better next day. Add a swirl of coconut yogurt at the end if you want richness.'},

  {id:'a48',cat:'a',leftovers:true,icon:'🥥',
   name:'Thai-style vegetable green curry with jasmine rice',
   time:'25 min',tools:'1 pot + 1 pan',kcal:'~800 kcal/person',
   diet:'vegan',cooling:'low',effort:'easy',burners:2,
   ing:[['Curry powder','6 tbsp'],['Coconut milk (full-fat)','400ml/person'],['Jasmine rice','100g/person'],['Firm tofu','150g/person, cubed (optional)'],['Bamboo shoots (canned)','100g/person, drained'],['Green beans','80g/person'],['Red capsicum','0.5/person, sliced'],['Eggplant','0.5/person, chunked'],['Basil','small handful/person'],['Tamari','1.5 tbsp/person'],['Brown sugar','1 tsp/person'],['Vegetable oil','2 tbsp'],['Lime','0.5/person'],['Salt','to taste']],
   steps:['Burner 1 (pot): Cook jasmine rice — 100g + 150ml water/person. Boil, lid on, low 12 min. Rest 10 covered.','Burner 2 (pan or wok): Heat oil medium. Fry tofu cubes 3 min/side until golden if using. Remove.','Same pan: scoop 3 tbsp of the thick coconut cream from the top of the coconut milk can. Heat until it starts to sizzle. Add curry paste, fry 2 min until intensely aromatic (this is the flavour base — don\'t rush).','Pour in remaining coconut milk. Bring to gentle simmer.','Add eggplant/zucchini + capsicum, simmer 5 min. Add long beans + bamboo shoots, 3 min more.','Add tamari + sugar + tofu. Simmer 2 min. Taste — adjust salt.','Off heat: tear Thai basil in. Squeeze lime over.','Serve over jasmine rice. Extra lime on the side.'],
   tip:'Gluten-free, vegan, nut-free, dairy-free — and one of the great cuisines for restrictive diets. Most Thai curry pastes ARE vegan (check label — some have shrimp paste, e.g. Mae Ploy). Ayam Green Curry Paste at Coles is reliably vegan. Fry the paste in coconut CREAM (not water) first — that\'s how Thai cooks build flavour. Long beans = "snake beans" at Asian grocers, regular green beans are fine.'},

  {id:'a49',cat:'a',leftovers:true,icon:'🍆',
   name:'Greek-style vegetable moussaka with béchamel',
   time:'50 min',tools:'2 pans + 1 pot',kcal:'~1050 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'medium',burners:3,
   ing:[['Eggplant','1 large/person, sliced 1cm rounds'],['Potatoes','200g/person, peeled, sliced 0.5cm'],['Lentils','150g/person, drained'],['Onion','1, diced'],['Garlic','4 cloves'],['Diced tomatoes (canned)','1 × 400g can (for both)'],['Tomato paste','2 tbsp'],['Mixed dried herbs','1 tsp'],['Red wine (optional)','100ml'],['Butter','40g/person (for béchamel)'],['Flour','30g/person'],['UHT milk','300ml/person'],['Parmesan','40g/person, grated'],['Eggs','1 (for béchamel)'],['Olive oil','6 tbsp'],['Salt & pepper','generous']],
   steps:['Eggplant prep: salt slices, rest 15 min, pat dry.','Burner 1 (pan): Heat 3 tbsp olive oil hot. Fry eggplant slices in batches 2 min/side until golden. Drain.','Burner 2 (pan): Heat 2 tbsp olive oil. Sauté onion 5 min. Add garlic + cinnamon + oregano, 1 min. Add tomato paste, 1 min.','Add lentils, diced tomatoes, red wine if using, salt + pepper. Simmer 10 min until thick.','Burner 3 (pan): Boil potato slices in salted water 5 min — just par-cooked. Drain.','Béchamel: Same Burner 3, melt butter. Whisk in flour, cook 1 min. Slowly whisk in milk. Simmer 5 min until thick, whisking. Off heat: stir in cheese + nutmeg + salt + pepper + beaten egg (works the binding).','Layer in the deep pan (or whatever your biggest pan is): potatoes on the bottom, lentil sauce, eggplant slices, more sauce, more eggplant. Pour béchamel evenly on top.','Cover with lid or foil, low heat 10 min until top sets and bubbles at edges. Rest 5 min before serving.'],
   tip:'Vegetarian, can be made gluten-free with a GF flour blend in the béchamel. The lentil-tomato sauce replaces the traditional minced lamb — gives the same hearty depth thanks to cinnamon and oregano (the Greek flavour signature). Don\'t skip salting the eggplant — without it, the dish is bitter and oily. Best on a layover day, you want to take your time. Reheats beautifully.'},

  {id:'a50',cat:'a',icon:'🍠',
   name:'Pan-fried sweet potato fries with veg and your choice of meat',
   time:'30 min',tools:'2 pans',kcal:'~1100 kcal/person',
   diet:'omnivore',cooling:'high',effort:'easy',burners:2,
   ing:[['Sweet potato','350g/person, cut into 1cm fries'],['Beef steak','250g/person'],['Broccoli','150g/person, cut into florets'],['Capsicum','0.5/person, sliced'],['Onion','0.5/person, sliced'],['Crème fraîche','80g/person'],['Lemon juice','1 tbsp/person (for dip)'],['Garlic','2 cloves, minced (optional, for dip)'],['Olive oil','5 tbsp'],['Smoked paprika','1 tsp'],['Mixed dried herbs','0.5 tsp'],['Butter','20g/person (for meat finish)'],['Salt','generous (mind. 1 tsp for sweet potato + dip)'],['Black pepper','generous']],
   steps:['Dip first (do it cold, flavours marry): mix crème fraîche + lemon juice + 0.5 tsp salt + garlic (if using) + pinch of pepper. Cover, rest in cooler while you cook.','Burner 1 (pan, medium-high): Heat 2 tbsp olive oil. Add sweet potato fries in single layer with salt + smoked paprika. Don\'t stir for 4 min — let one side crust. Toss, cook 14–16 min total, tossing every 3–4 min, until deeply golden outside and tender inside.','Burner 2 (pan, medium-high): Heat 1 tbsp olive oil. Add onion, 2 min. Add capsicum + broccoli + thyme, 6 min, stirring occasionally. You want some char on the veggies. Salt + pepper.','Push veggies to one side of Pan 2 (or remove and cover with foil). Crank heat. Add 1 tbsp olive oil + meat. Sear 2–4 min/side depending on cut and thickness (steak 3 min/side medium-rare, chicken 4 min/side, lamb cutlets 3 min/side medium, pork 4 min/side cooked). In last minute drop butter in, baste meat.','Rest meat 3–5 min on a board (mandatory for juicy results). Slice against the grain.','Plate: sweet potato fries on one side, veggies, sliced meat on top. Big dollop of lemon-crème-fraîche dip in the middle for dipping everything.'],
   tip:'Flexible camper-classic — pick your meat by what\'s freshest in the cooler. Day 1–2 of the meat cluster: steak or lamb (highest value, eat first). Day 3+: chicken or pork. The lemon-crème-fraîche dip is the unexpected hero — bright, cool, salty, cuts the richness of fried sweet potato. Lemon concentrate (PJ\'s or Spiral Foods at Coles) is shelf-stable and lasts forever — buy a small bottle for the trip, use it for dressings too. Sweet potato needs SPACE in the pan to crisp — cook in two batches if crowded. Add a sprinkle of chili flakes to the fries if you like heat.'},

  // ── SPECIAL OCCASION DINNERS ──────────────
  // Premium-Rezepte für Layover-Tage und Lagerfeuer-Abende. Tag `occasion: 'special'`
  // wird vom Generator separat behandelt — pro Trip max 0–3 Specials je nach Trip-Länge,
  // max 1 pro Cluster, in der Cluster-Mitte platziert. Specials erscheinen NICHT im
  // regulären Round-Robin, blockieren also keine Standard-Slots.
  // Pro Diät 2 Specials, damit User aller Präferenzen Premium-Variation kriegen.

  {id:'a36',cat:'a',icon:'🥩',
   name:'Ribeye steak with garlic butter and crispy wedges',
   time:'30 min',tools:'2 pans + 1 pot',kcal:'~1300 kcal/person',
   diet:'omnivore',cooling:'high',effort:'medium',burners:3,occasion:'special',
   ing:[['Beef ribeye steak','300g/person'],['Potatoes','300g/person, cut into wedges'],['Butter','40g/person'],['Garlic','4 cloves, smashed'],['Mixed dried herbs','1 tsp'],['Cherry tomatoes (on the vine)','100g/person'],['Olive oil','4 tbsp'],['Smoked paprika','1 tsp'],['Lemon wedges','to serve'],['Salt','to taste'],['Black pepper','generous']],
   steps:['Take steaks out of cooler 30 min before cooking — room temp = even cook. Salt heavily.','Burner 1 (pot/pan): Toss potato wedges with 2 tbsp olive oil, paprika, salt. Pan-roast over medium 18–20 min, turning occasionally, until deeply golden and crisp.','Burner 2 (cast-iron or heavy pan): Heat dry, screaming hot. Brush steaks with olive oil, lay in pan. 3 min UNDISTURBED for the crust. Flip, 2–3 min for medium-rare (4 min for medium).','In the last 1 min: drop butter, smashed garlic, thyme into the pan. Tilt pan, baste steak continuously with the foaming garlic butter. Magic happens here.','Burner 3 (pan): Heat splash of olive oil hot. Throw cherry tomatoes (still on vine) in for 2 min until skins blister. Salt.','Rest steaks 5 min on a board (mandatory — juices redistribute). Slice against the grain.','Plate: wedges, sliced steak with garlic butter spooned over, blistered tomatoes, lemon wedge. Flaky salt + pepper at the table.'],
   tip:'Special occasion meal — splurge on quality ribeye in Cairns (~$25/person, marbled, 2.5cm thick). Cast-iron pan if you packed one is ideal — heavy + retains heat. The garlic-butter baste is non-negotiable, this is what makes restaurant steak. Resting is what separates good steak from juicy steak. Pair with a cold beer.'},

  {id:'a37',cat:'a',icon:'🍖',
   name:'BBQ pork ribs with corn on the cob and slaw',
   time:'90 min',tools:'2 pans + 1 pot',kcal:'~1400 kcal/person',
   diet:'omnivore',cooling:'high',effort:'hard',burners:3,occasion:'special',
   ing:[['Pork ribs (American-style, in racks)','400g/person'],['Corn on the cob','1/person'],['White cabbage','100g/person, finely shredded'],['Carrot','0.5/person, grated'],['Mayo','3 tbsp/person'],['Apple cider vinegar','2 tbsp (for both)'],['Brown sugar','3 tbsp (for both, for rub)'],['Smoked paprika','2 tbsp'],['Cumin','1 tbsp'],['BBQ sauce (smoky)','5 tbsp/person'],['Apple juice','200ml (for steaming)'],['Butter','30g/person (for corn)'],['Salt & pepper','to taste']],
   steps:['Slaw first (do it cold): toss shredded cabbage + carrot with mayo, vinegar, salt, pepper. Rest in cooler 30 min minimum.','Mix dry rub: brown sugar + paprika + garlic + onion + cumin + 1 tsp salt + 1 tsp pepper. Massage all over the ribs.','Burner 1 (deep pan with lid or foil): Place ribs meat-side down. Pour in apple juice/beer + 200ml water. Cover tightly with foil. Steam-braise 60 min on low — meat should be pull-tender.','Burner 2 (pot): Boil corn in salted water 6–8 min until tender. Drain, smother with butter + salt.','Burner 3 (pan, hot): Take ribs out of the steam, brush generously with BBQ sauce. Sear in hot pan 3 min/side, brushing with more sauce, until sticky and charred at edges.','Cut ribs between bones. Serve piled high with corn + slaw + extra BBQ sauce on the side. Wet-wipes ready.'],
   tip:'90-min effort but it\'s the camping-trip highlight meal — pork ribs are cheap (~$10/person at Coles), the rub does the heavy lifting. Steam-then-sear is the camper\'s shortcut to fall-off-the-bone ribs (real BBQ would be 6+ hours over coals). Aussie BBQ sauce brands: Bull\'s-Eye, Stubb\'s, or homemade with ketchup + brown sugar + Worcestershire.'},

  {id:'a38',cat:'a',icon:'🍆',
   name:'Aubergine parmigiana with garlic toast',
   time:'45 min',tools:'2 pans + 1 pot',kcal:'~1100 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'medium',burners:3,occasion:'special',
   ing:[['Eggplant','1 medium/person, sliced 1cm rounds'],['Mozzarella (vacuum-packed)','120g/person, sliced'],['Parmesan, grated','60g/person'],['Diced tomatoes (canned)','1 × 400g can (for both)'],['Tomato paste','2 tbsp'],['Garlic','5 cloves total (3 for sauce, 2 for toast)'],['Olive oil','6 tbsp'],['Mixed dried herbs','1 tsp'],['Chili flakes','0.5 tsp'],['Sourdough bread','3 thick slices/person'],['Butter','30g/person'],['Sugar','1 tsp (balances sauce)'],['Salt & pepper','to taste']],
   steps:['Aubergine prep: salt the slices generously, rest 15 min on paper towel — pulls out bitterness. Pat dry.','Burner 1 (pan): Heat 4 tbsp olive oil hot. Fry aubergine slices in batches 2 min/side until deeply golden. Drain. Add more oil between batches.','Burner 2 (pan): Heat 2 tbsp olive oil. Sauté 3 chopped garlic cloves 30 sec. Add diced tomatoes, tomato paste, basil, oregano, chili, sugar. Salt + pepper. Simmer 12 min until thick.','Burner 3 (deep pan with lid): Build layers in the deep pan — sauce, aubergine slices, mozzarella slices, parmesan. Repeat 2-3 times. End with cheese on top.','Cover, cook on low 10 min until cheese melts and bubbles at edges.','Garlic toast: mix softened butter with 2 minced garlic cloves + parsley. Spread on bread, toast in dry pan 2 min/side until golden.','Serve parmigiana straight from the pan, garlic toast for sopping up sauce.'],
   tip:'Italian Sunday-lunch indulgence on the road. Salting the aubergine is key — without it, sauce gets bitter and oily. Use the BIG pan (deep, with lid) for layering — improvised "dutch oven" works perfectly. Vacuum-packed mozzarella keeps weeks; if you find buffalo mozz in Cairns, splurge — game changer.'},

  {id:'a39',cat:'a',icon:'🧀',
   name:'Halloumi mezze platter with dips and warm flatbread',
   time:'25 min',tools:'2 pans',kcal:'~1100 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'easy',burners:2,occasion:'special',
   ing:[['Halloumi','200g/person, sliced 1cm thick'],['Pita bread','3/person'],['Hummus (good quality, jarred)','100g/person'],['Tzatziki','80g/person'],['Kalamata olives','60g/person'],['Cherry tomatoes','100g/person'],['Cucumber','0.5/person, sliced'],['Roasted red capsicum (jarred)','60g/person'],['Honey','30ml/person, for halloumi'],['Olive oil','3 tbsp'],['Lemon','0.5/person'],['Mixed dried herbs','1 tsp'],['Black pepper','generous']],
   steps:['Burner 1 (pan, dry): Heat hot. Lay halloumi slices, sear 1.5 min/side until golden-crusted and squeaky-tender. Plate, drizzle hot honey over while still hot — it sizzles into the cheese.','Burner 2 (pan): Warm flatbreads briefly 30 sec/side. Stack under foil to keep soft.','While bread warms: arrange the platter. Center mounds of hummus + tzatziki, surround with olives, tomatoes, cucumber, capsicum.','Add pan-seared halloumi on top. Drizzle olive oil over everything, squeeze lemon, sprinkle za\'atar.','Eat communally — tear bread, scoop dips, build mini-mezze bites. No utensils needed.'],
   tip:'Mediterranean sharing-feast for a layover day. Halloumi-with-hot-honey is the Trojan-horse star — sweet-salty-squeaky combo blows people away. Buy good jarred dips in Cairns (Yalla, Macro, Coles deli) — quality matters here, the dips ARE the meal. Pita warmed in dry pan beats microwave-soft any day.'},

  {id:'a40',cat:'a',icon:'🌮',
   name:'Jackfruit pulled "pork" tacos with all the trimmings',
   time:'35 min',tools:'2 pans + 1 pot',kcal:'~1100 kcal/person',
   diet:'vegan',cooling:'low',effort:'medium',burners:3,occasion:'special',
   ing:[['Young jackfruit (canned in brine, drained)','1 × 400g can/person'],['Soft taco shells','5/person'],['White cabbage','100g/person, shredded'],['Carrot','0.5/person, grated'],['Avocado','1/person'],['Lime','1/person'],['Vegan mayo','3 tbsp/person'],['Coriander leaves','small handful/person'],['Pickled jalapeños','1 tbsp/person'],['Onion','1, diced'],['Garlic','4 cloves'],['Smoked paprika','2 tsp'],['Cumin','2 tsp'],['Brown sugar','1 tbsp'],['BBQ sauce (vegan, e.g. Bull\'s-Eye Original)','4 tbsp/person'],['Apple cider vinegar','1 tbsp'],['Vegetable stock cube','1 + 200ml water'],['Olive oil','3 tbsp'],['Hot sauce (optional)','to taste'],['Salt','to taste']],
   steps:['Drain jackfruit, rinse, squeeze out water. Shred with hands or fork — the chunks fall apart into stringy "pulled pork" texture. This is the magic.','Burner 1 (pan, deep): Heat olive oil medium. Sauté onion 4 min, add garlic 1 min.','Add shredded jackfruit, smoked paprika, cumin, brown sugar — toss to coat, cook 3 min.','Pour in BBQ sauce, vinegar, stock cube + water. Simmer 15 min, stirring, until liquid reduces and jackfruit caramelises. Mash with a spoon to break up further. Salt.','Burner 2 (pot): Quick slaw — toss cabbage + carrot + 2 tbsp vegan mayo + lime juice + salt. Set aside.','Avocado crema: mash avocado in bowl with remaining vegan mayo + lime + salt. Loosen with splash of water if thick.','Burner 3 (pan, dry): Warm tortillas 20 sec/side, stack under foil.','Build at the table: tortilla, jackfruit, slaw, avocado crema, coriander, pickled jalapeños, hot sauce. Squeeze of lime on each.'],
   tip:'Jackfruit "pulled pork" is the holy grail of vegan camping food — canned, shelf-stable, transforms into shredded-meat texture in 30 min. Get the YOUNG/GREEN jackfruit IN BRINE (NOT in syrup — sweet jackfruit is for desserts). Coles/Woolworths have it in the Asian aisle. Make extra — leftovers in tortillas = best lunch next day.'},

  {id:'a41',cat:'a',icon:'🎃',
   name:'Stuffed butternut roast with quinoa, mushrooms and cranberries',
   time:'60 min',tools:'2 pans + 1 pot',kcal:'~1100 kcal/person',
   diet:'vegan',cooling:'low',effort:'medium',burners:3,occasion:'special',
   ing:[['Butternut squash','1 small (~800g)/person, halved lengthwise, seeds out'],['Quinoa','80g/person'],['Mushrooms','150g/person, diced'],['Onion','1, diced'],['Garlic','3 cloves'],['Dried cranberries','40g/person'],['Walnuts','30g/person, chopped'],['Vegetable stock cube','1 + 400ml water'],['Olive oil','5 tbsp'],['Maple syrup','30ml/person'],['Mixed dried herbs','1 tsp'],['Smoked paprika','1 tsp'],['Lemon juice','1 tbsp/person'],['Vegan butter (for finishing)','20g/person'],['Salt & pepper','to taste']],
   steps:['Burner 1 (pan, deep with lid, OR cover with foil): Brush butternut halves with 2 tbsp olive oil + maple syrup + cinnamon + salt. Place cut-side down. Cover, cook on medium-low 25–30 min until tender (knife slides in easily). Flip cut-side up for last 5 min to caramelise.','Burner 2 (pot): Cook quinoa — 80g/person + 1.5× water + crumbled stock cube. Boil, cover, low 12 min, rest 5. Fluff.','Burner 3 (pan): Heat 2 tbsp olive oil hot. Sear mushrooms 4 min until browned, no stirring first 2 min. Add onion + garlic + thyme + paprika, 3 min more.','Combine mushroom mix into quinoa. Stir in cranberries, chopped walnuts, lemon juice. Salt + pepper generously. This is the stuffing.','Mound stuffing into the butternut halves, pressing it in. Drizzle vegan butter over the top, return to the pan with lid 5 min — flavours meld.','Plate each butternut half whole, scoop into the stuffing as you eat. Extra maple syrup drizzle if you like sweet-savoury.'],
   tip:'Vegan Sunday-roast for the campsite — butternut squash transforms into the centerpiece, stuffing carries all the harvest-festival vibes. The cinnamon-maple-roasted butternut + savoury mushroom-cranberry stuffing is the contrast that makes it. Use any leftover stuffing in wraps next day. If your butternut is huge, cook 1 between two people — it\'s a generous serve.'},

  // ── 2-BURNER-SPECIALS ─────────────────────
  // Pro Diät 1 Special das auf dem häufigsten Mietwagen-Camper (2-Burner Stove)
  // läuft. Ohne diese landen omnivore + vegan User mit Standard-Camper bei 0 Specials.
  // a36-a41 sind 3-Burner-Sunday-Roast-Niveau, a42-a44 sind 2-Burner-Bistro-Niveau.

  {id:'a42',cat:'a',icon:'🍷',
   name:'Beef stroganoff with creamy garlic mash',
   time:'40 min',tools:'2 pans + 1 pot',kcal:'~1250 kcal/person',
   diet:'omnivore',cooling:'high',effort:'medium',burners:2,occasion:'special',
   ing:[['Beef rump, sliced thin','250g/person'],['Mushrooms (mixed if you find them)','200g/person, sliced thick'],['Potatoes (for mash)','350g/person, peeled and chunked'],['Onion','1, finely sliced'],['Garlic','5 cloves total (3 for stroganoff, 2 for mash)'],['Sour cream','100g/person'],['Dijon mustard','1 tbsp/person'],['Beef stock cube','1 + 300ml water'],['Smoked paprika','1 tsp'],['Worcestershire sauce','1 tbsp/person'],['Butter','60g/person (40g mash, 20g sear)'],['Olive oil','3 tbsp'],['UHT milk','100ml/person'],['Parsley','small handful, chopped'],['Flour','20g (thickener)'],['Salt & pepper','generous']],
   steps:['Burner 1 (pot): Boil potatoes in salted water 15–18 min until knife-tender.','Burner 2 (deep pan, hot): Heat 2 tbsp olive oil + 20g butter. Sear beef strips in batches 1 min/side — just brown, don\'t cook through. Set aside on plate (juices kept).','Same pan, lower to medium: melt remaining butter, add onion. Cook 5 min until soft. Add 3 minced garlic cloves + paprika, 1 min.','Add mushrooms, crank heat. Cook 6 min until deeply golden — no stirring first 2 min for proper sear.','Sprinkle flour over, stir 1 min. Pour in stock + Worcestershire + mustard. Simmer 4 min until silky.','Off heat: stir in sour cream + beef + resting juices. Warm through gently (DO NOT boil — sour cream splits). Salt + pepper. Parsley.','Mash time: drain potatoes, return to hot pot, dry off 30 sec. Mash with butter + milk + 2 garlic cloves grated raw + salt. Beat until creamy.','Plate: pillow of garlic mash, stroganoff spooned over, more parsley.'],
   tip:'Bistro-classic on a 2-burner stove. Beef stroganoff is the ultimate "looks fancy, easy execution" dish — the trick is searing the beef HOT and fast (overcooked = chewy), and never boiling once the sour cream goes in. Rump is the budget pick at Coles, scotch fillet if you splurge. Garlic mash needs to be aggressively seasoned — bland mash kills the dish. Pair with a glass of red.'},

  {id:'a43',cat:'a',icon:'🍄',
   name:'Wild mushroom risotto with white wine and parmesan',
   time:'35 min',tools:'2 pans + 1 pot',kcal:'~1150 kcal/person',
   diet:'vegetarian',cooling:'medium',effort:'medium',burners:2,occasion:'special',parallel:true,
   ing:[['Arborio rice','90g/person'],['Mushrooms (mixed: button, swiss brown, oyster if found)','250g/person, sliced'],['Dried porcini','10g (for both)'],['White wine (dry)','100ml/person'],['Vegetable stock cube','2 + 1L hot water (for both)'],['Onion','1, finely diced'],['Garlic','4 cloves, minced'],['Parmesan, grated','60g/person'],['Butter','60g/person (cold, cubed)'],['Olive oil','4 tbsp'],['Mixed dried herbs','1 tsp'],['Lemon zest','1/person'],['Parsley','small handful, chopped'],['Black pepper','generous'],['Salt','to taste']],
   steps:['Soak porcini in 200ml hot water 10 min. Strain (keep liquid — gold!), chop porcini.','Burner 1 (pot): Heat stock + porcini liquid. Keep simmering gently — risotto needs HOT stock added ladle by ladle.','Burner 2 (deep pan): Heat 3 tbsp olive oil. Sear fresh mushrooms in batches 4 min until deeply golden (no stirring first 2 min — they need to crust). Add thyme. Salt. Set aside half for garnish.','Same pan, lower heat: 1 tbsp olive oil + onion. 5 min until translucent. Garlic + chopped porcini, 1 min.','Add rice, toast 2 min stirring — grains should turn translucent at edges with white centre.','Pour in wine, stir until almost fully absorbed (sniff: alcohol burns off).','Now the slow build: ladle in HOT stock, one at a time, stirring constantly. Wait until each ladle is absorbed before adding next. 18–20 min total. Test: rice should be al dente — tender outside, slight bite in centre.','Off heat: stir in cold butter + parmesan + lemon zest vigorously. This is the mantecatura — turns it glossy and creamy. Rest 2 min covered.','Plate: spoon risotto, top with reserved seared mushrooms, more parmesan, parsley, black pepper.'],
   tip:'Restaurant-grade risotto on 2 burners — the secret is HOT stock and constant stirring. Don\'t walk away. The mantecatura (vigorous beating in cold butter + parm at the end) is what makes it creamy — sounds fancy, takes 30 seconds. Porcini are pricey ($8 for a small pack at Coles) but transform the dish; skip if budget. Use the cheapest dry white wine — you\'ll drink the rest with dinner.'},

  {id:'a44',cat:'a',icon:'🍜',
   name:'Coconut laksa feast with crispy tofu and noodles',
   time:'40 min',tools:'2 pans + 1 pot',kcal:'~1200 kcal/person',
   diet:'vegan',cooling:'low',effort:'medium',burners:2,occasion:'special',
   ing:[['Firm tofu','200g/person, pressed and cubed'],['Rice noodles','120g/person dry'],['Coconut milk (full-fat)','400ml/person'],['Vegetable stock cube','1 + 400ml water'],['Curry powder','6 tbsp'],['Pak choi','1/person, halved'],['Bean sprouts','60g/person'],['Green beans','80g/person, cut into 5cm pieces'],['Fried shallots (for topping)','2 tbsp/person'],['Coriander leaves','small handful/person'],['Lime','1/person, wedged'],['Mint leaves','small handful/person'],['Red chili, sliced','to taste'],['Cornflour','3 tbsp (for tofu coating)'],['Vegetable oil','5 tbsp (for frying tofu)'],['Soy sauce','2 tbsp'],['Sugar','1 tsp'],['Salt','to taste']],
   steps:['Press tofu firmly (wrap in towel, weight with pot, 10 min). Cube. Toss in cornflour + salt — full coverage.','Burner 1 (deep pan, hot): Heat 5 tbsp oil. Fry tofu cubes in batches 3 min/side until deeply golden and crispy on all sides. Drain on paper. KEY: don\'t crowd or it steams.','Burner 2 (pot): Same pot does noodles + laksa. First boil water, cook noodles per pack (usually 4 min). Drain, rinse cold, set aside.','Wipe pot, return to burner. Heat 1 tbsp of the tofu oil. Add laksa paste, fry 2 min until intensely fragrant — toasting the paste is the flavour foundation.','Pour in coconut milk + stock + sugar + soy. Bring to gentle simmer, 5 min — should reduce slightly and turn rich orange-red.','Add green beans, simmer 3 min. Add bok choy, 2 min more — still has crunch.','Build the bowls: noodles at bottom, ladle laksa broth over (drown them generously), pile crispy tofu on top, then bean sprouts, fried shallots, coriander, mint, chili. Lime wedge on the side.','Slurp loudly — that\'s the test of a good laksa.'],
   tip:'Malaysian street-food feast for the campsite. Vegan laksa is one of the great cuisines for plant-based travel — coconut + laksa paste is already vegan in most brands (check label). The crispy tofu carries the dish — pressing it properly + cornflour crust is non-negotiable, soggy tofu kills it. Fried shallots in a jar (Coles Asian aisle) are the cheat-code topping. Adjust spice with the laksa paste — 3 tbsp is medium, 4 is fiery.'}
];
