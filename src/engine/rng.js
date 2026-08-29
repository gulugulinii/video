/* Generatore pseudo-casuale seedabile.
   Estratto da prototypes/sketch-bench.html. Fonte unica: modificare qui. */

/* ---------- generatore pseudo-casuale seedabile ---------- */
export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ---------- rumore di valore 2D, tabella seedata ---------- */
