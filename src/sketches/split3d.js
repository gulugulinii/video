/* Suddivisione 3D
   Estratto da prototypes/sketch-bench.html. Fonte unica: modificare qui. */

import { makeBatch } from "../engine/batch.js";
import { makeCam3D } from "../engine/cam3d.js";
import { makeCycle } from "../engine/cycle.js";
import { makeDof } from "../engine/dof.js";
import { EXTENT_INF, pickCopy } from "../engine/field.js";
import { keyLight } from "../engine/palette.js";

/* --- 5. Suddivisione 3D --- */
export const sketch = {
  label: "Suddivisione 3D", dim: "3D", hasCam: true, hasSplit: true,
  blurb: "Un cubo tagliato ricorsivamente in scatole, attraversate dalla camera.",
  clear: "full",
  title: "Suddivisione 3D — la stessa ricorsione, con un asse in più",
  body: "Identica alla versione 2D, salvo che si taglia un cubo invece di un rettangolo e gli assi possibili sono tre invece di due. Ogni scatola viene disegnata come i suoi dodici spigoli, proiettati. Da dentro sembra un'architettura infinita; da fuori si vede che è un solo cubo suddiviso.",
  code: "<span class='c'>// stessa ricorsione della 2D, con un asse in più</span>\nvar ax = piuLungo(scatola);            <span class='c'>// 0 = x, 1 = y, 2 = z</span>\nvar t  = 0.3 + rnd() * 0.4;\nsplit(parteBassa, d - 1);\nsplit(parteAlta,  d - 1);",
  create: function (rnd, w, h, density, P) {
    var B = 2.8, NB = 6;
    var C = makeCam3D(), D = makeDof();
    var depth = Math.max(3, Math.round((P ? P.splitDepth : 9) * Math.sqrt(density)));
    var boxes = [];
    (function rec(lo, hi, d) {
      var sx = hi[0] - lo[0], sy = hi[1] - lo[1], sz = hi[2] - lo[2];
      var smallest = Math.min(sx, sy, sz);
      if (d === 0 || smallest < B * 0.10 || boxes.length > 900) {
        boxes.push({ lo: lo, hi: hi, g: 0.35 + rnd() * 0.65 }); return;
      }
      var ax = sx >= sy && sx >= sz ? 0 : (sy >= sz ? 1 : 2);
      /* nel modo diagonale l'asse è scelto a caso: le scatole si sfalsano */
      if (P && (P.splitMode === "diag" || (P.splitMode === "misto" && rnd() < 0.5))) ax = (rnd() * 3) | 0;
      var t = 0.30 + rnd() * 0.40;
      var cut = lo[ax] + (hi[ax] - lo[ax]) * t;
      var m1 = hi.slice(), m2 = lo.slice();
      m1[ax] = cut; m2[ax] = cut;
      rec(lo, m1, d - 1); rec(m2, hi, d - 1);
    })([-B / 2, -B / 2, -B / 2], [B / 2, B / 2, B / 2], depth);

    var EDGES = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    var cyc = makeCycle(boxes.length, rnd);

    return {
      count: boxes.length,
      getCam: function () { return C.get(); },
      setCam: function (c) { C.set(c); },
      step: function (dt, w, h, input) {
        C.step(dt, input, P, P ? P.extent : EXTENT_INF);
        cyc.step(dt * 2, P);
      },
      draw: function (ctx, w, h) {
        var dpr = ctx.getTransform ? ctx.getTransform().a : 1;
        var L = D.begin(w, h, dpr), S = makeBatch(NB);
        C.prepare();
        var cam = C.get(), R = P ? P.extent : EXTENT_INF;
        var camR = C.dist(), k = Math.min(w, h * 1.7) * 0.5;
        var far = camR + B * 0.75, span = B * 0.85 + camR * 0.25;
        D.thresholds(Math.max(0.62, camR * 0.55), Math.max(1.55, camR * 0.98));

        var v = new Array(8), tmp = new Float64Array(7), i, e;
        for (var bi = 0; bi < boxes.length; bi++) {
          if (!cyc.alive[bi]) continue;
          var bx = boxes[bi], lo = bx.lo, hi = bx.hi;
          var cx = (lo[0] + hi[0]) / 2, cy2 = (lo[1] + hi[1]) / 2, cz = (lo[2] + hi[2]) / 2;
          pickCopy(cx, cy2, cz, cam, B, R, tmp);
          var ox = tmp[4], oy = tmp[5], oz = tmp[6], envv = tmp[3];
          if (envv <= 0.01) continue;
          for (i = 0; i < 8; i++) {
            var px = (i & 1 ? hi[0] : lo[0]) - cam.x - ox;
            var py = (i & 2 ? hi[1] : lo[1]) - cam.y - oy;
            var pz = (i & 4 ? hi[2] : lo[2]) - cam.z - oz;
            v[i] = C.project(px, py, pz, w, h, k);
          }
          var zc = 0, cnt = 0;
          for (i = 0; i < 8; i++) if (v[i]) { zc += v[i].z; cnt++; }
          if (!cnt) continue;
          zc /= cnt;
          var f = Math.max(0, Math.min(1, (far - zc) / span)) * envv * bx.g;
          if (f <= 0.02) continue;
          var pe = S.path(S.edge, D.binOf(zc), S.bucket(f));
          for (e = 0; e < 12; e++) {
            var a = v[EDGES[e][0]], b = v[EDGES[e][1]];
            if (!a || !b) continue;
            pe.moveTo(a.sx, a.sy); pe.lineTo(b.sx, b.sy);
          }
        }
        S.flush(L, 0, 0.42, [0, 0]);
        D.end(ctx, w, h, dpr);
        keyLight(ctx, w, h, P);
      },
      stats: function () { return "scatole " + cyc.count() + " di " + boxes.length + " · " + cyc.phaseName(); }
    };
  }
};
/* --- 6. Reticolo (3D) --- */
