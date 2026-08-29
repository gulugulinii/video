# Geometrie generative

Motore di geometria procedurale in JavaScript puro: nessuna libreria, nessun
modello linguistico in esecuzione. Solo `Math`, un generatore pseudo-casuale
seedabile e `CanvasRenderingContext2D`.

Stesso seed, stesso risultato, sempre.

L'obiettivo, in ordine di priorità:

1. **Sfondo per sito portfolio** ← prossimo passo
2. Video e clip per social
3. Videogioco (parkour in prima persona), alla fine

---

## Come si prova

Apri `prototypes/sketch-bench.html` nel browser. Non serve installare niente,
non serve un server: è un file solo.

**Quel file è generato.** La fonte sono i moduli in `src/`; dopo averli
modificati va rigenerato:

```bash
python3 tools/costruisci.py
```

Il doppio passaggio esiste per una ragione precisa: il browser rifiuta di
caricare moduli ES da `file://`, quindi un banco fatto di moduli richiederebbe
un server locale. Concatenandoli in un file solo resta apribile con un doppio
clic, e `src/` resta l'unica copia del codice — così il sito e il banco non
divergono. `tools/verifica.py` fallisce se il file generato è più vecchio
di `src/`.

```
src/engine/                     il motore: rng, rumore, camera, DOF, palette…
src/sketches/                   un file per sketch, stesso contratto
src/bench/                      runtime e template del banco
prototypes/sketch-bench.html    il banco, GENERATO da src/ — non modificare
prototypes/plexus-teardown.html l'analisi iniziale, con demo live
docs/piano.md                   il piano attivo, con lo stato di ogni fase
docs/decisioni.md               perché il codice è fatto così
docs/stato.md                   cosa esiste e cosa è verificato
docs/plexus-teardown.md         l'analisi dei quattro strumenti open source
reference/                      frame del video di riferimento, con le misure
tools/                          verifica automatica e misurazione
```

**Se riprendi il progetto da fermo**, leggi in quest'ordine:
[`docs/piano.md`](docs/piano.md) per sapere dove siamo e dove si va, poi
[`docs/decisioni.md`](docs/decisioni.md) per non rimettere in discussione scelte
già risolte. Il codice sopravvive da solo; il ragionamento che c'è dietro no,
ed è per questo che quei due file esistono.

## I sei sketch

| | Sketch | Cosa fa |
|---|---|---|
| 2D | **Flow field** | Particelle che seguono un campo di direzioni ricavato dal rumore |
| 2D | **Suddivisione** | Un rettangolo tagliato ricorsivamente, in ortogonale o in diagonale |
| 3D | **Immersione** | Nodi collegati per prossimità, archi e triangoli translucidi |
| 3D | **Flow field 3D** | Lo stesso campo di direzioni nello spazio, con scie |
| 3D | **Suddivisione 3D** | La stessa ricorsione su un cubo, disegnata come spigoli |
| 3D | **Reticolo** | Un cubo che cresce da uno o più semi; le giunzioni si accendono |

**Il 3D è disegnato sullo stesso canvas 2D degli altri.** Non c'è WebGL. La sola
differenza fra uno sketch 2D e uno 3D è una divisione:

```js
var s = focal / z;                 // <- il 3D è tutto qui
var sx = w * 0.5 + x * s * k;
var sy = h * 0.5 + y * s * k;
```

La profondità `z` decide posizione sullo schermo, dimensione e opacità. Da lì
esce tutta la sensazione di volume.

## Come si estende

Ogni sketch è un modulo in `src/sketches/` con la stessa forma. Per aggiungerne
uno se ne scrive un altro con quella forma, lo si registra in
`src/sketches/index.js`, e si rigenera:

```js
// src/sketches/mio.js
export const sketch = {
  label: "Il mio", dim: "3D",
  hasCam: true,                     // vuole camera, punto di vista, estensione
  create: function (rnd, w, h, densita, P) {
    return {
      step: function (dt, w, h, input) { /* avanza la simulazione */ },
      draw: function (ctx, w, h)       { /* disegna il frame     */ }
    };
  }
};
```

Gli attrezzi condivisi fanno il lavoro pesante: `makeCam3D` (camera dentro e
fuori), `makeDof` (profondità di campo a tre strati), `makeBatch` (disegno
raggruppato), `makeCycle` (costruzione e smontaggio), `makeNoise3` (rumore 3D),
`pickCopy` (quale copia del campo disegnare), `keyLight` (sorgente luminosa).

## Verifica

```bash
pip install -r tools/requirements.txt
python3 tools/costruisci.py                   # rigenera il banco da src/
python3 tools/verifica.py --out /tmp/prova    # gira tutti gli sketch, esce 1 se qualcosa non va
python3 tools/misura.py render.png            # confronta saturazione e luminanza col riferimento
```

`verifica.py` sostituisce i diciassette script usa-e-getta con cui il banco è
stato provato finora, e controlla cose che a occhio non si vedono: che ogni
sketch stia sopra i 20 fps, che il ciclo di costruzione raggiunga davvero tutte
e tre le fasi, che un solo seme dia zero giunzioni e quattro semi ne diano molte,
che i tasti muovano la camera anche dopo aver toccato un cursore, che i moduli
in `src/` si carichino davvero (il file generato potrebbe girare anche con un
import rotto) e che non sia più vecchio della sua fonte.

`misura.py` è servito a trovare due difetti reali: una saturazione di 3.9 dove
doveva essere 0, e una luminanza media di 20 contro le 36 del riferimento.

## Video

Il banco registra direttamente: da 30 secondi a 20 minuti, fino a 2560×1440.
Due vincoli da sapere prima di iniziare:

- **È in tempo reale.** Venti minuti di video richiedono venti minuti.
- **Dentro il visualizzatore Artifact c'è un tetto di 16 MB** per la consegna
  del file. Per i video veri apri il file in locale, dove non c'è nessun limite.
