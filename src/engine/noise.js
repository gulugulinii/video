/* Rumore di valore, 2D e 3D, su tabella seedata.
   Estratto da prototypes/sketch-bench.html. Fonte unica: modificare qui. */

/* ---------- rumore di valore 2D, tabella seedata ---------- */
export function makeNoise(rnd) {
  var S = 128, g = new Float32Array(S * S), i;
  for (i = 0; i < g.length; i++) g[i] = rnd();
  function fade(t) { return t * t * (3 - 2 * t); }
  return function (x, y) {
    x = ((x % S) + S) % S; y = ((y % S) + S) % S;
    var x0 = Math.floor(x), y0 = Math.floor(y);
    var fx = fade(x - x0), fy = fade(y - y0);
    var x1 = (x0 + 1) % S, y1 = (y0 + 1) % S;
    var a = g[y0 * S + x0], b = g[y0 * S + x1], c = g[y1 * S + x0], d = g[y1 * S + x1];
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  };
}

/* Rumore di valore 3D su tabella seedata. Stessa idea della versione 2D:
   una griglia di valori casuali, interpolata dolcemente. */
export function makeNoise3(rnd) {
  var S = 32, g = new Float32Array(S * S * S), i;
  for (i = 0; i < g.length; i++) g[i] = rnd();
  function fade(t) { return t * t * (3 - 2 * t); }
  function at(x, y, z) { return g[(z * S + y) * S + x]; }
  return function (x, y, z) {
    x = ((x % S) + S) % S; y = ((y % S) + S) % S; z = ((z % S) + S) % S;
    var x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
    var fx = fade(x - x0), fy = fade(y - y0), fz = fade(z - z0);
    var x1 = (x0 + 1) % S, y1 = (y0 + 1) % S, z1 = (z0 + 1) % S;
    var c00 = at(x0, y0, z0) * (1 - fx) + at(x1, y0, z0) * fx;
    var c10 = at(x0, y1, z0) * (1 - fx) + at(x1, y1, z0) * fx;
    var c01 = at(x0, y0, z1) * (1 - fx) + at(x1, y0, z1) * fx;
    var c11 = at(x0, y1, z1) * (1 - fx) + at(x1, y1, z1) * fx;
    return (c00 * (1 - fy) + c10 * fy) * (1 - fz) + (c01 * (1 - fy) + c11 * fy) * fz;
  };
}

/* Palette. Il colore non viene appiccicato sopra: viene mappato sulla stessa
   grandezza che struttura già l'immagine, cioè la profondità. Ogni livello di
   opacità pesca un colore lungo la rampa, quindi il vicino e il lontano restano
   distinguibili come nel monocromo — cambia solo la tinta. */
