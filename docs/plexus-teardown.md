# Plexus Stack Teardown

Analisi di quattro strumenti open source rispetto a un video di riferimento "plexus",
con piano di miglioramento per ognuno.

Versione navigabile con demo live: `prototypes/plexus-teardown.html`.

---

## 1. Il riferimento, misurato

| Metrica | Valore |
|---|---|
| Durata | 20.05 s (601 frame) |
| Risoluzione | 2560 × 1440 |
| Frame rate | 30 fps, h264 High, audio AAC |
| Saturazione | **0.00** su ogni frame campionato — monocromo esatto |
| Luminanza media | 36 / 255 |
| Luminanza di picco | 241 / 255 |

Misure ricavate da 11 frame campionati lungo i 20 secondi.

La saturazione a zero è il dato che decide l'architettura: non è una scena colorata
desaturata in post, è una pipeline che lavora in luminanza dall'inizio.

### Decomposizione in requisiti

| # | Requisito | Tecnica |
|---|---|---|
| R1 | Nuvola di punti 3D con deriva lenta | moto browniano lento o flow field a bassa frequenza |
| R2 | Archi per prossimità | soglia sulla distanza 3D, `alpha ∝ 1 − d/dmax`; serve hash spaziale oltre ~300 nodi |
| R3 | Triangoli translucidi | triple mutuamente adiacenti, fill bianco a bassissima opacità, additive |
| R4 | Camera prospettica in movimento | traslazione + rotazione lentissime; senza parallasse la scena legge piatta |
| R5 | Profondità di campo | marcata; richiede il depth buffer, non è blur uniforme |
| R6 | Bloom sui nodi + key light in alto al centro | |
| R7 | Fog per distanza | separa i piani, impedisce che la mesh diventi rumore |
| R8 | Vignettatura + grading in luminanza | |
| R9 | Export deterministico | 30 fps fissi a 2560×1440, indipendente dalla velocità di rendering |

---

## 2. Matrice di copertura

`SI` copre nativamente · `~` serve lavoro non banale · `NO` fuori dal modello dello strumento

| Requisito | Nature of Code | Hydra | CCapture v2 | Shader Park |
|---|---|---|---|---|
| R1 Punti 3D + moto | ~ | NO | NO | ~ |
| R2 Archi per prossimità | ~ | NO | NO | NO |
| R3 Triangoli translucidi | NO | NO | NO | NO |
| R4 Camera prospettica | NO | NO | NO | SI |
| R5 Profondità di campo | NO | ~ (finta) | NO | ~ |
| R6 Bloom / glow | NO | ~ | NO | ~ |
| R7 Fog per distanza | NO | NO | NO | SI |
| R8 Vignetta + grading | NO | SI | NO | ~ |
| R9 Export deterministico | NO | NO | SI | NO |

**R1–R3 non sono coperti da nessuno dei quattro, e sono il 90% di ciò che si vede.**
È il buco che definisce il progetto.

---

## 3. I quattro strumenti

### 3.1 Nature of Code — ruolo: motore di moto

**Stato reale.** `noc-examples-p5.js` è **archiviato dal 22 settembre 2024**, in sola lettura.
Gli esempi correnti vivono in `nature-of-code/noc-book-2` (edizione 2024).

**Copre.** Solo R1, parzialmente. Cap. 0 (Perlin noise) e cap. 2 (forze) danno la deriva
lenta dei nodi; cap. 5 (agenti autonomi, flocking) contiene già la logica di ricerca dei
vicini che serve a R2. Nient'altro: niente 3D, niente post, niente export.

**Si rompe.**
- È codice didattico, non codice di libreria: sketch monolitici, stato globale, nessun modulo.
- Tutto 2D e legato a `p5.Vector` e al ciclo `draw()`.
- Ricerca dei vicini O(n²) a forza bruta: a 600 nodi sono 180.000 confronti per frame.
- `random()` di p5 non è seedabile in modo portabile → niente riproducibilità.
- Update e draw fusi: non puoi avanzare la simulazione a passo fisso renderizzando a un altro frame rate.

**Piano.** Non forkare il repo — estrarre gli algoritmi in una libreria headless, 3D e deterministica.
1. Sganciare p5: `p5.Vector` → `THREE.Vector3` (o `Vec3` proprio); via ogni riferimento a `draw()`.
2. Rendere deterministico: PRNG seedabile (mulberry32/sfc32); ogni sketch prende un `seed`.
3. Portare in 3D: flow field da noise 3D, forze su tre assi, volume con condizioni al contorno.
4. Indicizzare lo spazio: hash spaziale a celle di lato `dmax` → O(n) ammortizzato. Stessa struttura per R2 e R3.
5. Separare update da render: `step(dt)` a passo fisso con accumulatore.
6. Uscita a buffer: `Float32Array` di posizioni, pronti per `BufferGeometry` senza copie.

### 3.2 Hydra — ruolo: grading, opzionale

**Stato reale.** WebGL su `regl`, catena di framebuffer, operazioni per fragment shader a
tutto schermo. **Nessun supporto nativo a geometria**: niente vertici, linee o triangoli.

**Copre.** R8 molto bene (grading, vignetta, curve in luminanza sono il suo mestiere).
R6 in parte via `add()` e feedback `src(o0).scale(1.01)`. R5 solo finta: può sfocare
l'immagine ma non ha accesso alla profondità, quindi sfoca tutto uniformemente.

**Si rompe.**
- **Non può generare il plexus.** Da `osc()`, `noise()`, `modulate()` escono forme organiche
  continue, non nodi discreti collegati. È una limitazione di modello, non di implementazione.
- Il tempo viene dal clock reale → feedback non riproducibile frame per frame → incompatibile con R9.
- Nasce come ambiente di livecoding con globali ed editor: incorporarlo in una pagina
  portfolio significa combattere il suo scope globale.
- Risoluzione di rendering legata al canvas nel DOM.

**Piano.** Usarlo solo come stadio finale di grading su un canvas Three.js in input.
1. Clock iniettabile: `time` avanza a passi di 1/30 guidati dal loop di export, non da `performance.now()`.
2. Sorgente da canvas esterno: `s0.init({src: canvasThree})` con upload texture garantito a ogni frame steppato.
3. Risoluzione disaccoppiata: rendering offscreen alla risoluzione di export.
4. Build embeddabile: modulo ES senza editor e senza globali, istanziabile più volte.
5. Verificare il costo: se serve solo grading e vignetta, un singolo shader di post nella
   catena Three.js fa lo stesso senza aggiungere una dipendenza. Tenerlo solo se usi davvero
   feedback e modulazione.

### 3.3 CCapture.js — ruolo: export

**Stato reale.** Sorpresa positiva: a **luglio 2026 è uscita la 2.0**, riscrittura da zero
con moduli ES, **WebCodecs** e motion blur su GPU. Esporta MP4 (H.264/AV1), WebM (VP9/VP8/AV1),
sequenze PNG/JPEG/WebP in TAR, GIF via gifski-wasm. Non è più la libreria ferma che era.

**Copre.** R9 per intero. Il clock virtuale intercetta `requestAnimationFrame`, `Date.now`
e `performance.now`: 30 fps esatti a 2560×1440 anche a 2 secondi per frame. Il motion blur
su GPU aggiunge gratis la resa del movimento lento. Nient'altro, per costruzione.

**Si rompe.**
- Cattura **un solo canvas**: comporre Three.js + Hydra richiede un compositing preliminare.
- **Nessun audio**: il riferimento ha una traccia AAC, la muxing va fatta fuori dal browser.
- Motion blur GPU richiede WebGL2 con `EXT_color_buffer_float`.
- Limiti dichiarati: niente animazioni CSS (timeline del compositor), niente `AnalyserNode`
  realtime, canvas contaminato da risorse cross-origin non codificabile.
- Vive in una sessione browser interattiva: nessun percorso da riga di comando.

**Piano.** Non toccare l'encoder — costruirgli intorno l'automazione headless che gli manca.
1. Harness headless: script Playwright che apre `?seed=&frames=&w=&h=`, pilota CCapture,
   scrive l'MP4 su disco. Il render diventa un job ripetibile e mettibile in CI.
2. Shim di compositing: un canvas di cattura su cui disegnare N canvas sorgente per frame.
3. Muxing audio: passaggio ffmpeg post-cattura, con offset dichiarato.
4. Manifest di render: JSON con seed, parametri, commit, versione accanto a ogni file.
5. Preset di uscita: profilo web (WebM/VP9, loop, poster) e consegna (MP4 2560×1440).

### 3.4 Shader Park — ruolo: famiglia di sketch separata

**Stato reale.** Compila JavaScript in shader di **raymarching su signed distance field**.
Espone `toThreeJS`, `toOffline`, `toRawSDF4Meshing`. Nativamente 3D, animato, interattivo.

**Copre.** R4 e R7 nativamente (camera e fog sono intrinseci al raymarching). R1 in parte:
qualche decina di sfere sì, seicento nodi no. R2 e R3 no.

**Si rompe.**
- **La primitiva è sbagliata per questo effetto.** Un plexus sono migliaia di segmenti
  sottili e triangoli piatti fra coppie arbitrarie di punti. Come SDF ognuno è una capsula
  o un triangolo da valutare *a ogni passo di ogni raggio*: costo = raggi × passi × primitive.
  A 2560×1440 con 600 nodi è fuori scala di ordini di grandezza. In rasterizzazione le
  stesse primitive costano una volta sola ciascuna.
- Nessuna DOF nativa.
- Affiancato a geometria rasterizzata, i due mondi non condividono il depth buffer.

**Piano.** Smettere di considerarlo un candidato per il plexus, promuoverlo a famiglia di
sketch autonoma: frattali SDF, Mandelbulb, Menger, metaball — geometrie complessissime che
in rasterizzazione sarebbero proibitive e in raymarching sono quasi gratis.
1. Integrare via `toThreeJS`: gli sketch SDF diventano materiali nella stessa scena, condividendo camera e post.
2. **Scrivere `gl_FragDepth`**: far emettere al raymarcher la profondità reale rende DOF e
   fog coerenti fra SDF e geometria rasterizzata. È anche il contributo più utile da mandare upstream.
3. Adottare la stessa interfaccia sketch: `init(ctx, seed)` / `step(dt)` / `resize()`.
4. Uniformare il seed: passarlo come uniform, hash noise deterministico dentro lo shader.
5. Budget di passi adattivo: ridurre i passi di march quando il frame rate scende.

---

## 4. Il buco nella matrice

Il pezzo mancante è un **rasterizzatore Three.js**: `Points` per i nodi, `LineSegments` per
gli archi, `BufferGeometry` aggiornato per i triangoli, più una catena di post-processing
per DOF, bloom e vignetta.

La ragione è di costo, non di gusto: con la rasterizzazione ogni segmento e ogni triangolo
si paga una volta sola; con il raymarching si paga a ogni passo di ogni raggio. Per una
geometria fatta di molte primitive sottili e sparse, la differenza è fra tempo reale e
nessuna speranza.

### Pipeline assemblata

```
[1] Moto           Nature of Code, estratto in libreria 3D deterministica
[2] Geometria      Three.js  <-- il pezzo da costruire
[2b] Sketch SDF    Shader Park via toThreeJS, stessa camera
[3] Post           DOF, bloom, fog, vignetta (Hydra solo se serve feedback)
[4] Export         CCapture v2 (WebCodecs), guidato da Playwright
```

Il ruolo dei quattro strumenti cambia dopo questa analisi:
Nature of Code è una fonte di algoritmi da riscrivere, non una dipendenza.
Shader Park è una seconda famiglia di sketch, non un concorrente di Three.js.
Hydra è opzionale e va giustificato. CCapture è l'unico da adottare così com'è.

---

## 5. Roadmap

**F1 — Plexus in canvas 2D, seedato.** Nodi, archi per prossimità, triangoli, hash spaziale,
PRNG seedabile. Nessuna dipendenza. Blocca la logica di generazione prima di introdurre WebGL.
→ *Uscita: sketch funzionante, stesso seed = stesso frame.*
(Prototipo già presente nella banda in cima a `prototypes/plexus-teardown.html`.)

**F2 — Porting in Three.js con post-processing.** Volume 3D, camera prospettica in movimento
lento, `Points` + `LineSegments` + triangoli in `BufferGeometry`, poi DOF, bloom, fog, vignetta.
→ *Uscita: parità visiva con il riferimento.*

**F3 — Interfaccia sketch e seconda famiglia.** Contratto comune `init/step/resize/dispose`,
poi secondo e terzo sketch (flow field + uno SDF via Shader Park) per verificare che
l'astrazione regga su tecniche diverse. Un'interfaccia validata da un solo caso non è un'interfaccia.
→ *Uscita: tre sketch intercambiabili, uno switch nel sito.*

**F4 — Pipeline di export.** CCapture v2 collegato al loop a passo fisso, harness Playwright,
manifest di render, preset web e consegna.
→ *Uscita: `npm run render -- --sketch=plexus --seed=42`.*

---

*Stato dei repository verificato ad agosto 2026.*
