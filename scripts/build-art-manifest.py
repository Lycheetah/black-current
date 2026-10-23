#!/usr/bin/env python3
"""
BUILD ART MANIFEST  —  268 keyed PNGs  ->  one file the game can actually read

    python3 scripts/build-art-manifest.py
    python3 scripts/build-art-manifest.py --dir art/keyed/modules --kind module

WHY THIS EXISTS
---------------
🔴 MEASURED 2026-08-17: `art/keyed/` holds 268 finished, keyed sprites — 215
   modules, 36 ships, 17 enemies — and `ctx.drawImage` appears NOWHERE in `js/`.
   Every one of them is unreachable by the running game. The gap was never the
   art. It was that nothing NAMED the art.

`extract-node-points.py` already solves the hard half: it finds the reserved
🟢 `#00FF00` mount dot and reports it. What it emits is a human-readable report
in *game* units derived from an assumed scale. A renderer needs something else:
**where the mount sits inside the bitmap, as a fraction of the bitmap** — which
survives any scale the game later chooses. That is what this writes.

⭐ THE MOUNT DOT IS THE PIVOT, NOT THE CENTRE. A turret rotates about the point
   where it bolts to the hull, not about the middle of its own picture. Drawing
   these centred would make every gun swing like a propeller. Storing `mount`
   as a normalised (u, v) is what makes `drawImage` able to place a 300px
   painting onto an 8px node and still have the barrel come out of the socket.

⚖ ONE TRUTH, AND MAC'S EDITS SURVIVE
------------------------------------
Geometry is MEASURED from the pixels every run. `type` is AUTHORED — a machine
cannot see that a barrel is a cannon and a capsule is a pod. So:

  * an existing `art/manifest.json` is read first, and every `type` in it is
    carried forward verbatim;
  * only geometry is overwritten;
  * anything new arrives as `"unclassified"` and is listed at the end.

⛔ THIS MEANS THE MANIFEST IS AN AUTHORED FILE. Re-running never destroys a
   classification. Do not "regenerate it clean" to tidy up — that throws away
   the only part a person had to supply.

⚠ WHAT IT CANNOT DO. It cannot classify. It cannot tell a shield ring from a
   thruster bell. It reports what it measured and flags what it could not.
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

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(REPO, "art", "manifest.json")

# Same reserved colour and tolerance as extract-node-points.py. ⛔ If you change
# one, change both — they are reading the same dots for the same reason.
GREEN = np.array([0, 255, 0], dtype=np.float32)
GREEN_TOL = 110.0
MIN_PX = 12

VALID_TYPES = ("core", "cannon", "pod", "spike", "thruster", "shield", "unclassified")

# ---------------------------------------------------------------------------
# SEED CLASSIFICATION — read off the contact sheets by eye, 2026-08-17.
#
# ⚠ THIS IS A SEED, NOT A TRUTH. It exists so the first run produces a game you
#   can look at instead of an empty table. Every value here is overridden the
#   moment `art/manifest.json` exists and carries a different one, so correcting
#   a wrong call is an edit to the manifest — never an edit to this dict.
#
# Read from `art/contact_modules_1.png` (001-092) and `_2.png` (093-172).
# 173-228 are unread here and arrive as "unclassified" on purpose: guessing at
# art nobody has looked at is exactly the failure this file is meant to avoid.
# ---------------------------------------------------------------------------
SEED = {}


def _seed(kind, nums):
    for n in nums:
        SEED["module_%03d.png" % n] = kind


# Barrels, launchers, gatlings, turrets — anything whose silhouette is a gun.
_seed("cannon", [
    1, 2, 3, 4, 5, 6, 7, 8, 11, 23, 24, 28, 29, 30, 31, 32, 33, 34, 35, 36,
    37, 38, 39, 40, 43, 60, 61, 62, 63, 65, 66, 67, 68, 71, 72, 73, 74, 75,
    76, 77, 78, 81, 82, 117, 118, 119, 122, 123, 127, 165, 166, 167, 168,
    170, 171,
])
# Capsules, spheres, cell grids, magazine blocks — mass and hit points.
_seed("pod", [25, 26, 44, 45, 46, 47, 49, 50, 51, 53, 54, 55, 56, 58, 59, 84,
              85, 91, 121, 125, 126, 130, 132, 169])
# Rings, orbs, dishes, halos — anything that reads as a projected field.
_seed("shield", [9, 10, 52, 57, 90, 131])
# Nozzles, bells, flame plumes.
_seed("thruster", [64, 69, 88, 89, 129])
# Points, claws, drills, spires — things that hurt by touching.
_seed("spike", [41, 42, 48, 70, 79, 83, 86, 87, 124, 128, 172])
# ⭐⭐ 093-100 CARRY SEVERAL DOTS EACH. A module has exactly one mount; several
#    sockets means it is a HULL, not a part. The extractor's own rule caught
#    these before any eye did.
#
# 🔴 AND THEN I FILED THEM AS `core` ANYWAY — 2026-08-17. Having correctly
#    reasoned "this is a ship, not a part", I put them in the bucket that every
#    hull's core node draws from. Mac launched the game and found his frigate
#    was four complete purple ships chained nose-to-tail:
#    *"some of the ships youve connected modules to ships what the fuck"*.
#
# ⛔ THE DIAGNOSIS WAS RIGHT AND THE ACTION CONTRADICTED IT. `ship` is the type;
#    it is not in VALID_TYPES for modules, so they are never bucketed as parts.
#    A CORE NODE WEARS NO SPRITE — the procedural membrane draws the hull body
#    that the painted modules bolt onto. There is no core art and inventing one
#    out of a ship is what caused this.
#
# ⚖ CENSUS BEFORE CORRECTION, 2026-08-17. Mac found ONE instance by playing. So
#    the same rule was then run over all 100 drawable sprites instead of the
#    eight already known: count separated green blobs in each ORIGINAL. It found
#    **092** — five sockets on a swept-wing body with no green paint anywhere —
#    still filed `spike` and still being bolted onto hulls as a part. Fixing only
#    what the user saw would have left it there.
#
# ⚠ AND THE SAME PASS PRODUCED A FALSE POSITIVE WORTH KEEPING IN MIND: **070**
#    also shows four green blobs, but it is a cannon built around a glowing GREEN
#    REACTOR. Blob COUNT alone cannot separate a socket from a running light —
#    the render at `shots/sprites/JUDGE_mount_truth.png` did. 070 stays a part.
_seed("ship", [92, 93, 94, 95, 96, 97, 98, 99, 100])


def find_blobs(mask):
    """Connected components over the green mask. Same flood fill as the
    extractor — deliberately, so the two tools can never disagree about what
    counts as a marker."""
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
        if len(pts) < MIN_PX:
            continue
        arr = np.array(pts, dtype=np.float32)
        blobs.append({
            "cx": float(arr[:, 1].mean()),
            "cy": float(arr[:, 0].mean()),
            "r": float(np.sqrt(len(pts) / np.pi)),
            "px": len(pts),
        })
    return blobs


def measure(path):
    img = Image.open(path).convert("RGBA")
    W, H = img.size
    arr = np.asarray(img).astype(np.float32)
    rgb, alpha = arr[..., :3], arr[..., 3]

    dist = np.sqrt(((rgb - GREEN) ** 2).sum(axis=2))
    green = (dist < GREEN_TOL) & (alpha > 64)
    body = alpha > 64
    if not body.any():
        return {"error": "fully transparent"}

    blobs = sorted(find_blobs(green), key=lambda b: -b["px"])

    # 🔴 THE BOUNDING BOX INCLUDES THE MARKERS, ON PURPOSE. They are painted ON
    #    the art, so excluding them punches holes in the mask being measured —
    #    the exact bug extract-node-points.py documents. A dot hanging off the
    #    edge inflates the box instead; that is visible in `art` and is an
    #    artwork fix, not a code fix.
    ys, xs = np.nonzero(body)
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())

    out = {
        "px": [W, H],
        # opaque bounds inside the bitmap, so the renderer can trim dead margin
        "box": [x0, y0, x1 - x0 + 1, y1 - y0 + 1],
        "mounts": len(blobs),
    }
    if blobs:
        b = blobs[0]
        # ⭐ NORMALISED TO THE FULL BITMAP, not to the box. `drawImage` addresses
        #    source pixels in bitmap space, so a fraction of the bitmap is the
        #    one number that needs no further arithmetic at draw time.
        out["mount"] = [round(b["cx"] / W, 5), round(b["cy"] / H, 5)]
        out["mountR"] = round(b["r"] / max(W, H), 5)
    return out


def main():
    argv = sys.argv[1:]
    dirs = [("module", "art/keyed/modules"),
            ("ship", "art/keyed/ships"),
            ("enemy", "art/keyed/enemy-ships")]
    if "--dir" in argv:
        d = argv[argv.index("--dir") + 1]
        k = argv[argv.index("--kind") + 1] if "--kind" in argv else "module"
        dirs = [(k, d)]

    prior = {}
    if os.path.exists(MANIFEST):
        with open(MANIFEST) as f:
            old = json.load(f)
        for kind in ("modules", "ships", "enemies"):
            for e in old.get(kind, []):
                prior[e["file"]] = e.get("type", "unclassified")
        print(f"carrying forward {len(prior)} authored type(s) from {MANIFEST}")

    manifest = {
        "version": 1,
        "note": ("Geometry is MEASURED by scripts/build-art-manifest.py and is "
                 "overwritten every run. `type` is AUTHORED and is carried "
                 "forward verbatim — edit it HERE, never in the script."),
        "mountIsPivot": True,
        "modules": [], "ships": [], "enemies": [],
    }
    key = {"module": "modules", "ship": "ships", "enemy": "enemies"}

    unclassified, nomount = [], []
    for kind, rel in dirs:
        d = os.path.join(REPO, rel)
        if not os.path.isdir(d):
            print(f"  ! {rel} missing, skipped")
            continue
        names = sorted(n for n in os.listdir(d) if n.lower().endswith(".png"))
        for n in names:
            geo = measure(os.path.join(d, n))
            if "error" in geo:
                print(f"  ✘ {n}: {geo['error']}")
                continue
            # prior wins, then the seed, then honest ignorance
            t = prior.get(n) or SEED.get(n) or ("ship" if kind != "module" else "unclassified")
            if t not in VALID_TYPES and kind == "module":
                t = "unclassified"
            entry = {"file": n, "path": rel + "/" + n, "type": t}
            entry.update(geo)
            # ⚠ A part with no mount dot CANNOT be placed on a node. It is kept
            #   in the manifest so it is visible as pending art rather than
            #   silently dropped, and `usable` is what the game filters on.
            entry["usable"] = bool(geo.get("mount")) and t != "unclassified"
            manifest[key[kind]].append(entry)
            if t == "unclassified":
                unclassified.append(n)
            if not geo.get("mount"):
                nomount.append(n)

    with open(MANIFEST, "w") as f:
        json.dump(manifest, f, indent=1)

    tot = sum(len(manifest[k]) for k in ("modules", "ships", "enemies"))
    usable = sum(1 for k in ("modules", "ships", "enemies")
                 for e in manifest[k] if e["usable"])
    print(f"\nwrote {MANIFEST}")
    print(f"  {tot} sprite(s) measured, {usable} USABLE in game today")
    print(f"  {len(manifest['modules'])} modules  "
          f"{len(manifest['ships'])} ships  {len(manifest['enemies'])} enemies")
    if nomount:
        print(f"\n  ⚠ {len(nomount)} file(s) carry NO 🟢 mount dot and cannot be "
              f"placed on a node.\n    Regenerate them with a marker, or drop them: "
              + " ".join(x.replace("module_", "").replace(".png", "") for x in nomount[:40])
              + (" ..." if len(nomount) > 40 else ""))
    if unclassified:
        print(f"\n  ⚠ {len(unclassified)} file(s) UNCLASSIFIED — set `type` in "
              f"art/manifest.json:\n    "
              + " ".join(x.replace("module_", "").replace(".png", "") for x in unclassified[:40])
              + (" ..." if len(unclassified) > 40 else ""))


if __name__ == "__main__":
    main()
