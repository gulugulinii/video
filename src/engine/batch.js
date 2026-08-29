/* Percorsi raggruppati per strato e livello di opacita.
   Estratto da prototypes/sketch-bench.html. Fonte unica: modificare qui. */

import { palAt } from "./palette.js";

/* Percorsi raggruppati per (strato, livello di opacità): poche decine di
   stroke() e fill() invece di alcune migliaia. */
export function makeBatch(nb) {
  var s = { tri: [], edge: [], node: [], glow: [], nb: nb };
  for (var l = 0; l < 3; l++) {
    s.tri.push(new Array(nb)); s.edge.push(new Array(nb));
    s.node.push(new Array(nb)); s.glow.push(new Array(nb));
  }
  s.bucket = function (a) { var b = (a * nb) | 0; return b < 0 ? 0 : (b >= nb ? nb - 1 : b); };
  s.path = function (store, l, b) {
    var p = store[l][b]; if (!p) { p = new Path2D(); store[l][b] = p; } return p;
  };
  /* glowA: archi "accesi", quelli dove due fronti di crescita si incontrano.
     Prendono sempre la cima della rampa di colore, così si staccano. */
  s.flush = function (L, triA, edgeA, nodeA, glowA) {
    for (var l = 0; l < 3; l++) {
      var x = L[l].ctx;
      for (var b = 0; b < nb; b++) {
        var a = (b + 0.5) / nb;
        var col = palAt(a);
        if (s.tri[l][b]) { x.fillStyle = "rgba(" + col + "," + (triA * a).toFixed(4) + ")"; x.fill(s.tri[l][b]); }
        if (s.edge[l][b]) {
          x.strokeStyle = "rgba(" + col + "," + (edgeA * a).toFixed(4) + ")";
          x.lineWidth = 0.5 + a * 0.8; x.stroke(s.edge[l][b]);
        }
        if (s.node[l][b]) { x.fillStyle = "rgba(" + col + "," + (nodeA[0] + a * nodeA[1]).toFixed(3) + ")"; x.fill(s.node[l][b]); }
        if (glowA && s.glow[l][b]) {
          x.strokeStyle = "rgba(" + palAt(0.99) + "," + (glowA * (0.35 + a * 0.65)).toFixed(4) + ")";
          x.lineWidth = 0.9 + a * 1.5; x.stroke(s.glow[l][b]);
        }
      }
    }
  };
  return s;
}

/* Ciclo di vita di una struttura che si costruisce e si smonta.
   Costruisce nell'ordine in cui le parti sono nate, tiene la figura completa
   per un momento, poi la smonta: o a ritroso lungo lo stesso percorso — l'ultima
   nata muore per prima — oppure in ordine casuale. Finito, ricomincia. */
