#!/usr/bin/env python3
"""STRIP A SURVIVING MOUNT MARKER FROM THE `clean/` COPIES — AT THE MOUNT ONLY.

⛔ PURE GREEN #00FF00 IS THE MACHINE-READABLE MOUNT MARKER. It is painted on
   every module sprite so `extract-node-points.py` can find where the part bolts
   on by a colour match and a flood fill, with no model and no tracing. It must
   never survive into a drawn frame.

MEASURED 2026-08-17. `extract-node-points.py` writes the marker-free `clean/`
copies, and three of the 100 drawable sprites came out with the dot still on
them — `module_070` (293 px across 4 blobs), `module_089` (148 px),
`module_079` (147 px). At gain 1.85 that is a bright green blob on the hull.

⭐⭐ THE MANIFEST ALREADY KNOWS WHERE THE DOT IS. `mount` (u, v) and `mountR`
   were MEASURED from the marker itself. So this strips green **inside a disc at
   the recorded mount and nowhere else.** That is the whole safety argument:

🔴 THE FIRST VERSION OF THIS SCRIPT SWEPT THE WHOLE BITMAP, and that was wrong
   for a reason the art itself proved. `module_070` is built around a glowing
   GREEN reactor, and the engine's own signature green `#39ff14` — thruster
   flare, homing rounds, Bio Emerald — sits inside any green-detection band wide
   enough to catch a marker. **A whole-bitmap sweep cannot tell a marker from a
   running light; a mount-local sweep never has to.** The earlier pass removed
   at most 66 px from any one file and did no visible damage (verified against
   the originals in `shots/sprites/JUDGE_strip_safety.png`), but the rule was
   unsound and this replaces it.

⛔ WRITES ONLY INTO `art/keyed/*/clean/`. Originals are never modified, and the
   whole directory is regenerable with `extract-node-points.py`.

    python3 scripts/strip-residual-markers.py          # report only
    python3 scripts/strip-residual-markers.py --write  # apply
"""
import json
import os
import sys

import numpy as np
from PIL import Image

MANIFEST = 'art/manifest.json'
NODE_TYPES = {'cannon', 'pod', 'spike', 'shield', 'thruster'}
RADIUS_SLACK = 1.7    # the marker's own radius, plus its anti-aliased fringe
MIN_R_PX = 8

WRITE = '--write' in sys.argv


def green_dominant(a):
    """Wide enough to catch a marker at any anti-aliased edge. Safe ONLY because
    it is applied inside the mount disc."""
    r, g, b, al = (a[..., 0].astype(int), a[..., 1].astype(int),
                   a[..., 2].astype(int), a[..., 3].astype(int))
    return (al > 40) & (g > 120) & (g > r + 55) & (g > b + 55)


def main():
    man = json.load(open(MANIFEST))
    entries = [e for k in ('modules', 'ships', 'enemies') for e in man.get(k, [])
               if e.get('usable') and e['type'] in NODE_TYPES]
    print(f'drawable-on-a-node sprites: {len(entries)}')

    hit = 0
    for e in entries:
        p = os.path.join(os.path.dirname(e['path']), 'clean', e['file'])
        if not os.path.exists(p):
            print(f'  ⚠ no clean/ copy: {e["file"]}')
            continue
        im = Image.open(p).convert('RGBA')
        a = np.asarray(im)
        H, W = a.shape[:2]

        mu, mv = e['mount']
        cx, cy = mu * W, mv * H
        rad = max(MIN_R_PX, (e.get('mountR') or 0.035) * max(W, H) * RADIUS_SLACK)
        yy, xx = np.ogrid[:H, :W]
        disc = ((xx - cx) ** 2 + (yy - cy) ** 2) <= rad ** 2

        bad = green_dominant(a) & disc
        n = int(bad.sum())
        if n < 8:
            continue
        hit += 1
        print(f'  ✂ {e["file"]:<18} {e["type"]:<9} {n:>5} px inside r={rad:.0f} '
              f'at mount ({cx:.0f},{cy:.0f})')
        if WRITE:
            out = a.copy()
            out[bad, 3] = 0      # the marker occluded whatever was under it anyway
            Image.fromarray(out, 'RGBA').save(p)

    print(f'\n{"APPLIED" if WRITE else "DRY RUN"}: {hit} file(s) carried a '
          f'surviving marker at the recorded mount')
    if not WRITE and hit:
        print('re-run with --write to apply')


if __name__ == '__main__':
    main()
