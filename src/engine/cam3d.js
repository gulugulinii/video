/* Camera in prima persona, dentro o in orbita fuori.
   Estratto da prototypes/sketch-bench.html. Fonte unica: modificare qui. */

/* Camera in prima persona con due inquadrature.
   DENTRO: sta nel mezzo e deriva lentamente in avanti.
   FUORI:  sta su un'orbita attorno all'origine e guarda verso il centro. */
export function makeCam3D(defR) {
  var cam = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
  var mode = "inside", focal = 1.0, autoDrift = 0.30;
  /* raggio d'orbita di riposo: va tarato sulla dimensione dello sketch,
     altrimenti "Fuori" su un oggetto grande resta appiccicato alla superficie */
  var REST = defR || 5.5;
  var orbA = 0, orbR = REST, orbRT = REST, orbH = REST * 0.11, yawOff = 0, pitchOff = 0;
  var cy = 1, sy = 0, cp = 1, sp = 0;

  return {
    get: function () { return cam; },
    focal: function () { return focal; },
    set: function (c) {
      if (mode === "outside") {
        var d = Math.sqrt(c.x * c.x + c.y * c.y + c.z * c.z);
        orbR = orbRT = d < REST * 0.33 ? REST : Math.min(REST * 8, d);
        if (c.x !== 0 || c.z !== 0) orbA = Math.atan2(c.x, c.z);
        orbH = c.y; yawOff = 0; pitchOff = 0;
        return;
      }
      cam.x = c.x; cam.y = c.y; cam.z = c.z; cam.yaw = c.yaw; cam.pitch = c.pitch;
    },
    step: function (dt, input, P, extentR) {
      var want = (P && P.mode) ? P.mode : "inside";
      if (want !== mode) {
        mode = want;
        if (mode === "outside") {
          var d0 = Math.sqrt(cam.x * cam.x + cam.y * cam.y + cam.z * cam.z);
          orbA = (cam.x === 0 && cam.z === 0) ? 0 : Math.atan2(cam.x, cam.z);
          orbR = Math.max(0.6, d0); orbRT = REST; orbH = REST * 0.11; yawOff = 0; pitchOff = 0;
        } else { cam.x = 0; cam.y = 0; cam.z = 0; cam.yaw = 0; cam.pitch = 0; }
      }
      var mf = input ? input.moveF : 0, mr = input ? input.moveR : 0, mu = input ? input.moveU : 0;
      var fast = (input && input.boost) ? 5 : 1;

      if (mode === "outside") {
        if (input) {
          yawOff += input.lookX * 0.0040;
          pitchOff = Math.max(-1, Math.min(1, pitchOff + input.lookY * 0.0040));
          if (input.fov) focal = input.fov;
        }
        var st = 0.055 * dt * fast;
        orbRT = Math.max(REST * 0.3, Math.min(REST * 8, orbRT - mf * st * REST * 0.32));
        orbH += mu * st * 0.5;
        orbA += mr * st * 0.10 + dt * 0.0016;
        orbR += (orbRT - orbR) * 0.045 * dt;
        cam.x = Math.sin(orbA) * orbR; cam.y = orbH; cam.z = Math.cos(orbA) * orbR;
        var L = Math.sqrt(cam.x * cam.x + cam.y * cam.y + cam.z * cam.z) || 1;
        cam.yaw = Math.atan2(-cam.x / L, -cam.z / L) + yawOff;
        cam.pitch = Math.asin(Math.max(-1, Math.min(1, -cam.y / L))) + pitchOff;
      } else {
        if (input) {
          cam.yaw += input.lookX * 0.0040;
          cam.pitch = Math.max(-1.35, Math.min(1.35, cam.pitch + input.lookY * 0.0040));
          if (input.fov) focal = input.fov;
        }
        var a = Math.cos(cam.yaw), b = Math.sin(cam.yaw);
        var c2 = Math.cos(cam.pitch), d2 = Math.sin(cam.pitch);
        var fwd = [b * c2, d2, a * c2], rgt = [a, 0, -b], up = [-d2 * b, c2, -d2 * a];
        /* La deriva automatica si ferma se sei già uscito dal campo finito,
           altrimenti voleresti via nel vuoto per sempre. */
        var outOfField = extentR < EXTENT_INF &&
          Math.sqrt(cam.x * cam.x + cam.y * cam.y + cam.z * cam.z) > extentR;
        if (mf === 0 && mr === 0 && mu === 0 && !outOfField) mf = autoDrift;
        var sc = 0.011 * dt * fast;
        cam.x += (fwd[0] * mf + rgt[0] * mr + up[0] * mu) * sc;
        cam.y += (fwd[1] * mf + rgt[1] * mr + up[1] * mu) * sc;
        cam.z += (fwd[2] * mf + rgt[2] * mr + up[2] * mu) * sc;
      }
    },
    /* da chiamare una volta per frame, prima di project() */
    prepare: function () {
      cy = Math.cos(cam.yaw); sy = Math.sin(cam.yaw);
      cp = Math.cos(cam.pitch); sp = Math.sin(cam.pitch);
    },
    /* mondo relativo alla camera -> schermo. La divisione per la profondità
       è tutta qui: è l'unica differenza fra uno sketch 2D e uno 3D. */
    project: function (dx, dy, dz, w, h, k) {
      var x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy;
      var y2 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp;
      if (z2 < 0.09) return null;
      var s = focal / z2;
      return { sx: w * 0.5 + x1 * s * k, sy: h * 0.5 + y2 * s * k, z: z2 };
    },
    dist: function () { return Math.sqrt(cam.x * cam.x + cam.y * cam.y + cam.z * cam.z); }
  };
}

/* Profondità di campo a tre strati. Gli strati sfocati sono renderizzati a metà
   risoluzione e sfocati nella LORO risoluzione: costa un quarto dei pixel e il
   risultato è indistinguibile. È l'unico posto dove i piani sovrapposti servono. */
