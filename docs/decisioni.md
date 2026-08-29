# Registro delle decisioni

Il codice sopravvive da solo; il **perché** no. Qui resta la ragione di ogni
scelta che ha cambiato il progetto, con le prove che l'hanno sostenuta e le
alternative scartate.

Si legge dal basso verso l'alto per ricostruire come ci siamo arrivati, oppure
dall'alto per sapere dove siamo.

Regola: si aggiunge una voce ogni volta che si prende una decisione che sarebbe
costoso rimettere in discussione più avanti. Non per ogni commit.

---

<a id="d16"></a>

## D16 — Un archivio permanente del ragionamento
**Stato:** attivo

Piano e decisioni vivevano solo nella conversazione. Se la chat sparisce,
sparisce il motivo per cui il codice è fatto così, e chiunque lo riprenda —
anche noi fra un mese — ricomincia a discutere scelte già risolte.

`docs/piano.md` tiene il piano attivo con lo stato per fase. Questo file tiene
il perché. Entrambi si aggiornano prima di procedere, non dopo.

---

<a id="d15"></a>

## D15 — ui-ux-pro-max: sì per il sito, no per lo sfondo
**Stato:** attivo · rimandato alla fase sito

`nextlevelbuilder/ui-ux-pro-max-skill` è una skill MIT che genera design system:
79 stili UI, 192 palette, 74 abbinamenti di font, 192 regole, più linee guida UX
e controlli sugli anti-pattern, in tredici CSV interrogati da script Python.

**Non serve per lo sfondo.** Un canvas non ha layout, tipografia, componenti né
stati di interazione: tutto ciò che la skill sa fare riguarda cose che in questa
fase non esistono. L'unica parte che ci sfiora è `colors.csv`, ma una palette da
interfaccia ottimizza il contrasto del testo sulle superfici, mentre a noi serve
una scala di luminanza su fondo quasi nero: sono oggetti diversi, e copiare
l'una nell'altra dà risultati mediocri.

**Serve per il sito**, ed è lì che va installata — con un'integrazione che oggi
non avrebbe senso: *una sola sorgente di colore*, i token che generano sia il
CSS del sito sia la rampa di profondità dello sfondo. Senza, i due finiscono in
mondi cromatici diversi.

**Rischio da ricordare:** un generatore di design system tende a produrre il look
medio del suo catalogo. Va usata come catalogo da interrogare, non come autrice
della pagina. E non deve mai decidere l'aspetto dello sfondo, che è vincolato da
misure (saturazione 0, luminanza 36/255) che la skill non conosce.

**Quando:** `uipro init --ai claude` dentro il progetto, non `--global`, e primo
passo obbligatorio leggere cosa è finito in `.claude/skills/` — sono istruzioni
di terze parti che entrano nel contesto dell'agente.

---

<a id="d14"></a>

## D14 — Stack del sito: HTML e CSS puro
**Stato:** attivo

Alternative valutate: Tailwind (stile come classi corte nell'HTML, richiede
compilazione), React (pagine come componenti JavaScript), Next.js (React più
navigazione e rendering sul server).

Un portfolio è poche pagine di contenuto statico. Nessuna delle tre porta un
vantaggio percepibile qui, mentre tutte aggiungono installazione, compilazione e
manutenzione. Il progetto non ha nessuna dipendenza e questo è un pregio: si
apre un file e funziona.

Si cambia idea solo se il sito cresce in molte pagine o prende contenuti da un
CMS. Migrare da statico a React è facile; il contrario no.

---

<a id="d13"></a>

## D13 — Sfondo del portfolio: Immersione alleggerita
**Stato:** attivo

Flow field 3D sarebbe più leggero (60 fps contro 34–45) e meno invadente dietro
al testo, ma è anche dimenticabile. Uno sfondo di portfolio deve reggere lo
sguardo di chi arriva, e Immersione è l'identità visiva del progetto: è quella
che insegue il video di riferimento.

Il problema delle prestazioni è risolvibile e non strutturale: il banco fa
girare Immersione con 470 nodi e 1100 triangoli al massimo dettaglio con sopra
un'interfaccia. Dietro al testo bastano circa 180 nodi e 300 triangoli.

---

<a id="d12"></a>

## D12 — Le grafiche vanno migliorate, e questi sono i difetti
**Stato:** da fare (F2)

Cinque problemi nominati, in ordine di resa per riga scritta:

1. **Rampe impastate.** Le palette interpolano in sRGB, lo spazio in cui i colori
   sono codificati, non quello in cui l'occhio li percepisce: i toni medi
   diventano grigi. Passare a **OKLab**, percettivamente uniforme, ~20 righe.
2. **Alte luci deboli.** Picco al 99° percentile misurato 85 contro i 144 del
   riferimento. Manca la gamma tonale alta.
3. **Nessuna composizione.** Tutto centrato e uniforme: manca il punto focale e
   manca lo spazio negativo. La luce c'è ma la geometria le è indifferente.
   Rimedio: modulare la densità con la distanza dal punto luce.
4. **Tratto uniforme.** Tutte le linee fra 0.5 e 1.3 px, senza gerarchia.
5. **Densità piatta.** Un campo con addensamenti e radure legge come organico;
   uno uniforme legge come rumore.

---

<a id="d11"></a>

## D11 — Ombre no, luce sì
**Stato:** attivo

Le ombre proiettate hanno bisogno di superfici piene su cui cadere. La geometria
attuale è fatta di linee e punti: non c'è niente che riceva un'ombra, e
aggiungere il controllo produrrebbe un comando che non fa nulla — l'errore di D8.

Quello che conta e che è stato fatto: direzione, altezza e intensità della
sorgente, applicate a caldo. Le ombre arrivano con la fase WebGL, quando le
scatole della suddivisione avranno facce piene invece dei soli spigoli; i
comandi della luce sono già quelli giusti.

---

<a id="d10"></a>

## D10 — Il colore mappato sulla profondità
**Stato:** attivo

Il monocromo veniva dal video di riferimento, ma per un portfolio è ciò che
rende il risultato una copia di uno stock. Servono le palette.

Il modo giusto non è colorare a caso: il colore è mappato sulla **profondità**,
la stessa grandezza che già struttura l'immagine. Vicino e lontano restano
distinguibili come nel monocromo, cambia solo la tinta. Ed è venuto gratis: il
disegno era già raggruppato per livelli di intensità (D9), quindi ogni livello
pesca un colore lungo la rampa senza un disegno in più.

Monocromo resta il default, così la corrispondenza col riferimento non si perde.

---

<a id="d9"></a>

## D9 — Prestazioni: da 16 a 55 fps, tre interventi
**Stato:** attivo

Lo sketch immersivo girava a 16 fps: inaccettabile.

1. **Percorsi raggruppati per (strato, livello di opacità)** con `Path2D`: poche
   decine di `stroke()` e `fill()` invece di alcune migliaia. 16 → 39 fps.
2. **Strati sfocati a metà risoluzione, sfocati nella loro risoluzione** invece
   che dopo l'ingrandimento: un quarto dei pixel, risultato indistinguibile.
   39 → 55 fps.
3. Hash spaziale con chiave intera e `Set` degli archi per il test di adiacenza.

Il raggruppamento per opacità ha poi reso gratuita la palette (D10): una
decisione presa per le prestazioni che ha ripagato altrove.

---

<a id="d8"></a>

## D8 — Un controllo senza effetto visibile è un controllo rotto
**Stato:** attivo

Il vecchio interruttore «Infinito / Finito» non comunicava niente: cliccarlo non
produceva alcun effetto: la camera restava dentro la nuvola e bisognava
indovinare che serviva volare all'indietro per una decina di secondi.

Riscritto come **Punto di vista: Dentro / Fuori**, dove un clic porta la camera a
distanza da sola in circa un secondo e la mette in orbita. Nome che dice cosa
vedi, non come è implementato, ed effetto immediato.

È una regola generale, non un aneddoto: vale per ogni comando aggiunto da qui in
avanti.

---

<a id="d7"></a>

## D7 — Finito e infinito sono un cursore, non un interruttore
**Stato:** attivo

Domanda: si può passare da finito a infinito in tempo reale, muovendosi?
Accendere e spegnere l'avvolgimento è per forza uno scatto — avvolgere è
un'operazione discontinua, non esiste mezzo avvolgimento.

Ma si ottiene lo stesso effetto cambiando cosa si controlla: **le posizioni si
avvolgono sempre**, quindi il mondo è sempre fatto di copie; quello che si regola
è **quante copie restano accese**, con un inviluppo morbido attorno all'origine.
Essendo una dissolvenza, si muove mentre voli senza nessuno scatto.

Corollario trovato provando: l'avvolgimento sceglie la copia più vicina alla
camera, giusto solo finché quella copia esiste. Con estensione finita e camera
lontana la copia vicina è spenta mentre l'originale è ancora acceso.
`pickCopy()` valuta entrambe e tiene la più visibile.

---

<a id="d6"></a>

## D6 — Il ritmo si legge, non si impone
**Stato:** attivo

Richiesta: controllare quanti archi e triangoli si generano al secondo.

Archi e triangoli **non vengono generati**: sono ricalcolati da zero ogni frame
dalla distanza fra i nodi. Un arco esiste se e solo se due nodi sono più vicini
della soglia. Imporre «300 archi al secondo» costringerebbe a inventarne fra
nodi lontani e cancellarne fra nodi vicini: la struttura smetterebbe di avere
senso.

Ma è un'ottima **unità di misura**. Quindi il ritmo viene mostrato — confrontando
l'insieme degli archi con quello del frame precedente — e i comandi agiscono
sulle cause: soglia di connessione (quanti esistono) e deriva dei nodi (con che
ritmo nascono e si spengono).

Misurato: da 1× a 4× di deriva, i nati passano da 231 a 426 al secondo.

---

<a id="d5"></a>

## D5 — Il 3D è disegno 2D, e i piani servono altrove
**Stato:** attivo

Domanda: il 3D si può fare sovrapponendo piani 2D?

No, e non serve. Un arco non ha coordinate proprie: è completamente determinato
dai suoi estremi. E la proiezione prospettica manda rette in rette, quindi basta
proiettare i due estremi e tracciare la retta fra i punti risultanti. Il 3D è
una divisione:

```js
var s = focal / z;
```

Costruire la scena a strati costringerebbe invece a spezzare ogni arco in tanti
segmenti, uno per piano attraversato: più lavoro per un risultato peggiore.

**Ma i piani sovrapposti servono davvero, un passo dopo**: per la profondità di
campo. Tre strati per distanza, il vicino sfocato. È l'unico punto in cui sono
la scelta giusta.

---

<a id="d4"></a>

## D4 — Verificare misurando, non guardando
**Stato:** attivo

Ogni modifica passa da Chromium headless e da misure numeriche. Non è
formalismo: sono i difetti che ha trovato e che a occhio non si vedevano.

- Saturazione 3.9 dove doveva essere 0: il fondo `#07090B` tendeva al blu.
- Luminanza media 20 contro le 36 del riferimento.
- Dopo aver toccato un cursore, i tasti di movimento smettevano di funzionare
  (il filtro sul bersaglio dell'evento bloccava ogni `INPUT`).
- Con estensione finita e camera lontana la scena spariva.
- La nebbia spegneva metà nuvola guardandola da fuori.
- Dal reticolo si stava dentro una singola cella: passo troppo fitto.
- «Fuori» restava appiccicato al reticolo: raggio d'orbita fisso e tarato su un
  altro sketch.

`tools/verifica.py` e `tools/misura.py` esistono per questo.

---

<a id="d3"></a>

## D3 — Nessuna dipendenza, e un contratto comune per gli sketch
**Stato:** attivo

Tutto è `Math`, un generatore pseudo-casuale seedabile e
`CanvasRenderingContext2D`. Nessuna libreria, nessun modello in esecuzione,
stesso seed stesso risultato.

Ogni sketch è un oggetto con `create(rnd, w, h, densità, P)` che restituisce
`{ step, draw }`. Il settimo sketch si scrive senza toccare niente del resto, e
gli attrezzi condivisi (`makeCam3D`, `makeDof`, `makeBatch`, `makeCycle`,
`makeNoise3`, `pickCopy`, `keyLight`) fanno il lavoro pesante.

Il contratto è stato validato su sei sketch di tecniche diverse: un'interfaccia
provata su un caso solo non è un'interfaccia.

---

<a id="d2"></a>

## D2 — Verdetto sui quattro strumenti open source
**Stato:** attivo

Analisi completa in `docs/plexus-teardown.md`. In breve, nessuno dei quattro
produce il plexus: i requisiti «punti, archi, triangoli» sono scoperti da tutti,
e sono il 90% di ciò che si vede.

- **Nature of Code** — fonte di algoritmi da riscrivere, non una dipendenza. Il
  repo `noc-examples-p5.js` è archiviato dal settembre 2024; è codice didattico,
  2D, con ricerca dei vicini O(n²) e `random()` non seedabile.
- **Hydra** — non può generare il plexus per limite di modello: da `osc`,
  `noise` e `modulate` escono forme continue, non nodi discreti collegati. Vale
  solo come grading finale, ed è opzionale.
- **CCapture.js** — l'unico da adottare così com'è. Riscrittura 2.0 del luglio
  2026 con moduli ES, WebCodecs e motion blur su GPU.
- **Shader Park** — primitiva sbagliata: migliaia di segmenti come SDF costano
  raggi × passi × primitive, fuori scala. Ottimo come famiglia di sketch a sé
  (frattali SDF), non per il plexus.

---

<a id="d1"></a>

## D1 — screenshot-to-code non è lo strumento
**Stato:** attivo

Richiesta iniziale: sfruttare `abi/screenshot-to-code`.

Fa una cosa sola: prende uno screenshot esistente e usa un modello vision per
riprodurlo in codice UI. Non genera geometrie nuove, casuali o complesse:
converte, non crea, e dipende da un modello in esecuzione — esattamente ciò che
il progetto vuole evitare.

Serviva invece codice generativo puro: rumore procedurale, frattali, sistemi a
particelle, tassellazioni.
