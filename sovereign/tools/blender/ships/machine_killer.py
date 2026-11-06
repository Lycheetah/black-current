"""Machine Killer · AI Hunters battleship (1 km, 5 hardpoints) · AI Hunters flagship.

Anti-machine artillery: a faceted stealth hull built around twin colossal spinal railguns that run
side by side past the bow; a red-line sensor ring; radiator banks along the flanks; missile cells;
an angular command tower offset to starboard. Dominant feature: the twin guns."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'machine_killer_hero.glb', 'hull': 'ai_hunters_battleship', 'tile': 30.0, 'bake_size': 2048}
L = 1000.0
Y0 = L / 2
S = L / 75.0
LOFT0 = 0.18


def Y(t):
    return Y0 - t * L


def sec(t):
    p = min(1.0, t / 0.12)
    w = (3.0 + 5.0 * ss(0.0, 0.3, t)) * (1 - 0.2 * ss(0.85, 1, t)) * max(0.08, p) * S
    top = (2.0 + 2.4 * ss(0.0, 0.3, t)) * max(0.08, p) * S
    bot = (1.8 + 1.6 * ss(0.0, 0.3, t)) * max(0.08, p) * S
    return w, top, bot, 1.0, 0.0        # diamond: faceted stealth section


LEN = L * (1 - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (1 - LOFT0)


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    hull = k.loft('body', LEN, sec, rings=28, segs=8, mat=M['HULL'], y0=LY0)
    k.bevel(hull, 0.6, 1, 20)
    k.weighted_normals(hull)
    hull.data.set_sharp_from_angle(angle=math.radians(20))
    # Dress the faceted dorsal planes.
    for q in range(7):
        t = 0.26 + q * 0.1
        w, top, bot, n, zo = sec(lt(t))
        for s in (-1, 1):
            ln = math.hypot(w, top)
            k.plane_kit('facet_kit', (s * w * 0.5, Y(t), top * 0.5), (s * w / ln, 0, -top / ln), (0, 1, 0), (s * top / ln, 0, w / ln), (ln * 0.8, 0.09 * L), M, count=10, h=3.0, seed=6200 + q * 2 + (s > 0))
    # Twin spinal railguns: two long box-section barrels side by side, running past the bow.
    for s in (-1, 1):
        gx = s * 3.4 * S
        y0, y1 = Y(-0.12), Y(0.72)
        ln, yc = y0 - y1, (y0 + y1) / 2
        k.box('gun_rail', (2.6 * S, ln, 3.4 * S), (gx, yc, 2.4 * S), M['TRIM'])
        k.box('gun_channel', (0.6 * S, ln * 0.96, 0.4 * S), (gx, yc, 4.15 * S), M['GLOW'])
        k.box_kit('gun_kit', (gx, yc, 2.4 * S), (2.6 * S, ln * 0.94, 3.4 * S), M, faces=('right' if s > 0 else 'left',), count=14, h=2.4, seed=6220 + (s > 0))
        for q in range(16):
            y = Y(-0.1 + q * 0.05)
            big = q % 4 == 0
            k.box('gun_coil', ((3.6 if big else 3.1) * S, (1.4 if big else 0.8) * S, (4.4 if big else 4.0) * S), (gx, y, 2.4 * S), M['HULL'] if big else M['TRIM'])
        k.box('gun_muzzle', (3.8 * S, 3.0 * S, 4.8 * S), (gx, Y(-0.12) + 0.2 * S, 2.4 * S), M['HULL'])
        k.box('gun_bore', (1.4 * S, 0.3 * S, 1.6 * S), (gx, Y(-0.12) - 1.4 * S, 2.4 * S), M['CORE'])
    # The red-line sensor ring at the bow and radiator banks along the flanks.
    k.armour_ring('sensor_ring', 7.0 * S, 0.8 * S, 1.8 * S, (0, Y(0.2), 0.6 * S), M, rot=(math.pi / 2, 0, 0), blocks=20, gap=0.1)
    for s in (-1, 1):
        w, top, bot, n, zo = sec(lt(0.6))
        for j, t in enumerate((0.44, 0.6, 0.76)):
            w, top, bot, n, zo = sec(lt(t))
            k.radiator_bank('radiator', (s * w * 0.62, Y(t), top * 0.3), (0, 1, 0), (0, 0, 1), (s * 0.7, 0, 0.7), 10.0 * S, 6.0 * S, 3.0 * S, M, fins=12)
        k.missile_cells('cells', (s * w * 0.3, Y(0.84), sec(lt(0.84))[1] * 0.72), (1, 0, 0), (0, 1, 0), (0, 0, 1), 3, 6, 1.6 * S, M)
    # Angular command tower offset to starboard.
    w, top, bot, n, zo = sec(lt(0.7))
    k.wedge('tower', (8.0 * S, 14.0 * S, 10.0 * S), (5.0 * S, Y(0.7), top * 0.6 + 5.0 * S), M['HULL'], slope=0.6, back=0.3)
    k.box('tower_slit', (6.0 * S, 0.2 * S, 0.5 * S), (5.0 * S, Y(0.7) + 4.0 * S, top * 0.6 + 7.0 * S), M['GLOW'])
    k.box_kit('tower_kit', (5.0 * S, Y(0.72), top * 0.6 + 5.0 * S), (8.0 * S, 8.0 * S, 10.0 * S), M, faces=('left', 'right'), count=8, h=2.2, seed=6230)
    k.antenna_array('tower_array', (5.0 * S, Y(0.74), top * 0.6 + 10.0 * S), (0, 0, 1), 16.0 * S, M, count=5, spread=2.4 * S, seed=6240)
    k.machinery('mach_belly', sec, LEN, LY0, lt(0.3), lt(0.9), math.pi + 1.2, math.tau - 1.2, M, count=50, h=5.0, seed=6250)
    for s, bank, t in ((-1, 'FL', 0.36), (1, 'FR', 0.36), (-1, 'ML', 0.56), (1, 'MR', 0.56)):
        w, top, bot, n, zo = sec(lt(t))
        barbette(k, M, bank, s * w * 0.62, Y(t), top * 0.4, 2.0 * S, 1.0 * S)
    barbette(k, M, 'AL', -4.0 * S, Y(0.8), sec(lt(0.8))[1] * 0.62, 2.4 * S, 1.0 * S)
    w, top, bot, n, zo = sec(1.0)
    k.box('stern', (w * 1.6, 2.0 * S, top * 1.4), (0, Y(1.0) + 0.4 * S, 0), M['TRIM'])
    for i, x in enumerate((-5.0, -1.7, 1.7, 5.0)):
        k.box('drive_slot', (2.6 * S, 0.8 * S, 1.6 * S), (x * S, Y(1.0) - 0.6 * S, 0), M['CORE'])
        k.box('drive_glow', (2.2 * S, 0.2 * S, 1.2 * S), (x * S, Y(1.0) - 0.3 * S, 0), M['GLOW'])
        k.empty('ENGINE_%d' % i, (x * S, Y(1.0) - 1.6 * S, 0), 1.2 * S)
    k.finish(skip=('core', 'body', 'sensor_ring', 'NODE', 'ENGINE', 'windows', 'mach', 'facet_kit', 'gun_kit', 'tower_kit', 'radiator', 'cells', 'tower_array'))
    print('windows', k.deck_windows(('tower',), rows=(0.2, 0.3), step=3.0, size=(0.25, 1.2, 0.6)))


LOOKS = looks('ai_hunters', L)
