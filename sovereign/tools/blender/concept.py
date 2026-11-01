"""Concept sheet renders: blockout variants as black silhouettes (top, side) and a clay 3/4 view.

    /opt/blender-venv/bin/python tools/blender/concept.py gravity_fang

Writes shots/concepts/<ship>/<variant>-{top,side,clay}.png and a sheet.html to screenshot.
"""
import importlib.util
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import shipkit  # noqa: E402

ship = sys.argv[1]
spec = importlib.util.spec_from_file_location(ship, os.path.join(HERE, 'concepts', ship + '.py'))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
out = os.path.join(ROOT, 'shots', 'concepts', ship)
os.makedirs(out, exist_ok=True)


def mats():
    return {
        # Clay values: light enough to read form; the real navy/black paint comes with the material pass.
        'HULL': shipkit.material('HULL', (0.36, 0.37, 0.4), 0.1, 0.55),
        'TRIM': shipkit.material('TRIM', (0.16, 0.17, 0.2), 0.2, 0.5),
        'CORE': shipkit.material('CORE', (0.0, 0.0, 0.0), 0.0, 0.2),
        'FIRE': shipkit.material('FIRE', (1.0, 0.35, 0.05), 0.0, 0.5, emit=(1.0, 0.38, 0.06)),
    }


def bounds():
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in meshes:
        e = o.evaluated_get(dg)
        pts += [e.matrix_world @ v.co for v in e.data.vertices]
    mn = Vector([min(p[i] for p in pts) for i in range(3)])
    mx = Vector([max(p[i] for p in pts) for i in range(3)])
    return mn, mx


def camera(loc, look, ortho=None, lens=50):
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    bpy.context.collection.objects.link(cam)
    cam.location = loc
    d = Vector(look) - Vector(loc)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    if ortho:
        cam.data.type = 'ORTHO'
        cam.data.ortho_scale = ortho
    cam.data.lens = lens
    cam.data.clip_end = 200000
    bpy.context.scene.camera = cam
    return cam


def setup(silhouette, size=30.0):
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    s.cycles.device = 'CPU'
    s.cycles.samples = 4 if silhouette else 48
    s.cycles.use_denoising = not silhouette
    s.render.resolution_x, s.render.resolution_y = (700, 700) if silhouette else (1000, 640)
    w = bpy.data.worlds.new('w')
    s.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.92, 0.92, 0.9, 1) if silhouette else (0.035, 0.04, 0.05, 1)
    bg.inputs['Strength'].default_value = 1.0
    s.view_settings.view_transform = 'Standard' if silhouette else 'AgX'
    if silhouette:
        black = bpy.data.materials.new('SIL')
        black.use_nodes = True
        b = black.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (0, 0, 0, 1)
        b.inputs['Roughness'].default_value = 1
        b.inputs['Specular IOR Level'].default_value = 0
        for o in s.objects:
            if o.type == 'MESH':
                o.data.materials.clear()
                o.data.materials.append(black)
    else:
        k = max(1.0, size / 34.0)
        for name, loc, power, col in (('key', (30, 25, 30), 30000, (1, 0.9, 0.8)), ('rim', (-35, -30, 12), 22000, (0.55, 0.65, 1)), ('fill', (-10, 30, -20), 6000, (0.6, 0.7, 1))):
            li = bpy.data.objects.new(name, bpy.data.lights.new(name, 'AREA'))
            li.data.energy = power * k * k
            li.data.size = 12 * k
            loc = tuple(c * k for c in loc)
            li.data.color = col
            li.location = loc
            li.rotation_euler = (-Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
            s.collection.objects.link(li)


def scale_to(length):
    """Scale the blockout so its hull is `length` metres long (designs are drawn in loose units)."""
    mn, mx = bounds()
    f = length / (mx.y - mn.y)
    for o in bpy.context.scene.objects:
        if o.parent is None:
            o.location = o.location * f
            o.scale = o.scale * f
    bpy.context.view_layer.update()
    return f


def scale_cues(length, skip=('core', 'singularity', 'star', 'fire', 'glow', 'ring', 'lip', 'claw_seam')):
    """Scale cues in real metres: rows of 2 m lit windows cast onto the hull flanks, and running lights
    along the spine. Their density is what makes a big hull read as big."""
    import bmesh as _bm
    import random
    rnd = random.Random(7)
    dg = bpy.context.evaluated_depsgraph_get()
    mn, mx = bounds()
    win = shipkit.material('WINDOW_WARM', (0.05, 0.04, 0.03), 0.0, 0.6, emit=(1.0, 0.72, 0.38))
    lamp = shipkit.material('LAMP', (0.05, 0.05, 0.05), 0.0, 0.5, emit=(1.0, 0.95, 0.85))
    bm, bl = _bm.new(), _bm.new()
    h = mx.z - mn.z
    step = 5.0
    y = mn.y + step
    count = 0
    while y < mx.y - step:
        for side in (-1, 1):
            for frac in (-0.12, 0.02, 0.16):
                if rnd.random() < 0.28:
                    continue
                z = (mn.z + mx.z) / 2 + frac * h
                o = Vector((side * (abs(mx.x) + abs(mn.x) + 50), y, z))
                hit, loc, nrm, _, ob, _ = bpy.context.scene.ray_cast(dg, o, Vector((-side, 0, 0)))
                if not hit or any(k in ob.name.lower() for k in skip) or abs(nrm.x) < 0.5:
                    continue
                c = loc + nrm * 0.15
                g = _bm.ops.create_cube(bm, size=1.0)
                for v in g['verts']:
                    v.co = Vector((c.x + v.co.x * 0.3, c.y + v.co.y * 2.0, c.z + v.co.z * 1.2))
                count += 1
        y += step
    # Running lights along the spine every 25 m.
    y = mn.y + 10
    while y < mx.y - 10:
        hit, loc, nrm, _, ob, _ = bpy.context.scene.ray_cast(dg, Vector((0, y, mx.z + 50)), Vector((0, 0, -1)))
        if hit and not any(k in ob.name.lower() for k in skip):
            g = _bm.ops.create_uvsphere(bl, u_segments=8, v_segments=4, radius=0.9)
            for v in g['verts']:
                v.co += loc + nrm * 0.5
        y += 25
    for name, b, m in (('scale_windows', bm, win), ('scale_lamps', bl, lamp)):
        me = bpy.data.meshes.new(name)
        b.to_mesh(me)
        b.free()
        ob = bpy.data.objects.new(name, me)
        ob.data.materials.append(m)
        bpy.context.collection.objects.link(ob)
    return count


def add_reference(at_x, at_z):
    """The Gravity Fang (60 m) beside the ship as a scale figure."""
    ref = os.path.join(HERE, 'out', 'gravity_fang_hero.raw.glb')
    if not os.path.exists(ref):
        return
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=ref)
    new = [o for o in bpy.context.scene.objects if o not in before]
    for o in new:
        if o.parent is None:
            o.location = Vector((at_x, 0, at_z))


def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


for name, fn in mod.VARIANTS.items():
    for view in ('top', 'side', 'clay'):
        shipkit.reset()
        shipkit._mats.clear()
        fn(shipkit, mats())
        real = getattr(mod, 'REAL_LENGTH', None)
        if real:
            scale_to(real)
        shipkit.finish()
        if real:
            n = scale_cues(real)
            print(name, view, 'scale cues', n, 'windows')
        mn, mx = bounds()
        if real and view == 'side':
            add_reference(0, mn.z - 40)
            mn, mx = bounds()
        c = (mn + mx) / 2
        size = max(mx - mn) * 1.15
        if view == 'top':
            camera((c.x, c.y, c.z + 200), c, ortho=size)
        elif view == 'side':
            camera((c.x + 200, c.y, c.z), c, ortho=size)
        else:
            d = size * 1.25
            camera((c.x + d * 0.75, c.y + d * 0.85, c.z + d * 0.45), c, lens=50)
        setup(view != 'clay', size)
        render(os.path.join(out, f'{name}-{view}.png'))
        print('rendered', name, view)

cards = ''.join(f'''<section><h2>{n.replace('_', ' ', 1).replace('_', ' ').upper()}</h2>
<div class="row"><img src="{n}-top.png"><img src="{n}-side.png"></div><img class="clay" src="{n}-clay.png"></section>''' for n in mod.VARIANTS)
bar = getattr(mod, 'EVE_BAR', None)
table = ''
if bar:
    col = {'PASS': '#6dffb0', 'WEAK': '#ffc56b', 'FAIL': '#ff6a5a'}
    head = ''.join(f'<th>{n.split("_", 1)[0]}</th>' for n in mod.VARIANTS)
    rows = ''.join(f'<tr><td><b>{c}</b><small>{d}</small></td>' + ''.join(
        f'<td style="color:{col[bar["scores"][n][i][0]]}">{bar["scores"][n][i][0]}<small>{bar["scores"][n][i][1]}</small></td>' for n in mod.VARIANTS) + '</tr>'
        for i, (c, d) in enumerate(bar['criteria']))
    table = f'<div class="bar"><h2>THE EVE BAR · EVERY SHIP IS MEASURED AGAINST EVE</h2><table><tr><th></th>{head}</tr>{rows}</table></div>'
open(os.path.join(out, 'sheet.html'), 'w').write(f'''<!doctype html><meta charset="utf-8"><style>
body{{margin:0;background:#07090d;color:#d8f4ff;font:13px sans-serif;letter-spacing:.08em}}
header{{padding:18px 24px;border-bottom:1px solid #1d3540}} h1{{margin:0;font-weight:400;letter-spacing:.35em;color:#ffb35a}}
p{{opacity:.75;max-width:1200px}} main{{display:flex;gap:18px;padding:18px}} section{{flex:1}}
h2{{font-weight:400;letter-spacing:.3em;color:#65f5ff;font-size:14px}} .row{{display:flex;gap:6px}} .row img{{width:50%;background:#ebebe6}}
img{{display:block;width:100%}} .clay{{margin-top:6px}}
.bar{{padding:0 18px 24px}} table{{width:100%;border-collapse:collapse}} td,th{{padding:7px 10px;border-bottom:1px solid #1d3540;text-align:left;font-weight:400}} th{{color:#65f5ff;letter-spacing:.3em}} small{{display:block;opacity:.6;font-size:11px;margin-top:2px;color:#d8f4ff}}</style>
<header><h1>{mod.__doc__.strip().splitlines()[0].upper()}</h1>
<p>Three directions in the Blackhole family. Top and side are pure silhouettes (does it read as one shape at a glance?); below is clay with the orange fire seams. Pick one, mix parts, or redirect.{' Side view: the small shape below is the Gravity Fang (60 m) for scale. Lit dots are 2 m windows.' if getattr(mod, 'REAL_LENGTH', None) else ''}</p></header>
<main>{cards}</main>{table}''')
print('sheet', os.path.join(out, 'sheet.html'))
