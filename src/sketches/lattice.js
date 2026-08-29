/* Reticolo (3D)
   Estratto da prototypes/sketch-bench.html. Fonte unica: modificare qui. */

import { makeBatch } from "../engine/batch.js";
import { makeCam3D } from "../engine/cam3d.js";
import { makeCycle } from "../engine/cycle.js";
import { makeDof } from "../engine/dof.js";
import { EXTENT_INF, pickCopy } from "../engine/field.js";
import { keyLight } from "../engine/palette.js";

/* --- 6. Reticolo (3D) --- */
export const sketch = {
  label: "Reticolo", dim: "3D", hasCam: true, hasSeeds: true, hasSplit: true, extent0: 50,
  blurb: "Un cubo che cresce da uno o più semi; dove i fronti si toccano gli archi si accendono.",
  clear: "full",
  title: "Reticolo — crescita da più semi, e cosa succede dove si incontrano",
  body: "La struttura non appare tutta insieme: parte da uno o più semi e si propaga di nodo in nodo lungo il reticolo, come una macchia d'inchiostro. Con più semi crescono più cubi contemporaneamente, e quando due fronti si toccano gli archi di frontiera prendono la cima della rampa di colore: sono gli archi dove due crescite diverse si sommano. Alza il numero di semi e guarda dove si formano le giunzioni.",
  code: "<span class='c'>// visita in ampiezza da più semi insieme</span>\nwhile (coda.length) {\n  var a = coda.shift();\n  for (ogni vicino b di a) if (padrone[b] &lt; 0) {\n    padrone[b] = padrone[a];   <span class='c'>// eredita il seme</span>\n    coda.push(b);\n  }\n}\n<span class='c'>// arco acceso: i due estremi vengono da semi diversi</span>\nvar acceso = padrone[a] !== padrone[b];",
  create: function (rnd, w, h, density, P) {
    var B = 5.6, NB = 6;
    var G = Math.max(3, Math.round(7 * Math.cbrt(density)));
    var C = makeCam3D(B * 2.2), D = makeDof();
    var N = G * G * G, t = (G - 1) || 1, i, j, k;
    var px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N);
    var wob = new Float32Array(N);
    function id(a, b, c) { return (c * G + b) * G + a; }
    for (i = 0; i < G; i++) for (j = 0; j < G; j++) for (k = 0; k < G; k++) {
      var n = id(i, j, k);
      px[n] = ((i / t) - 0.5) * B; py[n] = ((j / t) - 0.5) * B; pz[n] = ((k / t) - 0.5) * B;
      wob[n] = 0.55 + rnd() * 0.45;
    }
    /* archi del reticolo, e liste di adiacenza per la propagazione */
    var ea = [], eb = [], adj = new Array(N);
    for (i = 0; i < N; i++) adj[i] = [];
    function link(a, b) { ea.push(a); eb.push(b); adj[a].push(b); adj[b].push(a); }
    for (i = 0; i < G; i++) for (j = 0; j < G; j++) for (k = 0; k < G; k++) {
      var a = id(i, j, k);
      if (i + 1 < G) link(a, id(i + 1, j, k));
      if (j + 1 < G) link(a, id(i, j + 1, k));
      if (k + 1 < G) link(a, id(i, j, k + 1));
    }
    var E = ea.length;

    /* Visita in ampiezza da più semi contemporaneamente. Ogni nodo eredita il
       seme da cui è stato raggiunto per primo; l'ordine di visita diventa
       l'ordine in cui la struttura si costruisce. */
    var seeds = Math.max(1, Math.min(12, P ? P.seeds : 1));
    var owner = new Int32Array(N), order = new Int32Array(N), head = 0, tail = 0;
    for (i = 0; i < N; i++) owner[i] = -1;
    var used = {};
    for (i = 0; i < seeds; i++) {
      var pick, guard = 0;
      do { pick = (rnd() * N) | 0; guard++; } while (used[pick] && guard < 200);
      used[pick] = 1; owner[pick] = i; order[tail++] = pick;
    }
    while (head < tail) {
      var cur = order[head++], nb = adj[cur];
      for (i = 0; i < nb.length; i++) {
        var nx = nb[i];
        if (owner[nx] >= 0) continue;
        owner[nx] = owner[cur]; order[tail++] = nx;
      }
    }
    /* nodi irraggiungibili (non capita su un reticolo connesso, ma non si sa mai) */
    for (i = 0; i < N && tail < N; i++) if (owner[i] < 0) { owner[i] = 0; order[tail++] = i; }

    /* archi di giunzione: i due estremi vengono da semi diversi */
    var meet = new Uint8Array(E), meetCount = 0;
    for (i = 0; i < E; i++) {
      if (owner[ea[i]] !== owner[eb[i]]) { meet[i] = 1; meetCount++; }
    }

    var cyc = makeCycle(N, rnd, order);
    var rel = new Float32Array(N * 3), env = new Float32Array(N), tmp = new Float64Array(7);
    var spin = 0;

    return {
      count: N,
      getCam: function () { return C.get(); },
      setCam: function (c) { C.set(c); },
      step: function (dt, w, h, input) {
        var R = P ? P.extent : EXTENT_INF;
        C.step(dt, input, P, R);
        cyc.step(dt * 1.6, P);
        spin += dt * 0.0009;
        var cam = C.get(), cs = Math.cos(spin), sn = Math.sin(spin);
        for (var n = 0; n < N; n++) {
          /* rotazione lenta del reticolo attorno al proprio asse verticale */
          var x = px[n] * cs + pz[n] * sn, z = -px[n] * sn + pz[n] * cs;
          pickCopy(x, py[n], z, cam, B, R, tmp);
          rel[n * 3] = tmp[0]; rel[n * 3 + 1] = tmp[1]; rel[n * 3 + 2] = tmp[2];
          env[n] = tmp[3];
        }
      },
      draw: function (ctx, w, h) {
        var dpr = ctx.getTransform ? ctx.getTransform().a : 1;
        var L = D.begin(w, h, dpr), S = makeBatch(NB);
        C.prepare();
        var camR = C.dist(), k = Math.min(w, h * 1.7) * 0.5, n;
        var far = camR + B * 0.70, span = B * 0.80 + camR * 0.25;
        D.thresholds(Math.max(0.62, camR * 0.55), Math.max(1.55, camR * 0.98));

        var proj = new Array(N), fade = new Float32Array(N), vz = new Float32Array(N);
        for (n = 0; n < N; n++) {
          if (!cyc.alive[n] || env[n] <= 0.01) { proj[n] = null; continue; }
          var q = C.project(rel[n * 3], rel[n * 3 + 1], rel[n * 3 + 2], w, h, k);
          proj[n] = q;
          if (!q) continue;
          vz[n] = q.z;
          fade[n] = Math.max(0, Math.min(1, (far - q.z) / span)) * env[n];
        }

        var lit = 0;
        for (var e = 0; e < E; e++) {
          var A = proj[ea[e]], Bp = proj[eb[e]];
          if (!A || !Bp) continue;
          var f = (fade[ea[e]] + fade[eb[e]]) * 0.5;
          if (f <= 0.02) continue;
          var bin = D.binOf((vz[ea[e]] + vz[eb[e]]) * 0.5), bk = S.bucket(f);
          var store = meet[e] ? S.glow : S.edge;
          if (meet[e]) lit++;
          var pth = S.path(store, bin, bk);
          pth.moveTo(A.sx, A.sy); pth.lineTo(Bp.sx, Bp.sy);
        }
        for (n = 0; n < N; n++) {
          if (!proj[n] || fade[n] <= 0.02) continue;
          var r = 0.5 + fade[n] * 2.0 * wob[n];
          var pn = S.path(S.node, D.binOf(vz[n]), S.bucket(fade[n]));
          pn.moveTo(proj[n].sx + r, proj[n].sy);
          pn.arc(proj[n].sx, proj[n].sy, r, 0, 6.2832);
        }
        S.flush(L, 0, 0.34, [0.10, 0.62], 0.85);
        D.end(ctx, w, h, dpr);
        keyLight(ctx, w, h, P);
      },
      stats: function () {
        return "nodi " + cyc.count() + " di " + N + " · semi " + seeds +
          " · giunzioni " + meetCount + " · " + cyc.phaseName();
      }
    };
  }
};
