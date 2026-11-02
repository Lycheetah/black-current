"""Authored turret set · hand-built gun families the game mounts on every hardpoint.

    /opt/blender-venv/bin/python tools/blender/turrets.py          # build src/data/models/turrets.glb
    PREVIEW=1 /opt/blender-venv/bin/python tools/blender/turrets.py # also keep the assembled .blend scene

Each family is split at the joints the game animates (src/render/ship-mesh.js buildHardpoint):
  TUR_<fam>_BASE    fixed armoured ring on the hull          pivot (0, 0, 0)
  TUR_<fam>_YAW     housing that swivels                     pivot (0, 0, 0.25)   game yaw.position.y
  TUR_<fam>_PITCH   mantlet and trunnions that elevate        pivot (0, 0.55, 0.55) yaw + game pitch offset
  TUR_<fam>_BARREL  one barrel (the game places 1-3)         pivot at its breech, points +Y, nominal length 2.6
Units are the game's turret unit s (the game scales by hull length and weapon size).
Blender: +Y forward, +Z up (exports as glTF -Z forward, +Y up, the game's convention).
Materials HULL / TRIM / GOLD / GLOW take the ship's palette; GLOW takes the weapon's colour.
"""
import math
import os
import random
import sys

import bpy
import bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import shipkit as k  # noqa: E402

YAW_Z = 0.25
PITCH = (0.0, 0.55, 0.55)   # pivot of the pitch cradle (Blender coordinates)
BARREL_LEN = 2.6
FAMILIES = ('cannon', 'rail', 'beam', 'plasma', 'launcher')


# ------------------------------------------------------------------ geometry helpers

def prism(name, profile, half_w, mat, loc=(0, 0, 0), taper=1.0, taper_from=None):
    """Side profile [(y, z)] extruded across X (±half_w). Vertices above `taper_from` are pulled in
    by `taper`, so housings get sloped cheeks as well as a sloped glacis."""
    bm = bmesh.new()
    zs = [z for _, z in profile]
    z0, z1 = min(zs), max(zs)
    tf = z0 + (z1 - z0) * 0.45 if taper_from is None else taper_from
    def wx(z):
        if z <= tf or z1 <= tf:
            return half_w
        return half_w * (1 - (1 - taper) * (z - tf) / (z1 - tf))
    L = [bm.verts.new((-wx(z), y, z)) for y, z in profile]
    R = [bm.verts.new((wx(z), y, z)) for y, z in profile]
    n = len(profile)
    bm.faces.new(L)
    bm.faces.new(list(reversed(R)))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((L[i], R[i], R[j], L[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = k.obj_from_bmesh(name, bm, mat)
    ob.location = loc
    return ob


def ngon_ring(name, r_in, r_out, h, loc, mat, sides=8, rot=(0, 0, 0), chamfer=0.0):
    """A faceted armoured ring (n-gon), flat top and bottom."""
    bm = bmesh.new()
    rings = []
    for z, ro in ((-h / 2, r_out), (h / 2 - chamfer, r_out), (h / 2, r_out - chamfer)):
        rings.append([bm.verts.new((ro * math.cos(a), ro * math.sin(a), z)) for a in (i / sides * math.tau + math.pi / sides for i in range(sides))])
    inner = [[bm.verts.new((r_in * math.cos(a), r_in * math.sin(a), z)) for a in (i / sides * math.tau + math.pi / sides for i in range(sides))] for z in (h / 2, -h / 2)]
    seq = rings + inner + [rings[0]]
    for A, B in zip(seq, seq[1:]):
        for i in range(sides):
            j = (i + 1) % sides
            bm.faces.new((A[i], A[j], B[j], B[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = k.obj_from_bmesh(name, bm, mat)
    ob.location = loc
    ob.rotation_euler = rot
    return ob


def tube_y(name, r, y0, y1, mat, x=0.0, z=0.0, segs=16, r2=None):
    """A cylinder along +Y from y0 to y1."""
    return k.cylinder(name, r, y1 - y0, (x, (y0 + y1) / 2, z), mat, segs=segs, rot=(-math.pi / 2, 0, 0), r2=r2)


def bolts(name, R, z, n, r, mat, loc=(0, 0, 0)):
    bm = bmesh.new()
    for i in range(n):
        a = i / n * math.tau
        g = bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=r, radius2=r * 0.8, depth=r * 0.9)
        for v in g['verts']:
            v.co += Vector((loc[0] + R * math.cos(a), loc[1] + R * math.sin(a), loc[2] + z))
    return k.obj_from_bmesh(name, bm, mat)


def fins(name, x0, x1, y, z, n, size, mat):
    """A bank of cooling fins: n thin plates spread from x0 to x1."""
    bm = bmesh.new()
    for i in range(n):
        x = x0 + (x1 - x0) * i / max(1, n - 1)
        g = bmesh.ops.create_cube(bm, size=1.0)
        for v in g['verts']:
            v.co = Vector((x + v.co.x * size[0], y + v.co.y * size[1], z + v.co.z * size[2]))
    return k.obj_from_bmesh(name, bm, mat)


def seams(name, x0, x1, ys, z, mat, w=0.025):
    """Dark panel seams across a housing top at the given y positions (read as plate joins)."""
    bm = bmesh.new()
    for y in ys:
        g = bmesh.ops.create_cube(bm, size=1.0)
        for v in g['verts']:
            v.co = Vector(((x0 + x1) / 2 + v.co.x * (x1 - x0), y + v.co.y * w, z + v.co.z * 0.02))
    return k.obj_from_bmesh(name, bm, mat)


def ram(name, a, b, r, M):
    """A hydraulic ram between two points: a fat cylinder, a thin gold piston and two end eyes."""
    a, b = Vector(a), Vector(b)
    mid = a.lerp(b, 0.55)
    out = [k.tube(name, [tuple(a), tuple(mid)], [r, r], M['TRIM'], bevel_res=1, res=1),
           k.tube(name + '_rod', [tuple(mid), tuple(b)], [r * 0.5, r * 0.5], M['GOLD'], bevel_res=1, res=1)]
    for p in (a, b):
        out.append(k.sphere(name + '_eye', r * 1.2, tuple(p), M['TRIM'], 8))
    return out


# ------------------------------------------------------------------ shared parts

def base(fam, M, wide=1.0):
    """Fixed mount: an octagonal armoured skirt, a bolted collar and the gold bearing race."""
    obs = [
        ngon_ring(fam + '_skirt', 0.0, 1.38 * wide, 0.32, (0, 0, -0.08), M['TRIM'], sides=8, chamfer=0.08),
        ngon_ring(fam + '_collar', 0.0, 1.18 * wide, 0.16, (0, 0, 0.14), M['HULL'], sides=16, chamfer=0.04),
        k.torus(fam + '_race', 1.08 * wide, 0.05, (0, 0, 0.23), M['GOLD'], segs=48, rsegs=8),
        bolts(fam + '_bolts', 1.26 * wide, 0.1, 16, 0.045, M['TRIM']),
    ]
    # Four buttress blocks tie the skirt to the hull.
    for i in range(4):
        a = i / 4 * math.tau + math.pi / 4
        b = k.wedge(fam + '_buttress', (0.26, 0.22, 0.2), (math.cos(a) * 1.4 * wide, math.sin(a) * 1.4 * wide, -0.16), M['HULL'], slope=0.7)
        b.rotation_euler = (0, 0, a - math.pi / 2)
        obs.append(b)
    return obs


def barrel_cannon(M, ribs=5):
    """Cannon barrel: breech block, ribbed cooling jacket, plain tube, slotted muzzle brake, dark bore."""
    L = BARREL_LEN
    obs = [
        k.box('cb_breech', (0.34, 0.5, 0.34), (0, 0.15, 0), M['TRIM']),
        tube_y('cb_jacket', 0.2, 0.35, L * 0.42, M['HULL'], segs=12),
        tube_y('cb_tube', 0.12, L * 0.42, L * 0.92, M['TRIM'], segs=16, r2=0.105),
        tube_y('cb_brake', 0.17, L * 0.9, L * 1.0, M['TRIM'], segs=8),
        tube_y('cb_bore', 0.075, L * 0.995, L * 1.004, M['CORE'], segs=12),
    ]
    for i in range(ribs):
        y = 0.45 + i * (L * 0.42 - 0.55) / max(1, ribs - 1)
        obs.append(tube_y('cb_rib', 0.235, y, y + 0.06, M['GOLD'] if i in (0, ribs - 1) else M['TRIM'], segs=12))
    # Brake ports: two slots each side.
    for s in (-1, 1):
        for dy in (0.02, 0.1):
            obs.append(k.box('cb_port', (0.04, 0.05, 0.12), (s * 0.165, L * 0.9 + dy + 0.03, 0), M['CORE']))
    return obs


def barrel_rail(M):
    """Rail barrel: twin armoured rails with a glowing channel, coil rings, a pointed armour shroud."""
    L = BARREL_LEN * 1.05
    obs = [k.box('rb_breech', (0.42, 0.6, 0.36), (0, 0.2, 0), M['TRIM'])]
    for s in (-1, 1):
        obs.append(prism('rb_rail', [(0.3, -0.13), (L, -0.1), (L + 0.12, 0.0), (L, 0.1), (0.3, 0.13)], 0.05, M['HULL'], loc=(s * 0.11, 0, 0)))
    obs.append(k.box('rb_channel', (0.05, L * 0.5, 0.05), (0, 0.3 + L * 0.48, 0), M['GLOW']))
    for i in range(6):
        y = 0.6 + i * (L - 0.9) / 5
        obs.append(ngon_ring('rb_coil', 0.0, 0.21, 0.08, (0, y, 0), M['GOLD'] if i % 2 == 0 else M['TRIM'], sides=8, rot=(math.pi / 2, 0, 0)))
    obs.append(prism('rb_shroud', [(0.3, 0.12), (1.4, 0.12), (1.7, 0.2), (0.3, 0.26)], 0.17, M['TRIM'], taper=0.7))
    return obs


def barrel_beam(M):
    """Beam emitter: stepped focusing tube, glowing lens rings, a heat-sink sleeve, a crystal tip."""
    L = BARREL_LEN * 0.95
    obs = [
        tube_y('bb_breech', 0.26, 0.0, 0.45, M['TRIM'], segs=10),
        tube_y('bb_sleeve', 0.2, 0.45, L * 0.5, M['HULL'], segs=10),
        tube_y('bb_focus', 0.13, L * 0.5, L * 0.86, M['TRIM'], segs=16, r2=0.11),
        tube_y('bb_horn', 0.11, L * 0.86, L * 0.98, M['GOLD'], segs=16, r2=0.17),
        tube_y('bb_lens', 0.12, L * 0.975, L * 0.985, M['GLOW'], segs=16),
    ]
    for i in range(4):
        y = L * (0.52 + i * 0.09)
        obs.append(tube_y('bb_ring', 0.16, y, y + 0.04, M['GLOW'] if i % 2 else M['GOLD'], segs=16))
    for a in range(4):
        ang = a / 4 * math.tau + math.pi / 4
        f = k.box('bb_sink', (0.03, L * 0.36, 0.13), (math.cos(ang) * 0.24, 0.45 + L * 0.18, math.sin(ang) * 0.24), M['TRIM'])
        f.rotation_euler = (0, -ang, 0)
        obs.append(f)
    return obs


def barrel_plasma(M):
    """Plasma barrel: a fat containment tube wound with glowing coils, a wide magnetic muzzle."""
    L = BARREL_LEN * 0.9
    obs = [
        k.box('pb_breech', (0.46, 0.5, 0.46), (0, 0.2, 0), M['TRIM']),
        tube_y('pb_tube', 0.21, 0.45, L * 0.88, M['HULL'], segs=12),
        tube_y('pb_core', 0.09, L * 0.86, L * 0.995, M['GLOW'], segs=12),
    ]
    for i in range(6):
        y = 0.55 + i * (L * 0.88 - 0.7) / 5
        obs.append(k.torus('pb_coil', 0.24, 0.045, (0, y, 0), M['GLOW'] if i % 2 else M['GOLD'], rot=(math.pi / 2, 0, 0), segs=20, rsegs=6))
    for i in range(3):
        a = i / 3 * math.tau
        p = prism('pb_prong', [(L * 0.82, 0.18), (L * 1.04, 0.22), (L * 1.0, 0.31), (L * 0.82, 0.3)], 0.05, M['TRIM'])
        p.rotation_euler = (0, a, 0)
        obs.append(p)
    return obs


# ------------------------------------------------------------------ families

def family(fam, M):
    """Returns {part: [objects]} with every part built at its assembled position."""
    py, pz = PITCH[1], PITCH[2]
    parts = {'BASE': base(fam, M, 1.08 if fam == 'launcher' else 1.0)}
    if fam == 'cannon':
        parts['YAW'] = [
            prism('c_house', [(-1.25, 0.25), (0.95, 0.25), (1.0, 0.5), (0.7, 0.88), (-0.6, 0.95), (-1.2, 0.7)], 0.98, M['HULL'], taper=0.82),
            prism('c_cheek', [(-0.9, 0.3), (0.6, 0.3), (0.5, 0.72), (-0.8, 0.7)], 1.06, M['TRIM']),
            k.box('c_ammo', (0.36, 0.9, 0.4), (-1.12, -0.35, 0.55), M['TRIM']),
            k.box('c_ammo_r', (0.36, 0.9, 0.4), (1.12, -0.35, 0.55), M['TRIM']),
            k.box('c_sight', (0.26, 0.42, 0.22), (-0.5, -0.1, 1.06), M['TRIM']),
            k.box('c_sight_lens', (0.16, 0.02, 0.1), (-0.5, 0.12, 1.07), M['GLOW']),
            fins('c_vent', -0.45, 0.45, -1.12, 0.62, 6, (0.04, 0.16, 0.36), M['TRIM']),
            k.box('c_trim', (1.6, 0.06, 0.05), (0, 0.98, 0.5), M['GOLD']),
            k.box('c_hatch', (0.5, 0.5, 0.03), (0.35, -0.55, 0.955), M['TRIM']),
            seams('c_seams', -0.78, 0.78, (-0.85, -0.2, 0.35), 0.95, M['CORE']),
            k.box('c_plate', (0.62, 0.5, 0.05), (-0.42, 0.42, 0.88), M['TRIM']),
            k.cylinder('c_antenna', 0.02, 0.6, (0.62, -0.95, 1.25), M['TRIM'], segs=6, rot=(0, 0, 0)),
            k.sphere('c_antenna_tip', 0.035, (0.62, -0.95, 1.55), M['GLOW'], 8),
        ] + ram('c_ram', (-0.62, 0.1, 0.62), (-0.55, 0.55, 0.4), 0.07, M) + ram('c_ram_r', (0.62, 0.1, 0.62), (0.55, 0.55, 0.4), 0.07, M)
        parts['PITCH'] = [
            prism('c_mantlet', [(py - 0.3, pz - 0.3), (py + 0.42, pz - 0.26), (py + 0.5, pz), (py + 0.42, pz + 0.26), (py - 0.3, pz + 0.3)], 0.62, M['TRIM'], taper=0.9),
            k.cylinder('c_trunnion_l', 0.17, 0.24, (-0.7, py, pz), M['GOLD'], segs=12, rot=(0, math.pi / 2, 0)),
            k.cylinder('c_trunnion_r', 0.17, 0.24, (0.7, py, pz), M['GOLD'], segs=12, rot=(0, math.pi / 2, 0)),
        ]
        parts['BARREL'] = barrel_cannon(M)
    elif fam == 'rail':
        parts['YAW'] = [
            prism('r_house', [(-1.35, 0.25), (1.05, 0.25), (1.1, 0.42), (0.2, 0.78), (-1.3, 0.78)], 0.92, M['HULL'], taper=0.7),
            prism('r_spine', [(-1.3, 0.75), (0.1, 0.75), (-0.2, 0.92), (-1.25, 0.92)], 0.32, M['TRIM']),
            fins('r_caps', -0.7, 0.7, -0.95, 0.55, 5, (0.16, 0.5, 0.36), M['TRIM']),
            k.box('r_cap_glow', (1.5, 0.04, 0.06), (0, -0.68, 0.55), M['GLOW']),
            k.box('r_edge', (0.06, 2.2, 0.05), (-0.92, -0.1, 0.27), M['GOLD']),
            k.box('r_edge_r', (0.06, 2.2, 0.05), (0.92, -0.1, 0.27), M['GOLD']),
            seams('r_seams', -0.6, 0.6, (-0.3, 0.3), 0.79, M['CORE']),
            k.box('r_sight', (0.24, 0.36, 0.18), (0.55, -0.6, 0.86), M['TRIM']),
            k.box('r_sight_lens', (0.14, 0.02, 0.08), (0.55, -0.41, 0.86), M['GLOW']),
        ]
        parts['PITCH'] = [
            prism('r_mantlet', [(py - 0.4, pz - 0.22), (py + 0.6, pz - 0.18), (py + 0.7, pz), (py + 0.6, pz + 0.2), (py - 0.4, pz + 0.24)], 0.5, M['TRIM'], taper=0.85),
            k.box('r_capbank', (0.7, 0.4, 0.14), (0, py - 0.2, pz + 0.3), M['HULL']),
        ]
        parts['BARREL'] = barrel_rail(M)
    elif fam == 'beam':
        parts['YAW'] = [
            prism('b_house', [(-1.1, 0.25), (0.9, 0.25), (1.0, 0.45), (0.55, 0.8), (-0.55, 0.85), (-1.1, 0.55)], 0.9, M['HULL'], taper=0.6),
            ngon_ring('b_drum', 0.0, 0.5, 0.34, (0, -0.35, 0.95), M['TRIM'], sides=8, chamfer=0.07),
            ngon_ring('b_drum_cap', 0.0, 0.36, 0.1, (0, -0.35, 1.16), M['HULL'], sides=8, chamfer=0.03),
            k.cylinder('b_crystal', 0.13, 0.36, (0, -0.35, 1.38), M['GLOW'], segs=6, rot=(0, 0, 0), r2=0.0),
            k.cylinder('b_crystal_base', 0.13, 0.12, (0, -0.35, 1.24), M['GOLD'], segs=6, rot=(0, 0, 0)),
            seams('b_seams', -0.7, 0.7, (0.3, 0.6), 0.8, M['CORE']),
            fins('b_sinks', -0.62, 0.62, -0.95, 0.62, 9, (0.03, 0.3, 0.42), M['TRIM']),
            k.torus('b_halo', 0.52, 0.025, (0, -0.35, 1.13), M['GLOW'], segs=32, rsegs=6),
            k.box('b_capacitor', (0.3, 0.7, 0.3), (-0.95, -0.2, 0.42), M['TRIM']),
            k.box('b_capacitor_r', (0.3, 0.7, 0.3), (0.95, -0.2, 0.42), M['TRIM']),
            k.box('b_trim', (1.4, 0.05, 0.05), (0, 0.92, 0.47), M['GOLD']),
        ]
        parts['PITCH'] = [
            tube_y('b_collar', 0.38, py - 0.25, py + 0.4, M['TRIM'], z=pz, segs=10),
            tube_y('b_collar_ring', 0.41, py + 0.28, py + 0.34, M['GOLD'], z=pz, segs=10),
            k.box('b_yoke', (1.3, 0.34, 0.22), (0, py, pz - 0.18), M['HULL']),
        ]
        parts['BARREL'] = barrel_beam(M)
    elif fam == 'plasma':
        parts['YAW'] = [
            prism('p_house', [(-1.2, 0.25), (1.0, 0.25), (1.05, 0.55), (0.6, 0.9), (-0.9, 0.9), (-1.25, 0.6)], 1.0, M['HULL'], taper=0.75),
            k.cylinder('p_tank', 0.3, 1.2, (-1.0, -0.3, 0.55), M['TRIM'], segs=12, rot=(-math.pi / 2, 0, 0)),
            k.cylinder('p_tank_r', 0.3, 1.2, (1.0, -0.3, 0.55), M['TRIM'], segs=12, rot=(-math.pi / 2, 0, 0)),
            k.torus('p_tank_band', 0.32, 0.03, (-1.0, -0.1, 0.55), M['GLOW'], rot=(math.pi / 2, 0, 0), segs=16, rsegs=6),
            k.torus('p_tank_band_r', 0.32, 0.03, (1.0, -0.1, 0.55), M['GLOW'], rot=(math.pi / 2, 0, 0), segs=16, rsegs=6),
            k.box('p_vent', (0.9, 0.5, 0.05), (0, -0.6, 0.93), M['TRIM']),
            k.box('p_trim', (1.7, 0.05, 0.05), (0, 1.02, 0.55), M['GOLD']),
            seams('p_seams', -0.8, 0.8, (-0.15, 0.35), 0.905, M['CORE']),
            k.box('p_plate', (0.5, 0.45, 0.04), (0.45, 0.1, 0.92), M['TRIM']),
        ]
        parts['PITCH'] = [
            prism('p_mantlet', [(py - 0.3, pz - 0.32), (py + 0.4, pz - 0.3), (py + 0.48, pz), (py + 0.4, pz + 0.3), (py - 0.3, pz + 0.32)], 0.7, M['TRIM'], taper=0.9),
        ]
        parts['BARREL'] = barrel_plasma(M)
    else:  # launcher
        parts['YAW'] = [
            prism('l_house', [(-1.0, 0.25), (0.9, 0.25), (0.95, 0.45), (0.6, 0.6), (-1.0, 0.6)], 1.02, M['HULL'], taper=0.9),
            k.box('l_arm', (0.22, 0.9, 0.9), (-1.1, 0.3, 0.75), M['TRIM']),
            k.box('l_arm_r', (0.22, 0.9, 0.9), (1.1, 0.3, 0.75), M['TRIM']),
            k.box('l_reload', (0.9, 0.7, 0.36), (0, -0.8, 0.75), M['TRIM']),
            fins('l_reload_ribs', -0.35, 0.35, -0.8, 0.95, 4, (0.05, 0.6, 0.06), M['HULL']),
            k.cylinder('l_mast', 0.02, 0.7, (-0.7, -0.75, 0.95), M['TRIM'], segs=6, rot=(0, 0, 0)),
            k.sphere('l_mast_tip', 0.04, (-0.7, -0.75, 1.3), M['GLOW'], 8),
            k.box('l_trim', (1.9, 0.05, 0.05), (0, 0.93, 0.45), M['GOLD']),
        ]
        bx = [(-0.3, pz + 0.03), (0.3, pz + 0.03), (-0.3, pz + 0.37), (0.3, pz + 0.37)]
        pitch = [
            prism('l_box', [(py - 0.55, pz - 0.15), (py + 0.75, pz - 0.15), (py + 0.75, pz + 0.55), (py - 0.4, pz + 0.6)], 0.78, M['HULL'], taper=0.95),
            k.box('l_face', (1.5, 0.06, 0.66), (0, py + 0.77, pz + 0.2), M['TRIM']),
            k.box('l_seeker', (0.3, 0.2, 0.12), (0, py - 0.2, pz + 0.66), M['TRIM']),
            k.box('l_seeker_eye', (0.18, 0.02, 0.07), (0, py - 0.09, pz + 0.66), M['GLOW']),
        ]
        for x, z in bx:
            pitch.append(tube_y('l_tube', 0.125, py + 0.6, py + 0.82, M['TRIM'], x=x, z=z, segs=12))
            pitch.append(tube_y('l_mouth', 0.09, py + 0.8, py + 0.83, M['CORE'], x=x, z=z, segs=12))
            pitch.append(tube_y('l_rim', 0.14, py + 0.8, py + 0.84, M['GOLD'], x=x, z=z, segs=12))
        pitch.append(seams('l_seams', -0.7, 0.7, (py - 0.1, py + 0.3), pz + 0.6, M['CORE']))
        pitch.append(fins('l_ribs', -0.83, 0.83, py + 0.1, pz + 0.2, 2, (0.06, 0.9, 0.5), M['TRIM']))
        pitch.append(k.box('l_hazard', (1.5, 0.04, 0.05), (0, py + 0.79, pz - 0.12), M['GOLD']))
        parts['PITCH'] = pitch
        parts['BARREL'] = []
    return parts


# ------------------------------------------------------------------ assembly

def _bake_mods(ob):
    """Apply modifiers into the mesh so parts can be joined."""
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    ob.modifiers.clear()
    old = ob.data
    ob.data = me
    if old.users == 0:
        bpy.data.meshes.remove(old)


def join(name, obs, pivot):
    obs = [o for o in obs if o.type == 'MESH' and len(o.data.vertices)]
    for o in obs:
        k.bevel(o, 0.012, 1, 35) if not any(m.type == 'BEVEL' for m in o.modifiers) else None
        _bake_mods(o)
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for o in obs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    # Move the origin to the pivot: the game rotates each part about its own origin.
    bpy.context.scene.cursor.location = pivot
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    k.weighted_normals(ob)
    k.smooth(ob)
    ob.select_set(False)
    return ob


def build():
    k.reset()
    k._mats.clear()
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.1)
    out = {}
    for i, fam in enumerate(FAMILIES):
        parts = family(fam, M)
        pivots = {'BASE': (0, 0, 0), 'YAW': (0, 0, YAW_Z), 'PITCH': PITCH, 'BARREL': (0, 0, 0)}
        for part, obs in parts.items():
            if not obs:
                continue
            ob = join('TUR_%s_%s' % (fam, part), obs, pivots[part])
            out[(fam, part)] = ob
    # Every part stays at its own pivot (families overlap in the file): the game subtracts the pivot,
    # and turret_preview.py lays them out for review.
    return out


if __name__ == '__main__':
    build()
    raw = os.path.join(HERE, 'out', 'turrets.raw.glb')
    os.makedirs(os.path.dirname(raw), exist_ok=True)
    tris = k.export(raw, 1.2, False)
    if os.environ.get('PREVIEW'):
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'out', 'turrets.blend'))
    out = os.path.join(ROOT, 'src', 'data', 'models', 'turrets.glb')
    import subprocess
    subprocess.run(['npx', 'gltfpack', '-i', raw, '-o', out, '-kn', '-km'], cwd=ROOT, check=True)
    print(f'turrets · {tris} triangles · packed {os.path.getsize(out) // 1024} KB')
