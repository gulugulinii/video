#!/usr/bin/env python3
"""Costruisce il banco autonomo a partire dai moduli in src/.

I moduli ES sono la fonte unica, ma il browser rifiuta di caricarli da `file://`:
aprendo un file col doppio clic servirebbe un server locale. Questo script
concatena i moduli in un unico blocco di script dentro `prototypes/sketch-bench.html`,
così il banco resta apribile con un doppio clic senza installare niente.

    python3 tools/costruisci.py            # costruisce
    python3 tools/costruisci.py --verifica # esce con 1 se il file e da rigenerare

Nessuna dipendenza: solo la libreria standard.
"""
import argparse
import pathlib
import re
import sys

RADICE = pathlib.Path(__file__).resolve().parent.parent
TEMPLATE = RADICE / "src" / "bench" / "index.html"
USCITA = RADICE / "prototypes" / "sketch-bench.html"

# Ordine di concatenazione: le dipendenze prima di chi le usa.
# batch.js usa palAt, quindi palette.js viene prima.
ENGINE = ["rng", "noise", "palette", "field", "cam3d", "dof", "batch", "cycle", "poly"]
SKETCH = ["flow", "split", "inside", "flow3d", "split3d", "lattice"]

BANNER = """/* ==========================================================================
   FILE GENERATO — non modificare a mano.

   La fonte sono i moduli in src/. Per cambiare qualcosa modifica quelli e
   rigenera con:  python3 tools/costruisci.py

   Questo file esiste perche il browser non carica moduli ES da file://, e il
   banco deve restare apribile con un doppio clic.
   ========================================================================== */

"use strict";
"""


def spoglia(testo):
    """Toglie import ed export: nel bundle tutto vive nello stesso ambito."""
    testo = re.sub(r"^import\s+.*?;\s*$", "", testo, flags=re.M | re.S)
    testo = re.sub(r"^import\s*\{[^}]*\}\s*from\s*\"[^\"]+\";\s*$", "", testo, flags=re.M)
    testo = re.sub(r"^export\s+(function|var|const|let)\b", r"\1", testo, flags=re.M)
    return testo.strip()


def bundle():
    pezzi = [BANNER]

    for nome in ENGINE:
        f = RADICE / "src" / "engine" / f"{nome}.js"
        pezzi.append(f"\n/* ===== src/engine/{nome}.js ===== */\n" + spoglia(f.read_text()))

    for nome in SKETCH:
        f = RADICE / "src" / "sketches" / f"{nome}.js"
        corpo = spoglia(f.read_text())
        # ogni modulo esporta `sketch`: concatenandoli servono nomi distinti
        corpo = re.sub(r"^const sketch = \{", f"const sketch_{nome} = {{", corpo, flags=re.M)
        pezzi.append(f"\n/* ===== src/sketches/{nome}.js ===== */\n" + corpo)

    registro = ",\n  ".join(f"{n}: sketch_{n}" for n in SKETCH)
    ordine = ", ".join(f'"{n}"' for n in SKETCH)
    pezzi.append(
        "\n/* ===== src/sketches/index.js ===== */\n"
        "var SKETCHES = {\n  " + registro + "\n};\n"
        "var ORDINE = [" + ordine + "];"
    )

    f = RADICE / "src" / "bench" / "runtime.js"
    pezzi.append("\n/* ===== src/bench/runtime.js ===== */\n" + spoglia(f.read_text()))

    return "\n".join(pezzi) + "\n"


def pagina():
    tmpl = TEMPLATE.read_text()
    if "/*BUNDLE*/" not in tmpl:
        raise SystemExit(f"manca il segnaposto /*BUNDLE*/ in {TEMPLATE}")
    return tmpl.replace("/*BUNDLE*/", bundle())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--verifica", action="store_true",
                    help="non scrive: esce con 1 se il file generato e diverso")
    args = ap.parse_args()

    nuovo = pagina()

    if args.verifica:
        if not USCITA.exists():
            print(f"{USCITA.relative_to(RADICE)} non esiste: esegui tools/costruisci.py")
            return 1
        if USCITA.read_text() != nuovo:
            print(f"{USCITA.relative_to(RADICE)} e vecchio rispetto a src/.")
            print("Rigenera con: python3 tools/costruisci.py")
            return 1
        print(f"{USCITA.relative_to(RADICE)} e aggiornato rispetto a src/")
        return 0

    USCITA.write_text(nuovo)
    print(f"scritto {USCITA.relative_to(RADICE)} — {len(nuovo.splitlines())} righe")
    return 0


if __name__ == "__main__":
    sys.exit(main())
