/* ============================================================
   Café Kaisers – Brunch-scanner: computer vision-modul  v2
   Ren JavaScript. Bruges af både appen (index.html) og
   Node-testen. Kanonisk kort-rum: 708 x 2000 px.

   v2-forbedringer (efter test mod rigtige fotos):
   - Global registrering: skala/forskydning finjusteres automatisk
     mod felternes trykte rammer (tåler layout-afvigelser)
   - Blækmåling i felt + "halo" omkring feltet (gæster rammer ofte
     ved siden af)
   - QR-fallback: sedler der er let afskåret i billedet ankres
     på QR-koden i stedet for papirkanterne
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KaiserVision = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CARD_W = 708, CARD_H = 2000;

  // Krydsfelter (x, y = øverste venstre hjørne, s = sidelængde) – kortrevision Q3
  // OBS: koordinater kalibreres mod den aktuelle trykfil/rigtige fotos.
  // Opmålt direkte i den danske TRYKFIL (kanonisk 708×2000) – august 2026.
  // (Tidligere foto-udledte tal lå ~17 px forskudt og gav fejlaflæsninger.)
  var BOXES = [
    { id: 'roraeg',        x: 62, y: 427,  s: 25, cat: 'MEJERI',      name: 'Røræg' },
    { id: 'spejlaeg',      x: 62, y: 472,  s: 25, cat: 'MEJERI',      name: 'Spejlæg' },
    { id: 'havarti',       x: 62, y: 517,  s: 25, cat: 'MEJERI',      name: 'Modnet Havarti ost' },
    { id: 'yoghurt',       x: 62, y: 563,  s: 25, cat: 'MEJERI',      name: 'Hjemmelavet blåbæryoghurt' },
    { id: 'chiagrod',      x: 62, y: 631,  s: 25, cat: 'MEJERI',      name: 'Hjemmelavet chiagrød' },
    { id: 'avocado',       x: 62, y: 751,  s: 25, cat: 'PLANTERIGET', name: 'Avocado og hytteost' },
    { id: 'frugtskal',     x: 62, y: 796,  s: 25, cat: 'PLANTERIGET', name: 'Eksotisk frugtskål' },
    { id: 'sommerfersken', x: 62, y: 853,  s: 25, cat: 'PLANTERIGET', name: 'Sommerfersken med stracciatella' },
    { id: 'rosti',         x: 63, y: 980,  s: 25, cat: 'KØD & FISK',  name: 'Rösti' },
    { id: 'honsesalat',    x: 63, y: 1025, s: 25, cat: 'KØD & FISK',  name: 'Hjemmelavet hønsesalat' },
    { id: 'crispychicken', x: 63, y: 1070, s: 25, cat: 'KØD & FISK',  name: 'Crispy chicken' },
    { id: 'brunchpolser',  x: 63, y: 1115, s: 25, cat: 'KØD & FISK',  name: '2 brunchpølser' },
    { id: 'laks',          x: 63, y: 1160, s: 25, cat: 'KØD & FISK',  name: 'Koldrøget laks' },
    { id: 'painauchoc',    x: 75, y: 1289, s: 25, cat: 'BAGERIET',    name: 'Pain au chocolat fra Meyers' },
    { id: 'croissant',     x: 75, y: 1334, s: 25, cat: 'BAGERIET',    name: 'Øko. smørcroissant fra Meyers' },
    { id: 'toast',         x: 75, y: 1379, s: 25, cat: 'BAGERIET',    name: 'Mariagertoba-toast' },
    { id: 'jordbaerkage',  x: 75, y: 1507, s: 25, cat: 'FINALEN',     name: 'Kaisers jordbærkage' },
    { id: 'koldskal',      x: 75, y: 1578, s: 25, cat: 'FINALEN',     name: 'Hjemmelavet koldskål' },
    { id: 'pandekager',    x: 75, y: 1649, s: 25, cat: 'FINALEN',     name: '2 amerikanske pandekager' },
    { id: 'pisketsmor',    x: 44,  y: 1845, s: 18, cat: 'EKSTRA',     name: 'Pisket smør', extra: true },
    { id: 'nutella',       x: 170, y: 1847, s: 18, cat: 'EKSTRA',     name: 'Nutella (10,-)', extra: true }
  ];

  /* ---- ENGELSK KORT ("BUILD YOUR OWN BRUNCH") ----
     Samme retter i samme rækkefølge, men engelsk tekst ombrydes anderledes,
     så felterne sidder på andre højder. Kortet har INGEN QR-kode.
     Opmålt på ENG-trykfilen august 2026. */
  var BOXES_EN = [
    { id: 'roraeg',        x: 62, y: 427,  s: 25 },
    { id: 'spejlaeg',      x: 62, y: 472,  s: 25 },
    { id: 'havarti',       x: 62, y: 517,  s: 25 },
    { id: 'yoghurt',       x: 63, y: 563,  s: 25 },
    { id: 'chiagrod',      x: 62, y: 631,  s: 25 },
    { id: 'avocado',       x: 62, y: 764,  s: 25 },
    { id: 'frugtskal',     x: 62, y: 830,  s: 25 },
    { id: 'sommerfersken', x: 62, y: 873,  s: 25 },
    { id: 'rosti',         x: 63, y: 988,  s: 25 },
    { id: 'honsesalat',    x: 63, y: 1033, s: 25 },
    { id: 'crispychicken', x: 63, y: 1078, s: 25 },
    { id: 'brunchpolser',  x: 63, y: 1123, s: 25 },
    { id: 'laks',          x: 63, y: 1187, s: 25 },
    { id: 'painauchoc',    x: 75, y: 1323, s: 25 },
    { id: 'croissant',     x: 75, y: 1368, s: 25 },
    { id: 'toast',         x: 75, y: 1413, s: 25 },
    { id: 'jordbaerkage',  x: 75, y: 1533, s: 25 },
    { id: 'koldskal',      x: 75, y: 1604, s: 25 },
    { id: 'pandekager',    x: 75, y: 1675, s: 25 },
    { id: 'pisketsmor',    x: 240, y: 1859, s: 18, extra: true },
    { id: 'nutella',       x: 365, y: 1861, s: 18, extra: true }
  ];

  // Byg fuld ENG-liste med navne/kategorier fra den danske (samme retter)
  var BOXES_EN_FULL = BOXES_EN.map(function (b) {
    var dk = null;
    for (var i = 0; i < BOXES.length; i++) if (BOXES[i].id === b.id) dk = BOXES[i];
    return {
      id: b.id, x: b.x, y: b.y, s: b.s, extra: !!b.extra,
      cat: dk ? dk.cat : '', name: dk ? dk.name : b.id
    };
  });

  var LAYOUTS = [
    { key: 'dk', boxes: BOXES, hasQR: true },
    { key: 'en', boxes: BOXES_EN_FULL, hasQR: false }
  ];

  // QR-symbolets placering på kortet (kanoniske koordinater, opmålt juli 2026)
  var QR_BOX = { x0: 345, y0: 1733, x1: 481, y1: 1873 };

  // jsQR's egne hjørne-koordinater målt på det oprettede referencekort.
  // VIGTIGT: brug disse (ikke QR_BOX) som destination ved QR-forankring,
  // så jsQR's hjørne-konvention går ud mod sig selv.
  var QR_DST = [
    [348.51, 1737.62],   // topLeftCorner
    [482.33, 1731.16],   // topRightCorner
    [480.32, 1870.58],   // bottomRightCorner
    [343.91, 1878.15]    // bottomLeftCorner
  ];

  /* ================= hjælpere ================= */

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

  function median(arr) {
    var a = arr.slice().sort(function (x, y) { return x - y; });
    return a[(a.length / 2) | 0];
  }

  /* ================= find kortet ================= */

  // Percentil af gråtoner (0-1)
  function percentile(gray, p) {
    var hist = new Uint32Array(256), i;
    for (i = 0; i < gray.length; i++) hist[gray[i]]++;
    var target = gray.length * p, cum = 0;
    for (i = 0; i < 256; i++) {
      cum += hist[i];
      if (cum >= target) return i;
    }
    return 255;
  }

  // Prøv én tærskel → { quad, quality } | { clipped } | null
  function tryThreshold(gray, w, h, t) {
    var mask = new Uint8Array(w * h);
    var brightCount = 0;
    for (var i = 0; i < gray.length; i++) {
      if (gray[i] > t) { mask[i] = 1; brightCount++; }
    }
    if (brightCount < w * h * 0.05 || brightCount > w * h * 0.97) return null;

    // største lyse komponent
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
    if (best.size < w * h * 0.05) return null;

    // kant-kontakt (afskåret seddel eller baggrund med i komponenten)
    var edgeContact = 0;
    for (var x = 0; x < w; x++) {
      if (labels[x] === best.label) edgeContact++;
      if (labels[(h - 1) * w + x] === best.label) edgeContact++;
    }
    for (var y = 0; y < h; y++) {
      if (labels[y * w] === best.label) edgeContact++;
      if (labels[y * w + w - 1] === best.label) edgeContact++;
    }
    if (edgeContact > 0.03 * 2 * (w + h)) return { clipped: true };

    // randpunkter
    var pts = [];
    for (var yy = 1; yy < h - 1; yy++) {
      for (var xx = 1; xx < w - 1; xx++) {
        var q = yy * w + xx;
        if (labels[q] !== best.label) continue;
        if (labels[q - 1] !== best.label || labels[q + 1] !== best.label ||
            labels[q - w] !== best.label || labels[q + w] !== best.label) {
          pts.push([xx, yy]);
        }
      }
    }
    if (pts.length < 20) return null;

    var hull = convexHull(pts);
    if (hull.length < 4) return null;
    if (hull.length > 48) hull = thinHull(hull, 48);

    var quad = maxAreaQuad(hull);
    if (!quad) return null;

    var d = function (a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); };
    var sides = [d(quad[0], quad[1]), d(quad[1], quad[2]), d(quad[2], quad[3]), d(quad[3], quad[0])];
    var s02 = (sides[0] + sides[2]) / 2, s13 = (sides[1] + sides[3]) / 2;
    var ratio = Math.min(s02, s13) / Math.max(s02, s13);
    if (ratio < 0.2 || ratio > 0.55) return null;
    var qa = polyArea(quad);
    var fit = qa / best.size;              // hvor firkantet komponenten er
    if (fit < 0.7 || fit > 1.45) return null;

    // INDHOLDS-TJEK: en ægte seddel har trykt tekst indeni – lyse striber i
    // borde/marmor har ikke. Mål andelen af mørke pixels inde i firkanten.
    var minX = CARD_W, maxX = 0, minY = CARD_H, maxY = 0, qi;
    for (qi = 0; qi < 4; qi++) {
      minX = Math.min(minX, quad[qi][0]); maxX = Math.max(maxX, quad[qi][0]);
      minY = Math.min(minY, quad[qi][1]); maxY = Math.max(maxY, quad[qi][1]);
    }
    function inQuad(px, py) {
      var sign = 0;
      for (var e = 0; e < 4; e++) {
        var a1 = quad[e], b1 = quad[(e + 1) % 4];
        var cr = (b1[0] - a1[0]) * (py - a1[1]) - (b1[1] - a1[1]) * (px - a1[0]);
        var sg = cr > 0 ? 1 : -1;
        if (sign === 0) sign = sg;
        else if (sg !== sign) return false;
      }
      return true;
    }
    var darkT = t * 0.7;
    var darkC = 0, totC = 0;
    for (var sy2 = Math.max(0, minY | 0); sy2 <= Math.min(h - 1, maxY | 0); sy2 += 3) {
      for (var sx2 = Math.max(0, minX | 0); sx2 <= Math.min(w - 1, maxX | 0); sx2 += 3) {
        if (!inQuad(sx2, sy2)) continue;
        totC++;
        if (gray[sy2 * w + sx2] < darkT) darkC++;
      }
    }
    var darkFrac = totC ? darkC / totC : 0;
    if (darkFrac < 0.03 || darkFrac > 0.35) return null;

    // kvalitet: firkantethed + hvor tæt sideforholdet er på kortets (0.354)
    var quality = -Math.abs(1 - fit) - Math.abs(ratio - 0.354);
    return { quad: orderQuad(quad), quality: quality };
  }

  // Returnerer { quad } eller { clipped: true } eller null.
  // Prøver flere tærskler – lyse borde (træ) kræver højere tærskel end Otsu.
  function findCardQuadEx(gray, w, h) {
    var cands = [otsu(gray), percentile(gray, 0.80), percentile(gray, 0.86),
                 percentile(gray, 0.91), percentile(gray, 0.95)];
    // dedup
    cands = cands.filter(function (t, i) { return cands.indexOf(t) === i; });
    var best = null, sawClipped = false;
    for (var i = 0; i < cands.length; i++) {
      var r = tryThreshold(gray, w, h, cands[i]);
      if (!r) continue;
      if (r.clipped) { sawClipped = true; continue; }
      if (!best || r.quality > best.quality) best = r;
    }
    if (best) return { quad: best.quad };
    if (sawClipped) return { clipped: true };
    return null;
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

  function maxAreaQuad(hull) {
    var n = hull.length;
    if (n === 4) return hull.slice();
    var best = 0, bq = null;
    for (var a = 0; a < n - 3; a++) {
      for (var b = a + 1; b < n - 2; b++) {
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

  function orderQuad(quad) {
    var cx = 0, cy = 0, i;
    for (i = 0; i < 4; i++) { cx += quad[i][0] / 4; cy += quad[i][1] / 4; }
    var sorted = quad.slice().sort(function (a, b) {
      return Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx);
    });
    var d = function (a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); };
    var s01 = d(sorted[0], sorted[1]) + d(sorted[2], sorted[3]);
    var s12 = d(sorted[1], sorted[2]) + d(sorted[3], sorted[0]);
    var q;
    if (s01 < s12) q = sorted;
    else q = [sorted[1], sorted[2], sorted[3], sorted[0]];
    var topY = (q[0][1] + q[1][1]) / 2, botY = (q[2][1] + q[3][1]) / 2;
    if (topY > botY) q = [q[2], q[3], q[0], q[1]];
    if (q[0][0] > q[1][0]) q = [q[1], q[0], q[3], q[2]];
    return q;
  }

  /* ================= homografi & warp ================= */

  // H: kanonisk (dst) → kilde. srcPts/dstPts: 4 korrespondancer
  function homography4(dstPts, srcPts) {
    var A = [], b = [];
    for (var i = 0; i < 4; i++) {
      var x = dstPts[i][0], y = dstPts[i][1], X = srcPts[i][0], Y = srcPts[i][1];
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

  function warpWithH(gray, w, h, H) {
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
        out[y * CARD_W + x] = gray[p] * (1 - fx) * (1 - fy) + gray[p + 1] * fx * (1 - fy) +
          gray[p + w] * (1 - fx) * fy + gray[p + w + 1] * fx * fy;
      }
    }
    return out;
  }

  function warpToCanonical(gray, w, h, quad) {
    var H = homography4(
      [[0, 0], [CARD_W, 0], [CARD_W, CARD_H], [0, CARD_H]], quad);
    return H ? warpWithH(gray, w, h, H) : null;
  }

  /* ================= QR-detektion (multi-skala) =================
     jsQR afkoder ofte bedst ved ~800 px bredde (blur udjævner modulerne).
     Returnerer hjørner skaleret tilbage til input-opløsningen. */

  function grayToRgbaScaled(gray, w, h, tw) {
    var f = tw / w, th = Math.round(h * f);
    var out = new Uint8ClampedArray(tw * th * 4);
    for (var y = 0; y < th; y++) {
      var sy = Math.min(h - 1, Math.round(y / f));
      for (var x = 0; x < tw; x++) {
        var v = gray[sy * w + Math.min(w - 1, Math.round(x / f))];
        var p = (y * tw + x) * 4;
        out[p] = out[p + 1] = out[p + 2] = v; out[p + 3] = 255;
      }
    }
    return { data: out, w: tw, h: th, f: f };
  }

  function detectQRMultiscale(gray, w, h, qrDecode) {
    var widths = [800, 1200, w].filter(function (tw) { return tw <= w; });
    if (widths.length === 0) widths = [w];
    for (var i = 0; i < widths.length; i++) {
      var s = grayToRgbaScaled(gray, w, h, widths[i]);
      var r = null;
      try { r = qrDecode(s.data, s.w, s.h); } catch (e) { r = null; }
      if (r && r.location) {
        var L = r.location, inv = 1 / s.f;
        var sc = function (c) { return { x: c.x * inv, y: c.y * inv }; };
        return {
          topLeftCorner: sc(L.topLeftCorner),
          topRightCorner: sc(L.topRightCorner),
          bottomRightCorner: sc(L.bottomRightCorner),
          bottomLeftCorner: sc(L.bottomLeftCorner)
        };
      }
    }
    return null;
  }

  /* ============== kant-finjustering af homografi ==============
     H0 (fx fra QR) giver et groft estimat. Vi finder papirets fire
     kanter præcist i kildebilledet med step-filter på tværs af hver
     forudsagt kant og bygger en nøjagtig homografi af hjørnerne. */

  function mapH(H, x, y) {
    var den = H[6] * x + H[7] * y + 1;
    return [(H[0] * x + H[1] * y + H[2]) / den, (H[3] * x + H[4] * y + H[5]) / den];
  }

  function fitLinePCA(pts) {
    var n = pts.length, cx = 0, cy = 0, i;
    for (i = 0; i < n; i++) { cx += pts[i][0] / n; cy += pts[i][1] / n; }
    var sxx = 0, sxy = 0, syy = 0;
    for (i = 0; i < n; i++) {
      var ux = pts[i][0] - cx, uy = pts[i][1] - cy;
      sxx += ux * ux; sxy += ux * uy; syy += uy * uy;
    }
    var th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    return { px: cx, py: cy, dx: Math.cos(th), dy: Math.sin(th) };
  }

  function lineDist(l, p) {
    return Math.abs((p[0] - l.px) * (-l.dy) + (p[1] - l.py) * l.dx);
  }

  function lineIntersect(a, b) {
    var det = a.dx * (-b.dy) - a.dy * (-b.dx);
    var det2 = a.dx * b.dy - a.dy * b.dx;
    if (Math.abs(det2) < 1e-9) return null;
    var t = ((b.px - a.px) * b.dy - (b.py - a.py) * b.dx) / det2;
    return [a.px + a.dx * t, a.py + a.dy * t];
  }

  // find én kant: canonical-kantens punkter mappes via H0, og papirkanten
  // søges langs normalen med et step-filter (lyst papir -> mørkere bord)
  // nIn: kantens indad-normal i kanonisk rum, fx (0,1) for topkanten
  function refineEdge(gray, w, h, H0, e0, e1, R, diag, nIn, minInl) {
    R = R || 55;
    minInl = minInl || 10;
    var pts = [];
    var dirPred = null;
    for (var t = 0.05; t <= 0.951; t += 0.028) {
      var cx = e0[0] + (e1[0] - e0[0]) * t;
      var cy = e0[1] + (e1[1] - e0[1]) * t;
      var c = mapH(H0, cx, cy);
      // udad-normal i kilden = billedet af den kanoniske normal
      var inw = mapH(H0, cx + nIn[0] * 30, cy + nIn[1] * 30);
      var nx = c[0] - inw[0], ny = c[1] - inw[1];
      var nl = Math.hypot(nx, ny);
      if (nl < 1e-6) continue;
      nx /= nl; ny /= nl;
      if (!dirPred) dirPred = [-ny, nx];
      // profil langs normalen
      var prof = [];
      for (var o = -R; o <= R; o++) {
        var x = Math.round(c[0] + nx * o), y = Math.round(c[1] + ny * o);
        if (x < 0) x = 0; if (y < 0) y = 0;
        if (x >= w) x = w - 1; if (y >= h) y = h - 1;
        prof.push(gray[y * w + x]);
      }
      // step-filter: indersiden lys, ydersiden mørkere (blød skygge tålt: j=2..8)
      var scores = [];
      var bestScore = -1;
      for (var k = 9; k < prof.length - 9; k++) {
        var innerM = 0, outerM = 0;
        for (var j = 2; j <= 8; j++) { innerM += prof[k - j]; outerM += prof[k + j]; }
        var sc = (innerM - outerM) / 7;
        scores.push(sc);
        if (sc > bestScore) bestScore = sc;
      }
      // vælg det YDERSTE stærke step: papirkanten er den sidste overgang
      // (ellers fanges mørk tryktekst inde på kortet, fx headeren)
      if (bestScore > 5.5) {
        var need = Math.max(5.5, bestScore * 0.45);
        for (var k2 = scores.length - 1; k2 >= 0; k2--) {
          if (scores[k2] > need) {
            // lokal top: gå til nabomaks
            while (k2 > 0 && scores[k2 - 1] > scores[k2]) k2--;
            var off = (k2 + 9) - R;
            pts.push([c[0] + nx * off, c[1] + ny * off]);
            break;
          }
        }
      }
    }
    if (diag) diag.pts = pts.length;
    if (pts.length < 12) return null;

    // RANSAC med retnings-prior: træårer/skygger giver kollineære outliers,
    // men kun papirkanten har mange punkter i nogenlunde den forudsagte retning
    var bestInliers = null;
    for (var i = 0; i < pts.length - 1; i++) {
      for (var j = i + 1; j < pts.length; j++) {
        var ddx = pts[j][0] - pts[i][0], ddy = pts[j][1] - pts[i][1];
        var dl = Math.hypot(ddx, ddy);
        if (dl < 30) continue;
        ddx /= dl; ddy /= dl;
        if (Math.abs(ddx * dirPred[0] + ddy * dirPred[1]) < 0.86) continue;   // ±30° (H0 kan være noget skæv)
        var cand = { px: pts[i][0], py: pts[i][1], dx: ddx, dy: ddy };
        var inl = [];
        for (var k = 0; k < pts.length; k++) {
          if (lineDist(cand, pts[k]) < 3.0) inl.push(pts[k]);
        }
        if (!bestInliers || inl.length > bestInliers.length) bestInliers = inl;
      }
    }
    if (diag) diag.inliers = bestInliers ? bestInliers.length : 0;
    if (!bestInliers || bestInliers.length < minInl) return null;
    var line = fitLinePCA(bestInliers);
    var kept = pts.filter(function (p) { return lineDist(line, p) < 3.0; });
    if (diag) diag.kept = kept.length;
    if (kept.length < minInl) return null;
    line = fitLinePCA(kept);
    var dot = Math.abs(line.dx * dirPred[0] + line.dy * dirPred[1]);
    if (diag) diag.dot = Math.round(dot * 1000) / 1000;
    if (dot < 0.86) return null;
    return line;
  }

  // homografi via mindste kvadraters DLT over vilkårligt antal korrespondancer
  function homographyLS(dstPts, srcPts, weights) {
    var N = new Array(8), rhs = new Array(8), i, j, k;
    for (i = 0; i < 8; i++) { N[i] = new Array(8).fill(0); rhs[i] = 0; }
    for (k = 0; k < dstPts.length; k++) {
      var x = dstPts[k][0], y = dstPts[k][1], X = srcPts[k][0], Y = srcPts[k][1];
      var wgt = weights ? weights[k] : 1;
      var rows = [
        [[x, y, 1, 0, 0, 0, -x * X, -y * X], X],
        [[0, 0, 0, x, y, 1, -x * Y, -y * Y], Y]
      ];
      for (var r = 0; r < 2; r++) {
        var a = rows[r][0], b = rows[r][1];
        for (i = 0; i < 8; i++) {
          for (j = 0; j < 8; j++) N[i][j] += wgt * a[i] * a[j];
          rhs[i] += wgt * a[i] * b;
        }
      }
    }
    var hh = solve8(N, rhs);
    if (!hh) return null;
    return [hh[0], hh[1], hh[2], hh[3], hh[4], hh[5], hh[6], hh[7], 1];
  }

  var EDGES = {
    top:    { e: [[0, 0], [CARD_W, 0]],           nIn: [0, 1] },
    right:  { e: [[CARD_W, 0], [CARD_W, CARD_H]], nIn: [-1, 0] },
    bottom: { e: [[CARD_W, CARD_H], [0, CARD_H]], nIn: [0, -1] },
    left:   { e: [[0, CARD_H], [0, 0]],           nIn: [1, 0] }
  };

  function refineHomographyPass(gray, w, h, H0, qrSrc, R, minInl) {
    var L = {};
    var found = 0;
    for (var name in EDGES) {
      L[name] = refineEdge(gray, w, h, H0, EDGES[name].e[0], EDGES[name].e[1], R, null, EDGES[name].nIn, minInl);
      if (L[name]) found++;
    }
    if (found === 4) {
      var TL = lineIntersect(L.top, L.left), TR = lineIntersect(L.top, L.right);
      var BR = lineIntersect(L.bottom, L.right), BL = lineIntersect(L.bottom, L.left);
      if (TL && TR && BR && BL) {
        var H = homography4([[0, 0], [CARD_W, 0], [CARD_W, CARD_H], [0, CARD_H]], [TL, TR, BR, BL]);
        if (H) return { H: H, edges: 4 };
      }
    }
    if (found >= 2 && qrSrc) {
      // brug de fundne hjørner + QR-hjørnerne i en LS-homografi
      var dst = [], src = [], wts = [];
      var cornerDefs = [
        ['top', 'left', [0, 0]], ['top', 'right', [CARD_W, 0]],
        ['bottom', 'right', [CARD_W, CARD_H]], ['bottom', 'left', [0, CARD_H]]
      ];
      for (var cd = 0; cd < cornerDefs.length; cd++) {
        var l1 = L[cornerDefs[cd][0]], l2 = L[cornerDefs[cd][1]];
        if (l1 && l2) {
          var pt = lineIntersect(l1, l2);
          if (pt) { dst.push(cornerDefs[cd][2]); src.push(pt); wts.push(3); }
        }
      }
      for (var qi = 0; qi < 4; qi++) { dst.push(QR_DST[qi]); src.push(qrSrc[qi]); wts.push(1); }
      if (dst.length >= 5) {
        var H2 = homographyLS(dst, src, wts);
        if (H2) return { H: H2, edges: found };
      }
    }
    return null;
  }

  /* H0 fra QR er præcis nær QR'en (bunden) men kan være hundredvis af px
     forkert i toppen. Strategi: ITERÉR – hvert pas forbedrer H, hvilket får
     flere kant-punkter til at ramme rigtigt i næste pas. Til sidst forsøges
     et geometrisk top-gæt, hvis toppen stadig mangler. */
  function refineHomography(gray, w, h, H0, qrSrc) {
    var cur = H0, result = null;
    for (var it = 0; it < 3; it++) {
      var p = refineHomographyPass(gray, w, h, cur, qrSrc, it === 0 ? 60 : 30, it === 0 ? 7 : 10);
      if (!p) break;
      result = p; cur = p.H;
      if (p.edges === 4 && it >= 1) break;
    }
    var g = geometricTopFix(gray, w, h, cur, qrSrc);
    if (g) result = g;
    return result;
  }

  function geometricTopFix(gray, w, h, H0, qrSrc) {
    var bottom = refineEdge(gray, w, h, H0, EDGES.bottom.e[0], EDGES.bottom.e[1], 30, null, EDGES.bottom.nIn);
    var left = refineEdge(gray, w, h, H0, EDGES.left.e[0], EDGES.left.e[1], 30, null, EDGES.left.nIn);
    var right = refineEdge(gray, w, h, H0, EDGES.right.e[0], EDGES.right.e[1], 30, null, EDGES.right.nIn);

    var H1 = null;
    if (bottom && left && right) {
      var BL = lineIntersect(bottom, left);
      var BR = lineIntersect(bottom, right);
      if (BL && BR) {
        // opad-retning: fra bundlinjen mod QR-centret og videre
        var qc = [(qrSrc[0][0] + qrSrc[2][0]) / 2, (qrSrc[0][1] + qrSrc[2][1]) / 2];
        function upDir(line, from) {
          var d = [line.dx, line.dy];
          var toQ = [qc[0] - from[0], qc[1] - from[1]];
          if (d[0] * toQ[0] + d[1] * toQ[1] < 0) d = [-d[0], -d[1]];
          return d;
        }
        var uL = upDir(left, BL), uR = upDir(right, BR);
        var bw = Math.hypot(BR[0] - BL[0], BR[1] - BL[1]);
        var Lest = bw * (CARD_H / CARD_W);
        var TLg = [BL[0] + uL[0] * Lest, BL[1] + uL[1] * Lest];
        var TRg = [BR[0] + uR[0] * Lest, BR[1] + uR[1] * Lest];
        var Hg = homography4([[0, 0], [CARD_W, 0], [CARD_W, CARD_H], [0, CARD_H]], [TLg, TRg, BR, BL]);
        if (Hg) {
          var top = refineEdge(gray, w, h, Hg, EDGES.top.e[0], EDGES.top.e[1], 110, null, EDGES.top.nIn);
          if (top) {
            var TL = lineIntersect(top, left), TR = lineIntersect(top, right);
            if (TL && TR) {
              // plausibilitet: højde/bredde skal ligne kortets (2.824) – ellers
              // har toplinjen låst sig på header-teksten inde på kortet
              var hgt = (Math.hypot(TL[0] - BL[0], TL[1] - BL[1]) + Math.hypot(TR[0] - BR[0], TR[1] - BR[1])) / 2;
              var ratio = hgt / bw;
              if (ratio > 2.5 && ratio < 3.2) {
                H1 = homography4([[0, 0], [CARD_W, 0], [CARD_W, CARD_H], [0, CARD_H]], [TL, TR, BR, BL]);
              }
            }
          }
        }
      }
    }

    if (!H1) return null;

    // finpudsning med snævert vindue
    var p2 = refineHomographyPass(gray, w, h, H1, qrSrc, 14);
    if (p2 && p2.edges >= 3) return { H: p2.H, edges: 4 };
    return { H: H1, edges: 4 };
  }

  /* ================= orientering ================= */

  function meanLum(canon, x0, y0, x1, y1) {
    var t = 0, n = 0;
    for (var y = y0; y < y1; y += 2) {
      for (var x = x0; x < x1; x += 2) {
        t += canon[y * CARD_W + x];
        n++;
      }
    }
    return n ? t / n : 255;
  }

  // QR-området er markant mørkere end den spejlede position (headeren).
  // Sammenlign relativt – ingen fast tærskel, så det virker i alt lys.
  function isUpsideDown(canon) {
    var mNormal = meanLum(canon, QR_BOX.x0, QR_BOX.y0, QR_BOX.x1, QR_BOX.y1);
    var mFlipped = meanLum(canon, CARD_W - QR_BOX.x1, CARD_H - QR_BOX.y1, CARD_W - QR_BOX.x0, CARD_H - QR_BOX.y0);
    return mFlipped < mNormal;
  }

  /* ================= registrering (auto-finjustering) =================
     Efter warp kan felterne sidde en anelse forkert (upræcise hjørner,
     let afskåret seddel, layout-tolerancer i trykket). Vi finder den
     (skalaY, forskydningY, forskydningX), der får felternes trykte
     rammer til at score højest – med et hurtigt "mørke-kort". */

  function buildDarkMap(canon) {
    // baggrund ≈ box-blur (integralbillede), D = hvor meget mørkere end bg
    var W = CARD_W, H = CARD_H;
    var integ = new Float64Array((W + 1) * (H + 1));
    for (var y = 0; y < H; y++) {
      var rowsum = 0;
      for (var x = 0; x < W; x++) {
        rowsum += canon[y * W + x];
        integ[(y + 1) * (W + 1) + (x + 1)] = integ[y * (W + 1) + (x + 1)] + rowsum;
      }
    }
    var R = 24;
    var D = new Uint8ClampedArray(W * H);
    for (var yy = 0; yy < H; yy++) {
      var y0 = Math.max(0, yy - R), y1 = Math.min(H, yy + R + 1);
      for (var xx = 0; xx < W; xx++) {
        var x0 = Math.max(0, xx - R), x1 = Math.min(W, xx + R + 1);
        var area = (x1 - x0) * (y1 - y0);
        var s = integ[y1 * (W + 1) + x1] - integ[y0 * (W + 1) + x1] -
                integ[y1 * (W + 1) + x0] + integ[y0 * (W + 1) + x0];
        var bg = s / area;
        var diff = bg * 0.97 - canon[yy * W + xx];
        D[yy * W + xx] = diff > 0 ? (diff > 30 ? 30 : diff) : 0;
      }
    }
    return D;
  }

  // Score for én kvadrat-ramme: alle FIRE sider skal være mørke, ellers ~0.
  // (tekst-linjer giver kun mørke top/bund – min-siden filtrerer dem fra)
  function ringScoreD(D, bx, by, s) {
    bx = Math.round(bx); by = Math.round(by);
    if (bx < 0 || by < 0 || bx + s >= CARD_W || by + s >= CARD_H) return 0;
    var top = 0, bot = 0, lef = 0, rig = 0, n = 0;
    for (var i = 0; i < s; i += 2) {
      top += D[by * CARD_W + bx + i];
      bot += D[(by + s - 1) * CARD_W + bx + i];
      lef += D[(by + i) * CARD_W + bx];
      rig += D[(by + i) * CARD_W + bx + s - 1];
      n++;
    }
    var mn = Math.min(top, bot, lef, rig) / n;
    var avg = (top + bot + lef + rig) / (4 * n);
    return mn * 0.6 + avg * 0.4;
  }

  // Fire siders D-score for et kvadrat – bruges til kandidat-detektion
  function ringSidesD(D, bx, by, s) {
    if (bx < 0 || by < 0 || bx + s >= CARD_W || by + s >= CARD_H) return { min: 0, avg: 0 };
    var top = 0, bot = 0, lef = 0, rig = 0;
    for (var i = 0; i < s; i++) {
      top += D[by * CARD_W + bx + i];
      bot += D[(by + s - 1) * CARD_W + bx + i];
      lef += D[(by + i) * CARD_W + bx];
      rig += D[(by + i) * CARD_W + bx + s - 1];
    }
    return {
      min: Math.min(top, bot, lef, rig) / s,
      avg: (top + bot + lef + rig) / (4 * s)
    };
  }

  /* Find alle "kvadrat-kandidater" (trykte felt-rammer) i venstre kolonne.
     Datadrevet – tåler linseforvrængning og unøjagtig warp. */
  function detectCandidates(D) {
    var cands = [];
    function scan(x0, x1, y0, y1, s, minMin, minAvg) {
      for (var y = y0; y < y1; y += 2) {
        for (var x = x0; x < x1; x += 2) {
          var sc = ringSidesD(D, x, y, s);
          if (sc.min > minMin && sc.avg > minAvg) {
            // lokal finjustering ±2
            var best = sc, bx = x, by = y;
            for (var dy = -2; dy <= 2; dy++) {
              for (var dx = -2; dx <= 2; dx++) {
                var sc2 = ringSidesD(D, x + dx, y + dy, s);
                if (sc2.min * 0.6 + sc2.avg * 0.4 > best.min * 0.6 + best.avg * 0.4) {
                  best = sc2; bx = x + dx; by = y + dy;
                }
              }
            }
            cands.push({ x: bx, y: by, s: s, score: best.min * 0.6 + best.avg * 0.4 });
          }
        }
      }
    }
    scan(15, 130, 340, 1720, 25, 2.6, 4.2);   // menuens 19 felter
    scan(0, 230, 1780, 1955, 19, 2.6, 4.2);   // Pisket smør + Nutella
    // non-max suppression
    cands.sort(function (a, b) { return b.score - a.score; });
    var kept = [];
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i], ok = true;
      for (var j = 0; j < kept.length; j++) {
        if (Math.abs(c.x - kept[j].x) < 16 && Math.abs(c.y - kept[j].y) < 16) { ok = false; break; }
      }
      if (ok) kept.push(c);
    }
    return kept;
  }

  /* Match kandidater til det kendte mønster med 1D-Hough over (skala, offset) i y */
  function matchPattern(cands) {
    var menu = BOXES.filter(function (b) { return !b.extra; });
    var menuCands = cands.filter(function (c) { return c.s === 25; });
    var best = { votes: -1, scale: 1, off: 0 };
    for (var scale = 0.86; scale <= 1.145; scale += 0.005) {
      var offs = [];
      for (var i = 0; i < menuCands.length; i++) {
        for (var j = 0; j < menu.length; j++) {
          offs.push(menuCands[i].y - scale * menu[j].y);
        }
      }
      offs.sort(function (a, b) { return a - b; });
      // glidende vindue ±6
      var k0 = 0;
      for (var k1 = 0; k1 < offs.length; k1++) {
        while (offs[k1] - offs[k0] > 12) k0++;
        var votes = k1 - k0 + 1;
        if (votes > best.votes) {
          best = { votes: votes, scale: scale, off: (offs[k0] + offs[k1]) / 2 };
        }
      }
    }
    // tildel kandidater til felter
    var assign = {};   // id -> {x,y,fromCandidate}
    var usedCand = {};
    var matchedMenu = [];
    for (var m = 0; m < menu.length; m++) {
      var ey = best.scale * menu[m].y + best.off;
      var bi = -1, bd = 14;
      for (var c = 0; c < menuCands.length; c++) {
        if (usedCand[c]) continue;
        var d = Math.abs(menuCands[c].y - ey);
        if (d < bd) { bd = d; bi = c; }
      }
      if (bi >= 0) {
        usedCand[bi] = true;
        assign[menu[m].id] = { x: menuCands[bi].x, y: menuCands[bi].y, matched: true };
        matchedMenu.push({ box: menu[m], cand: menuCands[bi] });
      }
    }
    // x-drift: lineær fit x = a*y + b over matchede felter
    var a = 0, b0 = 0;
    if (matchedMenu.length >= 3) {
      var sy_ = 0, sx_ = 0, syy = 0, sxy = 0, n = matchedMenu.length;
      for (var t = 0; t < n; t++) {
        var dyv = matchedMenu[t].cand.y;
        var dxv = matchedMenu[t].cand.x - matchedMenu[t].box.x;
        sy_ += dyv; sx_ += dxv; syy += dyv * dyv; sxy += dyv * dxv;
      }
      var den = n * syy - sy_ * sy_;
      a = den !== 0 ? (n * sxy - sy_ * sx_) / den : 0;
      b0 = (sx_ - a * sy_) / n;
    }
    // umatchede menufelter: forudsig position
    for (var m2 = 0; m2 < menu.length; m2++) {
      if (assign[menu[m2].id]) continue;
      var py = best.scale * menu[m2].y + best.off;
      assign[menu[m2].id] = { x: Math.round(menu[m2].x + a * py + b0), y: Math.round(py), matched: false };
    }
    // ekstra-felter (s=19): match mod forudsigelse, ellers forudsig
    var extraCands = cands.filter(function (c) { return c.s === 19; });
    BOXES.filter(function (bx) { return bx.extra; }).forEach(function (e) {
      var pey = best.scale * e.y + best.off;
      var pex = e.x + a * pey + b0;
      var bi2 = -1, bd2 = 18;
      for (var c2 = 0; c2 < extraCands.length; c2++) {
        var d2 = Math.hypot(extraCands[c2].y - pey, extraCands[c2].x - pex);
        if (d2 < bd2) { bd2 = d2; bi2 = c2; }
      }
      if (bi2 >= 0) assign[e.id] = { x: extraCands[bi2].x, y: extraCands[bi2].y, matched: true };
      else assign[e.id] = { x: Math.round(pex), y: Math.round(pey), matched: false };
    });
    return { assign: assign, votes: best.votes, scale: best.scale, off: best.off };
  }

  /* ================= aflæsning af felter ================= */

  function localBg(canon, bx, by, s) {
    var vals = [];
    var pad = 16;
    for (var y = by - pad; y < by + s + pad; y += 2) {
      for (var x = bx - pad; x < bx + s + pad; x += 2) {
        if (x >= bx - 6 && x < bx + s + 6 && y >= by - 6 && y < by + s + 6) continue;
        if (x < 0 || y < 0 || x >= CARD_W || y >= CARD_H) continue;
        vals.push(canon[y * CARD_W + x]);
      }
    }
    return vals.length ? median(vals) : 220;
  }

  function ringScore(canon, bx, by, s, bg) {
    if (bx < 0 || by < 0 || bx + s >= CARD_W || by + s >= CARD_H) return 0;
    var top = 0, bot = 0, lef = 0, rig = 0;
    function v(x, y) {
      var diff = bg - canon[y * CARD_W + x];
      return diff > 0 ? Math.min(diff, 28) : 0;
    }
    for (var i = 0; i < s; i++) {
      top += v(bx + i, by); bot += v(bx + i, by + s - 1);
      lef += v(bx, by + i); rig += v(bx + s - 1, by + i);
    }
    var mn = Math.min(top, bot, lef, rig) / s;
    var avg = (top + bot + lef + rig) / (4 * s);
    return mn * 0.6 + avg * 0.4;
  }

  // gennemsnitlig mørke i venstre-marginen (skal være tom ved den ægte ramme)
  function marginDark(D, bx, by, s) {
    var t = 0, n = 0;
    for (var y = by + 3; y < by + s - 3; y += 2) {
      if (y < 0 || y >= CARD_H) continue;
      for (var x = bx - 15; x <= bx - 5; x += 2) {
        if (x < 0 || x >= CARD_W) continue;
        t += Math.min(D[y * CARD_W + x], 20); n++;
      }
    }
    return n ? t / n : 20;
  }

  function readBox(canon, D, pos, box, searchRx, searchRy) {
    var s = box.s;
    var Rx = searchRx || 7, Ry = searchRy || searchRx || 7;
    var px = Math.round(pos.x), py = Math.round(pos.y);   // heltal – ellers giver array-opslag undefined
    var bg = localBg(canon, px, py, s);
    var best = -Infinity, bestRing = 0, bx = px, by = py;
    for (var dy = -Ry; dy <= Ry; dy++) {
      for (var dx = -Rx; dx <= Rx; dx++) {
        var ring = ringScore(canon, px + dx, py + dy, s, bg);
        var sc = ring - 0.55 * marginDark(D, px + dx, py + dy, s);
        if (sc > best) { best = sc; bestRing = ring; bx = px + dx; by = py + dy; }
      }
    }
    var borderFound = bestRing > 2.0;
    var inkThresh = Math.max(16, bg * 0.14);
    function dark(x, y) {
      if (x < 0 || y < 0 || x >= CARD_W || y >= CARD_H) return false;
      return bg - canon[y * CARD_W + x] > inkThresh;
    }
    // indre af feltet (uden trykt ramme)
    var inset = Math.max(3, Math.round(s * 0.16));
    var darkIn = 0, totIn = 0, x, y;
    for (y = by + inset; y < by + s - inset; y++) {
      for (x = bx + inset; x < bx + s - inset; x++) {
        if (dark(x, y)) darkIn++;
        totIn++;
      }
    }
    // halo: kun VENSTRE for feltet (dér lander forskudte krydser).
    // Top/bund medregnes ikke – nabofelters kryds-overløb gav falske positive.
    var padL = box.extra ? 16 : 12, padT = 2, padB = 2, padR = 0;
    var darkHalo = 0, totHalo = 0;
    for (y = by - padT; y < by + s + padB; y++) {
      for (x = bx - padL; x < bx + s + padR; x++) {
        if (x >= bx - 2 && x < bx + s + 2 && y >= by - 2 && y < by + s + 2) continue;
        if (x < 0 || y < 0 || x >= CARD_W || y >= CARD_H) continue;
        if (dark(x, y)) darkHalo++;
        totHalo++;
      }
    }
    var fracIn = totIn ? darkIn / totIn : 0;
    var fracHalo = totHalo ? darkHalo / totHalo : 0;
    return {
      fracIn: fracIn, fracHalo: fracHalo,
      borderFound: borderFound, bx: bx, by: by, bg: bg, ringScore: bestRing
    };
  }

  /**
   * Aflæs et kanonisk warpet kort.
   * sensitivity: 0.5–2.0 (1 = standard). wide: bredere registrering (QR-fallback).
   */
  /* ---- indholds-ankre: QR-blok og teksttop ---- */

  var QR_CY = (QR_BOX.y0 + QR_BOX.y1) / 2;   // 1803
  var CONTENT_TOP_REF = 88;                  // "CAFÉ KAISERS"-linjens start på referencekortet

  // find QR-blokken (massiv mørk firkant) omkring den forventede position
  function findQRBlock(D) {
    function regionScore(dx, dy) {
      var t = 0, n = 0;
      for (var y = QR_BOX.y0 + dy; y < QR_BOX.y1 + dy; y += 4) {
        if (y < 0 || y >= CARD_H) return 0;
        for (var x = QR_BOX.x0 + dx; x < QR_BOX.x1 + dx; x += 4) {
          if (x < 0 || x >= CARD_W) return 0;
          t += D[y * CARD_W + x]; n++;
        }
      }
      return n ? t / n : 0;
    }
    var best = { score: -1, dx: 0, dy: 0 };
    for (var dy = -280; dy <= 280; dy += 4) {
      for (var dx = -70; dx <= 70; dx += 5) {
        var sc = regionScore(dx, dy);
        if (sc > best.score) best = { score: sc, dx: dx, dy: dy };
      }
    }
    for (var dy2 = best.dy - 4; dy2 <= best.dy + 4; dy2++) {
      for (var dx2 = best.dx - 5; dx2 <= best.dx + 5; dx2++) {
        var sc2 = regionScore(dx2, dy2);
        if (sc2 > best.score) best = { score: sc2, dx: dx2, dy: dy2 };
      }
    }
    return best;
  }

  // find første indholdsrække ("CAFÉ KAISERS") efter et rent mellemrum –
  // ignorerer mørke kant-artefakter allerøverst
  function findContentTop(D) {
    var frac = [];
    for (var y = 0; y < 420; y++) {
      var t = 0, n = 0;
      for (var x = 80; x < 620; x += 3) { if (D[y * CARD_W + x] > 10) t++; n++; }
      frac.push(t / n);
    }
    for (var y2 = 30; y2 < 400; y2++) {
      if (frac[y2] > 0.08 && frac[y2 + 1] > 0.08 && frac[y2 + 2] > 0.06) {
        var gapOk = true, gsum = 0, gn = 0;
        for (var g = Math.max(0, y2 - 30); g < y2 - 4; g++) { gsum += frac[g]; gn++; }
        if (gn > 0 && gsum / gn < 0.03) return y2;
      }
    }
    return null;
  }

  /* ---- DTW-registrering af rækkeprofilen ----
     Referenceprofil: mørke-andel pr. række (trin 2 px, udglattet, skaleret),
     målt på det oprettede referencekort. 1000 tegn, alfabet chr(48+v/2). */
  var ROW_PROFILE_REF = '97AADCA9?LRX_aa`@00000000000000000000000003;?<;==<@=600000003BMKDCEHIFDGMI;0000000000001:N[]]_^VD400015=EKHF<200000000014<HVYXRJ=30000000000004>IXaaa]Q@310000015@NTPPJ@310000012459SYJ32222222210000000588788768851100000001345:BHEFD>522110000000111128AGCEB>541000000012325=KZa[WNA5200000000358<JTWSRG;321000014<A?>=9310000002225=HV]\\YSE72000000000000000000000004=A>;<=<<??810000011237<DOXYVRG:21221000000012336=BDBC?822200000000000124:AISYWQI>511221000000000000000000000016;<::;::;<820000000000124;CJLKHD>720021100000137=BGOUWRJ@721210000000036:?DKMID?:522100112369?EJNMID>7210220001247<BEHJMNNJF@:522100000000000049;98899:<;5100000012334459=CGJHFB<620001222345668<ADGJKIC?:5211110123457;@DGILLJD?;632210001479;;863100000000000001479989999:951023458<?ACEFGJJGC?:5210013689<>?=:863001234458<?ABDGHKJGA=8532221001379:986554469<?BEFFHIHHD?;84200111000000000013543322111127;>??@CHMPRQNNOPMJJJKNQRPLJIIGFFEA@BHMNNRY]ZWTROPRUVUTTSQMG@>>???==;<>?>;:97642100000000000111237::;<===<==????<96765348:;<>?@?=975335';
  var REF_PROFILE = (function () {
    var out = new Float32Array(ROW_PROFILE_REF.length);
    for (var i = 0; i < ROW_PROFILE_REF.length; i++) out[i] = (ROW_PROFILE_REF.charCodeAt(i) - 48) * 2;
    return out;
  })();

  // Kanal B (reference): 20 i felternes rækker, 0 udenfor – låser rækkeidentitet
  var REF_PROFILE_B = (function () {
    var N = REF_PROFILE.length;
    var b = new Float32Array(N);
    for (var i = 0; i < BOXES.length; i++) {
      var y0 = Math.round(BOXES[i].y / 2), y1 = Math.round((BOXES[i].y + BOXES[i].s) / 2);
      for (var y = y0; y <= y1 && y < N; y++) b[y] = 20;
    }
    var out = new Float32Array(N);
    for (var i2 = 0; i2 < N; i2++) {
      var s = 0, c = 0;
      for (var j = -2; j <= 2; j++) { var k = i2 + j; if (k >= 0 && k < N) { s += b[k]; c++; } }
      out[i2] = s / c;
    }
    return out;
  })();

  function rowProfile(D) {
    var N = REF_PROFILE.length;
    var raw = new Float32Array(N);
    var rawB = new Float32Array(N);
    for (var i = 0; i < N; i++) {
      var y = i * 2;
      var t = 0, n = 0, tb = 0, nb = 0;
      for (var x = 40; x < 640; x += 2) { if (D[y * CARD_W + x] > 10) t++; n++; }
      for (var xb = 28; xb < 102; xb += 2) { if (D[y * CARD_W + xb] > 10) tb++; nb++; }
      raw[i] = t / n;
      rawB[i] = tb / nb;
    }
    var out = new Float32Array(N), outB = new Float32Array(N);
    for (var i2 = 0; i2 < N; i2++) {
      var s = 0, sb = 0, c = 0;
      for (var j = -2; j <= 2; j++) { var k = i2 + j; if (k >= 0 && k < N) { s += raw[k]; sb += rawB[k]; c++; } }
      out[i2] = Math.min(99, (s / c) * 99 * 2.2);
      outB[i2] = Math.min(25, (sb / c) * 99 * 1.5);   // klippes: kryds vs blank udjævnes
    }
    return { A: out, B: outB };
  }

  // DTW med åben start/slut og bånd ±200 bins (±400 px). To kanaler:
  // A = tekstprofil, B = feltkolonne (låser rækkeidentiteten).
  function dtwAlign(refA, obsA, refB, obsB) {
    var N = refA.length, M = obsA.length, BAND = 200;
    var INF = 1e15;
    var cost = new Float64Array(N * M).fill(INF);
    var from = new Int32Array(N * M).fill(-1);
    function stepCost(i, j) {
      return Math.abs(refA[i] - obsA[j]) + 1.4 * Math.abs(refB[i] - obsB[j]);
    }
    for (var j0 = 0; j0 <= Math.min(M - 1, BAND); j0++) {
      cost[j0] = stepCost(0, j0);
    }
    for (var i = 1; i < N; i++) {
      var ja = Math.max(1, i - BAND), jb = Math.min(M - 1, i + BAND);
      var base = i * M, prev = (i - 1) * M, prev2 = (i - 2) * M;
      for (var j = ja; j <= jb; j++) {
        var c = stepCost(i, j);
        var best = cost[prev + j - 1], f = prev + j - 1;
        if (j >= 2) {
          var v2 = cost[prev + j - 2] + c * 0.5;
          if (v2 < best) { best = v2; f = prev + j - 2; }
        }
        if (i >= 2) {
          var v3 = cost[prev2 + j - 1] + c * 0.5;
          if (v3 < best) { best = v3; f = prev2 + j - 1; }
        }
        if (best >= INF) continue;
        cost[base + j] = best + c;
        from[base + j] = f;
      }
    }
    var bj = -1, bc = INF;
    for (var je = Math.max(0, N - 1 - BAND); je < M; je++) {
      if (cost[(N - 1) * M + je] < bc) { bc = cost[(N - 1) * M + je]; bj = je; }
    }
    if (bj < 0) return null;
    var map = new Float32Array(N).fill(-1);
    var cur = (N - 1) * M + bj;
    while (cur >= 0) {
      map[Math.floor(cur / M)] = cur % M;
      cur = from[cur];
    }
    for (var i3 = 1; i3 < N; i3++) if (map[i3] < 0) map[i3] = map[i3 - 1];
    if (map[0] < 0) map[0] = 0;
    return { map: map, cost: bc / N };
  }

  // Sektionsoverskrifternes positioner på referencekortet (centrum af båndet)
  var HEADER_REF = [410, 730, 951, 1236, 1468];

  // rækkeprofil for overskrift-signaturen: mørk midte + tom venstremargin
  function headerProfile(D) {
    var score = [];
    for (var y = 0; y < 1780; y++) {
      var mid = 0, mn = 0, lef = 0, ln = 0;
      for (var x = 230; x < 480; x += 3) { if (D[y * CARD_W + x] > 10) mid++; mn++; }
      for (var x2 = 55; x2 < 200; x2 += 3) { if (D[y * CARD_W + x2] > 10) lef++; ln++; }
      score.push(mid / mn - 1.5 * (lef / ln));
    }
    return score;
  }

  // skala-estimat fra overskrifterne alene (når teksttoppen ikke kan findes):
  // overskrifternes forventede positioner skaleret om QR skal ramme profil-toppene
  function headerScaleScan(D, qrM) {
    var prof = headerProfile(D);
    var best = { s: 1, total: -1 };
    for (var s = 0.82; s <= 1.18; s += 0.005) {
      var total = 0;
      for (var i = 0; i < HEADER_REF.length; i++) {
        var y = Math.round(qrM + (HEADER_REF[i] - QR_CY) * s);
        // maks over lille vindue (overskriftsbåndet er ~20 rækker)
        var m = 0;
        for (var dy = -10; dy <= 10; dy += 2) {
          var yy = y + dy;
          if (yy >= 0 && yy < prof.length && prof[yy] > m) m = prof[yy];
        }
        total += m;
      }
      if (total > best.total) best = { s: s, total: total };
    }
    return best.total > 0.6 ? best : null;
  }

  // Overskrifter: mørk tekst i midten + TOM venstremargin (unik signatur)
  function findHeaders(D, mapY1) {
    var score = headerProfile(D);
    // sammenhængende bånd
    var runs = [];
    var y0 = -1;
    for (var yy = 150; yy < score.length; yy++) {
      if (score[yy] > 0.12) { if (y0 < 0) y0 = yy; }
      else if (y0 >= 0) {
        if (yy - y0 >= 12) runs.push((y0 + yy) / 2);
        y0 = -1;
      }
    }
    // match hvert forventet bånd til nærmeste fundne (±85)
    var out = [];
    for (var hi = 0; hi < HEADER_REF.length; hi++) {
      var pred = mapY1(HEADER_REF[hi]);
      var best = null, bd = 85;
      for (var ri = 0; ri < runs.length; ri++) {
        var d = Math.abs(runs[ri] - pred);
        if (d < bd) { bd = d; best = runs[ri]; }
      }
      if (best !== null) out.push([HEADER_REF[hi], best]);
    }
    return out;
  }

  /* Prøver begge kort-layouts (dansk/engelsk) og vælger det, hvor flest
     felt-rammer findes. Returnerer det bedste resultat. */
  function analyzeCanonical(canon, sensitivity, wide) {
    var best = null;
    for (var li = 0; li < LAYOUTS.length; li++) {
      var r = analyzeWithLayout(canon, sensitivity, LAYOUTS[li]);
      if (!best || r.bordersFound > best.bordersFound) best = r;
    }
    return best;
  }

  function analyzeWithLayout(canon, sensitivity, layout) {
    var BOXES = layout.boxes;          // skygger den globale bevidst
    sensitivity = sensitivity || 1;
    var T = 0.09 / sensitivity;

    var D = buildDarkMap(canon);
    var qr = layout.hasQR ? findQRBlock(D) : { score: 99, dx: 0, dy: 0 };

    // DTW-registrering af hele rækkeprofilen: alle tekstlinjer, mellemrum og
    // QR justeres samlet – tåler skæve/forvredne warps uden identitets-fejl
    var obs = rowProfile(D);
    var ali = layout.hasQR ? dtwAlign(REF_PROFILE, obs.A, REF_PROFILE_B, obs.B) : null;
    if (layout.hasQR && !ali) {
      return { items: [], bordersFound: 0, valid: false, layout: layout.key, reg: { qrScore: qr.score, dtw: null } };
    }
    if (!ali) ali = { map: null, cost: 0 };   // engelsk: ingen profil-reference endnu
    function mapY(y) {
      if (!ali.map) return y;      // uden profil: identitet (warp er allerede kanonisk)
      var i = Math.max(0, Math.min(REF_PROFILE.length - 1, Math.round(y / 2)));
      return ali.map[i] * 2;
    }
    // lokal skala fra DTW-forløbet – feltstørrelsen skal følge med
    function localScale(y) {
      var y0 = Math.max(0, y - 120), y1 = Math.min(1998, y + 120);
      var s = (mapY(y1) - mapY(y0)) / (y1 - y0);
      return Math.max(0.75, Math.min(1.3, s));
    }

    // PAS 1: bred søgning i x (margin-bevidst score forhindrer tekst-låse);
    // felternes fundne rammer bruges som landmærker
    // PAS 1 som sekventiel sporing NEDEFRA og op: felterne nærmest QR-ankeret
    // sidder rigtigt, og hvert fundet felt forudsiger det næste – følger
    // rotations-drift på over 100 px gennem kortet
    var anchors = [], pass1 = new Array(BOXES.length);
    var order = BOXES.map(function (b, idx) { return idx; })
      .sort(function (a, b2) { return BOXES[b2].y - BOXES[a].y; });
    var track = [];   // seneste {y, ox}
    function predictOx(y) {
      var v;
      if (track.length >= 3) {
        var n = Math.min(track.length, 8), sy = 0, sv = 0, syy = 0, syv = 0;
        for (var k = 0; k < n; k++) { var p = track[k]; sy += p.y; sv += p.ox; syy += p.y * p.y; syv += p.y * p.ox; }
        var den = n * syy - sy * sy;
        if (den !== 0) {
          var a = (n * syv - sy * sv) / den;
          var c = (sv - a * sy) / n;
          v = a * y + c;
        } else v = track[0].ox;
      } else if (track.length > 0) {
        v = track[0].ox;
      } else {
        // QR-blokkens x kan trækkes af pil/tekst – stol kun begrænset på den
        v = Math.max(-12, Math.min(12, qr.dx));
      }
      return Math.max(-130, Math.min(130, v));
    }
    for (var oi = 0; oi < order.length; oi++) {
      var i = order[oi];
      var b = BOXES[i];
      var sc = localScale(b.y);
      var bScaled = { s: Math.round(b.s * sc), extra: b.extra };
      var py = mapY(b.y);
      var pox = predictOx(py);
      var pos = { x: b.x + pox, y: py };
      var r1 = readBox(canon, D, pos, bScaled, track.length >= 3 ? 22 : 45, 12);
      pass1[i] = { pos: pos, r: r1, bScaled: bScaled };
      if (r1.borderFound && r1.ringScore > 2.8) {
        anchors.push({ y: py, ox: r1.bx - b.x, oy: r1.by - py });
        if (!b.extra && r1.ringScore > 3.2) track.unshift({ y: py, ox: r1.bx - b.x });
      }
    }

    // robust lineær model: offset som funktion af y (dækker resterende
    // rotation/skala-fejl glat over hele kortet)
    function fitLinear(get) {
      var pts = anchors.slice();
      var a = 0, c = 0;
      for (var it = 0; it < 2; it++) {
        var n = pts.length, sy = 0, sv = 0, syy = 0, syv = 0;
        if (n < 3) return null;
        for (var k = 0; k < n; k++) {
          sy += pts[k].y; sv += get(pts[k]); syy += pts[k].y * pts[k].y; syv += pts[k].y * get(pts[k]);
        }
        var den = n * syy - sy * sy;
        a = den !== 0 ? (n * syv - sy * sv) / den : 0;
        c = (sv - a * sy) / n;
        var kept = pts.filter(function (p) { return Math.abs(get(p) - (a * p.y + c)) < 6; });
        if (kept.length === pts.length) break;
        pts = kept;
      }
      if (pts.length < 3) return null;
      return function (y) { return a * y + c; };
    }
    var fx = fitLinear(function (p) { return p.ox; });
    var fy = fitLinear(function (p) { return p.oy; });

    // PAS 2: modellen som udgangspunkt, men et felt med en STÆRK egen ramme
    // i pas 1 (i nærheden af modellen) vinder over modellen
    var results = [], bordersFound = 0;
    for (var i2 = 0; i2 < BOXES.length; i2++) {
      var b2 = BOXES[i2];
      var p0 = pass1[i2].pos;
      var r1b = pass1[i2].r;
      var pos2 = (fx && fy)
        ? { x: b2.x + fx(p0.y), y: p0.y + fy(p0.y) }   // fx/fy er offsets fra baseline
        : { x: r1b.bx, y: r1b.by };
      if (r1b.ringScore > 3.2 &&
          Math.abs(r1b.bx - pos2.x) < 14 && Math.abs(r1b.by - pos2.y) < 14) {
        pos2 = { x: r1b.bx, y: r1b.by };
      }
      var r = readBox(canon, D, pos2, pass1[i2].bScaled, 3);
      if (r.borderFound) bordersFound++;
      var checked = r.fracIn > T || r.fracHalo > T * 1.3 || (r.fracIn + r.fracHalo) > T * 1.8;
      // ekstra-felterne ligger tæt på håndskrift (navn/bord) – kræv fundet
      // ramme eller meget tydeligt blæk for at undgå falske positive
      if (b2.extra && checked && !(r.borderFound && r.fracIn > 1.6 * T)) checked = false;
      // usikkerheds-flag: tæt på tærsklen eller ramme ikke fundet
      var maxFrac = Math.max(r.fracIn, r.fracHalo);
      var uncertain = !r.borderFound || (maxFrac > T * 0.45 && maxFrac < T * 2.2);
      results.push({
        id: b2.id, name: b2.name, cat: b2.cat, extra: !!b2.extra,
        checked: checked,
        uncertain: uncertain,
        ink: Math.round(maxFrac * 1000) / 1000,
        fracIn: Math.round(r.fracIn * 1000) / 1000,
        fracHalo: Math.round(r.fracHalo * 1000) / 1000,
        borderFound: r.borderFound,
        bx: r.bx, by: r.by, s: b2.s
      });
    }
    var uncertainCount = 0;
    for (var u = 0; u < results.length; u++) if (results[u].uncertain) uncertainCount++;
    return {
      items: results,
      bordersFound: bordersFound,
      layout: layout.key,
      valid: qr.score >= 8 && bordersFound >= 11 && anchors.length >= 6 && ali.cost < 20,
      confident: bordersFound >= 18 && ali.cost < 16.5 && uncertainCount <= 2,
      reg: { layout: layout.key, qrScore: Math.round(qr.score * 10) / 10, dtw: Math.round(ali.cost * 100) / 100, anchors: anchors.length }
    };
  }

  /**
   * Fuldt pipeline: RGBA-frame → resultat.
   * qrDecode: valgfri jsQR-funktion (rgba, w, h) → { location } | null.
   * Returnerer { ok, error?, items?, canon?, via }
   */
  // Mål skala-fejl i et kanonisk billede via ankre (teksttop ↔ QR-blok) og
  // returnér en korrigeret homografi, hvis fejlen er mærkbar
  function correctWarpByAnchors(H, canon) {
    var D = buildDarkMap(canon);
    var qr = findQRBlock(D);
    if (qr.score < 8) return null;
    var qrM = QR_CY + qr.dy;
    // skala fra de FEM sektionsoverskrifter samlet – robust mod at enkelte
    // tekstlinjer forveksles (cTop alene kunne matche forkert linje)
    var hs = headerScaleScan(D, qrM);
    if (!hs) return null;
    var sy = hs.s, ty = qrM - QR_CY * sy;
    if (!(sy > 0.7 && sy < 1.4)) return null;
    var topDrift = Math.abs(CONTENT_TOP_REF * sy + ty - CONTENT_TOP_REF);
    if (Math.abs(sy - 1) < 0.025 && Math.abs(qr.dx) < 12 && topDrift < 14) {
      return { H: H, canon: canon, corrected: false };
    }
    var sx = sy;
    var qrX = (QR_BOX.x0 + QR_BOX.x1) / 2 + qr.dx;
    var tx = qrX - ((QR_BOX.x0 + QR_BOX.x1) / 2) * sx;
    // H' = H · A  hvor A = [[sx,0,tx],[0,sy,ty],[0,0,1]]
    var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], hh = H[7];
    var H2 = [
      a * sx, b * sy, a * tx + b * ty + c,
      d * sx, e * sy, d * tx + e * ty + f,
      g * sx, hh * sy, g * tx + hh * ty + 1
    ];
    // normalisér så sidste element er 1
    var k = H2[8];
    for (var i = 0; i < 9; i++) H2[i] /= k;
    return { H: H2, canon: null, corrected: true };
  }

  function readSheet(rgba, w, h, sensitivity, qrDecode) {
    var gray = grayscale(rgba, w, h);
    var bestRes = null, bestCanon = null, bestVia = null;

    var validResults = [];
    function attempt(canon, via) {
      if (!canon) return null;
      var res = analyzeCanonical(canon, sensitivity);
      if (res.valid) {
        validResults.push({ ok: true, items: res.items, bordersFound: res.bordersFound, confident: res.confident, canon: canon, via: via, reg: res.reg });
        return validResults[validResults.length - 1];
      }
      if (!bestRes || res.bordersFound > bestRes.bordersFound) {
        bestRes = res; bestCanon = canon; bestVia = via;
      }
      return null;
    }
    // vælg det BEDSTE gyldige resultat (flest fundne rammer, dernæst laveste DTW-pris)
    function pickBest() {
      if (validResults.length === 0) return null;
      validResults.sort(function (a, b) {
        if (b.bordersFound !== a.bordersFound) return b.bordersFound - a.bordersFound;
        return (a.reg.dtw || 99) - (b.reg.dtw || 99);
      });
      return validResults[0];
    }

    // 1) QR-anker + kant-finjustering (virker på lyse OG mørke borde)
    var qrFoundButFailed = false;
    if (qrDecode) {
      var qr = detectQRMultiscale(gray, w, h, qrDecode);
      if (qr) {
        var qrSrc = [
          [qr.topLeftCorner.x, qr.topLeftCorner.y],
          [qr.topRightCorner.x, qr.topRightCorner.y],
          [qr.bottomRightCorner.x, qr.bottomRightCorner.y],
          [qr.bottomLeftCorner.x, qr.bottomLeftCorner.y]
        ];
        var H0 = homography4(QR_DST, qrSrc);
        if (H0) {
          var refined = refineHomography(gray, w, h, H0, qrSrc);
          var tries = [];
          if (refined) tries.push({ H: refined.H, via: 'qr+kanter(' + refined.edges + ')' });
          tries.push({ H: H0, via: 'qr' });
          for (var ti = 0; ti < tries.length; ti++) {
            attempt(warpWithH(gray, w, h, tries[ti].H), tries[ti].via);
          }
          var picked = pickBest();
          if (picked) return picked;
          qrFoundButFailed = true;
        }
      }
    }

    // 2) papirkant-quad (mørkt bord, ingen/ulæselig QR)
    var found = findCardQuadEx(gray, w, h);
    if (found && found.quad) {
      var canon = warpToCanonical(gray, w, h, found.quad);
      if (canon && isUpsideDown(canon)) {
        var q = found.quad;
        canon = warpToCanonical(gray, w, h, [q[2], q[3], q[0], q[1]]);
      }
      attempt(canon, 'quad');
      var picked2 = pickBest();
      if (picked2) return picked2;
    }

    if (bestRes) {
      return {
        ok: false,
        error: 'Sedlen kunne ikke aflæses tydeligt (' + bestRes.bordersFound + '/21 felter fundet) – prøv med mere lys',
        canon: bestCanon, via: bestVia
      };
    }
    var msg = found && found.clipped
      ? 'Hele sedlen skal med i billedet – hold telefonen længere væk (brug evt. 0,5x)'
      : (qrFoundButFailed
        ? 'Sedlen blev fundet men kunne ikke aflæses – prøv med mere lys'
        : 'Kunne ikke finde sedlen – prøv igen med mere afstand eller lys');
    return { ok: false, error: msg };
  }

  return {
    CARD_W: CARD_W, CARD_H: CARD_H,
    BOXES: BOXES, QR_BOX: QR_BOX,
    grayscale: grayscale,
    otsu: otsu,
    findCardQuadEx: findCardQuadEx,
    // bagudkompatibelt navn til appens live-overlay
    findCardQuad: function (gray, w, h) {
      var f = findCardQuadEx(gray, w, h);
      return f && f.quad ? f.quad : null;
    },
    warpToCanonical: warpToCanonical,
    detectQRMultiscale: detectQRMultiscale,
    isUpsideDown: isUpsideDown,
    buildDarkMap: buildDarkMap,
    detectCandidates: detectCandidates,
    matchPattern: matchPattern,
    analyzeCanonical: analyzeCanonical,
    readSheet: readSheet,
    QR_DST: QR_DST,
    __debug: {
      homography4: homography4,
      refineHomography: refineHomography,
      refineEdge: refineEdge,
      warpWithH: warpWithH,
      QR_DST: QR_DST
    }
  };
});
