# Il video di riferimento, misurato

Il progetto è partito da un video "plexus" monocromo. Il file originale non è
nel repo (20 MB, ed è tuo); qui ci sono quattro frame campionati e le misure
ricavate da undici.

| File | Momento |
|---|---|
| `rif-00.jpg` | 0.5 s |
| `rif-06.jpg` | 6 s |
| `rif-14.jpg` | 14 s |
| `rif-dettaglio.jpg` | ritaglio a piena risoluzione, 8 s |

## Misure

| | Valore |
|---|---|
| Durata | 20.05 s (601 frame) |
| Risoluzione | 2560 × 1440 |
| Codifica | 30 fps, h264 High, audio AAC |
| **Saturazione** | **0.00** — monocromo esatto, non "quasi" |
| Luminanza media | 36 / 255 |
| Luminanza di picco | 241 / 255 |

La saturazione a zero è il dato che ha deciso l'architettura: non è una scena
colorata desaturata in post, è una pipeline che lavora in luminanza dall'inizio.
Ed è anche la misura che ha scoperto il primo difetto del banco — una tinta
bluastra impercettibile nel colore di fondo, invisibile a occhio.

## I nove elementi

1. Nuvola di punti 3D con deriva lenta
2. Archi per prossimità, `alpha ∝ 1 − d/dmax`
3. Triangoli translucidi fra triple mutuamente adiacenti
4. Camera prospettica in movimento lentissimo
5. Profondità di campo marcata
6. Bloom sui nodi e sorgente luminosa in alto al centro
7. Fog per distanza
8. Vignettatura e grading in luminanza
9. Export deterministico a 30 fps fissi

## Confrontare un render col riferimento

```bash
python3 tools/misura.py render.png
```

Stampa saturazione e luminanza accanto ai valori del riferimento, e avverte se
compare una tinta non voluta.
