"""Nocturne Queen · Cosmic Darkness battleship (1 km, 5 hardpoints) · Cosmic Darkness flagship.

The night's queen: a long night-black hull dusted with star-points; two great crescent blades arc
over and under it like a moon held in her hands; a spire-crown rises at the stern; a veil of tall
hanging fin-plates forms her cloak along the flanks. Dominant feature: the crescent."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks, spire  # noqa: E402

META = {'name': 'nocturne_queen_hero.glb', 'hull': 'cosmic_darkness_battleship', 'tile': 30.0, 'bake_size': 2048}
L = 1000.0
Y0 = L / 2
S = L / 75.0
LOFT0 = 0.08


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.14)
    w = (2.4 + 3.0 * ss(0.05, 0.4, t)) * (1 - 0.35 * ss(0.8, 1, t)) * p * S
    top = (2.2 + 2.4 * ss(0.05, 0.4, t)) * p * S
    bot = (2.0 + 1.8 * ss(0.05, 0.4, t)) * p * S
    return w, top, bot, 2.2, 0.0


LEN = L * (1 - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (1 - LOFT0)


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    hull = k.loft('body', LEN, sec, rings=40, segs=34, mat=M['HULL'], y0=LY0)
    k.panelize(hull, 40, 34, skip_row=3, skip_col=4, depth=1.0, thickness=1.2, keep=lambda i, j: 3 <= i <= 37)
    k.bevel(hull, 0.8, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)
    armour(k, M, sec, LEN, LY0, lt, dorsal=((0.14, 0.26), (0.25, 0.38), (0.6, 0.72), (0.71, 0.84)), flanks=((0.16, 0.3), (0.32, 0.46), (0.5, 0.64), (0.68, 0.82)), thick=2.2, seed=6100)
    machinery_bands(k, M, sec, LEN, LY0, lt, 0.16, 0.9, 5.0, seed=6110, dorsal_gap=(0.39, 0.59), density=0.9)
    # The crescent: two great faceted blades arcing over and under the hull, tips forward.
    for up in (1, -1):
        pts = []
        for q in range(7):
            u = q / 6
            a = math.pi * (0.1 + 0.8 * u)
            pts.append((0.0, Y(0.62) + math.cos(a) * 34.0 * S, up * (math.sin(a) * 16.0 * S + 3.0 * S)))
        radii = [(1.0 + 2.6 * math.sin(math.pi * q / 6)) * S + 0.3 * S for q in range(7)]
        k.limb('crescent', pts, radii, M['TRIM'], core_mat=M['HULL'], sides=6, squash=0.35, plates=16, up=(1, 0, 0), flare=1.08, tip=3.0)
        k.tube('crescent_edge', [(0.0, p[1], p[2] + up * r * 0.0) for p, r in zip(pts, radii)], [0.4 * S] * 7, M['GLOW'], ends=('round', 'round'), res=4)
    # The spire-crown at the stern.
    w, top, bot, n, zo = sec(lt(0.86))
    k.armour_ring('crown_ring', 7.0 * S, 0.9 * S, 2.0 * S, (0, Y(0.86), top + 1.0 * S), M, rot=(0, 0, 0), blocks=14, gap=0.12)
    for i in range(7):
        a = i / 7 * math.tau + math.pi / 2
        h = (16.0 if i == 0 else 9.0 + 3.0 * (i % 2)) * S
        spire(k, 'crown_spire', (math.cos(a) * 7.0 * S, Y(0.86) + math.sin(a) * 7.0 * S, top + 1.6 * S), h, 1.0 * S, M['GOLD'] if i == 0 else M['TRIM'], sides=6)
    # The veil: tall hanging fin-plates along both flanks, like a cloak.
    for s in (-1, 1):
        for q in range(9):
            t = 0.24 + q * 0.065
            w, top, bot, n, zo = sec(lt(t))
            hh = (10.0 + 4.0 * math.sin(math.pi * q / 8)) * S
            veil = k.plate('veil', [(0, 2.4 * S), (0, -2.4 * S), (-hh, -3.6 * S), (-hh * 1.05, -1.0 * S)], 0.5 * S, M['TRIM'] if q % 2 else M['HULL'], loc=(s * w * 0.98, Y(t), bot * 0.2), bevel_w=0.3)
            veil.rotation_euler = (0, -math.pi / 2 + s * 0.25, 0)
    # Star-points over the back (the veil of night).
    import random
    rnd = random.Random(7)
    for q in range(160):
        t = rnd.uniform(0.14, 0.9)
        a = rnd.uniform(0.2, math.pi - 0.2)
        p, nrm = k.surf(sec, LEN, LY0, lt(t), a, 1.0)
        k.sphere('star', rnd.uniform(0.3, 0.8), tuple(p + nrm * 1.2), M['GLOW'], 6)
    k.antenna_array('array', (0, Y(0.3), sec(lt(0.3))[1] - 0.3 * S), (0, 0, 1), 14.0 * S, M, count=5, spread=3.0 * S, seed=6120)
    for s, bank, t in ((-1, 'FL', 0.26), (1, 'FR', 0.26), (-1, 'ML', 0.5), (1, 'MR', 0.5)):
        w, top, bot, n, zo = sec(lt(t))
        barbette(k, M, bank, s * w * 0.5, Y(t), top * 0.95, 2.2 * S, 1.1 * S)
    w, top, bot, n, zo = sec(lt(0.72))
    barbette(k, M, 'AL', 0, Y(0.72), top * 0.96, 2.4 * S, 1.1 * S)
    for i, (x, z, r) in enumerate(((-3.0, 0.0, 2.0), (3.0, 0.0, 2.0))):
        k.nozzle('nozzle', (x * S, Y(1.0) - 0.8 * S, z * S), r * S, 2.0 * r * S, M, glow='GLOW')
        k.cowl('cowl', (x * S, Y(1.0) - 0.4 * S, z * S), r * S, 2.3 * r * S, M)
        k.empty('ENGINE_%d' % i, (x * S, Y(1.0) - 2.0 * r * S, z * S), r * S)
    k.finish(skip=('core', 'body', 'crescent', 'crown_ring', 'star', 'array', 'NODE', 'ENGINE', 'windows', 'mach', 'plate_kit', 'cowl'))
    print('windows', k.deck_windows(('body',), rows=(-0.12, -0.04, 0.04, 0.12, 0.2), step=3.4, size=(0.25, 1.4, 0.8)))


LOOKS = looks('cosmic_darkness', L)
