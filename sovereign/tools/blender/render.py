"""Studio render of a built model for art review (Cycles, CPU).

    /opt/blender-venv/bin/python tools/blender/render.py src/data/models/green_seed_hero.glb shots/green_seed_studio.png
"""
import math
import sys

import bpy

src, out = sys.argv[1], sys.argv[2]
yaw = float(sys.argv[3]) if len(sys.argv) > 3 else 35
dist = float(sys.argv[4]) if len(sys.argv) > 4 else 1.25
elev = float(sys.argv[5]) if len(sys.argv) > 5 else 0.45
look_name = sys.argv[6] if len(sys.argv) > 6 else 'savanah'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
mn = [min(min((o.matrix_world @ v.co)[i] for v in o.data.vertices) for o in meshes) for i in range(3)]
mx = [max(max((o.matrix_world @ v.co)[i] for v in o.data.vertices) for o in meshes) for i in range(3)]
c = [(a + b) / 2 for a, b in zip(mn, mx)]
size = max(b - a for a, b in zip(mn, mx))

# Studio palette preview: the game swaps these, here they get representative looks.
looks = {'HULL': ((0.09, 0.095, 0.08), 0.6, 0.38), 'TRIM': ((0.03, 0.03, 0.025), 0.7, 0.45), 'GOLD': ((0.85, 0.6, 0.22), 1, 0.25)}
GLOWS = {'savanah': (0.15, 1.0, 0.5), 'blackhole': (1.0, 0.36, 0.06)}
if look_name == 'blackhole':
    looks = {'HULL': ((0.035, 0.042, 0.065), 0.6, 0.36), 'TRIM': ((0.014, 0.014, 0.018), 0.75, 0.42), 'GOLD': ((0.62, 0.3, 0.12), 1, 0.26)}
for m in bpy.data.materials:
    b = m.node_tree.nodes.get('Principled BSDF') if m.use_nodes else None
    if not b:
        continue
    for k, (col, met, rough) in looks.items():
        if m.name.upper().startswith(k):
            b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Metallic'].default_value = met; b.inputs['Roughness'].default_value = rough
    if m.name.upper().startswith('GLOW'):
        b.inputs['Emission Color'].default_value = (*GLOWS[look_name], 1); b.inputs['Emission Strength'].default_value = 12

world = bpy.data.worlds.new('w'); bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.006, 0.007, 0.012, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1

def light(name, kind, loc, energy, color, size_=None):
    d = bpy.data.lights.new(name, kind); d.energy = energy; d.color = color
    if size_ is not None: d.size = size_
    o = bpy.data.objects.new(name, d); o.location = loc; bpy.context.collection.objects.link(o)
    o.rotation_euler = (c[0] - loc[0], 0, 0)
    con = o.constraints.new('TRACK_TO'); tgt = bpy.data.objects.new('t' + name, None); tgt.location = c; bpy.context.collection.objects.link(tgt); con.target = tgt
    return o
light('key', 'AREA', (c[0] + size, c[1] + size * 0.6, c[2] + size * 0.9), (9000 if look_name == 'savanah' else 24000) * (size / 30) ** 2, (1, 0.86, 0.7), size * 0.5)
light('rim', 'AREA', (c[0] - size * 0.8, c[1] - size, c[2] + size * 0.4), 14000 * (size / 30) ** 2, (0.55, 0.5, 1), size * 0.4)
light('fill', 'AREA', (c[0] - size, c[1] + size * 0.4, c[2] - size * 0.3), 2500 * (size / 30) ** 2, (0.4, 0.85, 1), size * 0.6)

cam = bpy.data.cameras.new('cam'); cam.lens = 50
co = bpy.data.objects.new('cam', cam); bpy.context.collection.objects.link(co)
a = math.radians(yaw)
co.location = (c[0] + math.sin(a) * size * dist, c[1] + math.cos(a) * size * dist, c[2] + size * elev * dist / 1.25)
con = co.constraints.new('TRACK_TO'); t = bpy.data.objects.new('ct', None); t.location = c; bpy.context.collection.objects.link(t); con.target = t
bpy.context.scene.camera = co

sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 48; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 1280, 720
sc.view_settings.view_transform = 'AgX'
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print('rendered', out)
