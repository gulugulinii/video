/* Palette e sorgente luminosa.
   Estratto da prototypes/sketch-bench.html. Fonte unica: modificare qui. */

/* Palette. Il colore non viene appiccicato sopra: viene mappato sulla stessa
   grandezza che struttura già l'immagine, cioè la profondità. Ogni livello di
   opacità pesca un colore lungo la rampa, quindi il vicino e il lontano restano
   distinguibili come nel monocromo — cambia solo la tinta. */
export var PALETTES = {
  mono:     { label: "Monocromo", bg: [9, 9, 9],    stops: [[104, 104, 104], [198, 201, 206], [255, 255, 255]] },
  brace:    { label: "Brace",     bg: [14, 9, 7],   stops: [[116, 50, 26], [214, 126, 48], [255, 227, 170]] },
  ghiaccio: { label: "Ghiaccio",  bg: [7, 10, 14],  stops: [[44, 84, 122], [104, 175, 214], [228, 246, 255]] },
  alga:     { label: "Alga",      bg: [7, 13, 11],  stops: [[32, 90, 78], [86, 178, 140], [216, 248, 228]] },
  sabbia:   { label: "Sabbia",    bg: [13, 11, 8],  stops: [[108, 86, 56], [190, 162, 112], [249, 239, 216]] }
};
var PAL = PALETTES.mono;

/* PAL era una variabile globale che il runtime riassegnava. Con i moduli le
   importazioni sono in sola lettura, quindi la palette attiva resta privata al
   modulo e si cambia da qui. Meglio della globale: nessuno la puo riassegnare
   per sbaglio. */
export function setPalette(p) { PAL = (typeof p === "string" ? PALETTES[p] : p) || PALETTES.mono; }
export function getPalette() { return PAL; }
export function palAt(t) {
  var st = PAL.stops, n = st.length - 1;
  var x = Math.max(0, Math.min(0.9999, t)) * n, i = x | 0, f = x - i;
  var a = st[i], b = st[i + 1];
  return ((a[0] + (b[0] - a[0]) * f) | 0) + "," + ((a[1] + (b[1] - a[1]) * f) | 0) + "," + ((a[2] + (b[2] - a[2]) * f) | 0);
}
export function palBg() { return "rgb(" + PAL.bg.join(",") + ")"; }

/* Sorgente luminosa in alto: è ciò che dà alla scena un "sopra" e un "sotto",
   e quindi la sensazione di starci dentro invece di guardarla. */
export function keyLight(ctx, w, h, P) {
  var dir = P && P.lightDir !== undefined ? P.lightDir : 90;
  var hei = P && P.lightHei !== undefined ? P.lightHei : 1.16;
  var itn = P && P.lightInt !== undefined ? P.lightInt : 1;
  if (itn <= 0) return;
  var rad = dir * Math.PI / 180;
  var lx = w * 0.5 + Math.cos(rad) * w * 0.55;
  var ly = h * 0.5 - hei * h * 0.9;
  var g = ctx.createRadialGradient(lx, ly, 0, lx, ly, h * 1.15);
  g.addColorStop(0, "rgba(255,255,255," + (0.20 * itn).toFixed(3) + ")");
  g.addColorStop(.45, "rgba(255,255,255," + (0.045 * itn).toFixed(3) + ")");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
}

/* Estensione del campo, l'unica cosa che separa "finito" da "infinito".
   Le posizioni si avvolgono sempre, quindi il mondo è sempre fatto di copie;
   ciò che cambia è quante ne restano accese. Un inviluppo morbido attorno
   all'origine spegne le copie oltre il raggio R: con R piccolo resta una sola
   nuvola, con R grande se ne accendono infinite. Poiché è una dissolvenza e non
   un interruttore, R si può muovere mentre voli senza nessuno scatto. */
