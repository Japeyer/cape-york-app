/* Cape York Planner: launch splash. A kangaroo jumps in from the left, lands in the middle, crouches and jumps out to
   the right (about 1.5 s). No shadow, no text.
   Plain ES5 without modules, own file because the CSP allows no inline script (script-src 'self'). Linked as the first
   element of <body> (<script src="/splash.js">), so the layer exists before the app renders. Vite adds the base
   /cape-york-app/ in dev and build; its BASE_URL placeholder would add it twice in dev.
   The app has priority: after its first render it calls window.__splashEnde() once, and the layer fades out (180 ms)
   wherever the kangaroo is. Ready before the kangaroo was on screen: the layer goes at once, without a fade. Animation
   over and the app not ready yet: the empty background stays until it is. No call at all (crash before the first
   render): gone after 4 s. A tap or any key skips. Reduced motion: no splash.
   The layer is decorative: aria-hidden, never focused, pointer-events none (a tap only skips, it still reaches the app).
   Colours are the app tokens (src/firma-shared/tokens.css); the saved theme (data-theme, set by theme-boot.js) comes
   before the system.
   The figure is built from jointed parts. The outline comes from two layers: everything in ink and 2*T wider below,
   everything in the background colour on top, so there are no lines at the joints. Key poses are blended with
   Catmull-Rom; ground contact comes from forward kinematics, in flight the hip follows a parabola. Poses, times, sizes
   and outline as designed (scene 390 x 300, centred). On other widths only the two off-screen ends of the path move,
   chosen by time: the kangaroo enters and leaves the screen at the same moments as at 390 px.
   Animation time advances at most 50 ms per drawn frame: while the browser is busy (evaluating the app) frames are
   missing, and the kangaroo would jump. "On screen yet" counts drawn frames only; the 4 s fallback is wall clock. */
(function () {
  var win = window, doc = document, html = doc.documentElement;
  try { if (win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) { /* show */ }
  if (!doc.body || !doc.createElementNS || !win.requestAnimationFrame) return;
  if (doc.getElementById('splash')) return;   // linked twice: one splash only

  var FARBE = { light: { bg: '#F3F2EE', ink: '#1D201E' }, dark: { bg: '#141615', ink: '#ECEBE6' } };
  var AUS = 180, NOTFALL = 4000, BREMSE = 50;

  // ── Figure, rest pose (units 0..120, facing right). Each part: lines of width w (round ends) or an ellipse ──
  var T = 3;
  var GELENK = { koerper: [52, 84], schwanz: [46, 88], kopf: [66, 52], arm: [70, 60], ober: [52, 84], unter: [65, 96], fuss: [55, 107] };
  // Chain of many short pieces with evenly decreasing width: smooth outline without steps
  function kette(p, w0, w1, n) {
    var len = [0], i, s = [];
    for (i = 1; i < p.length; i++) {
      var dx = p[i][0] - p[i - 1][0], dy = p[i][1] - p[i - 1][1];
      len.push(len[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    function punkt(d) {
      for (var j = 1; j < p.length; j++) if (d <= len[j] || j === p.length - 1) {
        var u = (d - len[j - 1]) / (len[j] - len[j - 1]);
        return [p[j - 1][0] + (p[j][0] - p[j - 1][0]) * u, p[j - 1][1] + (p[j][1] - p[j - 1][1]) * u];
      }
    }
    var L = len[len.length - 1];
    for (i = 0; i < n; i++) s.push({ l: [punkt(L * i / n), punkt(L * (i + 1) / n)], w: w0 + (w1 - w0) * (i + 0.5) / n });
    return s;
  }
  var TEILE = {
    schwanz: kette([[46, 88], [32, 97], [18, 104], [5, 108]], 11.5, 4.5, 10),
    koerper: kette([[50, 82], [59, 66], [66, 52]], 26, 15, 8),
    kopf:    [{ l: [[66, 52], [73, 39]], w: 10 }, { e: [77, 34, 7.5, 5.5, 15] }, { l: [[80, 35], [89, 39]], w: 6 },
              { l: [[74, 30], [70, 18]], w: 4.5 }, { l: [[77.5, 29], [78, 17]], w: 4.5 }],
    arm:     [{ l: [[70, 60], [76, 68], [81, 69]], w: 4 }],
    ober:    kette([[47, 81], [55, 88], [61, 93], [65, 96]], 24, 9, 8),
    unter:   [{ l: [[65, 96], [55, 107]], w: 7 }],
    fuss:    [{ l: [[55, 107], [60, 107.5]], w: 7 }, { l: [[60, 107.5], [85, 110]], w: 5 }]
  };
  // Nesting: the body carries tail, head, arm and leg; the leg is a chain thigh -> shank -> foot
  var BAUM = ['koerper', ['schwanz'], ['ober', ['unter', ['fuss']]], ['kopf'], ['arm']];

  // ── Poses: absolute angles (degrees, clockwise), 0 = rest pose ──
  var H = {
    ruhe:    { koerper: 0,  ober: 0,   unter: 0,   fuss: 0,  schwanz: 0,  kopf: 0,   arm: 0 },
    ducken:  { koerper: 14, ober: -22, unter: 26,  fuss: 0,  schwanz: -6, kopf: -8,  arm: 10 },
    federn:  { koerper: 12, ober: -26, unter: 30,  fuss: 0,  schwanz: -8, kopf: -6,  arm: 8 },
    abstoss: { koerper: 34, ober: 95,  unter: 0,   fuss: 130, schwanz: 18, kopf: -18, arm: 30 },
    flug:    { koerper: 36, ober: 110, unter: -10, fuss: 150, schwanz: 24, kopf: -22, arm: 34 },
    schwung: { koerper: 30, ober: 30,  unter: 10,  fuss: 60, schwanz: 18, kopf: -16, arm: 24 },
    vorland: { koerper: 22, ober: -36, unter: 26,  fuss: -12, schwanz: 10, kopf: -10, arm: 14 },
    aufsetz: { koerper: 16, ober: -30, unter: 30,  fuss: 0,  schwanz: 2,  kopf: -8,  arm: 12 }
  };
  // Timeline in ms: jump in (take-off off screen), land, stand briefly, crouch, push off, jump out
  var SCHL = [
    [-140, 'abstoss'], [0, 'flug'], [230, 'schwung'], [370, 'vorland'], [430, 'aufsetz'], [530, 'federn'],
    [680, 'ruhe'], [900, 'ruhe'], [1020, 'ducken'], [1100, 'abstoss'], [1200, 'flug'], [1430, 'schwung'], [1640, 'vorland']
  ];
  var FLUG = [[-140, 430, 70], [1100, 1700, 78]];          // [take-off, landing, height]
  var X = [[-140, -420], [430, -18], [530, -4], [680, 0], [1020, 0], [1100, 14], [1700, 470]];   // hip, px from the middle
  var ENDE = 1480, S = 1.15;
  var BREITE = 390, SZENE = 300, BODEN = 232;               // design scene, centred on the screen

  function lerp(a, b, u) { return a + (b - a) * u; }
  function linear(tab, t) {
    if (t <= tab[0][0]) return tab[0][1];
    for (var i = 1; i < tab.length; i++) if (t <= tab[i][0]) {
      var u = (t - tab[i - 1][0]) / (tab[i][0] - tab[i - 1][0]); return lerp(tab[i - 1][1], tab[i][1], u);
    }
    return tab[tab.length - 1][1];
  }
  // Catmull-Rom over the key poses, per channel
  function haltung(t) {
    var n = SCHL.length, i = 1;
    if (t <= SCHL[0][0]) return H[SCHL[0][1]];
    if (t >= SCHL[n - 1][0]) return H[SCHL[n - 1][1]];
    while (SCHL[i][0] < t) i++;
    var p0 = H[SCHL[Math.max(i - 2, 0)][1]], p1 = H[SCHL[i - 1][1]], p2 = H[SCHL[i][1]], p3 = H[SCHL[Math.min(i + 1, n - 1)][1]];
    var u = (t - SCHL[i - 1][0]) / (SCHL[i][0] - SCHL[i - 1][0]), r = {};
    for (var k in p1) {
      var a = p0[k], b = p1[k], c = p2[k], d = p3[k];
      r[k] = 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
    }
    return r;
  }
  function dreh(p, c, g) {
    var r = g * Math.PI / 180, s = Math.sin(r), k = Math.cos(r), x = p[0] - c[0], y = p[1] - c[1];
    return [c[0] + x * k - y * s, c[1] + x * s + y * k];
  }
  // relative angles from the absolute ones
  function relativ(h) {
    return { koerper: h.koerper, schwanz: h.schwanz - h.koerper, kopf: h.kopf - h.koerper, arm: h.arm - h.koerper,
             ober: h.ober - h.koerper, unter: h.unter - h.ober, fuss: h.fuss - h.unter };
  }
  // lowest point of the foot (heel, toe) in kangaroo units, for ground contact
  function fussTief(rel) {
    var tief = -1e9;
    [[55, 107, 3.5], [60, 107.5, 3.5], [85, 110, 2.5]].forEach(function (q) {
      var p = [q[0], q[1]];
      p = dreh(p, GELENK.fuss, rel.fuss); p = dreh(p, GELENK.unter, rel.unter);
      p = dreh(p, GELENK.ober, rel.ober); p = dreh(p, GELENK.koerper, rel.koerper);
      tief = Math.max(tief, p[1] + q[2] + T);
    });
    return tief;
  }
  function hueftY(t, boden) {
    for (var i = 0; i < FLUG.length; i++) {
      var f = FLUG[i];
      if (t > f[0] && t < f[1]) {
        var a = boden - S * fussTief(relativ(haltung(f[0]))) + S * 84, b = boden - S * fussTief(relativ(haltung(f[1]))) + S * 84;
        var u = (t - f[0]) / (f[1] - f[0]);
        return lerp(a, b, u) - 4 * f[2] * u * (1 - u);
      }
    }
    return boden - S * fussTief(relativ(haltung(t))) + S * 84;
  }
  // Horizontal extent of the figure in units (outline included): is the kangaroo on screen yet?
  var ELTERN = {}, PUNKTE = {};
  (function eltern(k, vater) { ELTERN[k[0]] = vater; for (var i = 1; i < k.length; i++) eltern(k[i], k[0]); })(BAUM, null);
  function punkte(name) {
    var l = [];
    TEILE[name].forEach(function (s) {
      if (s.e) l.push([s.e[0], s.e[1], Math.max(s.e[2], s.e[3]) + T]);
      else s.l.forEach(function (p) { l.push([p[0], p[1], s.w / 2 + T]); });
    });
    return l;
  }
  for (var teil in TEILE) PUNKTE[teil] = punkte(teil);
  function ausdehnung(rel) {
    var lo = 1e9, hi = -1e9;
    for (var name in PUNKTE) {
      for (var i = 0; i < PUNKTE[name].length; i++) {
        var q = PUNKTE[name][i], p = [q[0], q[1]];
        for (var k = name; k; k = ELTERN[k]) p = dreh(p, GELENK[k], rel[k]);
        lo = Math.min(lo, p[0] - q[2]); hi = Math.max(hi, p[0] + q[2]);
      }
    }
    return [lo, hi];
  }
  // Edges of the painted figure in px from the hip (back, front) for the pose at t
  function kanten(t) { var a = ausdehnung(relativ(haltung(t))); return [S * (a[0] - 52), S * (a[1] - 52)]; }
  // First t in [von, bis] where test(t) holds (it holds from then on: the figure only moves right), to 0.5 ms
  function suche(von, bis, test) {
    while (bis - von > 0.5) { var m = (von + bis) / 2; if (test(m)) bis = m; else von = m; }
    return bis;
  }
  // At 390 px (the design): the front edge reaches the left edge at EIN, the last ink leaves the right edge at AUSTRITT
  var EIN = suche(0, X[1][0], function (t) { return BREITE / 2 + linear(X, t) + kanten(t)[1] > 0; });
  var AUSTRITT = suche(X[5][0], X[6][0], function (t) { return BREITE / 2 + linear(X, t) + kanten(t)[0] > BREITE; });
  // Path for the actual width: at 390 px as designed. Otherwise the take-off (-140 ms) and the far landing (1700 ms) move
  // so that at EIN and at AUSTRITT the hip has the same distance to the edge as at 390 px: same moments on every width.
  var PFADE = {};
  function pfad(breite) {
    if (PFADE[breite]) return PFADE[breite];
    var e = breite / 2 - BREITE / 2, w = X.slice(), n = X.length - 1;
    var vor = (X[1][0] - EIN) / (X[1][0] - X[0][0]), nach = (AUSTRITT - X[n - 1][0]) / (X[n][0] - X[n - 1][0]);
    w[0] = [X[0][0], X[0][1] - e / vor];
    w[n] = [X[n][0], X[n][1] + e / nach];
    return (PFADE[breite] = w);
  }

  // ── Drawing ──
  function thema() {
    var v = html.getAttribute('data-theme');
    if (v === 'light' || v === 'dark') return v;
    try { return win.matchMedia && win.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; }
  }
  var NS = 'http://www.w3.org/2000/svg';
  function el(n, a) { var e = doc.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); return e; }
  function teilZeichnen(g, name, extra, farbe) {
    TEILE[name].forEach(function (s) {
      if (s.e) {
        g.appendChild(el('ellipse', { cx: s.e[0], cy: s.e[1], rx: s.e[2], ry: s.e[3], transform: 'rotate(' + s.e[4] + ' ' + s.e[0] + ' ' + s.e[1] + ')',
          fill: farbe, stroke: extra ? farbe : 'none', 'stroke-width': extra * 2 }));
      } else {
        g.appendChild(el('polyline', { points: s.l.map(function (p) { return p.join(','); }).join(' '), fill: 'none', stroke: farbe,
          'stroke-width': s.w + extra * 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      }
    });
  }
  function bauen(eltern, knoten, extra, farbe, gruppen) {
    var name = knoten[0], g = el('g', { 'data-teil': name });
    gruppen[name] = g;
    eltern.appendChild(g);
    teilZeichnen(g, name, extra, farbe);
    for (var i = 1; i < knoten.length; i++) bauen(g, knoten[i], extra, farbe, gruppen);
  }

  var farbe = FARBE[thema()];
  var ebene = doc.createElement('div'), st = ebene.style;
  ebene.id = 'splash';
  ebene.setAttribute('aria-hidden', 'true');
  st.position = 'fixed'; st.left = '0'; st.top = '0'; st.right = '0'; st.bottom = '0'; st.zIndex = '2147483647';
  st.backgroundColor = farbe.bg; st.pointerEvents = 'none'; st.overflow = 'hidden';
  var svg = el('svg', { width: '100%', height: '100%' });
  svg.style.display = 'block';
  var wurzel = el('g', { 'class': 'wurzel' }), lagen = [];
  // The whole outline layer first, the whole fill layer on top: inside the figure no outline shows
  [['umriss', T, farbe.ink], ['fuell', 0, farbe.bg]].forEach(function (l) {
    var g = el('g', { 'class': l[0] }), gruppen = {};
    bauen(g, BAUM, l[1], l[2], gruppen);
    wurzel.appendChild(g); lagen.push(gruppen);
  });
  svg.appendChild(wurzel);
  ebene.appendChild(svg);

  var zeit = 0, zuletzt = null, raf = 0, gesehen = false, aus = false, weg = false, notfall = 0;
  function stellen(t) {
    var b = win.innerWidth || html.clientWidth || BREITE, h = win.innerHeight || html.clientHeight || SZENE;
    var rel = relativ(haltung(t)), x = b / 2 + linear(pfad(b), t), y = hueftY(t, h / 2 - SZENE / 2 + BODEN);
    var ox = x - 52 * S, oy = y - 84 * S;
    wurzel.setAttribute('transform', 'translate(' + ox.toFixed(2) + ',' + oy.toFixed(2) + ') scale(' + S + ')');
    lagen.forEach(function (gr) {
      for (var k in rel) { var c = GELENK[k]; gr[k].setAttribute('transform', 'rotate(' + rel[k].toFixed(2) + ' ' + c[0] + ' ' + c[1] + ')'); }
    });
    if (!gesehen) { var a = ausdehnung(rel); gesehen = ox + S * a[1] > 0 && ox + S * a[0] < b; }
  }
  // Animation time starts with the first frame and advances by the frame gap, at most BREMSE ms per frame
  function bild(now) {
    raf = 0;
    if (weg) return;
    if (zuletzt !== null) zeit += Math.max(0, Math.min(now - zuletzt, BREMSE));
    zuletzt = now;
    stellen(zeit);
    if (zeit >= ENDE) { svg.style.visibility = 'hidden'; return; }   // jumped out: empty background until the app is ready
    raf = win.requestAnimationFrame(bild);
  }
  function ausblenden() {
    if (aus) return;
    aus = true;
    if (!gesehen) { entfernen(); return; }
    st.transition = 'opacity ' + AUS + 'ms ease-out';
    st.opacity = '0';
    win.setTimeout(entfernen, AUS);
  }
  function entfernen() {
    if (weg) return;
    weg = aus = true;
    if (raf) win.cancelAnimationFrame(raf);
    raf = 0;
    win.clearTimeout(notfall);
    win.removeEventListener('pointerdown', ausblenden, true);
    win.removeEventListener('keydown', ausblenden, true);
    win.__splashEnde = function () {};   // the old function would keep the removed layer alive
    if (ebene.parentNode) ebene.parentNode.removeChild(ebene);
  }

  // Signal, listeners and fallback first, then the layer: whatever happens after, it can always go
  win.__splashEnde = function () { ausblenden(); };
  win.addEventListener('pointerdown', ausblenden, true);
  win.addEventListener('keydown', ausblenden, true);
  notfall = win.setTimeout(ausblenden, NOTFALL - AUS);
  stellen(0);
  doc.body.insertBefore(ebene, doc.body.firstChild);
  raf = win.requestAnimationFrame(bild);
})();
