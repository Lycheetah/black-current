"""Crowned Needle · AI Gods frigate (60 m, 2 hardpoints) · the AI Gods line.

A black needle carrying its god: a crowned command core rides mid-ship in its reliquary hoops,
two short temple-step wings, gold oath bands, a single great drive. Strict symmetry."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402
from _godmachine import command_core, crown, oath_bands, stepped_wing  # noqa: E402

META = {'name': 'crowned_needle_hero.glb', 'hull': 'ai_gods_frigate', 'tile': 3.0, 'bake_size': 1024}
L = 60.0
Y0 = L / 2
S = L / 50.0


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.22)
    w = (1.0 + 1.5 * ss(0.1, 0.5, t)) * (1 - 0.3 * ss(0.85, 1, t)) * p * S
    top = (1.0 + 1.3 * ss(0.1, 0.5, t)) * p * S
    bot = (0.9 + 1.0 * ss(0.1, 0.5, t)) * p * S
    return w, top, bot, 4.0, 0.0


lt = lambda t: t


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    M['CORE_LIGHT'] = k.material('CORE_LIGHT', (1.0, 0.9, 0.6), 0.0, 0.3, emit=(1.0, 0.85, 0.55))
    hull = k.loft('body', L, sec, rings=30, segs=28, mat=M['HULL'], y0=Y(0))
    k.panelize(hull, 30, 28, skip_row=3, skip_col=4, depth=0.06, thickness=0.08, keep=lambda i, j: 3 <= i <= 27)
    k.bevel(hull, 0.05, 1, 30)
    k.weighted_normals(hull)
    hull.data.set_sharp_from_angle(angle=math.radians(35))
    armour(k, M, sec, L, Y(0), lt, dorsal=((0.18, 0.32), (0.62, 0.76), (0.75, 0.88)), flanks=((0.2, 0.36), (0.6, 0.78)), thick=0.14, seed=5000)
    machinery_bands(k, M, sec, L, Y(0), lt, 0.2, 0.88, 0.4, seed=5010, dorsal_gap=None, density=0.5)
    oath_bands(k, M, sec, L, Y(0), lt, (0.16, 0.34, 0.6, 0.86), 0.12)
    # The crowned core mid-ship, raised on a pedestal.
    w, top, bot, n, zo = sec(0.48)
    k.box('pedestal', (2.2 * S, 3.0 * S, 1.0 * S), (0, Y(0.48), top + 0.4 * S), M['TRIM'])
    command_core(k, M, (0, Y(0.48), top + 2.4 * S), 0.8 * S)
    crown(k, M, (0, Y(0.48), top + 0.9 * S), 1.9 * S, 8, 1.8 * S, 0.22 * S)
    # Temple-step wings and a needle lance.
    for s in (-1, 1):
        stepped_wing(k, M, (s * 1.8 * S, Y(0.66), -0.2 * S), 6.0 * S, 5.0 * S, 0.45 * S, s, tiers=3, sweep=-0.25, seed=5020 + (s > 0), h_kit=0.3)
    k.tube('lance', [(0, Y(0.04), 0.0), (0, Y(-0.06), 0.0), (0, Y(-0.16), 0.0)], [0.35 * S, 0.22 * S, 0.04 * S], M['GOLD'], ends=('flat', 'point'), res=3)
    for s, bank in ((-1, 'FL'), (1, 'FR')):
        w, top, bot, n, zo = sec(0.3)
        barbette(k, M, bank, s * w * 0.55, Y(0.3), top * 0.9, 0.8 * S, 0.45 * S)
    k.nozzle('nozzle', (0, Y(1.0) - 0.3 * S, 0), 1.3 * S, 2.2 * S, M, glow='GLOW')
    k.cowl('cowl', (0, Y(1.0) - 0.05 * S, 0), 1.3 * S, 2.6 * S, M)
    k.empty('ENGINE_MAIN', (0, Y(1.0) - 1.6 * S, 0), 1.3 * S)
    k.finish(skip=('core', 'body', 'crown_ring', 'NODE', 'ENGINE', 'windows', 'mach', 'plate_kit', 'cowl', 'wing_kit', 'zig_kit'))
    print('windows', k.deck_windows(('body',), rows=(-0.08, 0.0, 0.08), step=2.2, size=(0.15, 0.9, 0.45)))


LOOKS = dict(looks('ai_gods', L), CORE_LIGHT=dict(emit=(1.0, 0.86, 0.56)))
