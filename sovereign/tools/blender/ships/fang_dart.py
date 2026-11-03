"""Fang Dart · Chaos frigate (60 m, 2 hardpoints) · Blender hero hull, shipyard batch 2.

Feral mutation: a lopsided dart. The hull leans and twists, one oversized claw arm grows from the
starboard shoulder while the port side carries a stunted one, uneven spines erupt along the back,
the drives are mismatched. Purple fire, crimson bronze, bruised black armour.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'fang_dart_hero.glb', 'hull': 'chaos_frigate', 'tile': 3.0, 'bake_size': 1024}
L = 60.0
Y0 = L / 2
S = L / 50.0
LOFT0 = 0.0


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.12)
    w = (1.4 + 2.6 * ss(0.05, 0.5, t) * (1 + 0.25 * math.sin(t * 17))) * (1 - 0.3 * ss(0.85, 1, t)) * p * S
    top = (1.2 + 1.8 * ss(0.05, 0.5, t) + 0.5 * bump(0.6, 0.1, t)) * p * S
    bot = (1.0 + 1.0 * ss(0.05, 0.5, t)) * p * S
    zo = 0.6 * S * math.sin(t * 5.0)    # the hull writhes
    return w, top, bot, 2.4 + 0.8 * math.sin(t * 9), zo


LEN = L
LY0 = Y(0)
lt = lambda t: t


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    hull = k.loft('body', LEN, sec, rings=30, segs=26, mat=M['HULL'], y0=LY0)
    k.panelize(hull, 30, 26, skip_row=2, skip_col=3, depth=0.07, thickness=0.09, keep=lambda i, j: 2 <= i <= 27)
    k.bevel(hull, 0.05, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)
    hull.rotation_euler = (0, 0.14, 0)   # it leans

    # The great claw (starboard) and the stunted one (port).
    big = [(2.6 * S, Y(0.35), 0.6 * S), (6.0 * S, Y(0.28), 1.6 * S), (7.4 * S, Y(0.12), 0.8 * S), (5.6 * S, Y(-0.02), -0.6 * S), (3.2 * S, Y(-0.06), -0.8 * S)]
    claw, C = k.limb('claw', big, [1.2 * S, 1.0 * S, 0.85 * S, 0.6 * S, 0.3 * S], M['TRIM'], core_mat=M['HULL'], sides=5, squash=0.7, plates=8, up=(0, 0, 1), flare=1.18, tip=3.5)
    for j in range(5):
        pp, rr, (t, sd, upv) = C.at(0.15 + j * 0.16)
        b_ = pp + upv * rr * 0.7
        fang(k, 'claw_spine', tuple(b_), tuple(b_ + upv * (0.6 + 0.5 * (j % 2)) * S - t * 0.3 * S), 0.22 * S, M['GOLD'], sides=3)
    small = [(-2.4 * S, Y(0.38), 0.2 * S), (-4.0 * S, Y(0.3), -0.4 * S), (-4.4 * S, Y(0.2), -1.2 * S)]
    k.limb('stub', small, [0.8 * S, 0.6 * S, 0.3 * S], M['TRIM'], core_mat=M['HULL'], sides=5, squash=0.7, plates=4, up=(0, 0, 1), flare=1.2, tip=2.5)

    # Uneven spines erupting along the back.
    for j, (t, h, lean) in enumerate(((0.2, 1.2, 0.3), (0.3, 2.4, -0.2), (0.38, 1.0, 0.5), (0.47, 3.1, 0.1), (0.55, 1.6, -0.4), (0.63, 2.2, 0.35), (0.74, 0.9, 0.0))):
        w, top, bot, n, zo = sec(t)
        b_ = (lean * w * 0.4, Y(t), zo + top * 0.9)
        fang(k, 'spine', b_, (b_[0] + lean * S, b_[1] - h * 0.6 * S, b_[2] + h * S), (0.25 + 0.08 * h) * S, M['GOLD'] if j == 3 else M['TRIM'], sides=3)
    k.tube('vein', [(0.4 * S, Y(0.15), 1.8 * S), (-0.3 * S, Y(0.4), 2.6 * S), (0.5 * S, Y(0.7), 2.2 * S)], [0.08 * S] * 3, M['GLOW'], ends=('round', 'round'), res=6)
    for s in (-1, 1):
        k.tube('vein', [(s * 2.2 * S, Y(0.25), 0.4 * S), (s * 3.4 * S, Y(0.5), 0.9 * S), (s * 2.6 * S, Y(0.8), 0.2 * S)], [0.07 * S] * 3, M['GLOW'], ends=('round', 'round'), res=6)

    armour(k, M, sec, LEN, LY0, lt, dorsal=((0.18, 0.3), (0.42, 0.52), (0.66, 0.8)), flanks=((0.2, 0.34), (0.5, 0.64)), thick=0.14, seed=501)
    # Mutation growths: bolted, uneven slabs crowding the starboard (big-claw) side, bone ridges to port.
    import random as _r
    rr = _r.Random(77)
    for q in range(8):
        t = 0.22 + q * 0.08
        w, top, bot, n, zo = sec(t)
        hh = (0.8 + rr.random() * 1.2) * S
        k.box('growth_slab', (0.35 * S, (1.6 + rr.random() * 1.6) * S, hh), (w + 0.15 * S, Y(t), zo + (rr.random() - 0.3) * 1.2 * S), M['GOLD'] if q % 3 == 0 else M['HULL'], rot=(rr.random() * 0.3, 0, 0))
        fang(k, 'bone_ridge', (-w * 0.95, Y(t), zo + 0.3 * S), (-w * 1.35, Y(t) - 0.9 * S, zo + 0.9 * S), 0.22 * S, M['TRIM'], sides=3)
    k.box_kit('claw_root', (2.6 * S, Y(0.36), 0.8 * S), (1.8 * S, 2.6 * S, 1.6 * S), M, faces=('top', 'right'), count=6, h=0.3, seed=2200)
    k.box('claw_root_block', (1.8 * S, 2.6 * S, 1.6 * S), (2.6 * S, Y(0.36), 0.8 * S), M['TRIM'])
    machinery_bands(k, M, sec, LEN, LY0, lt, 0.2, 0.88, 0.4, seed=511, dorsal_gap=(0.31, 0.41), density=0.5)

    for s, bank, t in ((-1, 'FL', 0.42), (1, 'FR', 0.5)):
        w, top, bot, n, zo = sec(t)
        barbette(k, M, bank, s * w * 0.5, Y(t), zo + top * 0.85, 0.9 * S, 0.55 * S)

    # Mismatched drives: one big, one small, one smaller still.
    for x, z, r, name in ((-1.2, 0.2, 1.3, 'MAIN'), (1.8, -0.4, 0.8, 'STARBOARD'), (0.4, 1.4, 0.5, 'PORT')):
        k.nozzle('nozzle', (x * S, Y(1.0) - 0.3 * S, z * S), r * S, 1.8 * r * S, M, glow='GLOW')
        k.empty('ENGINE_' + name, (x * S, Y(1.0) - 1.3 * r * S, z * S), r * S)

    k.finish(skip=('core', 'body', 'NODE', 'ENGINE', 'windows', 'claw', 'stub', 'mach', 'plate_kit'))
    print('windows', k.deck_windows(('body',), rows=(-0.1, 0.0, 0.1), step=2.2, size=(0.15, 0.9, 0.45)))


LOOKS = looks('chaos', L)
