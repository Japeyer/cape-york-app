/* Cape York Planner: applies the saved theme before first paint, so dark never flashes light.
   Plain ES5 without modules, own file because the CSP allows no inline script (script-src 'self').
   Key and values as in src/lib/appearance.js: ui_theme_v1 = 'light' | 'dark', missing = system (no attribute).
   The theme-color meta comes before this script and is light (#F3F2EE). It turns dark (#141615) for a saved 'dark'
   or a dark system without a choice. Reads storage only, never writes; without storage the system applies.
   Linked as <script src="/theme-boot.js">: Vite adds the base /cape-york-app/ in dev and build. Its BASE_URL
   placeholder would add it twice in dev. */
(function () {
  var v = null;
  try {
    var THEME_KEY = 'ui_theme_v1';
    v = window.localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark') document.documentElement.setAttribute('data-theme', v);
  } catch (e) { v = null; /* system */ }
  try {
    var dark = v === 'dark' || (v !== 'light' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (dark && meta) meta.setAttribute('content', '#141615');
  } catch (e) { /* system bar stays light */ }
})();
