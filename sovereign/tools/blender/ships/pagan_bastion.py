"""Pagan Bastion · Pagan AI battleship (1 km, 5 hardpoints) · Pagan AI flagship (v2).

A warship first, a bone temple second: a long armoured hull plated in bone, bone ribs wrapping flush
over it as armour bands, a faceted skull mask built into the prow with three burning sockets and
sweeping gold horns, a dorsal crest of tapered bone blades with amber veins, reliquary towers,
carved-vein bone armour. Dominant feature: the skull-prowed hull under its bone crest."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402
from _ossuary import rib_armour, skull_mask, bone_crest, reliquary  # noqa: E402

META = {'name': 'pagan_bastion_hero.glb', 'hull': 'pagan_ai_battleship', 'tile': 30.0, 'bake_size': 2048}
L = 1000.0
Y0 = L / 2
S = L / 75.0
LOFT0 = 0.12


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.05)
    w = (4.4 + 2.2 * ss(0.0, 0.3, t) + 0.6 * bump(0.5, 0.12, t)) * (1 - 0.3 * ss(0.82, 1, t)) * p * S
    top = (3.6 + 2.0 * ss(0.0, 0.3, t)) * p * S
    bot = (3.2 + 1.6 * ss(0.0, 0.3, t)) * p * S
    return w, top, bot, 3.0, 0.0


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
    armour(k, M, sec, LEN, LY0, lt, dorsal=((0.16, 0.26), (0.84, 0.94)), flanks=((0.18, 0.32), (0.36, 0.5), (0.54, 0.68), (0.72, 0.86)), thick=2.2, seed=6800)
    machinery_bands(k, M, sec, LEN, LY0, lt, 0.16, 0.94, 5.0, seed=6810, dorsal_gap=None, density=0.9)
    # Bone ribs wrapping flush over the hull, close-set like a ribcage.
    rib_armour(k, M, sec, LEN, LY0, lt, [0.28 + i * 0.045 for i in range(12)], 1.0 * S)
    # The skull mask at the prow.
    w, top, bot, n, zo = sec(lt(LOFT0 + 0.02))
    skull_mask(k, M, Y(LOFT0) - 1.0 * S, 1.0 * S, 12.0 * S, 12.0 * S, S)
    # The dorsal bone crest, tallest over the middle of the ribcage.
    bone_crest(k, M, lambda t: Y(t), lambda t: sec(lt(t))[1] * 1.04 + 1.0 * S, [0.3 + i * 0.05 for i in range(10)],
               lambda i: (6.0 + 10.0 * math.sin(math.pi * (i + 0.5) / 10)) * S, lean=-0.4, S=S)
    # Reliquary towers on the shoulders.
    for t in (0.36, 0.7):
        w, top, bot, n, zo = sec(lt(t))
        for s in (-1, 1):
            reliquary(k, M, (s * w * 0.62, Y(t), top * 0.72), 4.4 * S, 10.0 * S)
    for s, bank, t in ((-1, 'FL', 0.24), (1, 'FR', 0.24), (-1, 'ML', 0.56), (1, 'MR', 0.56)):
        w, top, bot, n, zo = sec(lt(t))
        barbette(k, M, bank, s * w * 0.62, Y(t), top * 0.8, 2.2 * S, 1.1 * S)
    w, top, bot, n, zo = sec(lt(0.88))
    barbette(k, M, 'AL', 0, Y(0.88), top * 0.96, 2.4 * S, 1.1 * S)
    for i, (x, z, r) in enumerate(((-3.6, -1.0, 2.2), (3.6, -1.0, 2.2), (0.0, 2.6, 2.4))):
        k.nozzle('nozzle', (x * S, Y(1.0) - 0.8 * S, z * S), r * S, 2.0 * r * S, M, glow='GLOW')
        k.cowl('cowl', (x * S, Y(1.0) - 0.4 * S, z * S), r * S, 2.3 * r * S, M)
        k.empty('ENGINE_%d' % i, (x * S, Y(1.0) - 2.0 * r * S, z * S), r * S)
    k.finish(skip=('core', 'body', 'rib_band', 'rib_knuckle', 'bone_vein', 'reliq_flame', 'skull_fire', 'NODE', 'ENGINE', 'windows', 'mach', 'plate_kit', 'cowl'))
    print('windows', k.deck_windows(('body',), rows=(-0.2, -0.12, -0.04, 0.04), step=3.4, size=(0.25, 1.4, 0.8)))


LOOKS = looks('pagan_ai', L)
