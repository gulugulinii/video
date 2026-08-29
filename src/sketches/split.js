/* Suddivisione ricorsiva (2D)
   Estratto da prototypes/sketch-bench.html. Fonte unica: modificare qui. */

import { makeCycle } from "../engine/cycle.js";
import { palAt } from "../engine/palette.js";
import { cutPoly, polyArea } from "../engine/poly.js";

/* --- 2. Suddivisione ricorsiva (2D) --- */
export const sketch = {
  label: "Suddivisione", dim: "2D", hasSplit: true,
  blurb: "Un rettangolo tagliato ricorsivamente, in ortogonale o in diagonale.",
  clear: "full",
  title: "Suddivisione ricorsiva — 2D puro",
  body: "Si parte da un rettangolo e lo si taglia in due, poi si ripete su ogni metà finché le celle non sono abbastanza piccole. Le celle non sono rettangoli ma poligoni convessi, e il taglio è una retta qualsiasi: per questo lo stesso identico codice produce sia la griglia ortogonale sia la tassellazione diagonale. Cambia solo la direzione della retta.",
  code: "<span class='c'>// una sola funzione per entrambi i modi: cambia la normale</span>\nvar ang = orto ? (larga ? 0 : Math.PI/2)\n              : (Math.PI/4 + rnd() * Math.PI/2);\nvar parti = cutPoly(cella, px, py, Math.cos(ang), Math.sin(ang));\n<span class='c'>// poi ricorsione su parti[0] e parti[1]</span>",
  create: function (rnd, w, h, density, P) {
    var mode = (P && P.splitMode) || "orto";
    var depth = Math.max(3, Math.round((P ? P.splitDepth : 9) * Math.sqrt(density)));
    var minA = Math.max(120, (w * h) / (14 * Math.pow(2, Math.min(depth, 11)) + 60));
    var cells = [];
    (function rec(poly, d) {
      var area = polyArea(poly);
      if (d === 0 || area < minA) { cells.push({ p: poly, g: rnd(), a: area }); return; }
      /* baricentro, spostato a caso, come punto di passaggio della retta */
      var cx = 0, cy = 0, i;
      for (i = 0; i < poly.length; i++) { cx += poly[i][0]; cy += poly[i][1]; }
      cx /= poly.length; cy /= poly.length;
      var minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
      for (i = 0; i < poly.length; i++) {
        minx = Math.min(minx, poly[i][0]); maxx = Math.max(maxx, poly[i][0]);
        miny = Math.min(miny, poly[i][1]); maxy = Math.max(maxy, poly[i][1]);
      }
      var wide = (maxx - minx) >= (maxy - miny);
      var ang;
      var diag = mode === "diag" || (mode === "misto" && rnd() < 0.5);
      if (diag) ang = Math.PI * 0.25 + rnd() * Math.PI * 0.5;
      else ang = wide ? 0 : Math.PI / 2;
      cx += (rnd() - 0.5) * (maxx - minx) * 0.34;
      cy += (rnd() - 0.5) * (maxy - miny) * 0.34;
      var parts = cutPoly(poly, cx, cy, Math.cos(ang), Math.sin(ang));
      if (!parts) { cells.push({ p: poly, g: rnd(), a: area }); return; }
      rec(parts[0], d - 1); rec(parts[1], d - 1);
    })([[0, 0], [w, 0], [w, h], [0, h]], depth);

    var cyc = makeCycle(cells.length, rnd);
    return {
      count: cells.length,
      step: function (dt) { cyc.step(dt, P); },
      draw: function (ctx) {
        var i, j;
        for (i = 0; i < cells.length; i++) {
          if (!cyc.alive[i]) continue;
          var c = cells[i], p = c.p;
          ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
          for (j = 1; j < p.length; j++) ctx.lineTo(p[j][0], p[j][1]);
          ctx.closePath();
          ctx.fillStyle = "rgba(" + palAt(c.g * 0.75) + "," + (0.05 + c.g * 0.16).toFixed(3) + ")";
          ctx.fill();
          ctx.strokeStyle = "rgba(" + palAt(0.35 + c.g * 0.65) + "," + (0.14 + c.g * 0.26).toFixed(3) + ")";
          ctx.lineWidth = 0.7; ctx.stroke();
        }
      },
      stats: function () { return "celle " + cyc.count() + " di " + cells.length + " · " + cyc.phaseName(); }
    };
  }
};
/* --- 3. Immersione: nuvola di nodi con camera (3D) --- */
