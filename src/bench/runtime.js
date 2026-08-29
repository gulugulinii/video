/* Runtime del banco di prova.
   Tutta l'interfaccia: scelta dello sketch, cursori, camera, palette,
   registrazione video. Il sito non usa niente di questo file: usa
   src/background.js. Fonte unica: modificare qui. */

import { mulberry32 } from "../engine/rng.js";
import { EXTENT_INF } from "../engine/field.js";
import { PALETTES, palBg, setPalette, getPalette } from "../engine/palette.js";
import { SKETCHES, ORDINE } from "../sketches/index.js";

(function () {
  var ORDER = ORDINE;
  var cv = document.getElementById("cv"), ctx = cv.getContext("2d");
  var W = 0, H = 0, DPR = 1;
  var current = "inside", inst = null, paused = false, frames = 0;
  var seedEl = document.getElementById("seed");
  var densEl = document.getElementById("density"), densVal = document.getElementById("density-val");
  var spdEl = document.getElementById("speed"), spdVal = document.getElementById("speed-val");
  var barLeft = document.getElementById("bar-left"), barFps = document.getElementById("bar-fps"), barFrame = document.getElementById("bar-frame");

  /* rail */
  var picker = document.getElementById("picker");
  ORDER.forEach(function (key) {
    var s = SKETCHES[key];
    var b = document.createElement("button");
    b.className = "pick"; b.type = "button"; b.dataset.key = key;
    b.setAttribute("aria-pressed", String(key === current));
    b.innerHTML = "<b></b><span class='dim'></span><small></small>";
    b.querySelector("b").textContent = s.label;
    b.querySelector(".dim").textContent = s.dim;
    b.querySelector("small").textContent = s.blurb;
    b.addEventListener("click", function () { select(key); });
    picker.appendChild(b);
  });

  /* stato degli input della camera, consumato da step() */
  var input = { lookX: 0, lookY: 0, moveF: 0, moveR: 0, moveU: 0, fov: 1, boost: false };
  /* parametri di generazione, letti dallo sketch a ogni frame senza ricostruirlo */
  var params = { link: 0.57, drift: 1, maxTri: 1100, mode: "inside",
                extent: EXTENT_INF, splitMode: "orto", splitDepth: 9, reveal: 1.6, undo: "inverso", seeds: 1,
                lightDir: 90, lightHei: 1.16, lightInt: 1 };
  var genPanel = document.getElementById("gen-panel");
  var viewPanel = document.getElementById("view-panel");
  var splitPanel = document.getElementById("split-panel");
  var driftField = document.getElementById("drift-field");
  var extEl = document.getElementById("extent"), extVal = document.getElementById("extent-val");
  var seedPanel = document.getElementById("seed-panel");
  var lightPanel = document.getElementById("light-panel");
  var keys = Object.create(null);
  var camPanel = document.getElementById("cam-panel");
  var camEl = document.getElementById("cam");
  var fovField = document.getElementById("fov-field"), fovEl = document.getElementById("fov"), fovVal = document.getElementById("fov-val");

  function select(key) {
    current = key;
    Array.prototype.forEach.call(picker.children, function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.key === key));
    });
    var s = SKETCHES[key];
    document.getElementById("ex-title").textContent = s.title;
    document.getElementById("ex-body").textContent = s.body;
    document.getElementById("ex-code").innerHTML = s.code;
    /* Alcuni sketch sono un oggetto solo, non un campo: partono con
       un'estensione finita, così "Fuori" mostra davvero l'oggetto intero. */
    var e0 = s.extent0 || 100;
    if (parseInt(extEl.value, 10) !== e0) {
      extEl.value = String(e0);
      extEl.dispatchEvent(new Event("input"));
    }
    camPanel.hidden = !s.hasCam;
    viewPanel.hidden = !s.hasCam;
    fovField.hidden = !s.hasCam;
    genPanel.hidden = !s.hasGen;
    splitPanel.hidden = !s.hasSplit;
    seedPanel.hidden = !s.hasSeeds;
    lightPanel.hidden = !s.hasCam;
    driftField.hidden = !s.hasDrift;
    cv.style.cursor = s.hasCam ? "grab" : "default";
    build();
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    var r = cv.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  var keptCam = null;   /* la camera sopravvive a cambio seed, densità e ridimensionamento */

  function build() {
    if (!W || !H) resize();
    if (inst && inst.getCam) { var c = inst.getCam(); keptCam = { x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch }; }
    var seed = parseInt(seedEl.value, 10); if (!isFinite(seed)) seed = 1;
    var density = parseInt(densEl.value, 10) / 100;
    inst = SKETCHES[current].create(mulberry32(seed >>> 0), W, H, density, params);
    if (inst.setCam && keptCam) inst.setCam(keptCam);
    frames = 0;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = palBg(); ctx.fillRect(0, 0, W, H);
  }

  /* controls */
  seedEl.addEventListener("change", build);
  document.getElementById("reroll").addEventListener("click", function () {
    seedEl.value = String(Math.floor(Math.random() * 99999999)); build();
  });
  densEl.addEventListener("input", function () { densVal.textContent = densEl.value + "%"; });
  densEl.addEventListener("change", build);
  spdEl.addEventListener("input", function () { spdVal.textContent = (spdEl.value / 100).toFixed(2) + "×"; });
  fovEl.addEventListener("input", function () {
    input.fov = fovEl.value / 100; fovVal.textContent = input.fov.toFixed(2);
  });

  /* --- parametri di generazione: agiscono a caldo, senza ricostruire lo sketch --- */
  var linkEl = document.getElementById("link"), linkVal = document.getElementById("link-val");
  var driftEl = document.getElementById("drift"), driftVal = document.getElementById("drift-val");
  var budEl = document.getElementById("budget"), budVal = document.getElementById("budget-val");
  linkEl.addEventListener("input", function () {
    params.link = linkEl.value / 100; linkVal.textContent = params.link.toFixed(2);
  });
  driftEl.addEventListener("input", function () {
    params.drift = driftEl.value / 100; driftVal.textContent = params.drift.toFixed(2) + "×";
  });

  /* Estensione del campo: continua, quindi si può muovere mentre voli. */
  extEl.addEventListener("input", function () {
    var v = parseInt(extEl.value, 10);
    params.extent = v >= 100 ? EXTENT_INF : v / 10;
    extVal.textContent = v >= 100 ? "∞" : (v / 10).toFixed(1);
  });

  /* Taglio: cambiano la struttura, quindi ricostruiscono lo sketch. */
  var depthEl = document.getElementById("depth"), depthVal = document.getElementById("depth-val");
  var revEl = document.getElementById("reveal"), revVal = document.getElementById("reveal-val");
  depthEl.addEventListener("input", function () { depthVal.textContent = depthEl.value; });
  depthEl.addEventListener("change", function () { params.splitDepth = parseInt(depthEl.value, 10); build(); });
  revEl.addEventListener("input", function () {
    params.reveal = parseInt(revEl.value, 10) / 10;
    revVal.textContent = params.reveal.toFixed(1) + "/frame";
  });
  var cuts = { orto: document.getElementById("cut-orto"), diag: document.getElementById("cut-diag"), misto: document.getElementById("cut-mix") };
  function setCut(m) {
    params.splitMode = m;
    for (var k in cuts) cuts[k].setAttribute("aria-pressed", String(k === m));
    build();
  }
  var undos = { inverso: document.getElementById("un-rev"), casuale: document.getElementById("un-rnd"), no: document.getElementById("un-no") };
  function setUndo(m) {
    params.undo = m;
    for (var k in undos) undos[k].setAttribute("aria-pressed", String(k === m));
  }
  undos.inverso.addEventListener("click", function () { setUndo("inverso"); });
  undos.casuale.addEventListener("click", function () { setUndo("casuale"); });
  undos.no.addEventListener("click", function () { setUndo("no"); });

  /* --- palette: cambia a caldo, nessuna ricostruzione --- */
  var swWrap = document.getElementById("swatches"), screenFig = document.querySelector(".screen");
  Object.keys(PALETTES).forEach(function (key) {
    var pl = PALETTES[key];
    var b = document.createElement("button");
    b.className = "sw"; b.type = "button"; b.dataset.pal = key;
    b.setAttribute("aria-pressed", String(getPalette() === pl));
    b.title = pl.label;
    var grad = pl.stops.map(function (c, i) {
      return "rgb(" + c.join(",") + ") " + Math.round(i / (pl.stops.length - 1) * 100) + "%";
    }).join(",");
    b.innerHTML = "<i></i><span></span>";
    b.querySelector("i").style.background = "linear-gradient(90deg," + grad + ")";
    b.querySelector("span").textContent = pl.label;
    b.addEventListener("click", function () {
      setPalette(pl);
      Array.prototype.forEach.call(swWrap.children, function (o) {
        o.setAttribute("aria-pressed", String(o.dataset.pal === key));
      });
      if (screenFig) screenFig.style.background = palBg();
    });
    swWrap.appendChild(b);
  });
  if (screenFig) screenFig.style.background = palBg();

  /* Semi: cambiano la struttura della crescita, quindi ricostruiscono. */
  var seedsEl = document.getElementById("seeds"), seedsVal = document.getElementById("seeds-val");
  seedsEl.addEventListener("input", function () { seedsVal.textContent = seedsEl.value; });
  seedsEl.addEventListener("change", function () { params.seeds = parseInt(seedsEl.value, 10); build(); });

  /* Luce: solo resa, quindi agisce a caldo. */
  function lightCtl(id, valId, apply) {
    var el = document.getElementById(id), out = document.getElementById(valId);
    el.addEventListener("input", function () { out.textContent = apply(parseInt(el.value, 10)); });
  }
  lightCtl("ldir", "ldir-val", function (v) { params.lightDir = v; return v + "°"; });
  lightCtl("lhei", "lhei-val", function (v) { params.lightHei = v / 100; return (v / 100).toFixed(2); });
  lightCtl("lint", "lint-val", function (v) { params.lightInt = v / 100; return (v / 100).toFixed(2); });

  /* Palette su misura: tre fermate più il fondo, applicate mentre provi. */
  function hexRGB(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  PALETTES.custom = { label: "Su misura", bg: [14, 9, 7], stops: [[106, 58, 28], [214, 126, 48], [255, 227, 170]] };
  function applyCustom() {
    var ids = ["c0", "c1", "c2"];
    PALETTES.custom.stops = ids.map(function (i) { return hexRGB(document.getElementById(i).value); });
    PALETTES.custom.bg = hexRGB(document.getElementById("cbg").value);
    setPalette(PALETTES.custom);
    Array.prototype.forEach.call(swWrap.children, function (o) { o.setAttribute("aria-pressed", "false"); });
    if (screenFig) screenFig.style.background = palBg();
  }
  ["c0", "c1", "c2", "cbg"].forEach(function (i) {
    document.getElementById(i).addEventListener("input", applyCustom);
  });

  cuts.orto.addEventListener("click", function () { setCut("orto"); });
  cuts.diag.addEventListener("click", function () { setCut("diag"); });
  cuts.misto.addEventListener("click", function () { setCut("misto"); });
  budEl.addEventListener("input", function () {
    params.maxTri = parseInt(budEl.value, 10); budVal.textContent = budEl.value;
  });
  var vIn = document.getElementById("view-in"), vOut = document.getElementById("view-out");
  var vHint = document.getElementById("view-hint");
  var camHint = document.getElementById("cam-hint");
  var HINT_IN = "Sei <b>dentro</b>: il campo si avvolge attorno alla camera e non ne esci mai. Premi <b>Fuori</b> e la camera si allontana da sola fino a inquadrare la nuvola intera, poi le orbita attorno.";
  var HINT_OUT = "Sei <b>fuori</b>: la nuvola è un oggetto finito e la camera le orbita attorno da sola. <b>W/S</b> avvicinano e allontanano, <b>R/F</b> alzano e abbassano, <b>A/D</b> ruotano più in fretta.";
  function setView(inside) {
    params.mode = inside ? "inside" : "outside";
    vIn.setAttribute("aria-pressed", String(inside));
    vOut.setAttribute("aria-pressed", String(!inside));
    vHint.innerHTML = inside ? HINT_IN : HINT_OUT;
    if (camHint) camHint.hidden = !inside;
  }
  vIn.addEventListener("click", function () { setView(true); });
  vOut.addEventListener("click", function () { setView(false); });

  /* --- camera: trascinamento per guardarsi intorno --- */
  var dragging = false, lastX = 0, lastY = 0;
  cv.addEventListener("pointerdown", function (e) {
    if (!SKETCHES[current].hasCam) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    cv.classList.add("dragging"); cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    input.lookX += e.clientX - lastX;
    input.lookY += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false; cv.classList.remove("dragging");
    if (e && e.pointerId !== undefined && cv.hasPointerCapture(e.pointerId)) cv.releasePointerCapture(e.pointerId);
  }
  cv.addEventListener("pointerup", endDrag);
  cv.addEventListener("pointercancel", endDrag);

  /* --- camera: tastiera per volare --- */
  cv.tabIndex = 0;
  /* I tasti di movimento devono restare vivi anche dopo aver toccato un cursore:
     solo i campi di testo se li tengono tutti, e i cursori si tengono le frecce. */
  function keyTarget(e) {
    var t = e.target;
    if (!t) return false;
    if (t.tagName === "TEXTAREA" || t.tagName === "SELECT") return true;
    if (t.tagName !== "INPUT") return false;
    if (t.type === "range") return e.code.indexOf("Arrow") === 0;
    return true;
  }
  var MOVE = { KeyW: "F+", ArrowUp: "F+", KeyS: "F-", ArrowDown: "F-", KeyA: "R-", ArrowLeft: "R-", KeyD: "R+", ArrowRight: "R+", KeyR: "U+", KeyF: "U-" };
  window.addEventListener("keydown", function (e) {
    if (keyTarget(e) || !SKETCHES[current].hasCam) return;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") { keys[e.code] = true; return; }
    if (!MOVE[e.code]) return;
    keys[e.code] = true; e.preventDefault();
  });
  window.addEventListener("keyup", function (e) { keys[e.code] = false; });
  window.addEventListener("blur", function () { keys = Object.create(null); });

  function readKeys() {
    var f = 0, r = 0, u = 0;
    for (var code in keys) {
      if (!keys[code] || !MOVE[code]) continue;
      var m = MOVE[code], s = m.charAt(1) === "+" ? 1 : -1;
      if (m.charAt(0) === "F") f += s; else if (m.charAt(0) === "R") r += s; else u += s;
    }
    input.boost = !!(keys.ShiftLeft || keys.ShiftRight);
    input.moveF = Math.max(-1, Math.min(1, f));
    input.moveR = Math.max(-1, Math.min(1, r));
    input.moveU = Math.max(-1, Math.min(1, u));
  }

  /* --- camera: lettura e scrittura della posizione --- */
  function fmtCam(c) {
    return [c.x.toFixed(2), c.y.toFixed(2), c.z.toFixed(2),
            (c.yaw * 180 / Math.PI).toFixed(1), (c.pitch * 180 / Math.PI).toFixed(1)].join(", ");
  }
  camEl.addEventListener("change", function () {
    if (!inst || !inst.setCam) return;
    var v = camEl.value.split(",").map(function (s) { return parseFloat(s.trim()); });
    if (v.length !== 5 || v.some(function (n) { return !isFinite(n); })) {
      camEl.value = fmtCam(inst.getCam()); return;
    }
    inst.setCam({ x: v[0], y: v[1], z: v[2], yaw: v[3] * Math.PI / 180, pitch: v[4] * Math.PI / 180 });
  });
  document.getElementById("cam-reset").addEventListener("click", function () {
    if (!inst || !inst.setCam) return;
    inst.setCam(params.mode === "outside"
      ? { x: 0, y: 0.6, z: -5.5, yaw: 0, pitch: 0 }
      : { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 });
  });
  document.getElementById("pause").addEventListener("click", function () {
    paused = !paused; this.setAttribute("aria-pressed", String(paused));
    this.textContent = paused ? "Riprendi" : "Pausa";
  });
  /* Salvataggio PNG.
     Dentro il viewer degli Artifact un <a download> è inerte: il file va offerto
     tramite la capability "downloads". In locale (file:// o server proprio) quella
     capability non esiste e si ricade sul link classico. */
  var saveBtn = document.getElementById("save");
  var downloads = null, downloadsResolved = false;
  if (window.claude && typeof window.claude.use === "function") {
    window.claude.use("downloads").then(function (d) {
      downloads = d; downloadsResolved = true;
      if (!d) saveBtn.hidden = true;
      refreshEst();   /* il tetto di 16 MB vale solo dentro il visualizzatore */
    }).catch(function () { downloadsResolved = true; });
  } else {
    downloadsResolved = true;
  }

  function flash(msg) {
    var prev = saveBtn.textContent;
    saveBtn.textContent = msg; saveBtn.disabled = true;
    setTimeout(function () { saveBtn.textContent = prev; saveBtn.disabled = false; }, 1600);
  }

  saveBtn.addEventListener("click", function () {
    var name = current + "-" + seedEl.value + ".png";
    if (downloads) {
      cv.toBlob(function (blob) {
        if (!blob) { flash("Errore"); return; }
        downloads.save({ filename: name, data: blob }).then(function () {
          flash("Salvato");
        }).catch(function (err) {
          flash(err && err.code === "declined" ? "Annullato" : "Non riuscito");
        });
      }, "image/png");
      return;
    }
    if (!downloadsResolved) { flash("Attendi…"); return; }
    var a = document.createElement("a");
    a.download = name; a.href = cv.toDataURL("image/png"); a.click();
  });

  /* =================== REGISTRAZIONE VIDEO ===================
     MediaRecorder cattura il canvas in tempo reale: un video di venti minuti
     richiede venti minuti. È il prezzo di non avere dipendenze; il rendering
     più veloce del tempo reale richiede WebCodecs e un muxer.               */
  var durEl = document.getElementById("dur"), resEl = document.getElementById("res");
  var rateEl = document.getElementById("rate"), rateVal = document.getElementById("rate-val");
  var estEl = document.getElementById("rec-est"), goEl = document.getElementById("rec-go");
  var progEl = document.getElementById("rec-prog"), fillEl = document.getElementById("rec-fill"), msgEl = document.getElementById("rec-msg");
  var VIEWER_CAP = 16 * 1024 * 1024;   /* tetto del visualizzatore Artifact */
  var rec = null, recTimer = null, recSaved = null;

  function mbps() { return parseInt(rateEl.value, 10); }
  function seconds() { return parseInt(durEl.value, 10); }
  function estBytes() { return mbps() * 1e6 / 8 * seconds(); }
  function human(b) {
    return b >= 1e9 ? (b / 1073741824).toFixed(2) + " GB" : (b / 1048576).toFixed(0) + " MB";
  }
  function pickMime() {
    var cands = ["video/mp4;codecs=avc1.42E01E", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    for (var i = 0; i < cands.length; i++) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(cands[i])) return cands[i];
    }
    return "";
  }
  function refreshEst() {
    rateVal.textContent = mbps() + " Mbps";
    var b = estBytes(), s = seconds();
    var over = b > VIEWER_CAP && !!downloads;
    estEl.className = "hint" + (over ? " warn" : "");
    estEl.innerHTML = "&asymp; " + human(b) + " · registrazione in tempo reale, "
      + (s >= 60 ? Math.round(s / 60) + " min" : s + " s")
      + (over ? " — oltre il limite di 16 MB del visualizzatore: apri il file in locale, oppure abbassa bitrate o durata." : "");
  }
  durEl.addEventListener("change", refreshEst);
  rateEl.addEventListener("input", refreshEst);

  function finishRecording(blob, mime) {
    progEl.hidden = true; goEl.textContent = "Registra"; goEl.disabled = false;
    restoreAfterRecording();
    var ext = mime.indexOf("mp4") >= 0 ? "mp4" : "webm";
    var name = current + "-" + seedEl.value + "." + ext;
    if (downloads) {
      if (blob.size > VIEWER_CAP) {
        estEl.className = "hint warn";
        estEl.textContent = "Registrati " + human(blob.size) + ", oltre il limite di 16 MB del visualizzatore. Il file non può essere consegnato qui: apri prototypes/sketch-bench.html in locale, oppure abbassa bitrate o durata.";
        return;
      }
      downloads.save({ filename: name, data: blob }).then(function () {
        estEl.className = "hint"; estEl.textContent = "Salvato: " + name + " (" + human(blob.size) + ").";
      }).catch(function (err) {
        estEl.className = "hint warn";
        estEl.textContent = err && err.code === "declined" ? "Salvataggio annullato." : "Salvataggio non riuscito.";
      });
      return;
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    estEl.className = "hint"; estEl.textContent = "Scaricato: " + name + " (" + human(blob.size) + ").";
  }

  function restoreAfterRecording() {
    if (!recSaved) return;
    cv.style.height = recSaved.h; cv.style.aspectRatio = recSaved.ar;
    recSaved = null;
    resize(); build();
  }

  function stopRecording() {
    if (recTimer) { clearInterval(recTimer); recTimer = null; }
    if (rec && rec.state !== "inactive") rec.stop();
  }

  goEl.addEventListener("click", function () {
    if (rec && rec.state === "recording") { stopRecording(); return; }
    var mime = pickMime();
    if (!mime) { estEl.className = "hint warn"; estEl.textContent = "Questo browser non espone MediaRecorder per il canvas."; return; }

    var wh = resEl.value.split("x");
    var tw = parseInt(wh[0], 10), th = parseInt(wh[1], 10);
    /* si registra la risoluzione scelta, non quella a schermo */
    recSaved = { h: cv.style.height, ar: cv.style.aspectRatio };
    cv.style.height = "auto"; cv.style.aspectRatio = tw + " / " + th;
    W = tw; H = th; DPR = 1;
    cv.width = tw; cv.height = th;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    build();

    var stream = cv.captureStream(30);
    try {
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: mbps() * 1e6 });
    } catch (e) {
      restoreAfterRecording();
      estEl.className = "hint warn"; estEl.textContent = "Avvio non riuscito: " + e.message;
      return;
    }
    var chunks = [];
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = function () { finishRecording(new Blob(chunks, { type: mime }), mime); };
    rec.start(1000);

    var total = seconds(), t0 = Date.now();
    goEl.textContent = "Ferma"; progEl.hidden = false;
    recTimer = setInterval(function () {
      var el = (Date.now() - t0) / 1000;
      fillEl.style.width = Math.min(100, el / total * 100).toFixed(1) + "%";
      var left = Math.max(0, total - el);
      msgEl.textContent = Math.floor(el) + " s di " + total + " · mancano "
        + Math.floor(left / 60) + ":" + ("0" + Math.floor(left % 60)).slice(-2)
        + " · " + tw + "×" + th;
      if (el >= total) stopRecording();
    }, 250);
  });

  var rt = null;
  window.addEventListener("resize", function () {
    if (rec && rec.state === "recording") return;   /* non toccare il canvas mentre registra */
    clearTimeout(rt); rt = setTimeout(function () { resize(); build(); }, 140);
  });

  /* loop a passo fisso: la simulazione avanza sempre di 1 unità per frame,
     indipendentemente dal frame rate reale — è ciò che rende l'export riproducibile. */
  var fpsAcc = 0, fpsN = 0, last = 0;
  function loop(t) {
    var real = last ? Math.min(100, t - last) : 16.7; last = t;
    if (real > 0) { fpsAcc += 1000 / real; fpsN++; }

    if (inst && !paused) {
      var dt = parseInt(spdEl.value, 10) / 100;
      readKeys();
      if (dt > 0) { inst.step(dt, W, H, input); frames++; }
      input.lookX = 0; input.lookY = 0;   /* i delta di sguardo si consumano ogni frame */

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (SKETCHES[current].clear === "trail") {
        ctx.fillStyle = "rgba(" + getPalette().bg.join(",") + ",0.055)"; ctx.fillRect(0, 0, W, H);
      } else {
        ctx.fillStyle = palBg(); ctx.fillRect(0, 0, W, H);
      }
      inst.draw(ctx, W, H);

      if (SKETCHES[current].dim === "3D") {
        var vg = ctx.createRadialGradient(W * .5, H * .45, Math.min(W, H) * .18, W * .5, H * .5, Math.max(W, H) * .78);
        var bgs = getPalette().bg.join(",");
        vg.addColorStop(0, "rgba(" + bgs + ",0)"); vg.addColorStop(1, "rgba(" + bgs + ",0.55)");
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      }

      if (frames % 15 === 0) {
        var extra = inst.stats ? inst.stats() : "elementi " + inst.count;
        barLeft.textContent = SKETCHES[current].label + " · " + SKETCHES[current].dim + " · " + extra;
        barFrame.textContent = String(frames);
        if (fpsN) { barFps.textContent = (fpsAcc / fpsN).toFixed(0); fpsAcc = 0; fpsN = 0; }
        if (inst.getCam && document.activeElement !== camEl) camEl.value = fmtCam(inst.getCam());
      }
    }
    requestAnimationFrame(loop);
  }

  resize();
  select(current);
  refreshEst();
  requestAnimationFrame(loop);
})();
