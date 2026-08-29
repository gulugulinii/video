# Stato del progetto

Aggiornato: agosto 2026. Tutto quanto segue è nel banco di prova
`prototypes/sketch-bench.html` e verificato con `tools/verifica.py`.

---

## Cosa c'è

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

### Prossimo: sfondo per il portfolio

Versione ridotta di un solo sketch: niente pannelli, niente codice di controllo,
che gira dietro al contenuto. Deve essere leggera e spegnersi su
`prefers-reduced-motion`.

### Poi: video e social

Il registratore c'è ma lavora in tempo reale. Il rendering più veloce del tempo
reale richiede WebCodecs e un muxer, oppure CCapture v2 pilotato da Playwright
(vedi `plexus-teardown.md`, fase F4).

Per il caso "flythrough rilassante" serve una camera che segue un percorso
curvo generato proceduralmente. Non serve collisione: solo un tracciato.

### Alla fine: videogioco

Il parkour ha bisogno di tre cose che oggi non esistono:

- **Superfici solide.** I triangoli attuali sono fantasmi: si vedono ma non
  esistono fisicamente.
- **Un controller del giocatore**: gravità, salto, attrito.
- **Generazione garantita percorribile.** È il pezzo difficile: nodi sparsi a
  caso non formano mai un percorso raggiungibile. Serve un generatore che
  costruisca una catena di piattaforme ognuna entro distanza di salto dalla
  precedente. Il plexus diventa la decorazione attorno.

Vincolo tecnico: per un gioco vero il canvas 2D non basta. Superfici piene,
illuminazione e collisione a velocità di gioco vogliono WebGL.

### Ombre

Non ci sono, e non per pigrizia: le ombre proiettate hanno bisogno di superfici
piene su cui cadere. La geometria attuale è fatta di linee e punti, non c'è
niente che riceva un'ombra. Arrivano naturalmente con la fase WebGL, quando le
scatole della suddivisione avranno facce piene invece dei soli spigoli. I
comandi della luce sono già quelli giusti.

## Domande aperte

- Un messaggio si è interrotto a **"Infine,"** — quella richiesta non è mai
  arrivata.
- **"Ci sono due test (quella di programmazione e quella pratica)"**: se
  significa che il banco deve servire sia a verificare che il codice funzioni
  sia a valutare come viene esteticamente, è quello che si sta facendo — ogni
  modifica passa da `tools/verifica.py` e da uno sguardo alle schermate. Se
  significava altro, è da chiarire.
