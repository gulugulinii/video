# Stato del progetto

Aggiornato: agosto 2026. Tutto quanto segue è nel banco di prova
`prototypes/sketch-bench.html` e verificato con `tools/verifica.py`.

Dove si va: [`piano.md`](piano.md). Perché è fatto così: [`decisioni.md`](decisioni.md).

---

## Cosa c'è

### Struttura

`src/engine/` e `src/sketches/` sono la fonte unica; `prototypes/sketch-bench.html`
è generato da `tools/costruisci.py` per restare apribile con un doppio clic.
`tools/verifica.py` prova entrambi e fallisce se il generato è vecchio.

### Sketch

| Sketch | Dim | Camera | Ciclo | Note |
|---|---|---|---|---|
| Flow field | 2D | — | — | tracce accumulate sul canvas |
| Suddivisione | 2D | — | sì | ortogonale, diagonale, misto |
| Immersione | 3D | sì | — | nodi, archi, triangoli; il più pesante |
| Flow field 3D | 3D | sì | — | scie di 9 frame in coordinate del mondo |
| Suddivisione 3D | 3D | sì | sì | spigoli delle scatole |
| Reticolo | 3D | sì | sì | crescita da semi, giunzioni accese |

### Comandi

- **Palette** — cinque pronte (monocromo, brace, ghiaccio, alga, sabbia) più una
  su misura con quattro selettori. Il colore è mappato sulla profondità, non
  appiccicato sopra: vicino e lontano restano distinguibili come nel monocromo.
- **Parametri** — seed, densità, velocità, deriva interna, prospettiva.
- **Mondo** — punto di vista dentro/fuori, estensione del campo.
- **Camera** — posizione leggibile e scrivibile, sopravvive a seed e densità.
- **Generazione** — soglia di connessione, tetto triangoli.
- **Taglio** — direzione, profondità, velocità di comparsa, smontaggio.
- **Semi** — punti di partenza della crescita del reticolo.
- **Luce** — direzione, altezza, intensità.
- **Video** — durata, risoluzione, bitrate, registrazione.

### Idee che hanno retto

**Il 3D è disegnato in 2D.** Una divisione per la profondità, e la stessa `z`
usata per posizione, dimensione e opacità. Nessuna libreria.

**I piani sovrapposti servono, ma dopo.** Non per costruire la geometria — un
arco fra un nodo vicino e uno lontano non appartiene a nessun piano — ma per la
profondità di campo: tre strati per distanza, il vicino sfocato.

**Il ritmo si legge, non si impone.** Archi e triangoli non vengono creati: sono
ricalcolati ogni frame dalla distanza fra i nodi. "Archi al secondo" non è un
comando sensato, ma è un'ottima misura: viene mostrata, e si regola agendo sulle
cause (soglia e deriva).

**Finito e infinito sono un cursore, non un interruttore.** Le posizioni si
avvolgono sempre; quello che si regola è quante copie del cubo restano accese.
Essendo una dissolvenza, si può muovere mentre voli senza scatti.

**Un controllo senza effetto visibile è un controllo rotto.** Il vecchio
"Finito" non faceva vedere niente finché non volavi indietro per dieci secondi.
Ora "Fuori" porta la camera a distanza da sola in un secondo.

## Difetti trovati provando, non a occhio

Nessuno di questi si vedeva guardando le schermate. Sono la ragione per cui
`tools/verifica.py` esiste.

- Saturazione 3.9 dove doveva essere 0: il fondo `#07090B` tendeva al blu.
- Luminanza media 20 contro le 36 del riferimento.
- Dopo aver toccato un cursore, i tasti di movimento smettevano di funzionare.
- Con estensione finita e camera lontana la scena spariva: l'avvolgimento
  sceglieva una copia già spenta ignorando l'originale ancora acceso.
- La nebbia spegneva metà nuvola guardandola da fuori.
- Dal reticolo si stava dentro una singola cella: passo troppo fitto.
- "Fuori" restava appiccicato al reticolo: raggio d'orbita fisso.
- 16 fps sullo sketch immersivo, portati a 55 raggruppando i percorsi per
  livello di opacità e sfocando gli strati nella loro risoluzione ridotta.

## Cosa manca

Il piano attivo, con lo stato di ogni fase e le fasi successive, sta in
[`piano.md`](piano.md). Le ragioni delle scelte stanno in
[`decisioni.md`](decisioni.md), comprese quelle delle assenze: le ombre
proiettate mancano perché servono superfici piene su cui cadere, e la geometria
attuale è fatta di linee e punti.

Questo file resta il censimento di **cosa esiste e cosa è verificato**.
