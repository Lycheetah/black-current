"""Solis Regent · Sol Symbiots battleship (1 km, 5 hardpoints) · Blender hero hull, shipyard batch 5.

Built to EVE's lessons: one dominant feature (two great forward-swept wing blocks carrying the guns),
stepped wedge tiers on a slab hull, an offset bridge tower to starboard, big clean planes cut by lit
channels, detail gathered in the channels and under the wings. Pale steel, silver, cyan.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'solis_regent_hero.glb', 'hull': 'sol_symbiots_battleship', 'tile': 30.0, 'bake_size': 2048}
L = 1000.0
Y0 = L / 2
S = L / 75.0
LOFT0 = 0.12


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.05)
    w = (3.0 + 3.2 * ss(0.0, 0.3, t)) * (1 - 0.15 * ss(0.85, 1, t)) * p * S
    top = (2.0 + 1.6 * ss(0.0, 0.3, t)) * p * S
    bot = (2.0 + 1.2 * ss(0.0, 0.3, t)) * p * S
    return w, top, bot, 8.0, 0.0


LEN = L * (1 - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (1 - LOFT0)


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    hull = k.loft('body', LEN, sec, rings=30, segs=32, mat=M['HULL'], y0=LY0)
    k.bevel(hull, 0.8, 1, 30)
    k.weighted_normals(hull)
    hull.data.set_sharp_from_angle(angle=math.radians(30))
    # Prow: a long armoured wedge.
    k.wedge('prow', (8.0 * S, 14.0 * S, 4.4 * S), (0, Y(LOFT0) + 5.0 * S, 0.0), M['TRIM'], slope=0.9, back=0.0)
    k.wedge('prow_cap', (5.0 * S, 10.0 * S, 1.2 * S), (0, Y(LOFT0) + 3.0 * S, 2.6 * S), M['HULL'], slope=0.7)
    # Stepped wedge tiers along the spine, each edged with a lit channel.
    for i, (t, wd, ln) in enumerate(((0.45, 11.0, 34.0), (0.55, 8.4, 26.0), (0.64, 5.6, 18.0))):
        w, top, bot, n, zo = sec(lt(t))
        z = top + (i * 2.4 + 1.2) * S
        k.wedge('tier', (wd * S, ln * S, 2.4 * S), (0, Y(t), z), M['HULL'] if i % 2 == 0 else M['TRIM'], slope=0.35, back=0.15)
        for s in (-1, 1):
            k.box('channel', (0.25 * S, ln * 0.8 * S, 0.25 * S), (s * wd * 0.5 * S, Y(t) - ln * 0.05 * S, z - 1.0 * S), M['GLOW'])
        k.machinery('mach_tier', sec, LEN, LY0, lt(t - 0.05), lt(t + 0.02), 0.2, math.pi - 0.2, M, count=24, h=3.0, seed=1400 + i)
    # The wings: two great forward-swept blocks per side, stacked, guns on their tips.
    for s in (-1, 1):
        w, top, bot, n, zo = sec(lt(0.5))
        for j, (dx, dz, wd, ln, ht, ang) in enumerate(((10.0, -0.5, 7.0, 34.0, 3.4, 0.42), (8.0, 2.8, 5.0, 24.0, 2.4, 0.36))):
            blk = k.wedge('wing', (wd * S, ln * S, ht * S), (s * (w + dx * S), Y(0.5) + 6.0 * S, dz * S), M['TRIM'] if j == 0 else M['HULL'], slope=0.5, back=0.2, rot=(0, 0, -s * ang))
            k.box('wing_channel', (0.3 * S, ln * 0.7 * S, 0.3 * S), (s * (w + dx * S), Y(0.5) + 6.0 * S, dz * S + ht * 0.5 * S + 0.1 * S), M['GLOW'], rot=(0, 0, -s * ang))
        k.box('wing_root', (8.0 * S, 10.0 * S, 3.0 * S), (s * (w + 3.0 * S), Y(0.52), 0.0), M['HULL'])
        k.machinery('mach_wing', sec, LEN, LY0, lt(0.42), lt(0.62), (math.pi + 0.6) if s < 0 else -0.6, (math.pi + 1.0) if s < 0 else -1.0, M, count=20, h=4.0, seed=1410 + (s > 0))
    # Offset bridge tower (starboard).
    w, top, bot, n, zo = sec(lt(0.76))
    for i, (wd, ln, ht) in enumerate(((6.0, 10.0, 4.0), (4.6, 8.0, 4.0), (3.2, 6.0, 3.4))):
        k.box('tower', (wd * S, ln * S, ht * S), (3.4 * S, Y(0.76) - i * 0.8 * S, top + (2.0 + i * 4.0) * S), M['HULL'] if i % 2 == 0 else M['TRIM'])
    k.box('tower_glass', (3.0 * S, 0.1 * S, 0.5 * S), (3.4 * S, Y(0.76) - 1.6 * S + 3.05 * S, top + 11.0 * S), k.window_material())
    for i in range(3):
        k.sensor_mast('array', (3.0 * S + i * 0.5 * S, Y(0.77), top + 13.4 * S), 40.0 + 20.0 * i, M['TRIM'], M['GLOW'], dish=8.0 if i == 1 else 0)
    machinery_bands(k, M, sec, LEN, LY0, lt, 0.18, 0.92, 5.0, seed=1420, dorsal_gap=None, density=0.6)
    for s, bank in ((-1, 'FL'), (1, 'FR')):
        w, top, bot, n, zo = sec(lt(0.5))
        tipx = s * (w + 10.0 * S + math.sin(0.42) * 15.0 * S)
        barbette(k, M, bank, tipx, Y(0.5) + 6.0 * S + math.cos(0.42) * 14.0 * S, 1.2 * S, 2.0 * S, 1.0 * S)
    for s, bank, t in ((-1, 'ML', 0.66), (1, 'MR', 0.6)):
        w, top, bot, n, zo = sec(lt(t))
        barbette(k, M, bank, s * w * 0.62, Y(t), top + 0.6 * S, 2.0 * S, 1.0 * S)
    w, top, bot, n, zo = sec(lt(0.34))
    barbette(k, M, 'AL', 0, Y(0.34), top + 0.6 * S, 2.4 * S, 1.0 * S)
    # Stern block with a row of square drives.
    k.box('stern', (13.0 * S, 4.0 * S, 7.0 * S), (0, Y(0.98), 0), M['TRIM'])
    for i, x in enumerate((-4.5, -1.5, 1.5, 4.5)):
        k.box('drive_frame', (2.6 * S, 1.0 * S, 2.6 * S), (x * S, Y(1.0) - 0.2 * S, 0), M['HULL'])
        k.box('drive_glow', (2.0 * S, 0.2 * S, 2.0 * S), (x * S, Y(1.0) - 0.75 * S, 0), M['GLOW'])
        k.empty('ENGINE_%d' % i, (x * S, Y(1.0) - 1.4 * S, 0), 1.2 * S)
    k.finish(skip=('core', 'body', 'NODE', 'ENGINE', 'windows', 'mach', 'plate_kit'))
    print('windows', k.deck_windows(('body', 'tower', 'tier'), rows=(-0.12, -0.04, 0.04, 0.12, 0.2, 0.3), step=3.2, size=(0.25, 1.4, 0.8)))


LOOKS = looks('sol_symbiots', L)
