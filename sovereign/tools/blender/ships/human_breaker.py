"""Human Breaker · Human Hunters battleship (1 km, 5 hardpoints) · Blender hero hull, shipyard batch 3.

Industrial pursuit: a brutal slab of a hull, square and heavy, with a toothed breaker ram for a prow,
exposed girder frames along the flanks, cargo racks, crane booms, armour slabs bolted on in layers,
a stepped command tower aft and a wall of drives. Steel, hazard yellow, orange running lights.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'human_breaker_hero.glb', 'hull': 'human_hunters_battleship', 'tile': 30.0, 'bake_size': 2048}
L = 1000.0
Y0 = L / 2
S = L / 75.0
LOFT0 = 0.14


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.04)
    w = (5.2 + 1.4 * ss(0.0, 0.2, t)) * p * S
    top = (3.8 + 1.0 * ss(0.0, 0.2, t) + 1.2 * ss(0.6, 0.7, t)) * p * S
    bot = (3.6 + 0.8 * ss(0.0, 0.2, t)) * p * S
    return w, top, bot, 7.0, 0.0


LEN = L * (1 - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (1 - LOFT0)


def build(k):
    rnd = random.Random(4)
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    hull = k.loft('body', LEN, sec, rings=36, segs=36, mat=M['HULL'], y0=LY0)
    k.panelize(hull, 36, 36, skip_row=2, skip_col=3, depth=1.2, thickness=1.6, keep=lambda i, j: 2 <= i <= 34)
    k.bevel(hull, 0.8, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)

    # The breaker: a giant wedge ram with teeth along its lip.
    yr = Y(LOFT0)
    k.wedge('ram', (12.0 * S, 12.0 * S, 7.0 * S), (0, yr + 4.0 * S, -0.6 * S), M['TRIM'], slope=0.85, back=0.0)
    k.wedge('ram_plate', (12.8 * S, 6.0 * S, 1.6 * S), (0, yr + 7.0 * S, -3.6 * S), M['GOLD'], slope=0.3)
    for i in range(9):
        x = (i - 4) * 1.35 * S
        fang(k, 'ram_tooth', (x, yr + 9.4 * S, -3.4 * S), (x, yr + 13.0 * S, -3.0 * S), 0.6 * S, M['TRIM'], sides=4)
    for s in (-1, 1):
        k.wedge('ram_cheek', (2.0 * S, 10.0 * S, 6.0 * S), (s * 6.4 * S, yr + 2.0 * S, -0.4 * S), M['HULL'], slope=0.6)

    # Girder frames along both flanks: verticals, a top and bottom chord, diagonals.
    for s in (-1, 1):
        x = s * 7.3 * S
        for zc in (-2.6 * S, 3.6 * S):
            k.box('girder_chord', (0.6 * S, 52.0 * S, 0.6 * S), (x, Y(0.53), zc), M['TRIM'])
        for q in range(14):
            y = Y(0.28) - q * 3.9 * S
            k.box('girder_post', (0.5 * S, 0.5 * S, 6.2 * S), (x, y, 0.5 * S), M['TRIM'])
            if q < 13:
                k.tube('girder_brace', [(x, y, -2.6 * S), (x, y - 3.9 * S, 3.6 * S)], [0.18 * S] * 2, M['GOLD'], bevel_res=1, ends=('flat', 'flat'), res=1)
        # Cargo racks between the girders and the hull.
        for q in range(10):
            if rnd.random() < 0.25:
                continue
            y = Y(0.3) - q * 5.0 * S
            k.box('cargo', (1.4 * S, 3.6 * S, 2.2 * S), (s * 6.4 * S, y, (rnd.random() - 0.3) * 3.0 * S), M['GOLD'] if q % 4 == 0 else M['HULL'])
        # Crane booms on the shoulders.
        for t in (0.34, 0.62):
            b = (s * 5.0 * S, Y(t), 4.8 * S)
            k.box('crane_base', (2.0 * S, 2.0 * S, 1.2 * S), b, M['TRIM'])
            k.box('crane_mast', (0.7 * S, 0.7 * S, 5.0 * S), (b[0], b[1], b[2] + 3.0 * S), M['GOLD'])
            k.box('crane_jib', (6.0 * S, 0.6 * S, 0.6 * S), (b[0] + s * 2.4 * S, b[1], b[2] + 5.4 * S), M['GOLD'])
            k.box('crane_head', (0.9 * S, 1.2 * S, 0.9 * S), (b[0] + s * 5.2 * S, b[1], b[2] + 4.8 * S), M['TRIM'])
            k.box('crane_cable', (0.1 * S, 0.1 * S, 3.0 * S), (b[0] + s * 5.2 * S, b[1], b[2] + 3.0 * S), M['TRIM'])
        k.light_strip('running', (s * 7.7 * S, Y(0.28), 4.1 * S), (s * 7.7 * S, Y(0.8), 4.1 * S), 25, 1.4, M['GLOW'])

    # Hazard stripes along the deck edges and across the ram's root.
    for s in (-1, 1):
        for q in range(18):
            t = 0.2 + q * 0.035
            w, top, bot, n, zo = sec(lt(t))
            k.box('hazard', (1.0 * S, 1.6 * S, 0.25 * S), (s * w * 0.88, Y(t), top * 0.99), M['GOLD'] if q % 2 == 0 else M['TRIM'])
    # Bolted armour slabs on the deck, stepped command tower aft.
    for q in range(8):
        t = 0.24 + q * 0.07
        w, top, bot, n, zo = sec(lt(t))
        k.box('slab', ((7.0 - (q % 3)) * S, 4.4 * S, 0.9 * S), (0, Y(t), top * 0.97 + 0.4 * S), M['HULL'] if q % 2 else M['TRIM'])
    w, top, bot, n, zo = sec(lt(0.8))
    for i, (wd, ln, ht) in enumerate(((8.0, 12.0, 3.0), (6.0, 8.0, 3.0), (4.0, 5.0, 2.6))):
        k.box('tower', (wd * S, ln * S, ht * S), (0, Y(0.8) - i * 1.0 * S, top + (1.5 + i * 3.0) * S), M['HULL'] if i % 2 == 0 else M['TRIM'])
    k.box('tower_glass', (3.6 * S, 0.1 * S, 0.5 * S), (0, Y(0.8) - 2.0 * S + 2.55 * S, top + 8.0 * S), k.window_material())
    k.sensor_mast('tower_mast', (0, Y(0.81), top + 9.4 * S), 50.0, M['TRIM'], M['GLOW'], dish=8.0)

    machinery_bands(k, M, sec, LEN, LY0, lt, 0.2, 0.92, 5.0, seed=811, dorsal_gap=None, density=0.9)

    for s, bank, t in ((-1, 'FL', 0.3), (1, 'FR', 0.3), (-1, 'ML', 0.55), (1, 'MR', 0.55)):
        w, top, bot, n, zo = sec(lt(t))
        barbette(k, M, bank, s * w * 0.62, Y(t), top * 1.0 + 1.3 * S, 2.3 * S, 1.2 * S)
    w, top, bot, n, zo = sec(lt(0.7))
    barbette(k, M, 'AL', 0, Y(0.7), top * 1.0 + 1.3 * S, 2.8 * S, 1.2 * S)

    # A wall of drives.
    for i, (x, z) in enumerate(((-3.6, -1.8), (0.0, -1.8), (3.6, -1.8), (-1.8, 1.8), (1.8, 1.8))):
        k.nozzle('nozzle', (x * S, Y(1.0) - 0.8 * S, z * S), 1.6 * S, 2.6 * S, M, glow='GLOW')
        k.empty('ENGINE_%d' % i, (x * S, Y(1.0) - 2.2 * S, z * S), 1.6 * S)

    # Dress the slab: deck, both flanks and the belly, then the ram's faces.
    w, top, bot, n, zo = sec(lt(0.55))
    k.plane_kit('deck_kit', (0, Y(0.56), top), (1, 0, 0), (0, 1, 0), (0, 0, 1), (w * 1.7, 0.72 * L), M, count=70, h=3.6, seed=2300)
    for s in (-1, 1):
        k.plane_kit('flank_kit', (s * w, Y(0.56), 0.4 * S), (0, s, 0), (0, 0, 1), (s, 0, 0), (0.72 * L, (top + bot) * 0.75), M, count=40, h=3.0, seed=2310 + (s > 0))
    k.plane_kit('belly_kit', (0, Y(0.56), -bot), (1, 0, 0), (0, -1, 0), (0, 0, -1), (w * 1.7, 0.72 * L), M, count=40, h=3.6, seed=2320)
    k.box_kit('ram_kit', (0, Y(LOFT0) + 2.0 * S, -0.6 * S), (12.0 * S, 6.0 * S, 7.0 * S), M, faces=('left', 'right'), count=12, h=2.6, seed=2330)
    k.finish(skip=('core', 'body', 'NODE', 'ENGINE', 'windows', 'mach', 'plate_kit', 'deck_kit', 'flank_kit', 'belly_kit', 'ram_kit'))
    print('windows', k.deck_windows(('body', 'tower'), rows=(-0.2, -0.12, -0.04, 0.04, 0.12, 0.2, 0.3), step=3.0, size=(0.25, 1.4, 0.8)))


LOOKS = looks('human_hunters', L)
