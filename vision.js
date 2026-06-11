/* ============================================================
   Café Kaisers – Brunch-scanner: computer vision-modul
   Ren JavaScript, ingen afhængigheder. Bruges af både appen
   (index.html) og Node-testen (test/run-test.js).
   Koordinatsystem: trykfilen "Byg selv brunch seddel + QR Q3"
   i 708 x 2000 px (kanonisk kort-rum).
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KaiserVision = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CARD_W = 708, CARD_H = 2000;

  // Krydsfelter målt præcist i trykfilen (x, y = øverste venstre hjørne, s = sidelængde)
  var BOXES = [
    { id: 'roraeg',      x: 62, y: 427,  s: 25, cat: 'MEJERI',      name: 'Røræg' },
    { id: 'spejlaeg',    x: 62, y: 472,  s: 25, cat: 'MEJERI',      name: 'Spejlæg' },
    { id: 'havarti',     x: 62, y: 517,  s: 25, cat: 'MEJERI',      name: 'Modnet Havarti ost' },
    { id: 'yoghurt',     x: 62, y: 563,  s: 25, cat: 'MEJERI',      name: 'Hjemmelavet blåbæryoghurt' },
    { id: 'chiagrod',    x: 62, y: 631,  s: 25, cat: 'MEJERI',      name: 'Hjemmelavet chiagrød' },
    { id: 'avocado',     x: 62, y: 751,  s: 25, cat: 'PLANTERIGET', name: 'Avocado og hytteost' },
    { id: 'frugtskal',   x: 62, y: 796,  s: 25, cat: 'PLANTERIGET', name: 'Eksotisk frugtskål' },
    { id: 'stracciatella', x: 62, y: 853, s: 25, cat: 'PLANTERIGET', name: 'Stracciatella med sommerfersken' },
    { id: 'rosti',       x: 63, y: 980,  s: 25, cat: 'KØD & FISK',  name: 'Rösti' },
    { id: 'honsesalat',  x: 63, y: 1025, s: 25, cat: 'KØD & FISK',  name: 'Hjemmelavet hønsesalat' },
    { id: 'crispychicken', x: 63, y: 1070, s: 25, cat: 'KØD & FISK', name: 'Crispy chicken' },
    { id: 'brunchpolser', x: 63, y: 1115, s: 25, cat: 'KØD & FISK', name: '2 brunchpølser' },
    { id: 'laks',        x: 63, y: 1160, s: 25, cat: 'KØD & FISK',  name: 'Koldrøget laks' },
    { id: 'painauchoc',  x: 75, y: 1289, s: 25, cat: 'BAGERIET',    name: 'Pain au chocolat fra Meyers' },
    { id: 'croissant',   x: 75, y: 1334, s: 25, cat: 'BAGERIET',    name: 'Øko. smørcroissant fra Meyers' },
    { id: 'toast',       x: 75, y: 1379, s: 25, cat: 'BAGERIET',    name: 'Toast' },
    { id: 'jordbaerkage', x: 75, y: 1507, s: 25, cat: 'FINALEN',    name: 'Kaisers jordbærkage' },
    { id: 'koldskal',    x: 75, y: 1578, s: 25, cat: 'FINALEN',     name: 'Hjemmelavet koldskål' },
    { id: 'pandekager',  x: 75, y: 1649, s: 25, cat: 'FINALEN',     name: '2 amerikanske pandekager' },
    { id: 'pisketsmor',  x: 44, y: 1845, s: 18, cat: 'EKSTRA',      name: 'Pisket smør', extra: true },
    { id: 'nutella',     x: 170, y: 1847, s: 18, cat: 'EKSTRA',     name: 'Nutella (10,-)', extra: true }
  ];

  // QR-kodens område på kortet – bruges til at afgøre om kortet vender rigtigt
  var QR = { x: 374, y: 1730, w: 100, h: 136 };

  /* ---------- små hjælpere ---------- */

  function grayscale(rgba, w, h) {
    var g = new Uint8ClampedArray(w * h);
    for (var i = 0, p = 0; i < g.length; i++, p += 4) {
      g[i] = (rgba[p] * 299 + rgba[p + 1] * 587 + rgba[p + 2] * 114) / 1000;
    }
    return g;
  }

  function otsu(gray) {
    var hist = new Uint32Array(256), i;
    for (i = 0; i < gray.length; i++) hist[gray[i]]++;
    var total = gray.length, sum = 0;
    for (i = 0; i < 256; i++) sum += i * hist[i];
    var sumB = 0, wB = 0, maxVar = 0, thresh = 127;
    for (i = 0; i < 256; i++) {
      wB += hist[i];
      if (wB === 0) continue;
      var wF = total - wB;
      if (wF === 0) break;
      sumB += i * hist[i];
      var mB = sumB / wB, mF = (sum - sumB) / wF;
      var v = wB * wF * (mB - mF) * (mB - mF);
      if (v > maxVar) { maxVar = v; thresh = i; }
    }
    return thresh;
  }

  /* ---------- find kortets fire hjørner ---------- */

  // Største lyse sammenhængende område (kortet) → konveks hylster → kvadrilateral med størst areal
  function findCardQuad(gray, w, h) {
    var t = otsu(gray);
    var mask = new Uint8Array(w * h);
    var brightCount = 0;
    for (var i = 0; i < gray.length; i++) {
      if (gray[i] > t) { mask[i] = 1; brightCount++; }
    }
    if (brightCount < w * h * 0.08 || brightCount > w * h * 0.97) return null;

    // største komponent (iterativ flood fill)
    var labels = new Int32Array(w * h);
    var best = { size: 0, label: 0 };
    var stack = new Int32Array(w * h);
    var next = 1;
    for (var s0 = 0; s0 < w * h; s0++) {
      if (!mask[s0] || labels[s0]) continue;
      var lab = next++, sp = 0, size = 0;
      stack[sp++] = s0; labels[s0] = lab;
      while (sp > 0) {
        var p = stack[--sp]; size++;
        var px = p % w, py = (p / w) | 0;
        if (px > 0 && mask[p - 1] && !labels[p - 1]) { labels[p - 1] = lab; stack[sp++] = p - 1; }
        if (px < w - 1 && mask[p + 1] && !labels[p + 1]) { labels[p + 1] = lab; stack[sp++] = p + 1; }
        if (py > 0 && mask[p - w] && !labels[p - w]) { labels[p - w] = lab; stack[sp++] = p - w; }
        if (py < h - 1 && mask[p + w] && !labels[p + w]) { labels[p + w] = lab; stack[sp++] = p + w; }
      }
      if (size > best.size) best = { size: size, label: lab };
    }
    if (best.size < w * h * 0.08) return null;

    // punkter på komponentens rand
    var pts = [];
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var q = y * w + x;
        if (labels[q] !== best.label) continue;
        if (labels[q - 1] !== best.label || labels[q + 1] !== best.label ||
            labels[q - w] !== best.label || labels[q + w] !== best.label) {
          pts.push([x, y]);
        }
      }
    }
    if (pts.length < 20) return null;

    var hull = convexHull(pts);
    if (hull.length < 4) return null;
    if (hull.length > 48) hull = thinHull(hull, 48);

    var quad = maxAreaQuad(hull);
    if (!quad) return null;

    // sanity: sideforhold skal ligne kortet (kort side / lang side ≈ 0.354)
    var d = function (a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); };
    var sides = [d(quad[0], quad[1]), d(quad[1], quad[2]), d(quad[2], quad[3]), d(quad[3], quad[0])];
    var s02 = (sides[0] + sides[2]) / 2, s13 = (sides[1] + sides[3]) / 2;
    var ratio = Math.min(s02, s13) / Math.max(s02, s13);
    if (ratio < 0.2 || ratio > 0.55) return null;
    var qa = polyArea(quad);
    if (qa < best.size * 0.75) return null; // hylsteret skal være pænt firkantet

    return orderQuad(quad);
  }

  function convexHull(pts) {
    pts = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var cross = function (o, a, b) {
      return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    };
    var lower = [], upper = [], i;
    for (i = 0; i < pts.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop();
      lower.push(pts[i]);
    }
    for (i = pts.length - 1; i >= 0; i--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop();
      upper.push(pts[i]);
    }
    lower.pop(); upper.pop();
    return lower.concat(upper);
  }

  function thinHull(hull, maxN) {
    var out = [], step = hull.length / maxN;
    for (var i = 0; i < maxN; i++) out.push(hull[Math.floor(i * step)]);
    return out;
  }

  function triArea2(a, b, c) {
    return Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]));
  }

  function polyArea(q) {
    var s = 0;
    for (var i = 0; i < q.length; i++) {
      var j = (i + 1) % q.length;
      s += q[i][0] * q[j][1] - q[j][0] * q[i][1];
    }
    return Math.abs(s) / 2;
  }

  // kvadrilateral med størst areal blandt hylsterpunkterne
  function maxAreaQuad(hull) {
    var n = hull.length;
    if (n === 4) return hull.slice();
    var best = 0, bq = null;
    for (var a = 0; a < n - 3; a++) {
      for (var b = a + 1; b < n - 2; b++) {
        var ab = triArea2(hull[a], hull[b], [0, 0]); // dummy så JIT ikke fjerner loop
        for (var c = b + 1; c < n - 1; c++) {
          var t1 = triArea2(hull[a], hull[b], hull[c]);
          for (var dd = c + 1; dd < n; dd++) {
            var area = t1 + triArea2(hull[a], hull[c], hull[dd]);
            if (area > best) { best = area; bq = [hull[a], hull[b], hull[c], hull[dd]]; }
          }
        }
      }
    }
    return bq;
  }

  // sortér hjørner: [TL, TR, BR, BL] med den korte side øverst (foreløbigt – 180° afgøres senere)
  function orderQuad(quad) {
    var cx = 0, cy = 0, i;
    for (i = 0; i < 4; i++) { cx += quad[i][0] / 4; cy += quad[i][1] / 4; }
    var sorted = quad.slice().sort(function (a, b) {
      return Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx);
    });
    // sorted er nu i urets/modurets rækkefølge. Find det par af modstående sider der er kortest
    var d = function (a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); };
    var s01 = d(sorted[0], sorted[1]) + d(sorted[2], sorted[3]);
    var s12 = d(sorted[1], sorted[2]) + d(sorted[3], sorted[0]);
    var q;
    if (s01 < s12) q = sorted;                       // side 0-1 er kort → 0,1 er "top"
    else q = [sorted[1], sorted[2], sorted[3], sorted[0]];
    // sørg for at toppen faktisk er den side med mindst gennemsnits-y (ellers roteres 180°)
    var topY = (q[0][1] + q[1][1]) / 2, botY = (q[2][1] + q[3][1]) / 2;
    if (topY > botY) q = [q[2], q[3], q[0], q[1]];
    // TL skal være til venstre for TR
    if (q[0][0] > q[1][0]) q = [q[1], q[0], q[3], q[2]];
    return q;
  }

  /* ---------- homografi & warp ---------- */

  // homografi der mapper enhedskvadrat-agtige destinationer: vi beregner H: dst(kanonisk) → src
  function homographyDstToSrc(quad, dw, dh) {
    // korrespondancer: (0,0)→quad[0], (dw,0)→quad[1], (dw,dh)→quad[2], (0,dh)→quad[3]
    var src = [[0, 0], [dw, 0], [dw, dh], [0, dh]];
    var dst = quad;
    // løs 8x8 lineært system  A h = b
    var A = [], b = [];
    for (var i = 0; i < 4; i++) {
      var x = src[i][0], y = src[i][1], X = dst[i][0], Y = dst[i][1];
      A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X);
      A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y);
    }
    var hh = solve8(A, b);
    if (!hh) return null;
    return [hh[0], hh[1], hh[2], hh[3], hh[4], hh[5], hh[6], hh[7], 1];
  }

  function solve8(A, b) {
    var n = 8, M = [], i, j, k;
    for (i = 0; i < n; i++) M.push(A[i].concat([b[i]]));
    for (i = 0; i < n; i++) {
      var piv = i;
      for (j = i + 1; j < n; j++) if (Math.abs(M[j][i]) > Math.abs(M[piv][i])) piv = j;
      if (Math.abs(M[piv][i]) < 1e-10) return null;
      var tmp = M[i]; M[i] = M[piv]; M[piv] = tmp;
      for (j = i + 1; j < n; j++) {
        var f = M[j][i] / M[i][i];
        for (k = i; k <= n; k++) M[j][k] -= f * M[i][k];
      }
    }
    var x = new Array(n);
    for (i = n - 1; i >= 0; i--) {
      var s = M[i][n];
      for (j = i + 1; j < n; j++) s -= M[i][j] * x[j];
      x[i] = s / M[i][i];
    }
    return x;
  }

  // warp gråtonebillede til kanonisk 708x2000 med bilineær sampling
  function warpToCanonical(gray, w, h, quad) {
    var H = homographyDstToSrc(quad, CARD_W, CARD_H);
    if (!H) return null;
    var out = new Uint8ClampedArray(CARD_W * CARD_H);
    for (var y = 0; y < CARD_H; y++) {
      var h0 = H[1] * y + H[2], h3 = H[4] * y + H[5], h6 = H[7] * y + 1;
      for (var x = 0; x < CARD_W; x++) {
        var den = H[6] * x + h6;
        var sx = (H[0] * x + h0) / den;
        var sy = (H[3] * x + h3) / den;
        var ix = sx | 0, iy = sy | 0;
        if (ix < 0 || iy < 0 || ix >= w - 1 || iy >= h - 1) { out[y * CARD_W + x] = 255; continue; }
        var fx = sx - ix, fy = sy - iy;
        var p = iy * w + ix;
        var v = gray[p] * (1 - fx) * (1 - fy) + gray[p + 1] * fx * (1 - fy) +
                gray[p + w] * (1 - fx) * fy + gray[p + w + 1] * fx * fy;
        out[y * CARD_W + x] = v;
      }
    }
    return out;
  }

  /* ---------- orientering (QR-tæthed) ---------- */

  function darkDensity(canon, x0, y0, w0, h0) {
    var t = 0, n = 0;
    for (var y = y0; y < y0 + h0; y++) {
      for (var x = x0; x < x0 + w0; x++) {
        if (canon[y * CARD_W + x] < 120) t++;
        n++;
      }
    }
    return t / n;
  }

  // true hvis kortet vender på hovedet (QR-tæthed højest i den spejlede position)
  function isUpsideDown(canon) {
    var dNormal = darkDensity(canon, QR.x, QR.y, QR.w, QR.h);
    var dFlipped = darkDensity(canon, CARD_W - QR.x - QR.w, CARD_H - QR.y - QR.h, QR.w, QR.h);
    return dFlipped > dNormal;
  }

  /* ---------- aflæsning af krydsfelter ---------- */

  function median(arr) {
    var a = arr.slice().sort(function (x, y) { return x - y; });
    return a[(a.length / 2) | 0];
  }

  // lokal baggrund: median af en ramme udenom feltet
  function localBg(canon, bx, by, s) {
    var vals = [];
    var pad = 14;
    for (var y = by - pad; y < by + s + pad; y += 2) {
      for (var x = bx - pad; x < bx + s + pad; x += 2) {
        if (x >= bx - 4 && x < bx + s + 4 && y >= by - 4 && y < by + s + 4) continue; // skip boksen selv
        if (x < 0 || y < 0 || x >= CARD_W || y >= CARD_H) continue;
        vals.push(canon[y * CARD_W + x]);
      }
    }
    return vals.length ? median(vals) : 220;
  }

  // score for at boksens trykte ramme sidder på (bx,by): mørke langs kvadratets perimeter,
  // hver pixels bidrag begrænses så et kryds ikke kan dominere
  function ringScore(canon, bx, by, s, bg) {
    var score = 0, n = 0;
    function add(x, y) {
      if (x < 0 || y < 0 || x >= CARD_W || y >= CARD_H) return;
      var diff = bg - canon[y * CARD_W + x];
      if (diff > 0) score += Math.min(diff, 28);
      n++;
    }
    for (var i = 0; i < s; i++) {
      add(bx + i, by); add(bx + i, by + s - 1);
      add(bx, by + i); add(bx + s - 1, by + i);
    }
    return n ? score / n : 0;
  }

  // finjustér feltets position i et søgevindue og mål blæk-andelen i feltets indre
  function readBox(canon, box, searchR) {
    var bg = localBg(canon, box.x, box.y, box.s);
    var best = -1, bx = box.x, by = box.y;
    for (var dy = -searchR; dy <= searchR; dy++) {
      for (var dx = -searchR; dx <= searchR; dx++) {
        var sc = ringScore(canon, box.x + dx, box.y + dy, box.s, bg);
        if (sc > best) { best = sc; bx = box.x + dx; by = box.y + dy; }
      }
    }
    var borderFound = best > 3.0;
    // blæk i feltets indre (4 px inde fra rammen, så rammen ikke tæller med)
    var inset = Math.max(3, Math.round(box.s * 0.16));
    var inkThresh = Math.max(16, bg * 0.14);
    var dark = 0, tot = 0;
    for (var y = by + inset; y < by + box.s - inset; y++) {
      for (var x = bx + inset; x < bx + box.s - inset; x++) {
        if (x < 0 || y < 0 || x >= CARD_W || y >= CARD_H) continue;
        if (bg - canon[y * CARD_W + x] > inkThresh) dark++;
        tot++;
      }
    }
    var ink = tot ? dark / tot : 0;
    return { ink: ink, borderFound: borderFound, bx: bx, by: by, bg: bg, ringScore: best };
  }

  /**
   * Hovedfunktion: aflæs et kanonisk warpet kort.
   * sensitivity: 0.5–2.0 (1 = standard). Lavere tal = der skal mere blæk til.
   */
  function analyzeCanonical(canon, sensitivity) {
    sensitivity = sensitivity || 1;
    var threshold = 0.06 / sensitivity;

    // 1. pass: groft søgevindue, find globalt offset via median af felter med god ramme
    var coarse = [], i, b;
    for (i = 0; i < BOXES.length; i++) {
      b = BOXES[i];
      coarse.push(readBox(canon, b, 10));
    }
    var oxs = [], oys = [];
    for (i = 0; i < BOXES.length; i++) {
      if (coarse[i].borderFound) {
        oxs.push(coarse[i].bx - BOXES[i].x);
        oys.push(coarse[i].by - BOXES[i].y);
      }
    }
    var gx = oxs.length >= 5 ? median(oxs) : 0;
    var gy = oys.length >= 5 ? median(oys) : 0;

    // 2. pass: lille vindue omkring den globalt korrigerede position
    var results = [], bordersFound = 0;
    for (i = 0; i < BOXES.length; i++) {
      b = BOXES[i];
      var shifted = { x: b.x + gx, y: b.y + gy, s: b.s };
      var r = readBox(canon, shifted, 4);
      if (r.borderFound) bordersFound++;
      results.push({
        id: b.id, name: b.name, cat: b.cat, extra: !!b.extra,
        checked: r.ink > threshold,
        ink: Math.round(r.ink * 1000) / 1000,
        borderFound: r.borderFound,
        bx: r.bx, by: r.by, s: b.s
      });
    }
    return {
      items: results,
      bordersFound: bordersFound,
      valid: bordersFound >= 15,
      offset: [gx, gy]
    };
  }

  /**
   * Fuldt pipeline: RGBA-frame → resultat.
   * Returnerer { ok, error?, items?, canon?, quad? }
   */
  function readSheet(rgba, w, h, sensitivity) {
    var gray = grayscale(rgba, w, h);
    var quad = findCardQuad(gray, w, h);
    if (!quad) return { ok: false, error: 'Kunne ikke finde sedlen i billedet' };
    var canon = warpToCanonical(gray, w, h, quad);
    if (!canon) return { ok: false, error: 'Perspektiv-korrektion fejlede' };
    if (isUpsideDown(canon)) {
      quad = [quad[2], quad[3], quad[0], quad[1]];
      canon = warpToCanonical(gray, w, h, quad);
    }
    var res = analyzeCanonical(canon, sensitivity);
    if (!res.valid) {
      return { ok: false, error: 'Sedlen kunne ikke aflæses tydeligt (' + res.bordersFound + '/21 felter fundet)', canon: canon, quad: quad };
    }
    return { ok: true, items: res.items, bordersFound: res.bordersFound, canon: canon, quad: quad };
  }

  return {
    CARD_W: CARD_W, CARD_H: CARD_H,
    BOXES: BOXES, QR: QR,
    grayscale: grayscale,
    otsu: otsu,
    findCardQuad: findCardQuad,
    warpToCanonical: warpToCanonical,
    isUpsideDown: isUpsideDown,
    analyzeCanonical: analyzeCanonical,
    readSheet: readSheet
  };
});
