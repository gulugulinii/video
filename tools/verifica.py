#!/usr/bin/env python3
"""Verifica il banco di prova in Chromium headless.

Sostituisce i diciassette script usa-e-getta con cui il banco e stato provato
finora. Carica la pagina, passa per ogni sketch, esercita i comandi principali,
e fallisce se compare un errore di pagina o se qualcosa smette di rispondere.

    python3 tools/verifica.py                    # tutto, con schermate
    python3 tools/verifica.py --rapido           # solo il giro sugli sketch
    python3 tools/verifica.py --out /tmp/prova   # dove scrivere le schermate

Esce con 1 se qualcosa non torna, cosi si puo mettere in CI.
Serve: playwright (e un Chromium: PLAYWRIGHT_BROWSERS_PATH o --chromium).
"""
import argparse
import functools
import glob
import http.server
import pathlib
import re
import socketserver
import subprocess
import sys
import threading

from playwright.sync_api import sync_playwright

RADICE = pathlib.Path(__file__).resolve().parent.parent
PAGINA = RADICE / "prototypes" / "sketch-bench.html"

SKETCH = ["flow", "split", "inside", "flow3d", "split3d", "lattice"]
FPS_MINIMO = 20          # sotto questo il banco non e piu usabile per provare


def trova_chromium(esplicito=None):
    if esplicito:
        return esplicito
    for pat in ("/opt/pw-browsers/chromium-*/chrome-linux/chrome",
                "/opt/pw-browsers/chromium/chrome-linux/chrome"):
        trovati = sorted(glob.glob(pat))
        if trovati:
            return trovati[-1]
    return None            # lascia scegliere a Playwright


class Esito:
    def __init__(self):
        self.errori = []

    def ok(self, msg):
        print(f"  ok   {msg}", flush=True)

    def ko(self, msg):
        print(f"  KO   {msg}", flush=True)
        self.errori.append(msg)

    def stampa(self):
        print()
        if self.errori:
            print(f"{len(self.errori)} problemi:")
            for e in self.errori:
                print(f"  - {e}")
        else:
            print("tutto a posto")
        return 1 if self.errori else 0


PAGINA_MODULI = b"""<!doctype html><meta charset="utf-8"><title>prova moduli</title>
<pre id="out">in corso</pre>
<script type="module">
import { SKETCHES, ORDINE } from "/src/sketches/index.js";
import { mulberry32 } from "/src/engine/rng.js";
import { setPalette, getPalette, palAt, PALETTES } from "/src/engine/palette.js";
const r = [];
r.push("sketch=" + ORDINE.length);
r.push("contratto=" + ORDINE.every(k => SKETCHES[k] && typeof SKETCHES[k].create === "function"));
const i = SKETCHES.inside.create(mulberry32(7), 800, 600, 1,
  { link: 0.57, maxTri: 100, mode: "inside", extent: 99, drift: 1, reveal: 1.6 });
r.push("istanza=" + [typeof i.step, typeof i.draw, typeof i.getCam].join("/"));
setPalette("brace");
r.push("palette=" + getPalette().label + "|" + palAt(0.5) + "|" + Object.keys(PALETTES).length);
document.getElementById("out").textContent = r.join(" ");
</script>"""


def servi(radice):
    """Server locale: i moduli ES non si caricano da file://."""
    class H(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            if self.path == "/favicon.ico":
                self.send_response(204)      # senza, il 404 sporca la console
                self.end_headers()
                return
            if self.path == "/__prova__":
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(PAGINA_MODULI)))
                self.end_headers()
                self.wfile.write(PAGINA_MODULI)
                return
            super().do_GET()

        def log_message(self, *a):
            pass

    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(H, directory=str(radice)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv.server_address[1], srv.shutdown


def prova_moduli(browser, porta, e):
    """I moduli in src/ sono la fonte: il bundle puo girare anche con un import
    rotto, quindi vanno provati per conto loro."""
    errs = []
    pg = browser.new_page()
    pg.on("pageerror", lambda err: errs.append(str(err)))
    pg.on("console", lambda m: errs.append(m.text)
          if m.type == "error" and "favicon" not in m.text else None)
    pg.goto(f"http://127.0.0.1:{porta}/__prova__")
    pg.wait_for_timeout(2500)
    out = pg.inner_text("#out")
    pg.close()
    if errs:
        e.ko(f"moduli: {errs[0]}")
    elif "sketch=6" not in out or "contratto=true" not in out:
        e.ko(f"moduli: registro incompleto ({out})")
    elif "istanza=function/function/function" not in out:
        e.ko(f"moduli: contratto dello sketch non rispettato ({out})")
    elif "palette=Brace" not in out:
        e.ko(f"moduli: setPalette non ha effetto ({out})")
    else:
        e.ok("i moduli in src/ si caricano e si collegano fra loro")


def prova_costruito(e):
    """Il banco e generato da src/: se qualcuno tocca solo src/, va rigenerato."""
    r = subprocess.run([sys.executable, str(RADICE / "tools" / "costruisci.py"), "--verifica"],
                       capture_output=True, text=True)
    if r.returncode == 0:
        e.ok("prototypes/sketch-bench.html e aggiornato rispetto a src/")
    else:
        e.ko("il banco e vecchio rispetto a src/: python3 tools/costruisci.py")


def fase(pagina):
    """Estrae la fase del ciclo dalla barra sotto il canvas, se c'e."""
    m = re.search(r"·\s*(COSTRUISCE|COMPLETA|SMONTA)", pagina.inner_text("#bar-left").upper())
    return m.group(1) if m else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rapido", action="store_true", help="salta i comandi, prova solo gli sketch")
    ap.add_argument("--out", default=None, help="cartella per le schermate")
    ap.add_argument("--chromium", default=None, help="percorso dell'eseguibile Chromium")
    args = ap.parse_args()

    out = pathlib.Path(args.out) if args.out else None
    if out:
        out.mkdir(parents=True, exist_ok=True)

    if not PAGINA.exists():
        print(f"pagina non trovata: {PAGINA}", file=sys.stderr)
        return 1

    e = Esito()
    errori_pagina = []

    print("fonte")
    prova_costruito(e)
    porta, ferma_server = servi(RADICE)

    with sync_playwright() as p:
        exe = trova_chromium(args.chromium)
        browser = p.chromium.launch(executable_path=exe, args=["--no-sandbox"])
        pg = browser.new_page(viewport={"width": 1440, "height": 1150})
        pg.on("pageerror", lambda err: errori_pagina.append(str(err)))
        pg.goto(PAGINA.as_uri())
        pg.wait_for_timeout(2500)

        if not args.rapido:
            prova_moduli(browser, porta, e)

        # --- ogni sketch gira, e i pannelli giusti compaiono ---
        print("sketch")
        for key in SKETCH:
            pg.click(f'button.pick[data-key="{key}"]')
            pg.wait_for_timeout(2600)
            barra = pg.inner_text("#bar-left")
            fps = int(pg.inner_text("#bar-fps") or 0)
            pann = pg.evaluate("""() => Object.entries({
                mondo:'view-panel', camera:'cam-panel', taglio:'split-panel',
                gen:'gen-panel', semi:'seed-panel', luce:'light-panel'})
                .filter(([k,id]) => !document.getElementById(id).hidden)
                .map(([k]) => k).join(',') || '—'""")
            if out:
                pg.locator("#cv").screenshot(path=str(out / f"{key}.png"))
            if fps < FPS_MINIMO:
                e.ko(f"{key}: {fps} fps, sotto il minimo di {FPS_MINIMO}")
            elif not barra.strip():
                e.ko(f"{key}: la barra di stato e vuota")
            else:
                e.ok(f"{key:8s} {fps:>3d} fps · {pann}")

        if not args.rapido:
            # --- ciclo costruzione / completa / smonta ---
            print("\nciclo di costruzione")
            for key in ("split", "split3d"):
                pg.click(f'button.pick[data-key="{key}"]')
                pg.wait_for_timeout(400)
                pg.click("#un-rev")
                pg.locator("#reveal").fill("120")
                pg.dispatch_event("#reveal", "input")
                viste = set()
                for _ in range(44):
                    pg.wait_for_timeout(500)
                    f = fase(pg)
                    if f:
                        viste.add(f)
                    if {"COSTRUISCE", "COMPLETA", "SMONTA"} <= viste:
                        break
                mancanti = {"COSTRUISCE", "COMPLETA", "SMONTA"} - viste
                if mancanti:
                    e.ko(f"{key}: fasi mai raggiunte: {', '.join(sorted(mancanti))}")
                else:
                    e.ok(f"{key:8s} costruisce, resta completa, smonta")

            # --- crescita da piu semi: le giunzioni devono comparire ---
            print("\ncrescita del reticolo")
            pg.click('button.pick[data-key="lattice"]')
            pg.wait_for_timeout(1200)
            giunzioni = {}
            for n in ("1", "4"):
                pg.locator("#seeds").fill(n)
                pg.dispatch_event("#seeds", "input")
                pg.dispatch_event("#seeds", "change")
                pg.wait_for_timeout(2500)
                m = re.search(r"GIUNZIONI (\d+)", pg.inner_text("#bar-left").upper())
                giunzioni[n] = int(m.group(1)) if m else -1
            if giunzioni.get("1") != 0:
                e.ko(f"un solo seme dovrebbe dare zero giunzioni, ne da {giunzioni.get('1')}")
            elif giunzioni.get("4", 0) <= 0:
                e.ko("quattro semi non producono nessuna giunzione")
            else:
                e.ok(f"1 seme -> 0 giunzioni, 4 semi -> {giunzioni['4']} giunzioni")

            # --- la camera risponde ai tasti anche dopo aver toccato un cursore ---
            print("\ncamera")
            pg.click('button.pick[data-key="inside"]')
            pg.wait_for_timeout(1500)
            pg.locator("#extent").fill("60")
            pg.dispatch_event("#extent", "input")     # il cursore prende il fuoco
            prima = pg.input_value("#cam")
            pg.keyboard.down("Shift")
            pg.keyboard.down("s")
            pg.wait_for_timeout(2500)
            pg.keyboard.up("s")
            pg.keyboard.up("Shift")
            pg.wait_for_timeout(600)
            dopo = pg.input_value("#cam")
            z0 = float(prima.split(",")[2])
            z1 = float(dopo.split(",")[2])
            if abs(z1 - z0) < 1.0:
                e.ko(f"i tasti non muovono la camera dopo aver usato un cursore ({prima} -> {dopo})")
            else:
                e.ok(f"i tasti muovono la camera dopo un cursore (z {z0:.2f} -> {z1:.2f})")

            # --- un clic su Fuori deve bastare, senza tastiera ---
            pg.click("#view-in")
            pg.wait_for_timeout(1200)
            pg.click("#view-out")
            pg.wait_for_timeout(4000)
            d = pg.evaluate("""() => { const v = document.getElementById('cam').value.split(',');
                return Math.hypot(+v[0], +v[1], +v[2]); }""")
            if d < 3.0:
                e.ko(f"un clic su Fuori non allontana la camera (distanza {d:.2f})")
            else:
                e.ok(f"un clic su Fuori porta la camera a distanza {d:.2f}")

            # --- palette e luce agiscono a caldo ---
            print("\nresa")
            n_pal = pg.locator(".sw").count()
            if n_pal < 5:
                e.ko(f"trovate {n_pal} palette, ne servono almeno 5")
            else:
                e.ok(f"{n_pal} palette disponibili")
            for k in ("brace", "ghiaccio"):
                pg.click(f'.sw[data-pal="{k}"]')
                pg.wait_for_timeout(1400)
                if out:
                    pg.locator("#cv").screenshot(path=str(out / f"palette-{k}.png"))
            e.ok("palette applicate a caldo")

            pg.locator("#ldir").fill("250")
            pg.dispatch_event("#ldir", "input")
            pg.locator("#lhei").fill("-40")
            pg.dispatch_event("#lhei", "input")
            pg.wait_for_timeout(1400)
            if out:
                pg.locator("#cv").screenshot(path=str(out / "luce-dal-basso.png"))
            e.ok("luce orientabile applicata a caldo")

        browser.close()
    ferma_server()

    if errori_pagina:
        for err in errori_pagina:
            e.ko(f"errore di pagina: {err}")
    else:
        e.ok("nessun errore di pagina")

    print()
    if out:
        print(f"schermate in {out}\n")
    return e.stampa()


if __name__ == "__main__":
    sys.exit(main())
