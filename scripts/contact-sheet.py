#!/usr/bin/env python3
"""
BUILD A CONTACT SHEET SO A SLICE CAN ACTUALLY BE LOOKED AT

    python3 scripts/contact-sheet.py art/sliced --out art/contact.png
    python3 scripts/contact-sheet.py art/sliced --tile 260 --cols 10 --page 100

⛔ NEVER JUDGE A COMPOSITION YOU HAVE NOT RENDERED. A slicer reporting "206
objects" is reporting arithmetic, not art. Whether object 03 is a gunboat or two
gunboats welded together is a question only the eye answers, and it cannot answer
it 206 times through a file listing.

⭐ TRANSPARENCY IS INVISIBLE AGAINST THE WRONG GROUND. A cut-out hull composited
onto white looks like a hull; onto black it looks like nothing at all, and half
these sheets ARE black. Everything is drawn on a mid-grey checker so both a dark
hull and a bright one stay readable, and so a FAILED cut shows up as a hard
rectangle of background instead of blending in.

⚠ Pages exist because a 206-tile sheet shrinks each tile past the point of
judgement. Crop and upscale before ruling on a small panel.
"""

import sys
import os

from PIL import Image, ImageDraw

try:
    from PIL import ImageFont
    FONT = ImageFont.load_default()
except Exception:
    FONT = None


def parse_args(argv):
    a = {"indir": None, "out": None, "tile": 240, "cols": 0, "page": 0, "label": True}
    i = 0
    while i < len(argv):
        t = argv[i]
        if t == "--out":
            i += 1; a["out"] = argv[i]
        elif t == "--tile":
            i += 1; a["tile"] = int(argv[i])
        elif t == "--cols":
            i += 1; a["cols"] = int(argv[i])
        elif t == "--page":
            i += 1; a["page"] = int(argv[i])
        elif t == "--no-label":
            a["label"] = False
        elif t.startswith("--"):
            sys.exit(f"unknown flag: {t}")
        else:
            a["indir"] = t
        i += 1
    if not a["indir"]:
        sys.exit(__doc__)
    return a


def checker(w, h, size=16, a=(96, 96, 104), b=(126, 126, 134)):
    img = Image.new("RGB", (w, h), a)
    d = ImageDraw.Draw(img)
    for y in range(0, h, size):
        for x in range(0, w, size):
            if ((x // size) + (y // size)) % 2:
                d.rectangle([x, y, x + size - 1, y + size - 1], fill=b)
    return img


def build(files, out, tile, cols, label):
    n = len(files)
    cols = cols or max(1, int(n ** 0.5 * 1.3))
    rows = (n + cols - 1) // cols
    lab = 14 if label else 0
    cell = tile + lab
    sheet = checker(cols * tile, rows * cell)
    d = ImageDraw.Draw(sheet)

    for i, f in enumerate(files):
        cx, cy = (i % cols) * tile, (i // cols) * cell
        try:
            im = Image.open(f).convert("RGBA")
        except Exception:
            continue
        im.thumbnail((tile - 8, tile - 8 - lab), Image.LANCZOS)
        ox = cx + (tile - im.width) // 2
        oy = cy + (tile - lab - im.height) // 2
        sheet.paste(im, (ox, oy), im)
        d.rectangle([cx, cy, cx + tile - 1, cy + cell - 1], outline=(40, 40, 46))
        if label:
            name = os.path.splitext(os.path.basename(f))[0]
            d.rectangle([cx, cy + tile, cx + tile - 1, cy + cell - 1], fill=(24, 24, 28))
            d.text((cx + 4, cy + tile + 2), name[-22:], fill=(210, 210, 220), font=FONT)
    sheet.save(out)
    return sheet.size, rows, cols


def main():
    a = parse_args(sys.argv[1:])
    files = sorted(os.path.join(a["indir"], n) for n in os.listdir(a["indir"])
                   if n.lower().endswith(".png"))
    if not files:
        sys.exit("no PNGs found")

    out = a["out"] or os.path.join(a["indir"], "contact.png")
    per = a["page"] or len(files)
    pages = (len(files) + per - 1) // per
    for p in range(pages):
        chunk = files[p * per:(p + 1) * per]
        path = out if pages == 1 else out.replace(".png", f"_{p + 1}.png")
        size, rows, cols = build(chunk, path, a["tile"], a["cols"], a["label"])
        print(f"{path}  {len(chunk)} tiles  {cols}x{rows}  {size[0]}x{size[1]}px")


if __name__ == "__main__":
    main()
