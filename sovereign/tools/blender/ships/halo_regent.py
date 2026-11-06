"""Halo Regent · Techno Angels battleship (1 km, 5 hardpoints) · Blender hero hull, shipyard batch 3.

Crystalline machine wings: a slender armoured needle with four great crystal wings (two raised,
two lowered, like an angel's), each wing a fan of glowing faceted shards on a metal spar, a halo
ring standing behind the head, a crystal lance at the bow. White-blue armour, silver, cyan light.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402
from _seraph import pane_wing, halo_array  # noqa: E402

META = {'name': 'halo_regent_hero.glb', 'hull': 'techno_angels_battleship', 'tile': 30.0, 'bake_size': 2048}
L = 1000.0
Y0 = L / 2
S = L / 75.0
LOFT0 = 0.06


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.12)
    w = (1.8 + 3.0 * ss(0.05, 0.4, t) + 1.0 * bump(0.45, 0.1, t)) * (1 - 0.35 * ss(0.8, 1, t)) * p * S
    top = (1.8 + 2.8 * ss(0.05, 0.4, t)) * p * S
    bot = (1.6 + 2.2 * ss(0.05, 0.4, t)) * p * S
    return w, top, bot, 2.2, 0.0


LEN = L * (1 - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (1 - LOFT0)


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    M['CRYSTAL'] = k.material('CRYSTAL', (0.5, 0.9, 1.0), 0.0, 0.1, emit=(0.35, 0.9, 1.0))
    hull = k.loft('body', LEN, sec, rings=36, segs=30, mat=M['HULL'], y0=LY0)
    k.panelize(hull, 36, 30, skip_row=3, skip_col=4, depth=1.0, thickness=1.2, keep=lambda i, j: 3 <= i <= 33)
    k.bevel(hull, 0.8, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)

    # Four wings: a metal spar each, carrying a fan of crystal shards.
    yw = Y(0.42)
    for s in (-1, 1):
        for up, (lift, span, sweep) in ((1, (0.75, 30.0, 10.0)), (-1, (-0.45, 22.0, 6.0))):
            d = (math.cos(lift) * s, math.sin(lift))
            root = (s * 3.4 * S, yw, up * 1.6 * S)
            tip = (root[0] + d[0] * span * S, yw - sweep * S, root[2] + d[1] * span * S)
            k.tube('spar', [root, ((root[0] + tip[0]) / 2, yw - sweep * 0.3 * S, (root[2] + tip[2]) / 2 + up * 1.5 * S), tip], [1.0 * S, 0.7 * S, 0.25 * S], M['TRIM'], bevel_res=1, ends=('flat', 'point'), res=4)
            n = 7 if up > 0 else 5
            for q in range(n):
                u = (q + 1) / (n + 1)
                base = (root[0] + (tip[0] - root[0]) * u, yw - sweep * u * S, root[2] + (tip[2] - root[2]) * u + up * 1.0 * S * math.sin(u * math.pi))
                ln = (14.0 - 9.0 * u) * S
                end = (base[0] + d[0] * 2.0 * S, base[1] - ln, base[2] + d[1] * 2.0 * S - (0.0 if up > 0 else 1.0) * S)
                fang(k, 'shard', base, end, (1.1 - 0.5 * u) * S, M['CRYSTAL'], sides=6)
                # Smaller shards growing off each blade, so the wing reads as a crystal cluster.
                for c_, (ox, oz, f_) in enumerate(((0.9, 0.6, 0.55), (-0.7, -0.5, 0.4))):
                    mid = (base[0] + (end[0] - base[0]) * 0.3, base[1] + (end[1] - base[1]) * 0.3, base[2] + (end[2] - base[2]) * 0.3)
                    tip2 = (mid[0] + ox * 2.2 * S, mid[1] - ln * f_, mid[2] + oz * 2.2 * S)
                    fang(k, 'shard', mid, tip2, (0.7 - 0.3 * u) * S, M['CRYSTAL'], sides=5)
                k.box('shard_clamp', (2.6 * S, 0.8 * S, 1.0 * S), base, M['TRIM'])
                fang(k, 'shard_cap', base, (base[0], base[1] + 2.0 * S, base[2]), (1.2 - 0.5 * u) * S, M['GOLD'], sides=6)

    # Halo behind the head and the crystal lance.
    w, top, bot, n, zo = sec(lt(0.24))
    halo_array(k, M, (0, Y(0.26), top + 7.0 * S), 9.0 * S, n=3, tilt=0.3, nodes=10)
    # Stained-glass pane wings tucked under the crystal fans.
    for s in (-1, 1):
        pane_wing(k, M, (s * 3.6 * S, Y(0.5), 0.0), 18.0 * S, 12.0 * S, s, lift=0.1, panes=6, seed=2500 + (s > 0))
    k.tube('halo_post', [(0, Y(0.26), top * 0.9), (0, Y(0.26), top + 0.6 * S)], [1.0 * S, 0.7 * S], M['TRIM'], bevel_res=1, ends=('flat', 'flat'), res=1)
    fang(k, 'lance', (0, Y(0.07), 0), (0, Y(-0.06), 0), 1.2 * S, M['CRYSTAL'], sides=6)
    k.armour_ring('lance_collar', 1.8 * S, 0.35 * S, 1.0 * S, (0, Y(0.07), 0), M, rot=(math.pi / 2, 0, 0), blocks=10, gap=0.2, glow=False)

    armour(k, M, sec, LEN, LY0, lt, dorsal=((0.12, 0.22), (0.3, 0.4), (0.52, 0.63), (0.62, 0.74), (0.74, 0.86)), flanks=((0.14, 0.26), (0.5, 0.62), (0.66, 0.8)), thick=2.0, seed=901)
    machinery_bands(k, M, sec, LEN, LY0, lt, 0.14, 0.9, 4.5, seed=911, dorsal_gap=(0.41, 0.51), density=0.9)
    conduits(k, M, sec, LEN, LY0, lt, (0.15, 0.3, 0.5, 0.7, 0.88), 1.4)

    for s, bank, t in ((-1, 'FL', 0.2), (1, 'FR', 0.2), (-1, 'ML', 0.6), (1, 'MR', 0.6)):
        w, top, bot, n, zo = sec(lt(t))
        barbette(k, M, bank, s * w * 0.48, Y(t), top * 0.9, 2.0 * S, 0.9 * S)
    w, top, bot, n, zo = sec(lt(0.78))
    barbette(k, M, 'AL', 0, Y(0.78), top * 0.95, 2.4 * S, 0.9 * S)

    for x, z, name in ((-2.6, 0.0, 'PORT'), (0.0, 1.6, 'MAIN'), (2.6, 0.0, 'STARBOARD')):
        k.nozzle('nozzle', (x * S, Y(1.0) - 0.8 * S, z * S), 1.6 * S, 2.6 * S, M, glow='GLOW')
        k.cowl('cowl', (x * S, Y(1.0) - 0.4 * S, z * S), 1.6 * S, 3.0 * S, M)
        k.empty('ENGINE_' + name, (x * S, Y(1.0) - 2.2 * S, z * S), 1.6 * S)

    k.finish(skip=('core', 'body', 'halo', 'lance_collar', 'shard', 'pane', 'NODE', 'ENGINE', 'windows', 'mach', 'plate_kit', 'cowl'))
    print('windows', k.deck_windows(('body',), rows=(-0.16, -0.08, 0.0, 0.08, 0.16, 0.24), step=3.0, size=(0.25, 1.4, 0.8)))


LOOKS = dict(looks('techno_angels', L), CRYSTAL=dict(emit=(0.4, 0.92, 1.0)))
