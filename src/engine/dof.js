/* Profondita di campo a tre strati.
   Estratto da prototypes/sketch-bench.html. Fonte unica: modificare qui. */

/* Profondità di campo a tre strati. Gli strati sfocati sono renderizzati a metà
   risoluzione e sfocati nella LORO risoluzione: costa un quarto dei pixel e il
   risultato è indistinguibile. È l'unico posto dove i piani sovrapposti servono. */
export function makeDof() {
  var SC = [0.5, 1, 0.5], BL = [7, 0, 1.4];
  var L = null, lw = 0, lh = 0, ld = 0;
  var b0 = 0.62, b1 = 1.55;
  return {
    thresholds: function (n, f) { b0 = n; b1 = f; },
    binOf: function (z) { return z < b0 ? 0 : (z < b1 ? 1 : 2); },
    begin: function (w, h, dpr) {
      if (!L || lw !== w || lh !== h || ld !== dpr) {
        lw = w; lh = h; ld = dpr; L = [];
        for (var n = 0; n < 3; n++) {
          var cw = Math.max(1, Math.round(w * dpr * SC[n])), ch = Math.max(1, Math.round(h * dpr * SC[n]));
          var c = document.createElement("canvas"); c.width = cw; c.height = ch;
          var e = { cv: c, ctx: c.getContext("2d"), scale: SC[n], tmp: null, tctx: null };
          if (BL[n] > 0) {
            var t = document.createElement("canvas"); t.width = cw; t.height = ch;
            e.tmp = t; e.tctx = t.getContext("2d");
          }
          L.push(e);
        }
      }
      for (var i = 0; i < 3; i++) {
        var s = dpr * L[i].scale;
        L[i].ctx.setTransform(s, 0, 0, s, 0, 0);
        L[i].ctx.clearRect(0, 0, w, h);
        L[i].ctx.globalCompositeOperation = "lighter";
      }
      return L;
    },
    end: function (ctx, w, h, dpr) {
      for (var i = 0; i < 3; i++) {
        var e = L[i], src = e.cv;
        if (e.tmp) {
          var r = BL[i] * dpr * e.scale;
          e.tctx.setTransform(1, 0, 0, 1, 0, 0);
          e.tctx.clearRect(0, 0, e.tmp.width, e.tmp.height);
          if ("filter" in e.tctx) e.tctx.filter = "blur(" + r.toFixed(2) + "px)";
          e.tctx.drawImage(e.cv, 0, 0);
          if ("filter" in e.tctx) e.tctx.filter = "none";
          src = e.tmp;
        }
        e.out = src;
      }
      ctx.drawImage(L[2].out, 0, 0, w, h);   /* lontano */
      ctx.drawImage(L[1].out, 0, 0, w, h);   /* a fuoco */
      ctx.drawImage(L[0].out, 0, 0, w, h);   /* vicino, sfocato */
    }
  };
}

/* Percorsi raggruppati per (strato, livello di opacità): poche decine di
   stroke() e fill() invece di alcune migliaia. */
