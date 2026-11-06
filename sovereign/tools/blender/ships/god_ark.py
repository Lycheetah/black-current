"""God Ark · AI Gods cruiser (280 m, 4 hardpoints) · the AI Gods line.

A temple that flies: a broad obsidian monolith carrying a stepped ziggurat amidships, the command
core enshrined at its summit inside a crown, four temple-step wings, gold oath bands, a lance-prow
of three gilded blades, a stern block of drives. Strict symmetry."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402
from _godmachine import command_core, crown, oath_bands, ziggurat, stepped_wing  # noqa: E402

META = {'name': 'god_ark_hero.glb', 'hull': 'ai_gods_cruiser', 'tile': 12.0, 'bake_size': 2048}
L = 280.0
Y0 = L / 2
S = L / 50.0
LOFT0 = 0.08


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.07)
    w = (2.6 + 2.6 * ss(0.0, 0.3, t)) * (1 - 0.15 * ss(0.85, 1, t)) * p * S
    top = (2.0 + 1.6 * ss(0.0, 0.3, t)) * p * S
    bot = (2.0 + 1.4 * ss(0.0, 0.3, t)) * p * S
    return w, top, bot, 4.5, 0.0


LEN = L * (1 - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (1 - LOFT0)


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    M['CORE_LIGHT'] = k.material('CORE_LIGHT', (1.0, 0.9, 0.6), 0.0, 0.3, emit=(1.0, 0.85, 0.55))
    hull = k.loft('body', LEN, sec, rings=36, segs=32, mat=M['HULL'], y0=LY0)
    k.panelize(hull, 36, 32, skip_row=3, skip_col=4, depth=0.3, thickness=0.36, keep=lambda i, j: 3 <= i <= 33)
    k.bevel(hull, 0.25, 1, 30)
    k.weighted_normals(hull)
    hull.data.set_sharp_from_angle(angle=math.radians(35))
    armour(k, M, sec, LEN, LY0, lt, dorsal=((0.12, 0.24), (0.72, 0.84), (0.83, 0.94)), flanks=((0.14, 0.28), (0.3, 0.44), (0.56, 0.7), (0.72, 0.86)), thick=0.6, seed=5200)
    machinery_bands(k, M, sec, LEN, LY0, lt, 0.14, 0.94, 1.8, seed=5210, dorsal_gap=None, density=0.9)
    oath_bands(k, M, sec, LEN, LY0, lt, (0.12, 0.26, 0.7, 0.88), 0.4)
    # The ziggurat amidships, and the enshrined core under its crown at the summit.
    w, top, bot, n, zo = sec(lt(0.48))
    summit = ziggurat(k, M, (0, Y(0.48), top - 0.4 * S), w * 1.6, 0.36 * L, 4, 1.8 * S, shrink=0.72, seed=5220, h_kit=1.4)
    command_core(k, M, (0, Y(0.48), summit + 3.6 * S), 1.6 * S)
    crown(k, M, (0, Y(0.48), summit + 0.6 * S), 4.0 * S, 12, 3.6 * S, 0.45 * S)
    # A lance-prow of three gilded blades.
    for x, z, f in ((0.0, 0.6, 1.0), (-1.6, -0.6, 0.7), (1.6, -0.6, 0.7)):
        fang(k, 'prow_blade', (x * S, Y(LOFT0) + 1.0 * S, z * S), (x * S * 0.6, Y(LOFT0) + (1.0 + 16.0 * f) * S, z * S * 0.6), 1.1 * S * f, M['GOLD'], sides=4)
    k.armour_ring('prow_collar', 3.2 * S, 0.5 * S, 1.4 * S, (0, Y(LOFT0) + 0.6 * S, 0.0), M, rot=(math.pi / 2, 0, 0), blocks=14, gap=0.12)
    # Four temple-step wings (two per side, fore and aft).
    for s in (-1, 1):
        stepped_wing(k, M, (s * 4.2 * S, Y(0.36), -0.6 * S), 9.0 * S, 9.0 * S, 0.9 * S, s, tiers=3, sweep=-0.2, seed=5230 + (s > 0), h_kit=1.1)
        stepped_wing(k, M, (s * 4.4 * S, Y(0.7), -0.8 * S), 7.0 * S, 8.0 * S, 0.8 * S, s, tiers=3, sweep=-0.3, seed=5240 + (s > 0), h_kit=1.0)
    for s, bank, t in ((-1, 'FL', 0.24), (1, 'FR', 0.24), (-1, 'ML', 0.76), (1, 'MR', 0.76)):
        w, top, bot, n, zo = sec(lt(t))
        barbette(k, M, bank, s * w * 0.5, Y(t), top * 0.95, 1.2 * S, 0.8 * S)
    k.box('stern', (9.0 * S, 3.0 * S, 6.0 * S), (0, Y(0.98), 0), M['TRIM'])
    k.box_kit('stern_kit', (0, Y(0.98), 0), (9.0 * S, 3.0 * S, 6.0 * S), M, faces=('top', 'left', 'right'), count=8, h=1.2, seed=5250)
    for i, (x, z) in enumerate(((-2.6, -1.2), (2.6, -1.2), (0.0, 1.4))):
        k.nozzle('nozzle', (x * S, Y(1.0) - 0.4 * S, z * S), 1.1 * S, 2.0 * S, M, glow='GLOW')
        k.empty('ENGINE_%d' % i, (x * S, Y(1.0) - 1.6 * S, z * S), 1.1 * S)
    k.finish(skip=('core', 'body', 'crown_ring', 'prow_collar', 'NODE', 'ENGINE', 'windows', 'mach', 'plate_kit', 'cowl', 'wing_kit', 'zig_kit', 'stern_kit', 'oath'))
    print('windows', k.deck_windows(('body', 'zig'), rows=(-0.16, -0.08, 0.0, 0.08, 0.16, 0.26), step=2.6, size=(0.2, 1.2, 0.6)))


LOOKS = dict(looks('ai_gods', L), CORE_LIGHT=dict(emit=(1.0, 0.86, 0.56)))
