/* Flow field (2D)
   Estratto da prototypes/sketch-bench.html. Fonte unica: modificare qui. */

import { makeNoise } from "../engine/noise.js";
import { palAt } from "../engine/palette.js";

/* --- 1. Flow field (2D) --- */
export const sketch = {
  label: "Flow field", dim: "2D",
  blurb: "Particelle che seguono un campo di direzioni ricavato dal rumore.",
  clear: "trail",
  title: "Flow field — 2D puro",
  body: "Ogni particella legge un angolo dal campo di rumore nella sua posizione e ci si muove. Non cancellando del tutto il frame precedente, le tracce si accumulano e disegnano le linee di flusso. Due coordinate per particella, nessuna profondità.",
  code: "<span class='c'>// per ogni particella, a ogni frame:</span>\nvar a = noise(p.x / 90, p.y / 90) * Math.PI * 4;\np.x += Math.cos(a) * 1.1;\np.y += Math.sin(a) * 1.1;",
  create: function (rnd, w, h, density) {
    var noise = makeNoise(rnd);
    var N = Math.round(1400 * density), ps = [], i;
    for (i = 0; i < N; i++) ps.push({ x: rnd() * w, y: rnd() * h, life: rnd() * 220 });
    return {
      count: N,
      step: function (dt, w, h) {
        for (var i = 0; i < ps.length; i++) {
          var p = ps[i];
          var a = noise(p.x / 90, p.y / 90) * Math.PI * 4;
          p.x += Math.cos(a) * 1.1 * dt; p.y += Math.sin(a) * 1.1 * dt;
          p.life -= dt;
          if (p.life <= 0 || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
            p.x = rnd() * w; p.y = rnd() * h; p.life = 120 + rnd() * 160;
          }
        }
      },
      draw: function (ctx) {
        ctx.fillStyle = "rgba(" + palAt(0.72) + ",0.30)";
        for (var i = 0; i < ps.length; i++) ctx.fillRect(ps[i].x, ps[i].y, 0.9, 0.9);
      }
    };
  }
};
/* --- 2. Suddivisione ricorsiva (2D) --- */
