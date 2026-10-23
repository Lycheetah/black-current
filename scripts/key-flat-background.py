#!/usr/bin/env python3
"""
KEY A FLAT BACKGROUND OUT OF GENERATED ART  ->  transparent PNG

    python3 scripts/key-flat-background.py IN_DIR [OUT_DIR]
    python3 scripts/key-flat-background.py IN_DIR --colour FF00FF
    python3 scripts/key-flat-background.py IN_DIR --tolerance 60

WHY THIS EXISTS
---------------
`rembg` is installed on this machine but has NO WORKING onnxruntime backend, so
it does not run. That looked like a hard blocker on "generate 112 assets with
transparent backgrounds", because GPT/DALL-E in particular tends to ignore a
transparency instruction and hand back an opaque white card — or worse, a
*drawing of* a checkerboard.

But rembg solves the HARD problem: separating a subject from a photograph. We do
not have that problem. If we ask the generator for a FLAT SOLID background, the
separation is arithmetic — distance in RGB space — and needs no model at all.

⭐ **Ask for the background you can remove, rather than trying to remove the
   background you were given.**

Magenta (#FF00FF) is the default for a reason: it is the furthest thing in the
palette from every hull colour in the prompt pack (greys, rusts, bones, teals,
golds). A white background would key out the white highlights on the IRONWAKE
and SPIRE hulls along with it.

⚠ ANTI-ALIASING IS THE PART PEOPLE GET WRONG. The generator does not paint a
hard edge; it blends the subject into the background over 1–3 pixels. A naive
`if pixel == magenta: make transparent` leaves a bright pink fringe around every
asset, which then gets faithfully traced into the vector packs. So this does two
things a naive keyer does not:

  1. A SOFT RAMP — pixels between `tolerance` and `tolerance*2` from the
     background colour get partial alpha instead of a binary cut.
  2. DESPILL — those partial pixels have the background's colour mathematically
     removed in proportion to how transparent they are, so the remaining colour
     is the subject's own. This is what actually kills the fringe.

VERIFY, DO NOT ASSUME: the script reports the alpha coverage of every file it
writes. A result near 100% means it keyed nothing (wrong colour). A result near
0% means it keyed the whole image (the subject WAS the background colour). Both
are printed as warnings rather than passing silently — a keyer that quietly
returns a blank PNG is worse than one that fails.
"""

import sys
import os

try:
    from PIL import Image
except ImportError:
    sys.exit("FATAL: Pillow is not available.  pip install --user Pillow")

try:
    import numpy as np
except ImportError:
    sys.exit("FATAL: numpy is not available.  pip install --user numpy")

try:
    from scipy import ndimage
    HAVE_SCIPY = True
except ImportError:
    HAVE_SCIPY = False


def parse_args(argv):
    args = {"indir": None, "outdir": None, "colour": None, "tolerance": 48}
    positional = []
    i = 0
    while i < len(argv):
        a = argv[i]
        if a in ("--colour", "--color"):
            i += 1
            args["colour"] = argv[i]
        elif a == "--tolerance":
            i += 1
            args["tolerance"] = int(argv[i])
        elif a.startswith("--"):
            sys.exit(f"unknown flag: {a}")
        else:
            positional.append(a)
        i += 1
    if not positional:
        sys.exit(__doc__)
    args["indir"] = positional[0]
    args["outdir"] = positional[1] if len(positional) > 1 else os.path.join(positional[0], "keyed")
    return args


def detect_background(arr):
    """Median of the four corner patches.

    Sampling a single corner pixel is fragile — generators put noise, vignette
    or a stray glow in a corner often enough that one bad pixel would set the
    key colour for the whole image. A 12px patch from each of the four corners,
    combined with a median, survives one bad corner entirely.
    """
    h, w = arr.shape[:2]
    p = max(4, min(12, h // 20, w // 20))
    patches = np.concatenate([
        arr[:p, :p].reshape(-1, 3),
        arr[:p, -p:].reshape(-1, 3),
        arr[-p:, :p].reshape(-1, 3),
        arr[-p:, -p:].reshape(-1, 3),
    ])
    return np.median(patches, axis=0)


def key_dark_field(arr, tolerance):
    """Key a BLACK background by SILHOUETTE, never by a brightness ramp.

    🔴 THE BUG THIS REPLACES, measured on 27 real ships, 2026-08-16: the ramp
    below sets alpha from distance-to-background. Against magenta that is safe,
    because nothing in the art is near magenta. Against BLACK, distance-to-
    background IS BRIGHTNESS — so a dark hull scores low alpha and the keyer
    deletes the ship it was asked to keep. Four ships came back as a smudge and
    a dozen more as ghosts, while the bright ones passed and looked fine.

    ⭐ **A KEY ONLY WORKS WHEN THE BACKGROUND COLOUR IS ABSENT FROM THE
       SUBJECT.** Black fails that test for every warship ever drawn.

    So the question changes from "how far is this pixel from black" to "is this
    pixel INSIDE the ship" — a shape question. Threshold to find what is lit at
    all, close the gaps, fill the interior, and everything enclosed becomes
    fully opaque no matter how dark it is.
    """
    lum = arr.max(axis=2)
    # ⚠ Measured range on these sheets: p50≈0, p70≈14, p80≈38. A threshold just
    # clear of the compression floor separates "lit at all" from "nothing".
    t = max(12.0, float(np.percentile(lum, 55)) + 8.0)
    raw = lum > t

    if not HAVE_SCIPY:
        return np.clip(raw.astype(np.float32), 0, 1)

    m = ndimage.binary_closing(raw, structure=np.ones((7, 7)))
    m = ndimage.binary_fill_holes(m)

    # ⛔ Do NOT keep only the largest component — a ship with detached fins or a
    # separated pod would lose them. Keep everything of comparable size.
    lab, n = ndimage.label(m)
    if n > 1:
        sizes = np.array(ndimage.sum(m, lab, range(1, n + 1)))
        keep = np.where(sizes > max(sizes.max() * 0.02, 40))[0] + 1
        m = np.isin(lab, keep)

    # A 1-2px feather so the cut edge is not a jagged staircase.
    a = ndimage.gaussian_filter(m.astype(np.float32), 0.9)
    return np.clip((a - 0.25) / 0.5, 0.0, 1.0)


def key_image(path, out_path, colour, tolerance):
    src = Image.open(path)

    # ⛔ NEVER KEY AN IMAGE THAT IS ALREADY KEYED. `.convert("RGB")` silently
    # throws the alpha away, the corner probe then reads whatever was BEHIND the
    # cut-out, and a perfectly good transparent asset comes back as a solid
    # rectangle. MEASURED 2026-08-16: 15 of 27 sliced ships arrived already
    # transparent, so this is the common case, not the corner case.
    # ⭐ ONE TRUTH: transparency is decided once, by whichever step produced it.
    if src.mode in ("RGBA", "LA"):
        a = np.asarray(src.convert("RGBA"))
        if float((a[..., 3] < 250).mean()) > 0.02:
            src.convert("RGBA").save(out_path)
            return None, float((a[..., 3] / 255.0).mean())

    img = src.convert("RGB")
    arr = np.asarray(img).astype(np.float32)

    bg = np.array(colour, dtype=np.float32) if colour is not None else detect_background(arr)

    # ⭐ THE BACKGROUND COLOUR DECIDES WHICH ALGORITHM IS EVEN VALID.
    if float(bg.sum()) < 60.0:
        alpha = key_dark_field(arr, tolerance)
        # Against black, observed = subject * alpha, so the subject's own colour
        # is observed / alpha. Recovers the edge without brightening the middle.
        a3 = alpha[..., None]
        rgb = np.clip(np.where(a3 >= 0.98, arr, arr / np.maximum(a3, 0.25)), 0, 255)
        out = np.dstack([rgb.astype(np.uint8), (alpha * 255).astype(np.uint8)])
        Image.fromarray(out, mode="RGBA").save(out_path)
        return bg, float(alpha.mean())

    # Distance from the background colour, per pixel.
    dist = np.sqrt(((arr - bg) ** 2).sum(axis=2))

    # ---- ALPHA, AUTO-CALIBRATED -------------------------------------------
    # 🔴 THE BUG THIS REPLACES, and it is worth understanding because it looked
    # completely fine: the first version ramped alpha over a FIXED tolerance
    # (48 -> 96). But the real distance from magenta to a grey hull is ~235.
    # A pixel that is a genuine 50/50 blend of hull and background sits at
    # ~118 — already past 96 — so it scored alpha = 1.0, fully opaque, and the
    # despill below never touched it. Measured on a synthetic test card: 89 of
    # 177 edge pixels came out visibly pink.
    #
    # ⭐ **A THRESHOLD IN AN ABSOLUTE UNIT IS A GUESS UNTIL YOU MEASURE THE
    #    RANGE IT LIVES IN.** The scale is a property of the image, not a
    #    constant, so calibrate it from the image.
    #
    # T is the distance at which a pixel is certainly pure subject. Take the
    # pixels well clear of the background, then the 5th percentile of THOSE —
    # a distance nearly every foreground pixel exceeds, whatever its colour.
    # (Against magenta: black is 361 away, white 255, mid-grey 235. A single
    # global constant cannot serve all three; a low percentile can.)
    d_hi = np.percentile(dist, 99)
    fg = dist > d_hi * 0.5
    T = float(np.percentile(dist[fg], 5)) if fg.any() else max(d_hi, 1.0)
    T = max(T, float(tolerance))         # never calibrate below the noise floor

    floor = float(tolerance) * 0.25      # ignore compression noise in flat areas
    alpha = np.clip((dist - floor) / max(T - floor, 1e-6), 0.0, 1.0)

    # ---- DESPILL ----------------------------------------------------------
    # For a partially transparent pixel the observed colour is
    #     observed = subject*alpha + bg*(1-alpha)
    # so the subject's own colour is (observed - bg*(1-alpha)) / alpha. With
    # alpha now correct this is EXACT, not an approximation: a 50/50 magenta
    # edge pixel (175,52,185) recovers to (95,104,115) against a true hull of
    # (96,104,116). Without it, every asset keeps a halo of the background it
    # was generated on — and that halo gets faithfully traced into the vectors.
    a3 = alpha[..., None]
    safe = np.maximum(a3, 0.06)          # do not divide by ~0 in the clear region
    subject = (arr - bg * (1.0 - a3)) / safe
    rgb = np.clip(np.where(a3 >= 1.0, arr, subject), 0, 255)

    out = np.dstack([rgb.astype(np.uint8), (alpha * 255).astype(np.uint8)])
    Image.fromarray(out, mode="RGBA").save(out_path)

    coverage = float(alpha.mean())
    return bg, coverage


def main():
    args = parse_args(sys.argv[1:])
    colour = None
    if args["colour"]:
        c = args["colour"].lstrip("#")
        colour = [int(c[i:i + 2], 16) for i in (0, 2, 4)]

    # ⚠ The slicer files assets into CATEGORY subfolders, so a flat listdir
    # would find nothing at all and exit claiming the folder was empty. Walk it,
    # and mirror the structure into the output.
    base = os.path.abspath(args["indir"])
    jobs = []
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames[:] = [d for d in sorted(dirnames) if d != "keyed"]
        rel = os.path.relpath(dirpath, base)
        for n in sorted(filenames):
            if n.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                jobs.append((os.path.join(dirpath, n),
                             "" if rel == "." else rel, n))
    if not jobs:
        sys.exit(f"no images found in {args['indir']}")

    print(f"\nkeying {len(jobs)} image(s)  ->  {args['outdir']}")
    print(f"background: {'#' + args['colour'].lstrip('#') if args['colour'] else 'AUTO (corner median)'}"
          f"   tolerance: {args['tolerance']}\n")

    suspect = passthrough = 0
    for src, rel, n in jobs:
        odir = os.path.join(args["outdir"], rel)
        os.makedirs(odir, exist_ok=True)
        dst = os.path.join(odir, os.path.splitext(n)[0] + ".png")
        bg, cov = key_image(src, dst, colour, args["tolerance"])

        if bg is None:
            passthrough += 1
            continue                      # already transparent, left untouched
        bg_hex = "#%02X%02X%02X" % tuple(int(v) for v in bg)

        # A keyer that silently writes a blank or an unchanged image is worse
        # than one that fails, so both ends of the range are called out.
        if cov > 0.97:
            note, suspect = "  ⚠ KEYED NOTHING — wrong background colour?", suspect + 1
        elif cov < 0.05:
            note, suspect = "  ⚠ KEYED ALMOST EVERYTHING — subject matches the background", suspect + 1
        else:
            note = ""
        print(f"  {os.path.join(rel, n):<40} bg {bg_hex}  subject {cov * 100:5.1f}%{note}")

    print(f"\n{len(jobs)} written, {passthrough} already transparent (passed "
          f"through untouched), {suspect} suspect")
    if suspect:
        print("re-run the suspect ones with an explicit --colour, or --tolerance 30 / 80")


if __name__ == "__main__":
    main()
