/* Ciclo di costruzione e smontaggio.
   Estratto da prototypes/sketch-bench.html. Fonte unica: modificare qui. */

/* Ciclo di vita di una struttura che si costruisce e si smonta.
   Costruisce nell'ordine in cui le parti sono nate, tiene la figura completa
   per un momento, poi la smonta: o a ritroso lungo lo stesso percorso — l'ultima
   nata muore per prima — oppure in ordine casuale. Finito, ricomincia. */
export function makeCycle(n, rnd, customOrder) {
  var alive = new Uint8Array(n);
  var order = new Int32Array(n), kill = new Int32Array(n), i;
  for (i = 0; i < n; i++) order[i] = customOrder ? customOrder[i] : i;
  var phase = 0, built = 0, razed = 0, held = 0, live = 0;
  function planKill(mode) {
    for (var i = 0; i < n; i++) kill[i] = order[n - 1 - i];      /* a ritroso */
    if (mode === "casuale") {
      for (var j = n - 1; j > 0; j--) {
        var t = (rnd() * (j + 1)) | 0, tmp = kill[j]; kill[j] = kill[t]; kill[t] = tmp;
      }
    }
  }
  return {
    alive: alive,
    count: function () { return live; },
    phaseName: function () { return phase === 0 ? "costruisce" : (phase === 1 ? "completa" : "smonta"); },
    step: function (dt, P) {
      var sp = dt * (P ? P.reveal : 1.6), mode = (P && P.undo) ? P.undo : "inverso", i;
      if (phase === 0) {
        var t = Math.min(n, built + sp);
        for (i = Math.floor(built); i < Math.floor(t); i++) { alive[order[i]] = 1; live++; }
        built = t;
        if (built >= n) { phase = 1; held = 0; }
      } else if (phase === 1) {
        held += dt;
        if (held > 90 && mode !== "no") { phase = 2; razed = 0; planKill(mode); }
      } else {
        var u = Math.min(n, razed + sp);
        for (i = Math.floor(razed); i < Math.floor(u); i++) { alive[kill[i]] = 0; live--; }
        razed = u;
        if (razed >= n) { phase = 0; built = 0; }
      }
    }
  };
}

/* Taglio di un poligono convesso con una retta. Un'unica funzione copre sia i
   tagli ortogonali sia quelli diagonali: cambia solo la direzione della retta. */
