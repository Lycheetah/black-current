#!/usr/bin/env python3
"""
SLICE A MULTI-OBJECT SHEET INTO ONE PNG PER OBJECT

    python3 scripts/slice-sheet.py SHEET.png
    python3 scripts/slice-sheet.py ~/Downloads/sheets/            # whole folder
    python3 scripts/slice-sheet.py SHEET.png --expect 6
    python3 scripts/slice-sheet.py SHEET.png --colour FF00FF --min-area 900

WHY THIS EXISTS
---------------
Mac, 2026-08-16: *"why not just have 4 images of the extra shit outside the
bodies or even for the ship in one image generation bro???"*

He is right, and the cost argument is the weaker half of it:

  * 112 separate generations  ->  16 sheets. Six parts per ship, one image.
  * ⭐ THE REAL WIN IS STYLE COHERENCE. A cannon generated in its own call has
    no reason to share the hull's palette, line weight, wear pattern or light
    direction. Generated in the SAME image it inherits all four for free. That
    is precisely why bolted-on parts look bolted-on.

⭐ **AND NO SLICING TOOL IS NEEDED, BECAUSE THE BACKGROUND IS ALREADY A KEY.**
That turns "find the objects" into connected-component labelling on a boolean
mask — arithmetic, no model, no grid to guess, no hand-cutting.

⚠ WHAT THE FIRST REAL BATCH TAUGHT US (42 sheets, 2026-08-16)
-------------------------------------------------------------
⭐ **THE GENERATOR DOES NOT GIVE YOU ONE BACKGROUND — IT GIVES YOU THREE.**
MEASURED across Mac's first 42 sheets:

    12 files  real alpha, 51-65% transparent   -> already cut out
     9 files  magenta, but #F903FA not #FF00FF -> keyed, drifted by compression
    21 files  opaque BLACK                     -> the dangerous set

⛔ A sheet that already carries alpha must be read THROUGH ITS ALPHA. Flattening
it to RGB paints every transparent pixel black, the corner probe reads black as
the key, and the whole sheet returns as one blob. Asking for a key does not mean
you got one — **probe the file, do not trust the prompt.**

⛔ Black backgrounds are keyed at a LOWER tolerance than a coloured key, because
a warship's own shadow side sits only a few values off black. And because that
still fragments a dark hull into pieces, the mask is DILATED before labelling so
neighbouring fragments of one ship rejoin — then the bounding box is shrunk back
by the same amount, so the crop is honest.

⚠ THIS TOOL ONLY CUTS. Keying lives in `key-flat-background.py`. Three small
tools in a chain, each independently verifiable:

    slice-sheet.py  ->  key-flat-background.py  ->  extract-node-points.py
       cut it            make it transparent          read its sockets

⭐ An alpha-sourced slice SKIPS the middle step — it is already transparent, and
this tool says so per file so nobody keys an image twice.

⛔ TOUCHING OBJECTS ARE THE FAILURE MODE, so they are detected rather than
guessed at. If two parts are drawn overlapping they become ONE component, and
splitting them would be invention. The tool flags the blob (by aspect ratio and
fill ratio) and says so. A flagged sheet is re-generated with wider gaps, not
repaired by hand — where the seam went is a guess.
"""

import sys
import os
import hashlib

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
    a = {"paths": [], "colour": None, "tolerance": 60, "min_area": 600,
         "expect": 0, "pad": 8, "dilate": 3, "outdir": None, "keep_dupes": False,
         "root_name": "ships", "redo": False, "consume": False}
    i = 0
    while i < len(argv):
        t = argv[i]
        if t in ("--colour", "--color"):
            i += 1; a["colour"] = argv[i]
        elif t == "--tolerance":
            i += 1; a["tolerance"] = int(argv[i])
        elif t == "--min-area":
            i += 1; a["min_area"] = int(argv[i])
        elif t == "--expect":
            i += 1; a["expect"] = int(argv[i])
        elif t == "--pad":
            i += 1; a["pad"] = int(argv[i])
        elif t == "--dilate":
            i += 1; a["dilate"] = int(argv[i])
        elif t == "--out":
            i += 1; a["outdir"] = argv[i]
        elif t == "--keep-duplicates":
            a["keep_dupes"] = True
        elif t == "--root-name":
            i += 1; a["root_name"] = argv[i]
        elif t == "--redo":
            a["redo"] = True
        elif t == "--consume":
            # ⛔ DESTRUCTIVE, AND DELIBERATELY OPT-IN. Mac, 2026-08-16:
            # *"make sure you delete the ones you used as it doesn't matter me
            # adding more stuff"* — the drop folder is an INBOX, so anything
            # still in it is by definition unprocessed. The source is removed
            # only AFTER its slices are written and counted, never before.
            a["consume"] = True
        elif t.startswith("--"):
            sys.exit(f"unknown flag: {t}")
        else:
            a["paths"].append(t)
        i += 1
    if not a["paths"]:
        sys.exit(__doc__)
    return a


def detect_background(arr):
    """Median of four corner patches — one bad corner cannot set the key."""
    h, w = arr.shape[:2]
    p = max(4, min(16, h // 20, w // 20))
    patches = np.concatenate([
        arr[:p, :p].reshape(-1, 3), arr[:p, -p:].reshape(-1, 3),
        arr[-p:, :p].reshape(-1, 3), arr[-p:, -p:].reshape(-1, 3),
    ])
    return np.median(patches, axis=0)


def dilate(mask, k):
    """Bridge thin gaps so one dark hull does not label as six fragments.

    ⚠ The bounding box is shrunk by the same k afterwards, so growth never
    reaches the saved crop. Dilation is a LABELLING aid, never a cropping one.
    """
    out = mask
    for _ in range(k):
        d = out.copy()
        d[1:, :] |= out[:-1, :]
        d[:-1, :] |= out[1:, :]
        d[:, 1:] |= out[:, :-1]
        d[:, :-1] |= out[:, 1:]
        out = d
    return out


def components_scipy(label_mask, true_mask, min_area, shrink):
    lab, n = ndimage.label(label_mask)
    found = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None:
            continue
        sub = (lab[sl] == i) & true_mask[sl]
        area = int(sub.sum())
        if area < min_area:
            continue
        ys, xs = np.nonzero(sub)
        if not len(ys):
            continue
        # ⚠ measure the box on the TRUE mask, not the dilated one.
        y0 = int(sl[0].start + ys.min()); y1 = int(sl[0].start + ys.max())
        x0 = int(sl[1].start + xs.min()); x1 = int(sl[1].start + xs.max())
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        found.append(_blob(x0, y0, x1, y1, bw, bh, area))
    return found


def components_flood(mask, min_area):
    """Iterative flood fill. Recursion would blow the stack on a real sheet."""
    h, w = mask.shape
    seen = np.zeros((h, w), dtype=bool)
    found = []
    ys, xs = np.nonzero(mask)
    for sy, sx in zip(ys, xs):
        if seen[sy, sx]:
            continue
        stack = [(sy, sx)]
        seen[sy, sx] = True
        pix = []
        while stack:
            y, x = stack.pop()
            pix.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if len(pix) < min_area:
            continue
        a = np.array(pix)
        y0, x0 = int(a[:, 0].min()), int(a[:, 1].min())
        y1, x1 = int(a[:, 0].max()), int(a[:, 1].max())
        found.append(_blob(x0, y0, x1, y1, x1 - x0 + 1, y1 - y0 + 1, len(pix)))
    return found


def _blob(x0, y0, x1, y1, bw, bh, area):
    return {
        "x0": x0, "y0": y0, "x1": x1, "y1": y1,
        "w": int(bw), "h": int(bh), "area": int(area),
        # ⚠ fill = how much of the bounding box the object actually occupies.
        # A single part fills its box generously. TWO touching parts joined by a
        # thin bridge leave big empty corners, so fill collapses. Same
        # shape-not-size reasoning that catches merged node markers — a merged
        # blob is still a valid blob; only its SHAPE betrays it.
        "fill": round(float(area) / float(bw * bh), 3),
        "aspect": round(float(max(bw, bh)) / float(max(min(bw, bh), 1)), 2),
    }


def order_reading(blobs, tol_ratio=0.55):
    """Sort into rows top-to-bottom, then left-to-right inside each row.

    A generator will not align a sheet to a perfect grid, so rows are grouped by
    vertical OVERLAP rather than by an exact y value: two objects are on the same
    row if their vertical spans overlap by more than half the shorter one.
    """
    rows, remaining = [], sorted(blobs, key=lambda b: b["y0"])
    while remaining:
        seed = remaining.pop(0)
        row = [seed]
        keep = []
        for b in remaining:
            lo = max(seed["y0"], b["y0"])
            hi = min(seed["y1"], b["y1"])
            overlap = max(0, hi - lo)
            if overlap > tol_ratio * min(seed["h"], b["h"]):
                row.append(b)
            else:
                keep.append(b)
        remaining = keep
        rows.append(sorted(row, key=lambda b: b["x0"]))

    # ⭐ THE GRID IS THE STAT TABLE. Row and column are recorded because on a
    # deliberate matrix sheet they MEAN something — row = size class, column =
    # damage type — so a module's stats can be derived from where it was drawn
    # instead of from a tag nobody will maintain. On a non-grid sheet they are
    # simply reading order and cost nothing.
    out = []
    for r, row in enumerate(rows, 1):
        for c, b in enumerate(row, 1):
            b["row"], b["col"] = r, c
            out.append(b)
    return out


def build_mask(path, args):
    """Return (rgba_image, mask, source_label, note).

    ⭐ THE PROBE DECIDES, NOT THE PROMPT. Three regimes, in priority order:
      ALPHA  — the file already carries a cut-out. Read it and stop.
      COLOUR — a deliberate key (magenta). Distance in RGB.
      BLACK  — an opaque dark field. Same maths, tighter tolerance.
    """
    img = Image.open(path)
    rgba = img.convert("RGBA")
    a = np.asarray(rgba).astype(np.float32)
    alpha = a[..., 3]
    rgb = a[..., :3]

    transparent = float((alpha < 32).mean())
    if args["colour"] is None and transparent > 0.05:
        return rgba, alpha > 128, "ALPHA", f"{transparent*100:.0f}% transparent"

    bg = (np.array(args["colour"], dtype=np.float32)
          if args["colour"] is not None else detect_background(rgb))
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))

    # ⚠ A tolerance is a guess until you know the range it lives in. Against a
    # coloured key, 60 is comfortable — nothing in the art is near magenta.
    # Against BLACK, 60 eats the shadow side of a dark hull, so tighten it.
    tol = float(args["tolerance"])
    is_black = float(bg.sum()) < 60.0
    if is_black:
        tol = min(tol, 26.0)
    mask = dist > tol
    bg_hex = "#%02X%02X%02X" % tuple(int(v) for v in bg)
    return rgba, mask, ("BLACK" if is_black else "COLOUR"), f"bg {bg_hex} tol {tol:.0f}"


SINGULAR = {"ships": "ship", "modules": "module", "enemy-ships": "enemy",
            "enemies": "enemy", "weapons": "weapon", "turrets": "turret",
            "hulls": "hull", "parts": "part"}


def asset_name(category):
    """⌨ A DISPLAY NAME YOU CANNOT TYPE BACK IS A LIE. `sheet14_09.png` names a
    generator timestamp, not a thing in the game. Assets get the noun they are."""
    return SINGULAR.get(category, category.rstrip("s") or category)


def next_asset_number(catdir, stem):
    hi = 0
    if os.path.isdir(catdir):
        pre = stem + "_"
        for n in os.listdir(catdir):
            if n.startswith(pre):
                num = n[len(pre):len(pre) + 3]
                if num.isdigit():
                    hi = max(hi, int(num))
    return hi + 1


def slice_sheet(path, outdir, args, index, manifest, category, md5):
    rgba, mask, source, note = build_mask(path, args)
    w_img, h_img = rgba.size

    k = args["dilate"]
    label_mask = dilate(mask, k) if k > 0 else mask
    if HAVE_SCIPY:
        blobs = components_scipy(label_mask, mask, args["min_area"], k)
    else:
        blobs = components_flood(label_mask, args["min_area"])
    blobs = order_reading(blobs)

    # ⚠ A generator filename is a timestamp, and truncating it produces
    # `..._Aug_16,_20` — a name that identifies nothing. Assets are numbered
    # per category, and `manifest.tsv` is the one place that maps back to the
    # original sheet, its slot, and its grid position.
    stem = asset_name(category)
    num = next_asset_number(outdir, stem)
    covered = sum(b["area"] for b in blobs) / float(w_img * h_img)
    print(f"\n{os.path.basename(path)}")
    print(f"   {source:<6} {note}   {len(blobs)} object(s)   "
          f"{covered*100:.0f}% of sheet is object")

    if len(blobs) == 1 and covered > 0.70:
        print("   ⛔ ONE BLOB COVERING THE WHOLE SHEET — the background probe "
              "almost certainly failed. Do not trust this slice.")
    if args["expect"] and len(blobs) != args["expect"]:
        print(f"   ⚠ EXPECTED {args['expect']} — objects may be touching, or a "
              f"part is missing.")

    pad = args["pad"]
    suspect = 0
    for i, b in enumerate(blobs, 1):
        x0 = max(0, b["x0"] - pad); y0 = max(0, b["y0"] - pad)
        x1 = min(w_img, b["x1"] + 1 + pad); y1 = min(h_img, b["y1"] + 1 + pad)
        out = os.path.join(outdir, f"{stem}_{num + i - 1:03d}.png")
        crop = rgba.crop((x0, y0, x1, y1))
        # ⭐ An alpha-sourced sheet stays RGBA — it is already keyed, and
        # re-keying it later would be the second implementation of one truth.
        crop.save(out) if source == "ALPHA" else crop.convert("RGB").save(out)

        flag = ""
        if b["fill"] < 0.34:
            flag = "  ⚠ LOW FILL — two objects may have merged into one blob"
            suspect += 1
        elif b["aspect"] > 4.5:
            flag = "  ⚠ VERY ELONGATED — a long part, or two joined side by side"
            suspect += 1
        print(f"   {i:02d}  {b['w']:4d}x{b['h']:<4d} fill {b['fill']:.2f} "
              f"aspect {b['aspect']:.1f}  -> {os.path.basename(out)}{flag}")
        manifest.append([
            os.path.basename(out), category, f"sheet{index:02d}", str(i),
            str(b.get("row", 0)), str(b.get("col", 0)), source,
            str(b["w"]), str(b["h"]), f"{b['fill']:.3f}", f"{b['aspect']:.2f}",
            "FLAG" if flag else "", str(len(blobs)), md5, os.path.basename(path),
        ])
    return len(blobs), suspect, source


def slugify(s):
    out = "".join(c.lower() if c.isalnum() else "-" for c in s)
    while "--" in out:
        out = out.replace("--", "-")
    return out.strip("-") or "unsorted"


def gather(paths, root_name):
    """Walk the drop folder recursively; a SUBFOLDER NAME IS THE CATEGORY.

    ⭐ Mac sorts as he generates — `modules/`, `enemy ships/` appeared underneath
    the drop folder mid-run. A non-recursive walk silently processed only the
    top level and reported a confident, wrong count. **The folder structure he
    made by hand IS the classification; read it instead of asking for tags.**
    """
    out = []
    for p in paths:
        if os.path.isfile(p):
            out.append((p, root_name))
            continue
        base = os.path.abspath(p)
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [d for d in sorted(dirnames)
                           if d not in ("sliced", "keyed", "consumed")]
            rel = os.path.relpath(dirpath, base)
            cat = root_name if rel == "." else slugify(rel.replace(os.sep, "-"))
            for n in sorted(filenames):
                if n.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                    out.append((os.path.join(dirpath, n), cat))
    return out


def read_manifest(mpath):
    """md5 -> slice-count, so a re-run only touches sheets it has never seen."""
    done = {}
    if not os.path.exists(mpath):
        return done
    with open(mpath, encoding="utf-8") as fh:
        head = fh.readline().rstrip("\n").split("\t")
        try:
            hi = head.index("md5")
        except ValueError:
            return done
        for line in fh:
            cols = line.rstrip("\n").split("\t")
            if len(cols) > hi:
                done[cols[hi]] = done.get(cols[hi], 0) + 1
    return done


def next_index(catdir):
    """⛔ A NEW DROP MUST NEVER RENUMBER YESTERDAY'S SLICES."""
    hi = 0
    if os.path.isdir(catdir):
        for n in os.listdir(catdir):
            if n.startswith("sheet") and n[5:7].isdigit():
                hi = max(hi, int(n[5:7]))
    return hi + 1


def main():
    args = parse_args(sys.argv[1:])
    if args["colour"]:
        c = args["colour"].lstrip("#")
        args["colour"] = [int(c[i:i + 2], 16) for i in (0, 2, 4)]

    found = gather(args["paths"], args["root_name"])
    if not found:
        sys.exit("no images found")

    first = args["paths"][0]
    root = args["outdir"] or os.path.join(
        first if os.path.isdir(first) else os.path.dirname(first) or ".", "sliced")
    os.makedirs(root, exist_ok=True)
    mpath = os.path.join(root, "manifest.tsv")
    already = read_manifest(mpath)

    # ⭐ SAME BYTE COUNT IS NOT THE SAME FILE. Hash the content, or you will
    # report duplicates that are simply two sheets of equal size.
    seen, queue, dupes, skipped = {}, [], [], []
    for f, cat in found:
        with open(f, "rb") as fh:
            h = hashlib.md5(fh.read()).hexdigest()
        if h in already and not args["redo"]:
            skipped.append(f)
        elif h in seen and not args["keep_dupes"]:
            dupes.append((f, seen[h]))
        else:
            seen.setdefault(h, f)
            queue.append((f, cat, h))

    by_cat = {}
    for _, cat, _ in queue:
        by_cat[cat] = by_cat.get(cat, 0) + 1
    print(f"found {len(found)} image(s) in {len(set(c for _, c in found))} "
          f"category folder(s)")
    if skipped:
        print(f"   {len(skipped)} already sliced (in manifest) — skipped. "
              f"--redo to force")
    if dupes:
        print(f"   {len(dupes)} byte-identical duplicate(s) skipped:")
        for d, orig in dupes:
            print(f"      {os.path.basename(d)}  ==  {os.path.basename(orig)}")
    if not queue:
        print("nothing new to slice.")
        return
    print("   to slice: " + ", ".join(f"{k} {v}" for k, v in sorted(by_cat.items())))

    total = suspect = 0
    by_source = {}
    manifest = []
    counters = {}
    consumed = []
    for f, cat, h in queue:
        catdir = os.path.join(root, cat)
        os.makedirs(catdir, exist_ok=True)
        if cat not in counters:
            counters[cat] = next_index(catdir)
        i = counters[cat]; counters[cat] += 1
        n, s, src = slice_sheet(f, catdir, args, i, manifest, cat, h)
        total += n; suspect += s
        by_source[src] = by_source.get(src, 0) + 1
        # ⛔ CONSUME ONLY ON A RECEIPT. If a sheet produced zero objects the
        # source is KEPT, because deleting it would destroy the only evidence
        # of why the slice failed.
        if args["consume"]:
            if n > 0:
                os.remove(f); consumed.append(f)
            else:
                print("   ⛔ KEPT — produced 0 objects, nothing to consume")

    # ⛔ ONE INDEX, APPENDED NOT REWRITTEN — the mapping from a slice back to the
    # sheet it came from is the only thing that survives deleting the originals.
    fresh = not os.path.exists(mpath)
    with open(mpath, "a", encoding="utf-8") as fh:
        if fresh:
            fh.write("slice\tcategory\tsheet\tslot\trow\tcol\tsource\tw\th\t"
                     "fill\taspect\tflag\tobjects_in_sheet\tmd5\toriginal\n")
        for row in manifest:
            fh.write("\t".join(row) + "\n")
    if consumed:
        print(f"\n🗑 consumed {len(consumed)} source sheet(s) — the drop folder "
              f"now contains only what is UNPROCESSED.")

    print(f"\n{len(queue)} sheet(s) -> {total} object(s) in {root}/  "
          f"({suspect} flagged)")
    print(f"   index: {mpath}")
    print("   sources: " + ", ".join(f"{k} {v}" for k, v in sorted(by_source.items())))
    if by_source.get("COLOUR") or by_source.get("BLACK"):
        print(f"next for the opaque ones:  python3 scripts/key-flat-background.py {root}")
    print("⭐ ALPHA-sourced slices are already transparent — do not key them twice.")
    if suspect:
        print("⛔ re-generate flagged sheets with WIDER GAPS. Do not hand-repair "
              "a merged blob — where the seam went is a guess.")


if __name__ == "__main__":
    main()
