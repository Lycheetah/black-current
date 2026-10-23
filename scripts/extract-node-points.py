#!/usr/bin/env python3
"""
EXTRACT NODE POINTS  —  green markers in reference art  ->  game node layout

    python3 scripts/extract-node-points.py DIR
    python3 scripts/extract-node-points.py DIR --emit layout
    python3 scripts/extract-node-points.py DIR --core-radius 26
    python3 scripts/extract-node-points.py DIR --type cannon

WHY THIS EXISTS
---------------
Mac, 2026-08-16: *"all images need to have node points clearly distinguishable
so then we can clearly layer and have actual ships."*

He is pointing at the real gap. The game does not draw ships — it draws a NODE
GRAPH. `js/designer.js` stores `{ dx, dy, radius, type }` in pixels from the core
centre, and each node's art lives in its own normalised space where `r: 1.0` is
that node's radius. So a beautiful part image with no declared mount point is a
picture, not a component. You cannot layer it.

The fix is to make the artwork CARRY its own socket geometry, by reserving one
colour that may appear nowhere else:

    🟢 PURE GREEN #00FF00 filled circle = a node point.
       A CORE HULL  -> one dot per socket; the dot's SIZE is the socket radius.
       A MODULE     -> exactly one dot, at the point where it bolts on.

⭐ **RESERVING A COLOUR IS WHAT MAKES THE MARKERS MACHINE-READABLE.** No model,
   no tracing, no guessing — a colour match and a flood fill. This is the same
   trick as the magenta background key in `key-flat-background.py`, and for the
   same reason: **ask for the thing you can measure.**

WHAT IT DOES
------------
1. Finds every pure-green blob and measures its centroid and radius.
2. Measures the artwork's own bounding box with the green EXCLUDED, so the
   markers cannot inflate the hull's measured size.
3. Converts to the game's units and prints a paste-ready node layout.
4. Writes a CLEANED copy with the markers removed — filled from the ring of
   pixels just outside each blob, so the dots never get traced into the art.

⚠ WHAT IT CANNOT DO. It reports geometry, not intent. It does not know which
socket is a cannon and which is a pod — filenames and `--type` supply that, and
a wrong filename yields a confidently wrong type. It also cannot know the real
scale of a drawing, so the pixel->game conversion is an assumption, printed on
every run so it can be argued with rather than believed.

⚠ A GENERATOR WILL NOT PLACE THESE PERFECTLY. That is expected. Every file
reports its dot count and flags zero-dot and implausible-count results, so a bad
one is visible instead of silently wrong. Fix those by nudging numbers, not by
regenerating the art.
"""

import sys
import os
import json
from collections import deque

try:
    from PIL import Image
except ImportError:
    sys.exit("FATAL: Pillow is not available.  pip install --user Pillow")
try:
    import numpy as np
except ImportError:
    sys.exit("FATAL: numpy is not available.  pip install --user numpy")


PART_TYPES = ("core", "cannon", "pod", "spike", "thruster", "shield")

# How far a pixel may sit from pure green and still count as a marker. Wide,
# because a generator paints "pure green" approximately and a keyed edge blends
# it — but the hull palettes deliberately contain no green at all, so there is
# nothing nearby to collide with.
GREEN = np.array([0, 255, 0], dtype=np.float32)
GREEN_TOL = 110.0


def parse_args(argv):
    a = {"indir": None, "emit": "layout", "core_radius": 26.0, "type": None, "min_px": 12}
    pos = []
    i = 0
    while i < len(argv):
        t = argv[i]
        if t == "--emit":
            i += 1; a["emit"] = argv[i]
        elif t == "--core-radius":
            i += 1; a["core_radius"] = float(argv[i])
        elif t == "--type":
            i += 1; a["type"] = argv[i]
        elif t == "--min-px":
            i += 1; a["min_px"] = int(argv[i])
        elif t.startswith("--"):
            sys.exit(f"unknown flag: {t}")
        else:
            pos.append(t)
        i += 1
    if not pos:
        sys.exit(__doc__)
    a["indir"] = pos[0]
    return a


def infer_type(name, override):
    """Filename decides the part type. `--type` overrides for a whole batch.

    Ordered longest-first is not needed here (no type name contains another),
    but the FIRST match wins, so `ironwake_core_cannon.png` resolves to `core`.
    That is a real ambiguity a filename cannot settle, so it is reported rather
    than silently resolved.
    """
    if override:
        return override, False
    low = name.lower()
    hits = [t for t in PART_TYPES if t in low]
    if not hits:
        return "unknown", False
    return hits[0], len(hits) > 1


def find_blobs(mask, min_px):
    """Connected components over the green mask.

    A flood fill rather than a library labeller so this file keeps its
    zero-dependency footing beyond Pillow and numpy — and the blobs are a
    handful of small circles, so the cost is irrelevant.
    """
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    blobs = []
    ys, xs = np.nonzero(mask)
    for sy, sx in zip(ys, xs):
        if seen[sy, sx]:
            continue
        q = deque([(sy, sx)])
        seen[sy, sx] = True
        pts = []
        while q:
            y, x = q.popleft()
            pts.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        if len(pts) < min_px:
            continue                      # speckle, not a marker
        arr = np.array(pts, dtype=np.float32)
        cy, cx = arr[:, 0].mean(), arr[:, 1].mean()
        # Radius from AREA, not from the bounding box: a blob nicked by the
        # frame edge or slightly elliptical still reports a sane radius.
        r = float(np.sqrt(len(pts) / np.pi))

        # 🔴 MERGED-MARKER DETECTION. Found by the witness, and it is the
        # failure mode that actually bites: two sockets drawn close enough to
        # touch flood-fill into ONE blob, and the extractor then reports a
        # single fat node with a plausible-looking radius. It looked like a
        # clean run — "0 needing attention" — over a hull that had silently
        # lost a socket.
        #
        # ⭐ **A MERGED BLOB IS STILL A VALID BLOB. The only thing that betrays
        #    it is its SHAPE.** One drawn circle fills ~pi*r^2 of a square
        #    bounding box and is as tall as it is wide. Two merged circles are
        #    elongated and sparse in their own box. So measure roundness, and
        #    refuse to guess where the seam was — splitting them would be
        #    invention. Report it and let the artwork be fixed.
        bh_ = arr[:, 0].max() - arr[:, 0].min() + 1
        bw_ = arr[:, 1].max() - arr[:, 1].min() + 1
        span = max(bw_, bh_)
        roundness = len(pts) / (np.pi * (span / 2.0) ** 2)
        aspect = max(bw_, bh_) / max(min(bw_, bh_), 1.0)
        blobs.append({
            "cx": float(cx), "cy": float(cy), "r": r, "px": len(pts),
            "merged": bool(roundness < 0.74 or aspect > 1.35),
            "roundness": round(float(roundness), 2),
        })
    return blobs


def strip_markers(rgb, alpha, mask):
    """Remove the markers by filling each from the ring just outside it.

    Setting them transparent would punch holes through the hull, and the holes
    would be traced. Filling from the immediate surroundings leaves plating that
    reads correctly at the sizes anyone will actually look at this.
    """
    out = rgb.copy()
    if not mask.any():
        return out, alpha
    # Dilate the mask a few times; the ring is the dilation minus the mask.
    grown = mask.copy()
    for _ in range(4):
        g = grown.copy()
        g[1:, :] |= grown[:-1, :]
        g[:-1, :] |= grown[1:, :]
        g[:, 1:] |= grown[:, :-1]
        g[:, :-1] |= grown[:, 1:]
        grown = g
    ring = grown & ~mask & (alpha > 128)
    fill = np.median(out[ring], axis=0) if ring.any() else np.array([0, 0, 0])
    out[mask] = fill
    a = alpha.copy()
    a[mask] = 255                          # the marker sat on solid hull
    return out, a


def process(path, args):
    img = Image.open(path).convert("RGBA")
    arr = np.asarray(img).astype(np.float32)
    rgb, alpha = arr[..., :3], arr[..., 3]

    dist = np.sqrt(((rgb - GREEN) ** 2).sum(axis=2))
    mask = (dist < GREEN_TOL) & (alpha > 64)

    blobs = find_blobs(mask, args["min_px"])
    ptype, ambiguous = infer_type(os.path.basename(path), args["type"])

    # 🔴 THE EXTENT IS EVERY OPAQUE PIXEL, MARKERS INCLUDED. The first version
    # excluded the green, reasoning that a stray dot would inflate the hull.
    # The witness showed the opposite is what actually happens: the markers are
    # drawn ON TOP of the art, so subtracting them punches holes in the very
    # mask being measured. On the test module a mount dot sitting over the rear
    # face moved the measured centre 35px and every derived offset with it.
    # ⚠ The residual risk is the mirror image — a marker hanging off the edge
    #   of the artwork inflates the extent by up to its own radius. That is
    #   visible in the reported art_px, and it is the artist's error to fix.
    body = (alpha > 64)
    if not body.any():
        return {"file": os.path.basename(path), "error": "no artwork found (all transparent?)"}
    ys, xs = np.nonzero(body)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    bw, bh = float(x1 - x0 + 1), float(y1 - y0 + 1)
    ox, oy = (x0 + x1) / 2.0, (y0 + y1) / 2.0

    # PIXEL -> GAME SCALE. The assumption, stated: a hull's node radius is about
    # its half-beam, so half the artwork's HEIGHT maps to --core-radius. Height
    # not width, because these hulls are drawn nose-right and elongated, so the
    # width carries the length rather than the beam.
    scale = (args["core_radius"] * 2.0) / bh

    nodes = []
    for b in sorted(blobs, key=lambda b: (-b["r"], b["cx"])):
        nodes.append({
            "dx": round((b["cx"] - ox) * scale, 1),
            "dy": round((b["cy"] - oy) * scale, 1),
            "radius": round(b["r"] * scale, 1),
            "px": b["px"],
            "merged": b["merged"],
            "roundness": b["roundness"],
        })

    clean_rgb, clean_a = strip_markers(rgb.astype(np.uint8), alpha.astype(np.uint8), mask)
    outdir = os.path.join(os.path.dirname(path) or ".", "clean")
    os.makedirs(outdir, exist_ok=True)
    clean_path = os.path.join(outdir, os.path.basename(path))
    Image.fromarray(np.dstack([clean_rgb, clean_a]), mode="RGBA").save(clean_path)

    return {
        "file": os.path.basename(path),
        "type": ptype,
        "ambiguous_type": ambiguous,
        "art_px": [int(bw), int(bh)],
        "scale_px_to_game": round(scale, 4),
        "nodes": nodes,
        "clean": clean_path,
    }


def main():
    args = parse_args(sys.argv[1:])
    names = sorted(n for n in os.listdir(args["indir"]) if n.lower().endswith(".png"))
    if not names:
        sys.exit(f"no PNGs in {args['indir']}")

    print(f"\nreading {len(names)} image(s) from {args['indir']}")
    print(f"assumption: half the artwork's HEIGHT == core radius {args['core_radius']:g}px\n")

    results, warned = [], 0
    for n in names:
        r = process(os.path.join(args["indir"], n), args)
        results.append(r)
        if "error" in r:
            print(f"  ✘ {n:<40} {r['error']}"); warned += 1; continue

        note = ""
        # A core with no sockets, or a module with anything other than one
        # mount, is a defect in the ARTWORK. Say so instead of emitting
        # confident nonsense.
        merged = [n for n in r["nodes"] if n["merged"]]
        if merged:
            note = (f"  ⚠ {len(merged)} MARKER(S) NOT ROUND — two sockets drawn "
                    f"touching will merge into one; redraw them apart")
            warned += 1
        elif len(r["nodes"]) == 0:
            note, warned = "  ⚠ NO GREEN MARKER FOUND", warned + 1
        elif r["type"] == "core" and len(r["nodes"]) < 2:
            note, warned = "  ⚠ a core hull should have several sockets", warned + 1
        elif r["type"] in PART_TYPES and r["type"] != "core" and len(r["nodes"]) != 1:
            note, warned = "  ⚠ a module needs EXACTLY ONE mount point", warned + 1
        elif r["type"] == "unknown":
            note, warned = "  ⚠ part type not in filename — pass --type", warned + 1
        if r["ambiguous_type"]:
            note += "  ⚠ filename names more than one part type"
        print(f"  {'✔' if not note else '•'} {n:<40} {r['type']:<9} "
              f"{len(r['nodes'])} node(s){note}")

    if args["emit"] in ("layout", "both"):
        print("\n" + "=" * 62)
        print("PASTE-READY NODE LAYOUTS  (game units, forward = +X)")
        print("=" * 62)
        for r in results:
            if "error" in r or not r["nodes"]:
                continue
            print(f"\n/* {r['file']} — {r['type']} */")
            if r["type"] == "core":
                print("nodes: [")
                print(f"  {{ dx: 0, dy: 0, radius: {args['core_radius']:g}, type: 'core' }},")
                for nd in r["nodes"]:
                    print(f"  {{ dx: {nd['dx']:g}, dy: {nd['dy']:g}, "
                          f"radius: {nd['radius']:g}, type: '?' }},   // set the type")
                print("]")
            else:
                nd = r["nodes"][0]
                print(f"// mount offset from art centre: dx {nd['dx']:g}, dy {nd['dy']:g}")
                print(f"// draw this part with its origin at that point, "
                      f"r 1.0 = {nd['radius']:g}px")

    if args["emit"] in ("json", "both"):
        out = os.path.join(args["indir"], "node-points.json")
        with open(out, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nwrote {out}")

    print(f"\n{len(names)} processed, {warned} needing attention")
    print(f"marker-free copies in {os.path.join(args['indir'], 'clean')}/")
    print("⚠ types are guessed from filenames — check them before trusting a layout.")


if __name__ == "__main__":
    main()
