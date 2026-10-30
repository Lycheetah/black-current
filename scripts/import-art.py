#!/usr/bin/env python3
"""Import an art drop: check every PNG under art/cael/<folder>/ and rewrite art/cael/manifest.json.

    python3 scripts/import-art.py            # check and write
    python3 scripts/import-art.py --check    # check only

Folders → kinds (docs/ART_CAEL_BRIEF.md has the ids and the rules):
    sections/<kind>.png   a hull section kind (bridge, spine, plate, deck, drive, utility, heavy, hangar, spinal, ...)
    guns/<gun-id>.png     one gun (rifle-heavy, scatter-light, ...)
    arch/<archetype>.png  every gun of an archetype (cannon, rail, beam, ...)
Each file: PNG with a transparent background, top-down, nose UP, 128-2048 px. Guns and archetypes are square and turn
about their centre unless a sidecar <name>.json gives {"pivot": [x, y], "radius": r} in pixels (radius = turret body).
"""
import json, struct, sys, zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DROP = ROOT / 'art/cael'
KINDS = {'sections': 'section', 'guns': 'gun', 'arch': 'arch'}

def png_info(path):
    data = path.read_bytes()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        return None, 'not a PNG'
    w, h, depth, colour = struct.unpack('>IIBB', data[16:26])
    alpha = colour in (4, 6) or b'tRNS' in data[:4096]
    return (w, h, alpha), None

def main():
    check_only = '--check' in sys.argv
    items, problems = [], []
    for folder, kind in KINDS.items():
        for png in sorted((DROP / folder).glob('*.png')):
            rel = png.relative_to(ROOT).as_posix()
            info, err = png_info(png)
            if err:
                problems.append(f'{rel}: {err}'); continue
            w, h, alpha = info
            if not alpha:
                problems.append(f'{rel}: no transparency (the background must be transparent)')
            if not (128 <= w <= 2048 and 128 <= h <= 2048):
                problems.append(f'{rel}: {w}x{h} is outside 128-2048 px')
            item = {'kind': kind, 'id': png.stem, 'path': rel, 'size': [w, h]}
            if kind in ('gun', 'arch'):
                if w != h:
                    problems.append(f'{rel}: guns are square ({w}x{h})')
                side = png.with_suffix('.json')
                extra = json.loads(side.read_text()) if side.exists() else {}
                item['pivot'] = extra.get('pivot', [w / 2, h / 2])
                item['radius'] = extra.get('radius', round(w * 135 / 418, 1))
            items.append(item)
    for p in problems:
        print('PROBLEM', p)
    print(f'{len(items)} images, {len(problems)} problems')
    if not check_only:
        manifest = {'v': 1, 'note': 'Art drops (js/art-drop.js). Written by scripts/import-art.py; see docs/ART_CAEL_BRIEF.md.', 'items': items}
        (DROP / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
        print('wrote art/cael/manifest.json')
    return 1 if problems else 0

if __name__ == '__main__':
    sys.exit(main())
