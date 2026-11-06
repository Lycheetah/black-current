"""Pagan AI parts: bone built into the armour of a warship, not glued onto it."""
import math

from _forge import fang


def rib_armour(k, M, sec, LEN, Y0, lt, ts, r, a0=0.12, a1=math.pi - 0.12, scale=1.07):
    """Bone ribs wrapping flush over the hull as armour bands, each with a knuckled spine joint."""
    for t in ts:
        pts = k.edge_curve(sec, LEN, Y0, lt(t), a0, a1, scale=scale, steps=16)
        k.tube('rib_band', pts, [r * (1.25 - 0.5 * abs(i / 16 - 0.5) * 2) for i in range(len(pts))], M['HULL'], bevel_res=2, ends=('point', 'point'), res=2)
        top = pts[len(pts) // 2]
        k.sphere('rib_knuckle', r * 1.9, top, M['HULL'], 12)


def skull_mask(k, M, y, z, w, h, S):
    """A faceted skull built into the prow: brow plate, three burning sockets, nasal cavity, cheek
    plates, a jaw line of gold teeth. Faces +Y (forward)."""
    # The cranium: a faceted helm that tapers back and up into the hull, ridged down the middle.
    fang(k, 'skull_crown', (0, y + h * 0.12, z + h * 0.12), (0, y - h * 1.4, z + h * 0.62), w * 0.5, M['HULL'], sides=6)
    k.tube('skull_ridge', [(0, y + h * 0.2, z + h * 0.42), (0, y - h * 0.4, z + h * 0.66), (0, y - h * 1.1, z + h * 0.78)], [h * 0.06, h * 0.05, h * 0.02], M['GOLD'], bevel_res=1, ends=('round', 'point'), res=3)
    k.wedge('skull_brow', (w * 0.96, h * 0.22, h * 0.2), (0, y + h * 0.22, z + h * 0.2), M['HULL'], slope=0.5)
    for x, zz in ((-w * 0.28, 0.02), (0.0, 0.08), (w * 0.28, 0.02)):
        k.cylinder('skull_socket', h * 0.11, h * 0.1, (x, y + h * 0.27, z + h * zz), M['CORE'], segs=8, rot=(-math.pi / 2, 0, 0))
        k.cylinder('skull_fire', h * 0.06, h * 0.02, (x, y + h * 0.32, z + h * zz), M['GLOW'], segs=8, rot=(-math.pi / 2, 0, 0))
    fang(k, 'skull_nose', (0, y + h * 0.3, z - h * 0.1), (0, y + h * 0.3, z - h * 0.22), h * 0.06, M['CORE'], sides=3)
    for s in (-1, 1):
        k.wedge('skull_cheek', (w * 0.32, h * 0.5, h * 0.36), (s * w * 0.4, y + h * 0.05, z - h * 0.16), M['HULL'], slope=0.6)
        fang(k, 'skull_horn', (s * w * 0.42, y - h * 0.2, z + h * 0.42), (s * w * 1.25, y - h * 1.2, z + h * 1.05), h * 0.12, M['GOLD'], sides=6)
    k.wedge('skull_jaw', (w * 0.8, h * 0.6, h * 0.22), (0, y + h * 0.02, z - h * 0.42), M['HULL'], slope=0.3)
    for i in range(9):
        x = (i - 4) * w * 0.085
        fang(k, 'skull_tooth', (x, y + h * 0.3, z - h * 0.34), (x, y + h * 0.34, z - h * 0.2), h * 0.03, M['GOLD'], sides=4)


def bone_crest(k, M, base_y, z_of, ts, h_of, lean=-0.35, S=1.0):
    """A dorsal crest of tapered bone blades with an amber vein up each leading edge."""
    for i, t in enumerate(ts):
        y, z, h = base_y(t), z_of(t), h_of(i)
        o = [(0, 1.6 * S), (0, -1.6 * S), (h * 0.6, h * 0.6 * lean - 0.8 * S), (h * 1.1, h * 1.1 * lean - 1.0 * S), (h * 0.7, h * 0.7 * lean + 1.0 * S)]
        b = k.plate('bone_blade', o, 0.5 * S, M['HULL'], loc=(0, y, z), bevel_w=0.3)
        b.rotation_euler = (0, -math.pi / 2, 0)
        k.tube('bone_vein', [(0.0, y + 1.4 * S, z + 0.4 * S), (0.0, y + h * 0.7 * lean + 0.9 * S, z + h * 0.7), (0.0, y + h * 1.1 * lean - 0.9 * S, z + h * 1.08)], [0.16 * S, 0.12 * S, 0.03 * S], M['GLOW'], bevel_res=1, ends=('round', 'point'), res=3)


def reliquary(k, M, base, w, h):
    """A small temple tower: a stepped plinth, a pillared shrine with an amber flame, a bone spire."""
    x, y, z = base
    k.box('reliq_plinth', (w, w, h * 0.18), (x, y, z + h * 0.09), M['TRIM'])
    k.box('reliq_step', (w * 0.8, w * 0.8, h * 0.12), (x, y, z + h * 0.24), M['HULL'])
    for sx in (-1, 1):
        for sy in (-1, 1):
            k.box('reliq_pillar', (w * 0.12, w * 0.12, h * 0.4), (x + sx * w * 0.3, y + sy * w * 0.3, z + h * 0.5), M['HULL'])
    k.sphere('reliq_flame', w * 0.18, (x, y, z + h * 0.5), M['GLOW'], 12)
    k.box('reliq_roof', (w * 0.85, w * 0.85, h * 0.08), (x, y, z + h * 0.74), M['GOLD'])
    k.cylinder('reliq_spire', w * 0.22, h * 0.32, (x, y, z + h * 0.94), M['HULL'], segs=4, rot=(0, 0, 0), r2=0.0)
