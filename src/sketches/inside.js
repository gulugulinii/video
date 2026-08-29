/* Immersione (3D)
   Estratto da prototypes/sketch-bench.html. Fonte unica: modificare qui. */

import { makeBatch } from "../engine/batch.js";
import { makeCam3D } from "../engine/cam3d.js";
import { makeDof } from "../engine/dof.js";
import { EXTENT_INF, pickCopy } from "../engine/field.js";
import { keyLight } from "../engine/palette.js";

/* --- 3. Immersione: nuvola di nodi con camera (3D) --- */
export const sketch = {
  label: "Immersione", dim: "3D", hasCam: true, hasGen: true, hasDrift: true,
  blurb: "Nodi collegati per prossimità, con la camera dentro o in orbita fuori.",
  clear: "full",
  title: "Immersione — nodi, archi e triangoli attorno alla camera",
  body: "I nodi vivono in un cubo che si ripete all'infinito. Archi fra quelli più vicini della soglia, triangoli fra le triple mutuamente collegate. L'estensione del campo decide quante copie del cubo restano accese: portala al minimo e resta una nuvola sola, portala al massimo e non ne esci mai. Poiché è una dissolvenza e non un interruttore, puoi muoverla mentre voli.",
  code: "<span class='c'>// la profondità decide posizione, dimensione e opacità</span>\nvar s = focal / z;              <span class='c'>// &lt;- il 3D è tutto qui</span>\n\n<span class='c'>// estensione: spegne le copie del cubo oltre il raggio R</span>\nvar env = clamp((R + soft - dist(mondo)) / soft);",
  create: function (rnd, w, h, density, P) {
    var B = 2.6, N = Math.round(470 * density), NB = 6;
    var C = makeCam3D(), D = makeDof();
    var pts = [], i;
    for (i = 0; i < N; i++) pts.push({
      x: (rnd() - .5) * B, y: (rnd() - .5) * B, z: (rnd() - .5) * B,
      vx: (rnd() - .5) * .0016, vy: (rnd() - .5) * .0016, vz: (rnd() - .5) * .0016
    });
    var rel = new Float32Array(N * 3), env = new Float32Array(N), tmp = new Float64Array(7);
    var edges = 0, tris = 0;
    var prevEdges = new Set(), bornAcc = 0, diedAcc = 0, tRate = 0, rateB = 0, rateD = 0;

    return {
      count: N,
      getCam: function () { return C.get(); },
      setCam: function (c) { C.set(c); },
      step: function (dt, w, h, input) {
        var R = P ? P.extent : EXTENT_INF;
        C.step(dt, input, P, R);
        var cam = C.get(), nd = (P ? P.drift : 1) * dt;
        for (var i = 0; i < N; i++) {
          var p = pts[i];
          p.x += p.vx * nd; p.y += p.vy * nd; p.z += p.vz * nd;
          if (p.x < -B / 2 || p.x > B / 2) p.vx = -p.vx;
          if (p.y < -B / 2 || p.y > B / 2) p.vy = -p.vy;
          if (p.z < -B / 2 || p.z > B / 2) p.vz = -p.vz;
          pickCopy(p.x, p.y, p.z, cam, B, R, tmp);
          rel[i * 3] = tmp[0]; rel[i * 3 + 1] = tmp[1]; rel[i * 3 + 2] = tmp[2];
          env[i] = tmp[3];
        }
      },
      draw: function (ctx, w, h) {
        var dpr = ctx.getTransform ? ctx.getTransform().a : 1;
        var L = D.begin(w, h, dpr), S = makeBatch(NB);
        C.prepare();
        var camR = C.dist(), k = Math.min(w, h * 1.7) * 0.5, n;
        var far = camR + B * 0.62, span = B * 0.75 + camR * 0.25;
        D.thresholds(Math.max(0.62, camR * 0.55), Math.max(1.55, camR * 0.98));

        var proj = new Array(N), fade = new Float32Array(N), vz = new Float32Array(N);
        for (n = 0; n < N; n++) {
          if (env[n] <= 0.01) { proj[n] = null; continue; }
          var q = C.project(rel[n * 3], rel[n * 3 + 1], rel[n * 3 + 2], w, h, k);
          proj[n] = q;
          if (!q) continue;
          vz[n] = q.z;
          fade[n] = Math.max(0, Math.min(1, (far - q.z) / span)) * env[n];
        }

        var LINK = P ? P.link : 0.57, LINK2 = LINK * LINK;
        var MAXTRI = P ? P.maxTri : 1100;
        var cells = new Map(), HX = 73856093, HY = 19349663, HZ = 83492791;
        var gi = new Int32Array(N * 3);
        for (n = 0; n < N; n++) {
          var gx = Math.floor(rel[n * 3] / LINK), gy = Math.floor(rel[n * 3 + 1] / LINK), gz = Math.floor(rel[n * 3 + 2] / LINK);
          gi[n * 3] = gx; gi[n * 3 + 1] = gy; gi[n * 3 + 2] = gz;
          var key = (Math.imul(gx, HX) ^ Math.imul(gy, HY) ^ Math.imul(gz, HZ)) >>> 0;
          var bkt = cells.get(key); if (!bkt) { bkt = []; cells.set(key, bkt); } bkt.push(n);
        }
        var adj = new Array(N), edgeSet = new Set();
        for (n = 0; n < N; n++) adj[n] = [];
        edges = 0;
        for (n = 0; n < N; n++) {
          if (!proj[n]) continue;
          for (var ox = -1; ox <= 1; ox++) for (var oy = -1; oy <= 1; oy++) for (var oz = -1; oz <= 1; oz++) {
            var ck = (Math.imul(gi[n * 3] + ox, HX) ^ Math.imul(gi[n * 3 + 1] + oy, HY) ^ Math.imul(gi[n * 3 + 2] + oz, HZ)) >>> 0;
            var cell = cells.get(ck); if (!cell) continue;
            for (var ci = 0; ci < cell.length; ci++) {
              var m = cell[ci];
              if (m <= n || !proj[m]) continue;
              var ax = rel[n * 3] - rel[m * 3], ay = rel[n * 3 + 1] - rel[m * 3 + 1], az = rel[n * 3 + 2] - rel[m * 3 + 2];
              var d2 = ax * ax + ay * ay + az * az;
              if (d2 >= LINK2 || edgeSet.has(n * N + m)) continue;
              adj[n].push(m); adj[m].push(n); edgeSet.add(n * N + m); edges++;
              var al = (1 - Math.sqrt(d2) / LINK) * (fade[n] + fade[m]) * 0.5;
              if (al <= 0.012) continue;
              var pe = S.path(S.edge, D.binOf((vz[n] + vz[m]) / 2), S.bucket(al));
              pe.moveTo(proj[n].sx, proj[n].sy); pe.lineTo(proj[m].sx, proj[m].sy);
            }
          }
        }

        var born = 0, died = 0;
        edgeSet.forEach(function (kk) { if (!prevEdges.has(kk)) born++; });
        prevEdges.forEach(function (kk) { if (!edgeSet.has(kk)) died++; });
        prevEdges = edgeSet; bornAcc += born; diedAcc += died;
        var now = (typeof performance !== "undefined" ? performance.now() : Date.now());
        if (!tRate) tRate = now;
        else if (now - tRate > 600) {
          var secs = (now - tRate) / 1000;
          rateB = bornAcc / secs; rateD = diedAcc / secs; bornAcc = 0; diedAcc = 0; tRate = now;
        }

        tris = 0;
        for (var c = 0; c < N && tris < MAXTRI; c++) {
          var nb = adj[c];
          for (var mm = 0; mm < nb.length && tris < MAXTRI; mm++) {
            var j = nb[mm]; if (j < c) continue;
            for (var nn = mm + 1; nn < nb.length && tris < MAXTRI; nn++) {
              var kk2 = nb[nn]; if (kk2 < j || !edgeSet.has(j * N + kk2)) continue;
              var A = proj[c], Bp = proj[j], Cp = proj[kk2];
              if (!A || !Bp || !Cp) continue;
              var f = (fade[c] + fade[j] + fade[kk2]) / 3;
              if (f <= 0.03) continue;
              var pt = S.path(S.tri, D.binOf((vz[c] + vz[j] + vz[kk2]) / 3), S.bucket(f));
              pt.moveTo(A.sx, A.sy); pt.lineTo(Bp.sx, Bp.sy); pt.lineTo(Cp.sx, Cp.sy); pt.closePath();
              tris++;
            }
          }
        }

        for (var v = 0; v < N; v++) {
          if (!proj[v] || fade[v] <= 0.02) continue;
          var r = 0.7 + fade[v] * 2.2;
          var pn = S.path(S.node, D.binOf(vz[v]), S.bucket(fade[v]));
          pn.moveTo(proj[v].sx + r, proj[v].sy);
          pn.arc(proj[v].sx, proj[v].sy, r, 0, 6.2832);
        }

        S.flush(L, 0.075, 0.62, [0.26, 0.62]);
        D.end(ctx, w, h, dpr);

        keyLight(ctx, w, h, P);
      },
      stats: function () {
        return "archi " + edges + " (+" + rateB.toFixed(0) + " −" + rateD.toFixed(0) + "/s) · triangoli " + tris;
      }
    };
  }
};
/* --- 4. Flow field 3D --- */
