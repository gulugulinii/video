/* Estensione del campo: quante copie del cubo restano accese.
   Estratto da prototypes/sketch-bench.html. Fonte unica: modificare qui. */

/* Estensione del campo, l'unica cosa che separa "finito" da "infinito".
   Le posizioni si avvolgono sempre, quindi il mondo è sempre fatto di copie;
   ciò che cambia è quante ne restano accese. Un inviluppo morbido attorno
   all'origine spegne le copie oltre il raggio R: con R piccolo resta una sola
   nuvola, con R grande se ne accendono infinite. Poiché è una dissolvenza e non
   un interruttore, R si può muovere mentre voli senza nessuno scatto. */
export var EXTENT_INF = 99;

/* Quale copia disegnare. L'avvolgimento sceglie sempre la copia più vicina alla
   camera, il che è giusto solo finché quella copia esiste: con estensione finita
   e camera lontana, la copia vicina è spenta mentre l'originale è ancora accesa.
   Si valutano entrambe e vince quella più visibile — ed è questo che permette di
   allontanarsi e continuare a vedere la nuvola. Scrive in out:
   [dx, dy, dz, env, offX, offY, offZ]. */
export function pickCopy(px, py, pz, cam, B, R, out) {
  var dx = px - cam.x, dy = py - cam.y, dz = pz - cam.z;
  var ox = B * Math.round(dx / B), oy = B * Math.round(dy / B), oz = B * Math.round(dz / B);
  var envW = envelopeAt(px - ox, py - oy, pz - oz, R);
  var envB = envelopeAt(px, py, pz, R);
  if (envW >= envB) {
    out[0] = dx - ox; out[1] = dy - oy; out[2] = dz - oz; out[3] = envW;
    out[4] = ox; out[5] = oy; out[6] = oz;
  } else {
    out[0] = dx; out[1] = dy; out[2] = dz; out[3] = envB;
    out[4] = 0; out[5] = 0; out[6] = 0;
  }
}

export function envelopeAt(wx, wy, wz, R) {
  if (R >= EXTENT_INF) return 1;
  var d = Math.sqrt(wx * wx + wy * wy + wz * wz);
  var soft = Math.max(1.0, R * 0.35);
  return Math.max(0, Math.min(1, (R + soft - d) / soft));
}

/* Camera in prima persona con due inquadrature.
   DENTRO: sta nel mezzo e deriva lentamente in avanti.
   FUORI:  sta su un'orbita attorno all'origine e guarda verso il centro. */
