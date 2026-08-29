# Piano attivo

Il piano in corso, con lo stato di ogni fase. Il **perché** delle scelte sta in
[`decisioni.md`](decisioni.md); qui c'è il **cosa** e il **come**.

Si aggiorna prima di procedere, non dopo: quando una fase finisce, la sua riga
passa a fatto e si annota cosa è cambiato rispetto a quanto previsto.

**Priorità generale del progetto:**
1. Sfondo per sito portfolio ← siamo qui
2. Video e clip per social
3. Videogioco (parkour in prima persona), alla fine

---

## Piano corrente: sfondo generativo per il portfolio

Approvato il 29 agosto 2026. Ambito: **solo il componente sfondo**, non il sito.

Il progetto ha sei sketch che funzionano, ma vivono dentro un unico file di
prova (`prototypes/sketch-bench.html`, ~1400 righe) pieno di pannelli, cursori e
registratore video. Per mettere una geometria dietro a un sito serve l'opposto:
un modulo piccolo, senza interfaccia, che non consumi batteria e non renda
illeggibile il testo.

### Stato

| Fase | Cosa | Stato |
|---|---|---|
| F0 | Archivio permanente di piano e decisioni | fatto |
| F1 | Estrarre il motore in moduli `src/` | fatto |
| F2 | Passo di qualità grafica | **prossima** |
| F3 | Componente sfondo `mountBackground()` | da fare |
| F4 | Verifica dello sfondo e del contrasto | da fare |

Decisioni che reggono questo piano: [D13](decisioni.md#d13) (sketch scelto),
[D14](decisioni.md#d14) (stack), [D15](decisioni.md#d15) (ui-ux-pro-max),
[D12](decisioni.md#d12) (difetti grafici).

---

### F1 — Estrarre il motore

Oggi il banco è la sola copia del codice. Se il sito ne prende una seconda, le
due divergono entro una settimana. Quindi: **una fonte sola, due consumatori**.

```
src/engine/rng.js         mulberry32
src/engine/noise.js       makeNoise, makeNoise3
src/engine/cam3d.js       makeCam3D — camera dentro/fuori, orbita, proiezione
src/engine/dof.js         makeDof — profondità di campo a tre strati
src/engine/batch.js       makeBatch — percorsi raggruppati per opacità
src/engine/cycle.js       makeCycle — costruzione e smontaggio
src/engine/field.js       envelopeAt, pickCopy, EXTENT_INF
src/engine/palette.js     PALETTES, palAt, palBg, keyLight
src/sketches/*.js         un file per sketch, contratto create/step/draw
src/background.js         mountBackground() — l'unica cosa che usa il sito
```

Moduli ES, caricabili con `<script type="module">` senza compilazione.
`prototypes/sketch-bench.html` viene riscritto per **importare** da `src/`, così
`tools/verifica.py` continua a provare il codice vero e non una copia.

Estrazione verbatim: gli attrezzi sono già scritti e provati, non si riscrivono.

**Fatto.** Con due scostamenti dal previsto, entrambi motivati:

- I moduli ES non si caricano da `file://`, quindi il banco a moduli avrebbe
  richiesto un server locale. Aggiunto `tools/costruisci.py`, che li concatena
  in un file solo: `src/` resta l'unica copia, il banco resta apribile con un
  doppio clic. `verifica.py` fallisce se il generato è più vecchio della fonte.
- `PAL` era una variabile globale che il runtime riassegnava. Le importazioni
  ES sono in sola lettura, quindi la palette attiva è diventata privata al
  modulo con `setPalette()` e `getPalette()`. Meglio di prima: nessuno può
  riassegnarla per sbaglio.

Rimosso `project()`, funzione morta rimasta dallo sketch plexus eliminato.

Prova che l'estrazione è fedele: stesso seed, **zero pixel di differenza** su
392.084 fra il banco prima e dopo.

### F2 — Qualità grafica

I cinque difetti di [D12](decisioni.md#d12), in ordine di resa:

- **OKLab** al posto di sRGB per interpolare le rampe
- gamma tonale più larga: pochi elementi molto luminosi, il resto più scuro
- densità modulata dalla distanza dal punto luce → punto focale e spazio negativo
- peso del tratto variabile secondo l'importanza dell'arco
- densità non uniforme: addensamenti e radure

Metro di riscontro: `python3 tools/misura.py render.png`, con il picco al 99°
percentile che deve salire da 85 verso i 144 del riferimento.

### F3 — Il componente sfondo

```js
mountBackground(elemento, {
  sketch: "inside",     // quale geometria
  seed: 20250829,       // riproducibile
  palette: "mono",      // o token presi dal sito
  quality: "auto"       // scala densità e DPR secondo il frame rate misurato
});
```

Requisiti che uno sfondo ha e un banco di prova no:

- **si ferma quando non si vede** — `IntersectionObserver` per l'elemento fuori
  schermo, `visibilitychange` per la scheda in secondo piano
- **si adatta** — sotto una soglia di frame rate riduce densità, poi risoluzione
- **DPR limitato a 1.5**
- **`prefers-reduced-motion`** → un fotogramma fisso
- **`aria-hidden="true"`** sul canvas: è decorazione
- **velo di protezione** fra canvas e contenuto, con contrasto verificato

Più `prototypes/sfondo-demo.html`: una pagina con testo sopra, per provarlo.

### F4 — Verifica

`tools/verifica.py --sfondo`:
- 60 fps col profilo alleggerito, ≥30 fps con CPU rallentata 4× via CDP
- l'animazione si ferma quando la scheda passa in secondo piano
- con `prefers-reduced-motion` il canvas non cambia fra due frame
- nessun errore di pagina

`tools/misura.py`, nuovo controllo di **contrasto del testo sopra il canvas**:
campionare il frame sotto ogni blocco di testo e verificare che il rapporto resti
sopra 4.5:1 nel caso peggiore su un centinaio di frame. È il rischio reale di uno
sfondo animato, e a occhio non si vede perché il momento peggiore dura un istante.

### Cosa questo piano non fa

- Non installa ui-ux-pro-max: va fatto quando parte il sito ([D15](decisioni.md#d15))
- Non costruisce il sito
- Non tocca il registratore video né gli altri cinque sketch

---

## Dopo: le fasi successive

### Sito portfolio
Qui entra ui-ux-pro-max, con l'integrazione a **sorgente di colore unica**: i
token del design system generano sia il CSS del sito sia la rampa dello sfondo.
Stack HTML e CSS puro ([D14](decisioni.md#d14)).

### Video e social
Il registratore c'è ma lavora in tempo reale. Il rendering più veloce del tempo
reale vuole WebCodecs e un muxer, oppure CCapture v2 pilotato da Playwright
(fase F4 di `plexus-teardown.md`).

Per il flythrough rilassante serve una camera che segue un percorso curvo
generato proceduralmente. Nessuna collisione: solo un tracciato.

### Videogioco
Tre cose che oggi non esistono: superfici solide (i triangoli attuali sono
fantasmi), un controller del giocatore con gravità e salto, e soprattutto una
**generazione garantita percorribile** — nodi sparsi a caso non formano mai un
percorso raggiungibile, serve una catena di piattaforme ognuna entro distanza di
salto dalla precedente. Il plexus diventa la decorazione attorno.

Vincolo: per un gioco vero il canvas 2D non basta. Serve WebGL.

---

## Letture consigliate

**Per iniziare, e per i nomi delle cose**
- **Refactoring UI** — Wathan e Schoger. Tutto mostrato come prima/dopo, con la
  ragione del cambiamento. Gerarchia, spaziatura, colore, profondità.
- **Practical Typography** — Butterick, gratis su `practicaltypography.com`.

**Layout** — **Grid Systems in Graphic Design**, Müller-Brockmann.

**Tipografia** — **Thinking with Type**, Lupton. Poi **The Elements of
Typographic Style**, Bringhurst.

**Colore** — **Interaction of Color**, Albers. Non insegna palette: insegna che
un colore cambia a seconda di cosa gli sta accanto. È esattamente il problema
che abbiamo mappando il colore sulla profondità.

**Arte generativa, il più vicino a quello che facciamo**
- **Tyler Hobbs**, saggi su `tylerxhobbs.com/essays` — colore e composizione
  nell'arte generativa: i problemi che abbiamo davvero
- **Anders Hoff**, `inconvergent.net` — algoritmi generativi, con il codice
- **Generative Design** — Bohnacker, Groß, Laub

---

## Resta aperto

- Un messaggio si era interrotto a **«Infine,»**: quella richiesta non è mai
  arrivata.
- **«Ci sono due test (quella di programmazione e quella pratica)»**: se
  significa che il banco deve servire sia a verificare il codice sia a valutare
  la resa, è quello che si fa. Se significava altro, è da chiarire.
