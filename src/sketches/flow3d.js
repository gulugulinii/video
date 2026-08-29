/* Flow field 3D
   Estratto da prototypes/sketch-bench.html. Fonte unica: modificare qui. */

import { makeBatch } from "../engine/batch.js";
import { makeCam3D } from "../engine/cam3d.js";
import { makeDof } from "../engine/dof.js";
import { EXTENT_INF, pickCopy } from "../engine/field.js";
import { makeNoise3 } from "../engine/noise.js";
import { keyLight } from "../engine/palette.js";

/* --- 4. Flow field 3D --- */
export const sketch = {
  label: "Flow field 3D", dim: "3D", hasCam: true, hasDrift: true,
  blurb: "Lo stesso campo di direzioni, ma nello spazio, attraversato dalla camera.",
  clear: "full",
  title: "Flow field 3D — le scie diventano volume",
  body: "Stesso principio della versione 2D: ogni particella legge una direzione dal rumore e ci si muove. Ma il rumore è a tre dimensioni e la direzione è un vettore nello spazio. Le scie non si possono più accumulare sul canvas, perché la camera si muove e le tracce vecchie sarebbero nel posto sbagliato: ogni particella disegna invece il segmento fra dove era e dove è ora, che resta corretto da qualsiasi punto di vista.",
  code: "<span class='c'>// due letture del rumore danno due angoli, cioè una direzione 3D</span>\nvar a = noise3(x*F, y*F, z*F) * TAU * 2;\nvar b = (noise3(x*F+9, y*F-4, z*F+2) - 0.5) * Math.PI;\nvx = Math.cos(a) * Math.cos(b);\nvy = Math.sin(b);\nvz = Math.sin(a) * Math.cos(b);",
  create: function (rnd, w, h, density, P) {
    var B = 3.0, N = Math.round(1300 * density), NB = 6, F = 3.2;
    var TR = 9;                        /* lunghezza della scia, in frame */
    var C = makeCam3D(), D = makeDof(), noise3 = makeNoise3(rnd);
    /* Storico in coordinate del mondo: la scia va ricostruita rispetto alla
       camera a ogni frame, altrimenti muovendosi resterebbe dov'era. */
    var H = new Float32Array(N * TR * 3), G = new Float32Array(N), hp = 0, tmp = new Float64Array(7);
    var ps = [], i, s;
    for (i = 0; i < N; i++) {
      var x = (rnd() - .5) * B, y = (rnd() - .5) * B, z = (rnd() - .5) * B;
      ps.push({ x: x, y: y, z: z });
      G[i] = 0.45 + rnd() * 0.55;
      for (s = 0; s < TR; s++) {
        H[(i * TR + s) * 3] = x; H[(i * TR + s) * 3 + 1] = y; H[(i * TR + s) * 3 + 2] = z;
      }
    }
    function reseed(i, p) {
      p.x = (rnd() - .5) * B; p.y = (rnd() - .5) * B; p.z = (rnd() - .5) * B;
      for (var s = 0; s < TR; s++) {
        H[(i * TR + s) * 3] = p.x; H[(i * TR + s) * 3 + 1] = p.y; H[(i * TR + s) * 3 + 2] = p.z;
      }
    }

    return {
      count: N,
      getCam: function () { return C.get(); },
      setCam: function (c) { C.set(c); },
      step: function (dt, w, h, input) {
        C.step(dt, input, P, P ? P.extent : EXTENT_INF);
        var sp = 0.020 * (P ? P.drift : 1) * dt, age = 0;
        hp = (hp + 1) % TR;
        for (var i = 0; i < N; i++) {
          var p = ps[i];
          /* due letture del rumore danno due angoli, cioè una direzione 3D */
          var a = noise3(p.x * F, p.y * F, p.z * F) * 6.2832 * 2;
          var b = (noise3(p.x * F + 9, p.y * F - 4, p.z * F + 2) - 0.5) * Math.PI;
          var cb = Math.cos(b);
          p.x += Math.cos(a) * cb * sp; p.y += Math.sin(b) * sp; p.z += Math.sin(a) * cb * sp;
          if (p.x < -B / 2 || p.x > B / 2 || p.y < -B / 2 || p.y > B / 2 || p.z < -B / 2 || p.z > B / 2) reseed(i, p);
          else {
            H[(i * TR + hp) * 3] = p.x; H[(i * TR + hp) * 3 + 1] = p.y; H[(i * TR + hp) * 3 + 2] = p.z;
          }
        }
      },
      draw: function (ctx, w, h) {
        var dpr = ctx.getTransform ? ctx.getTransform().a : 1;
        var L = D.begin(w, h, dpr), S = makeBatch(NB);
        C.prepare();
        var cam = C.get(), R = P ? P.extent : EXTENT_INF;
        var camR = C.dist(), k = Math.min(w, h * 1.7) * 0.5;
        var far = camR + B * 0.62, span = B * 0.75 + camR * 0.25;
        D.thresholds(Math.max(0.62, camR * 0.55), Math.max(1.55, camR * 0.98));

        for (var n = 0; n < N; n++) {
          var p = ps[n];
          /* un solo scarto per tutta la scia, così non si spezza a meta */
          pickCopy(p.x, p.y, p.z, cam, B, R, tmp);
          var ox = tmp[4], oy = tmp[5], oz = tmp[6], env = tmp[3];
          if (env <= 0.01) continue;
          var q = C.project(tmp[0], tmp[1], tmp[2], w, h, k);
          if (!q) continue;
          var f = Math.max(0, Math.min(1, (far - q.z) / span)) * env * G[n];
          if (f <= 0.02) continue;
          var bin = D.binOf(q.z), bk = S.bucket(f);
          var pe = S.path(S.edge, bin, bk), started = false;
          for (var s = 0; s < TR; s++) {
            var idx = ((hp - s) % TR + TR) % TR;
            var t = C.project(H[(n * TR + idx) * 3] - cam.x - ox,
                              H[(n * TR + idx) * 3 + 1] - cam.y - oy,
                              H[(n * TR + idx) * 3 + 2] - cam.z - oz, w, h, k);
            if (!t) break;
            if (!started) { pe.moveTo(t.sx, t.sy); started = true; } else pe.lineTo(t.sx, t.sy);
          }
          var r = 0.5 + f * 1.7;
          var pn = S.path(S.node, bin, bk);
          pn.moveTo(q.sx + r, q.sy); pn.arc(q.sx, q.sy, r, 0, 6.2832);
        }
        S.flush(L, 0, 0.52, [0.10, 0.62]);
        D.end(ctx, w, h, dpr);
        keyLight(ctx, w, h, P);
      },
      stats: function () { return "particelle " + N + " · scia " + TR + " frame"; }
    };
  }
};
/* --- 5. Suddivisione 3D --- */
