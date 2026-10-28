#!/usr/bin/env python3
"""Compile Black Current into ONE self-contained HTML file: dist/black-current.html

Every css/ and js/ file index.html loads is inlined in load order, and the art the
game actually wears (manifest entries that are usable + mounted, clean copy first)
is embedded as base64 so the file runs from file://, GitHub Pages, or any static
host with no server. Only the Google Fonts links stay external; offline, the
browser falls back to its own fonts and the game still runs.

Run: python3 scripts/build-single.py
"""
import base64, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
html = open('index.html', encoding='utf-8').read()

def strip_v(p): return p.split('?', 1)[0]

def css_inline(m):
    path = strip_v(m.group(1))
    return '<style>/* ' + path + ' */\n' + open(path, encoding='utf-8').read() + '\n</style>'

def safe_js(src):
    # a literal "</script" inside a script would end the tag early
    return src.replace('</script', '<\\/script')

ART_EDGE = 192   # px, longest edge. sprites.js pre-scales every part down to ~30 px
                 # on screen; 192 keeps detail at the closest zoom at ~1/20 the bytes.

def embed(path, edge=ART_EDGE):
    from PIL import Image
    import io
    im = Image.open(path).convert('RGBA')
    im.thumbnail((edge, edge), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

# ---- art: manifest + every image the sprite layer can request ---------------
art, manifest = {}, None
if os.path.exists('art/manifest.json'):
    manifest = json.load(open('art/manifest.json', encoding='utf-8'))
    entries = manifest.get('modules', []) + manifest.get('ships', []) + manifest.get('enemies', [])
    for e in entries:
        if not (e.get('usable') and e.get('mount')): continue
        p = e['path']
        clean = re.sub(r'/([^/]+)$', r'/clean/\1', p)
        # the clean copy is the one the game draws; the marked original only if it is absent
        cand = clean if os.path.exists(clean) else (p if os.path.exists(p) else None)
        if cand and cand not in art: art[cand] = embed(cand)
# World structure sprites are not rotating module-manifest entries.
from pathlib import Path
for structure in Path('art/keyed/structures').glob('*.png'):
    art[str(structure)] = embed(str(structure))
for turret in Path('art/keyed/turrets').glob('*.png'):
    art[str(turret)] = embed(str(turret))
for section in Path('art/keyed/sections').glob('*.png'):
    art[str(section)] = embed(str(section))
faction_kit = None
if Path('art/faction-kit.json').is_file():
    faction_kit = json.loads(Path('art/faction-kit.json').read_text())
    for asset in faction_kit['assets']:
        if not Path(asset['path']).is_file():
            sys.exit('missing selected faction art: ' + asset['path'])
        art[asset['path']] = embed(asset['path'])
art_js = ('window.__ART_MANIFEST = %s;\nwindow.__ART = %s;' % (json.dumps(manifest), json.dumps(art))) if manifest else ''
if faction_kit:
    art_js += '\nwindow.__FACTION_KIT = ' + json.dumps(faction_kit) + ';'
world_kit = None
if Path('art/world-kit.json').is_file():
    world_kit = json.loads(Path('art/world-kit.json').read_text())
    for asset in world_kit['assets']:
        if not Path(asset['path']).is_file():
            sys.exit('missing world art: ' + asset['path'])
        art[asset['path']] = embed(asset['path'], min(1024, max(192, int(asset.get('embed_edge', 192)))))
    art_js = 'window.__ART_MANIFEST = %s;\nwindow.__ART = %s;\nwindow.__FACTION_KIT = %s;\nwindow.__WORLD_KIT = %s;' % (json.dumps(manifest), json.dumps(art), json.dumps(faction_kit), json.dumps(world_kit))


if Path('art/hostile-kit.json').is_file():
    hostile_kit = json.loads(Path('art/hostile-kit.json').read_text())
    for asset in hostile_kit['assets']:
        if not Path(asset['path']).is_file():
            sys.exit('missing hostile art: ' + asset['path'])
        art[asset['path']] = embed(asset['path'], int(asset.get('embed_edge', 1536)))
    art_js = 'window.__ART_MANIFEST = %s;\nwindow.__ART = %s;\nwindow.__FACTION_KIT = %s;\nwindow.__WORLD_KIT = %s;\nwindow.__HOSTILE_KIT = %s;' % (json.dumps(manifest), json.dumps(art), json.dumps(faction_kit), json.dumps(world_kit), json.dumps(hostile_kit))

def patch_sprites(src):
    # manifest from the embed instead of fetch(); images from data URIs
    a = "const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });"
    b = "const res = window.__ART_MANIFEST ? { ok: true, json: async () => window.__ART_MANIFEST } : await fetch(MANIFEST_URL, { cache: 'no-cache' });"
    assert a in src, 'sprites.js fetch line moved: update build-single.py'
    src = src.replace(a, b)
    a = "img.src = p;"
    b = "img.src = (window.__ART && (window.__ART[p] || window.__ART[entry.path])) || p;"
    assert a in src, 'sprites.js img.src line moved: update build-single.py'
    return src.replace(a, b)

first_js = [True]
def js_inline(m):
    path = strip_v(m.group(1))
    if not os.path.exists(path):
        # index.html names it but the file is absent: the served game 404s it too
        print('skip (missing, 404s when served too):', path)
        return '<!-- ' + path + ' missing at build -->'
    src = open(path, encoding='utf-8').read()
    if path == 'js/sprites.js': src = patch_sprites(src)
    pre = ''
    if first_js[0] and art_js:
        pre = '<script>/* embedded art */\n' + safe_js(art_js) + '\n</script>\n  '
        first_js[0] = False
    return pre + '<script>/* ' + path + ' */\n' + safe_js(src) + '\n</script>'

# drop commented-out tags first so a dead <script> inside <!-- --> is not revived
html = re.sub(r'<!--(?:(?!-->).)*?(?:src|href)="(?:js|css)/(?:(?!-->).)*?-->', '', html, flags=re.S)
out = re.sub(r'<link[^>]*rel="stylesheet"[^>]*href="(css/[^"]+)"[^>]*>', css_inline, html)
out = re.sub(r'<link[^>]*href="(css/[^"]+)"[^>]*rel="stylesheet"[^>]*>', css_inline, out)
out = re.sub(r'<script src="(js/[^"]+)"></script>', js_inline, out)

left = re.findall(r'(?:src|href)="((?:js|css|art)/[^"]+)"', out)
if left: sys.exit('not inlined: %s' % left)

os.makedirs('dist', exist_ok=True)
open('dist/black-current.html', 'w', encoding='utf-8').write(out)
print('dist/black-current.html  %.1f MB  (%d art images embedded)' % (os.path.getsize('dist/black-current.html') / 1e6, len(art)))
