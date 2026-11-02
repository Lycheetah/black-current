"""Studio contact sheet of the turret set, assembled as the game mounts them (barrels placed, pitch raised).

    /opt/blender-venv/bin/python tools/blender/turret_preview.py shots/hero2/turrets.png
"""
import math
import sys

import bpy
from mathutils import Vector

out = sys.argv[1]
FAMS = ('cannon', 'rail', 'beam', 'plasma', 'launcher')
COUNT = {'cannon': 3, 'rail': 2, 'beam': 1, 'plasma': 2, 'launcher': 0}
SPREAD = {'cannon': 0.34, 'rail': 0.62, 'beam': 0, 'plasma': 0.56}
PITCH = Vector((0, 0.55, 0.55))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='tools/blender/out/turrets.raw.glb')
obs = {o.name: o for o in bpy.context.scene.objects if o.type == 'MESH'}
elev = math.radians(14)
for i, fam in enumerate(FAMS):
    X = (i % 3) * 5.0
    Yo = -(i // 3) * 6.0
    base, yaw, pitch = obs.get(f'TUR_{fam}_BASE'), obs.get(f'TUR_{fam}_YAW'), obs.get(f'TUR_{fam}_PITCH')
    turn = math.radians(-25 + i * 12)
    root = bpy.data.objects.new('root_' + fam, None); bpy.context.collection.objects.link(root)
    root.location = (X, Yo, 0)
    for o in (base,):
        o.parent = None; o.location = (0, 0, 0); o.rotation_euler = (0, 0, 0); o.parent = root
    yr = bpy.data.objects.new('yaw_' + fam, None); bpy.context.collection.objects.link(yr)
    yr.parent = root; yr.location = (0, 0, 0.25); yr.rotation_euler = (0, 0, turn)
    yaw.location = (0, 0, 0); yaw.rotation_euler = (0, 0, 0); yaw.parent = yr
    pr = bpy.data.objects.new('pitch_' + fam, None); bpy.context.collection.objects.link(pr)
    pr.parent = yr; pr.location = (0, 0.55, 0.30); pr.rotation_euler = (elev, 0, 0)
    pitch.location = (0, 0, 0); pitch.rotation_euler = (0, 0, 0); pitch.parent = pr
    bar = obs.get(f'TUR_{fam}_BARREL')
    n = COUNT[fam]
    for j in range(n):
        b = bar if j == 0 else bar.copy()
        if j:
            bpy.context.collection.objects.link(b)
        b.parent = pr
        b.rotation_euler = (0, 0, 0)
        b.location = ((j - (n - 1) / 2) * SPREAD[fam], 0, 0)
    if bar and n == 0:
        bar.hide_render = True

looks = {'HULL': ((0.035, 0.042, 0.065), 0.6, 0.36), 'TRIM': ((0.014, 0.014, 0.018), 0.75, 0.42), 'GOLD': ((0.62, 0.3, 0.12), 1, 0.26)}
for m in bpy.data.materials:
    b = m.node_tree.nodes.get('Principled BSDF') if m.use_nodes else None
    if not b:
        continue
    for k_, (col, met, rough) in looks.items():
        if m.name.upper().startswith(k_):
            b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Metallic'].default_value = met; b.inputs['Roughness'].default_value = rough
    if m.name.upper().startswith('GLOW'):
        b.inputs['Emission Color'].default_value = (1.0, 0.36, 0.06, 1); b.inputs['Emission Strength'].default_value = 10

w = bpy.data.worlds.new('w'); bpy.context.scene.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.006, 0.007, 0.012, 1)
C = Vector((5.0, -3.0, 0.5))
def light(name, loc, energy, color, size):
    d = bpy.data.lights.new(name, 'AREA'); d.energy = energy; d.color = color; d.size = size
    o = bpy.data.objects.new(name, d); o.location = loc; bpy.context.collection.objects.link(o)
    t = bpy.data.objects.new('t' + name, None); t.location = C; bpy.context.collection.objects.link(t)
    c = o.constraints.new('TRACK_TO'); c.target = t
light('key', C + Vector((8, 10, 9)), 9000, (1, 0.88, 0.75), 6)
light('rim', C + Vector((-9, -8, 5)), 6000, (0.55, 0.55, 1), 5)
light('fill', C + Vector((-6, 8, -2)), 1200, (0.4, 0.8, 1), 6)
cam = bpy.data.cameras.new('cam'); cam.lens = 42
co = bpy.data.objects.new('cam', cam); bpy.context.collection.objects.link(co)
co.location = C + Vector((7.5, 13.5, 8.5))
t = bpy.data.objects.new('ct', None); t.location = C + Vector((0, 0, -0.3)); bpy.context.collection.objects.link(t)
c = co.constraints.new('TRACK_TO'); c.target = t
sc = bpy.context.scene; sc.camera = co
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 48; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 1600, 900
sc.view_settings.view_transform = 'AgX'
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
