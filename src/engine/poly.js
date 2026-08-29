/* Taglio di poligoni convessi.
   Estratto da prototypes/sketch-bench.html. Fonte unica: modificare qui. */

/* Taglio di un poligono convesso con una retta. Un'unica funzione copre sia i
   tagli ortogonali sia quelli diagonali: cambia solo la direzione della retta. */
export function cutPoly(poly, px, py, nx, ny) {
  var A = [], B = [], i, n = poly.length;
  function side(p) { return (p[0] - px) * nx + (p[1] - py) * ny; }
  for (i = 0; i < n; i++) {
    var p = poly[i], q = poly[(i + 1) % n];
    var sp = side(p), sq = side(q);
    if (sp >= 0) A.push(p); else B.push(p);
    if ((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) {
      var t = sp / (sp - sq);
      var m = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      A.push(m); B.push(m.slice());
    }
  }
  return (A.length >= 3 && B.length >= 3) ? [A, B] : null;
}
export function polyArea(p) {
  var a = 0; for (var i = 0; i < p.length; i++) {
    var q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1];
  } return Math.abs(a) / 2;
}

/* --- 1. Flow field (2D) --- */
