#!/usr/bin/env python3
"""Misura saturazione e luminanza di un video o di un'immagine.

È lo strumento con cui il banco viene confrontato con il video di riferimento,
invece che a occhio. Ha già trovato due difetti reali: una saturazione di 3.9
dove doveva essere 0 (il fondo #07090B tendeva impercettibilmente al blu) e una
luminanza media di 20 contro le 36 del riferimento.

    python3 tools/misura.py video.mp4          # estrae 11 frame e li misura
    python3 tools/misura.py render.png         # misura una singola immagine
    python3 tools/misura.py a.png b.png ...    # confronta piu immagini

Serve: pillow, numpy, e imageio-ffmpeg solo per i video.
"""
import sys
import pathlib
import tempfile
import subprocess

import numpy as np
from PIL import Image

# Misure del video di riferimento (plexus monocromo, 2560x1440, 30 fps, 20.05 s),
# ricavate da 11 frame campionati lungo tutta la durata.
RIFERIMENTO = {"sat": 0.00, "lum": 36.0, "p99": 144.0, "max": 241.0}


def stats(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(int)
    sat = a.max(2) - a.min(2)
    lum = a.mean(2)
    return {
        "sat": float(sat.mean()),
        "lum": float(lum.mean()),
        "p99": float(np.percentile(lum, 99)),
        "max": float(lum.max()),
    }


def riga(nome, s):
    return (f"{nome:26s} sat {s['sat']:5.2f}  lum {s['lum']:5.1f}  "
            f"p99 {s['p99']:5.1f}  max {s['max']:5.1f}")


def frames_da_video(video, out_dir, n=11):
    """Campiona n frame lungo il video. Ritorna i percorsi scritti."""
    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()

    durata = None
    probe = subprocess.run([ff, "-i", str(video)], capture_output=True, text=True)
    for line in probe.stderr.splitlines():
        if "Duration:" in line:
            hh, mm, ss = line.split("Duration:")[1].split(",")[0].strip().split(":")
            durata = int(hh) * 3600 + int(mm) * 60 + float(ss)
            break
    if durata is None:
        raise SystemExit(f"non riesco a leggere la durata di {video}")

    scritti = []
    for i in range(n):
        t = durata * (i + 0.5) / n
        dst = out_dir / f"frame_{i:02d}.jpg"
        subprocess.run(
            [ff, "-ss", f"{t:.2f}", "-i", str(video), "-frames:v", "1",
             "-vf", "scale=960:-1", "-q:v", "3", str(dst), "-y"],
            capture_output=True,
        )
        if dst.exists():
            scritti.append(dst)
    return scritti


def main(argv):
    if not argv:
        raise SystemExit(__doc__)

    misure = []
    for arg in argv:
        p = pathlib.Path(arg)
        if not p.exists():
            raise SystemExit(f"non trovato: {p}")
        if p.suffix.lower() in {".mp4", ".webm", ".mov", ".mkv"}:
            with tempfile.TemporaryDirectory() as tmp:
                fs = frames_da_video(p, pathlib.Path(tmp))
                if not fs:
                    raise SystemExit(f"nessun frame estratto da {p}")
                per_frame = [stats(f) for f in fs]
                media = {k: float(np.mean([s[k] for s in per_frame])) for k in per_frame[0]}
                misure.append((f"{p.name} ({len(fs)} frame)", media))
        else:
            misure.append((p.name, stats(p)))

    print(riga("RIFERIMENTO", RIFERIMENTO))
    print("-" * 66)
    for nome, s in misure:
        print(riga(nome, s))

    # Uno scarto di saturazione e il segnale piu utile: il riferimento e
    # monocromo esatto, quindi qualsiasi valore sopra ~0.5 e una tinta non voluta.
    for nome, s in misure:
        if s["sat"] > 0.5:
            print(f"\nnota: {nome} ha saturazione {s['sat']:.2f}. Se il bersaglio e "
                  f"il monocromo del riferimento, c'e una tinta di troppo "
                  f"(spesso il colore di fondo del canvas).")


if __name__ == "__main__":
    main(sys.argv[1:])
