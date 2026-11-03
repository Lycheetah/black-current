"""Glass Wing · Techno Angels frigate (60 m, 2 hardpoints) · Blender hero hull, shipyard batch 6.

A living crystal in a metal cradle: the hull is one long glowing crystal held by armoured bands and
a keel frame, with two pairs of crystal wings on metal spars and a small halo over the stern.
White-blue metal, silver, cyan light.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'glass_wing_hero.glb', 'hull': 'techno_angels_frigate', 'tile': 3.0, 'bake_size': 1024}
L = 60.0
Y0 = L / 2
S = L / 50.0


def Y(t):
    return Y0 - t * L


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    M['CRYSTAL'] = k.material('CRYSTAL', (0.5, 0.9, 1.0), 0.0, 0.1, emit=(0.35, 0.9, 1.0))
    # The crystal hull: two long faceted shards joined at their widest point.
    mid = (0, Y(0.45), 0.0)
    fang(k, 'crystal_fore', mid, (0, Y(-0.02), 0.0), 3.2 * S, M['CRYSTAL'], sides=6)
    fang(k, 'crystal_aft', mid, (0, Y(0.95), 0.2 * S), 3.2 * S, M['CRYSTAL'], sides=6)
    # The cradle: armoured bands around the crystal and a keel frame beneath it.
    for t, r in ((0.2, 1.9), (0.33, 2.8), (0.45, 3.4), (0.58, 3.0), (0.72, 2.2)):
        k.armour_ring('band', r * S, 0.35 * S, 0.9 * S, (0, Y(t), 0.0), M, rot=(math.pi / 2, 0, 0), blocks=8, gap=0.2, glow=False)
    for s in (-1, 1):
        k.box('keel_rail', (0.5 * S, 0.55 * L, 0.6 * S), (s * 1.6 * S, Y(0.46), -3.0 * S), M['TRIM'])
        k.box_kit('keel_kit', (s * 1.6 * S, Y(0.46), -3.0 * S), (0.5 * S, 0.5 * L, 0.6 * S), M, faces=('right' if s > 0 else 'left',), count=6, h=0.25, seed=2600 + (s > 0))
        for t in (0.25, 0.45, 0.65):
            k.box('keel_post', (0.35 * S, 0.5 * S, 2.6 * S), (s * 1.6 * S, Y(t), -1.8 * S), M['HULL'])
    k.box('keel_spine', (2.2 * S, 0.5 * L, 0.5 * S), (0, Y(0.46), -3.4 * S), M['HULL'])
    k.box_kit('spine_kit', (0, Y(0.46), -3.4 * S), (2.2 * S, 0.48 * L, 0.5 * S), M, faces=('top',), count=6, h=0.25, seed=2610)
    # Two pairs of crystal wings on metal spars.
    for s in (-1, 1):
        for up, (yt, span, lift) in ((1, (0.38, 11.0, 0.5)), (-1, (0.55, 8.0, -0.35))):
            root = (s * 2.6 * S, Y(yt), up * 0.8 * S)
            tip = (s * (2.6 + span * math.cos(lift)) * S, Y(yt) - 3.0 * S, (up * 0.8 + span * math.sin(lift)) * S)
            k.tube('spar', [root, ((root[0] + tip[0]) / 2, (root[1] + tip[1]) / 2, (root[2] + tip[2]) / 2 + up * 0.4 * S), tip], [0.35 * S, 0.25 * S, 0.1 * S], M['TRIM'], bevel_res=1, ends=('flat', 'point'), res=3)
            for q in range(4):
                u = (q + 1) / 5
                base = (root[0] + (tip[0] - root[0]) * u, root[1] + (tip[1] - root[1]) * u, root[2] + (tip[2] - root[2]) * u)
                fang(k, 'wing_shard', base, (base[0], base[1] - (5.0 - 3.0 * u) * S, base[2] - up * 0.3 * S), (0.45 - 0.2 * u) * S, M['CRYSTAL'], sides=5)
                k.box('shard_clamp', (0.9 * S, 0.35 * S, 0.4 * S), base, M['GOLD'])
    # A small halo over the stern.
    k.armour_ring('halo', 2.4 * S, 0.2 * S, 0.5 * S, (0, Y(0.8), 3.4 * S), M, rot=(math.pi / 2 - 0.3, 0, 0), blocks=10, gap=0.2)
    k.tube('halo_post', [(0, Y(0.8), 0.8 * S), (0, Y(0.8), 2.0 * S), (0, Y(0.8), 3.0 * S)], [0.25 * S] * 3, M['TRIM'], bevel_res=1, ends=('flat', 'flat'), res=1)
    for s, bank in ((-1, 'FL'), (1, 'FR')):
        barbette(k, M, bank, s * 1.6 * S, Y(0.36), -3.6 * S + 0.3 * S, 0.7 * S, 0.4 * S)
    for x, name in ((-1.4, 'PORT'), (1.4, 'STARBOARD')):
        k.nozzle('nozzle', (x * S, Y(0.84), -2.6 * S), 0.7 * S, 1.4 * S, M, glow='GLOW')
        k.empty('ENGINE_' + name, (x * S, Y(0.84) - 1.0 * S, -2.6 * S), 0.7 * S)
    k.finish(skip=('core', 'crystal', 'band', 'halo', 'wing_shard', 'NODE', 'ENGINE', 'windows', 'keel_kit', 'spine_kit'))


LOOKS = dict(looks('techno_angels', L), CRYSTAL=dict(emit=(0.08, 0.32, 0.42)))
