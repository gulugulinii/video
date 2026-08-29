/* Palette e sorgente luminosa.
   Fonte unica: modificare qui, poi `python3 tools/costruisci.py`. */

/* Palette. Il colore non viene appiccicato sopra: viene mappato sulla stessa
   grandezza che struttura già l'immagine, cioè la profondità. Ogni livello di
   opacità pesca un colore lungo la rampa, quindi il vicino e il lontano restano
   distinguibili come nel monocromo — cambia solo la tinta.

   Le fermate si scrivono in sRGB perché è così che si leggono e si scelgono,
   ma l'interpolazione avviene in OKLab: vedi più sotto il perché. */
export var PALETTES = {
  /* Monocromo: le fermate devono essere neutre davvero. La fermata media era
     198,201,206 — croma 8, invisibile a occhio ma misurabile: bastava a portare
     la saturazione dell'immagine a 0.77 dove il riferimento sta a 0.00. */
  mono:     { label: "Monocromo", bg: [9, 9, 9],    stops: [[104, 104, 104], [201, 201, 201], [255, 255, 255]] },
  brace:    { label: "Brace",     bg: [14, 9, 7],   stops: [[116, 50, 26], [214, 126, 48], [255, 227, 170]] },
  ghiaccio: { label: "Ghiaccio",  bg: [7, 10, 14],  stops: [[44, 84, 122], [104, 175, 214], [228, 246, 255]] },
  alga:     { label: "Alga",      bg: [7, 13, 11],  stops: [[32, 90, 78], [86, 178, 140], [216, 248, 228]] },
  sabbia:   { label: "Sabbia",    bg: [13, 11, 8],  stops: [[108, 86, 56], [190, 162, 112], [249, 239, 216]] }
};

/* ---------- OKLab ----------
   sRGB è lo spazio in cui i colori sono *codificati*, non quello in cui l'occhio
   li *percepisce*. Interpolando in sRGB fra due colori saturi si passa per toni
   medi grigi e spenti: è il difetto che rendeva impastate le rampe.

   OKLab è uno spazio percettivamente uniforme: una distanza uguale corrisponde a
   una differenza percepita uguale. Interpolando lì, le stesse tre fermate danno
   una rampa pulita, senza cambiare nulla nelle palette scritte sopra.

   Matrici di Björn Ottosson. */
function srgbLin(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linSrgb(c) {
  c = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
}
function rgbToOklab(rgb) {
  var R = srgbLin(rgb[0]), G = srgbLin(rgb[1]), B = srgbLin(rgb[2]);
  var l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  var m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  var s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  ];
}
function oklabToRgb(L, a, b) {
  var l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  var m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  var s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  var l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  return [
    linSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)
  ];
}

/* La conversione costa tre radici cubiche, e palAt() viene chiamata anche
   centinaia di volte per frame dagli sketch 2D. La rampa viene quindi calcolata
   una volta sola quando cambia la palette, e poi solo letta. */
var PASSI = 128;
var PAL = null, LUT = null;

function costruisciLut(p) {
  var lab = p.stops.map(rgbToOklab), n = lab.length - 1;
  var out = new Array(PASSI + 1);
  for (var i = 0; i <= PASSI; i++) {
    var x = (i / PASSI) * n, k = Math.min(n - 1, x | 0), f = x - k;
    var A = lab[k], B = lab[k + 1];
    var c = oklabToRgb(A[0] + (B[0] - A[0]) * f,
                       A[1] + (B[1] - A[1]) * f,
                       A[2] + (B[2] - A[2]) * f);
    out[i] = c[0] + "," + c[1] + "," + c[2];
  }
  return out;
}

export function setPalette(p) {
  PAL = (typeof p === "string" ? PALETTES[p] : p) || PALETTES.mono;
  LUT = costruisciLut(PAL);
}
export function getPalette() { return PAL; }
export function palAt(t) {
  var i = (Math.max(0, Math.min(1, t)) * PASSI + 0.5) | 0;
  return LUT[i];
}
export function palBg() { return "rgb(" + PAL.bg.join(",") + ")"; }

setPalette(PALETTES.mono);

/* ---------- luce ----------
   Dove sta la sorgente sullo schermo. Serve al gradiente della luce, ma anche
   agli sketch: modulando la densità con la distanza da questo punto la
   geometria si addensa dove c'è luce e si dirada nel buio, ed è così che nasce
   un punto focale invece di un riempimento uniforme. */
export function lightPos(w, h, P) {
  var dir = (P && P.lightDir !== undefined) ? P.lightDir : 90;
  var hei = (P && P.lightHei !== undefined) ? P.lightHei : 1.16;
  var rad = dir * Math.PI / 180;
  return [w * 0.5 + Math.cos(rad) * w * 0.55, h * 0.5 - hei * h * 0.9];
}

/* Sorgente luminosa: è ciò che dà alla scena un "sopra" e un "sotto", e quindi
   la sensazione di starci dentro invece di guardarla. */
export function keyLight(ctx, w, h, P) {
  var itn = (P && P.lightInt !== undefined) ? P.lightInt : 1;
  if (itn <= 0) return;
  var L = lightPos(w, h, P), lx = L[0], ly = L[1];
  var g = ctx.createRadialGradient(lx, ly, 0, lx, ly, h * 1.15);
  g.addColorStop(0, "rgba(255,255,255," + (0.20 * itn).toFixed(3) + ")");
  g.addColorStop(.45, "rgba(255,255,255," + (0.045 * itn).toFixed(3) + ")");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
}
