"""Machine Emperor · AI Gods battleship (1 km, 5 hardpoints) · the AI Gods flagship.

The throne: a vast obsidian monolith; at its stern a throne tower rises in temple steps, a great
halo-crown standing behind it; in its chest the command core burns in an open reliquary under a
crown; a triple lance of gilded blades at the bow; two stacked temple-step wings a side; gold oath
bands every forty metres. Strict, overwhelming symmetry."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402
from _godmachine import command_core, crown, oath_bands, ziggurat, stepped_wing  # noqa: E402

META = {'name': 'machine_emperor_hero.glb', 'hull': 'ai_gods_battleship', 'tile': 30.0, 'bake_size': 2048}
L = 1000.0
Y0 = L / 2
S = L / 75.0
LOFT0 = 0.08


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.06)
    w = (3.6 + 3.6 * ss(0.0, 0.3, t)) * (1 - 0.15 * ss(0.85, 1, t)) * p * S
    top = (2.8 + 2.2 * ss(0.0, 0.3, t)) * p * S
    bot = (2.8 + 2.0 * ss(0.0, 0.3, t)) * p * S
    return w, top, bot, 4.5, 0.0


LEN = L * (1 - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (1 - LOFT0)


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    M['SUNCORE'] = k.material('SUNCORE', (1.0, 0.9, 0.6), 0.0, 0.3, emit=(1.0, 0.85, 0.55))
    hull = k.loft('body', LEN, sec, rings=40, segs=34, mat=M['HULL'], y0=LY0)
    k.panelize(hull, 40, 34, skip_row=3, skip_col=4, depth=1.0, thickness=1.2, keep=lambda i, j: 3 <= i <= 37)
    k.bevel(hull, 0.8, 1, 30)
    k.weighted_normals(hull)
    hull.data.set_sharp_from_angle(angle=math.radians(35))
    armour(k, M, sec, LEN, LY0, lt, dorsal=((0.36, 0.48), (0.47, 0.6)), flanks=((0.14, 0.28), (0.3, 0.44), (0.5, 0.64), (0.68, 0.82)), thick=2.2, seed=5300)
    machinery_bands(k, M, sec, LEN, LY0, lt, 0.14, 0.92, 5.0, seed=5310, dorsal_gap=(0.6, 0.66), density=1.0)
    oath_bands(k, M, sec, LEN, LY0, lt, [0.12 + i * 0.04 for i in range(20)], 1.0)
    # The chest: the command core in an open reliquary under a crown.
    w, top, bot, n, zo = sec(lt(0.24))
    k.box('reliquary_base', (10.0 * S, 12.0 * S, 2.0 * S), (0, Y(0.24), top + 0.6 * S), M['TRIM'])
    k.box_kit('reliquary_kit', (0, Y(0.24), top + 0.6 * S), (10.0 * S, 12.0 * S, 2.0 * S), M, faces=('left', 'right', 'front'), count=8, h=3.0, seed=5320)
    command_core(k, M, (0, Y(0.24), top + 7.0 * S), 3.0 * S)
    crown(k, M, (0, Y(0.24), top + 2.2 * S), 7.0 * S, 12, 7.0 * S, 0.8 * S)
    # The throne tower at the stern: temple steps rising, the halo-crown standing behind it.
    w, top, bot, n, zo = sec(lt(0.78))
    summit = ziggurat(k, M, (0, Y(0.78), top - 0.6 * S), w * 1.5, 0.24 * L, 6, 3.2 * S, shrink=0.78, seed=5330, h_kit=3.0)
    k.box('throne_seat', (6.0 * S, 6.0 * S, 7.0 * S), (0, Y(0.8), summit + 3.5 * S), M['HULL'])
    k.box_kit('throne_kit', (0, Y(0.8), summit + 3.5 * S), (6.0 * S, 6.0 * S, 7.0 * S), M, faces=('left', 'right', 'front'), count=8, h=2.6, seed=5340)
    k.box('throne_glass', (4.6 * S, 0.2 * S, 0.8 * S), (0, Y(0.8) + 3.05 * S, summit + 5.0 * S), k.window_material())
    crown(k, M, (0, Y(0.84), summit + 9.0 * S), 12.0 * S, 16, 9.0 * S, 1.0 * S, axis='y', tine_r=0.9 * S)
    # The triple lance at the bow.
    for x, z, f in ((0.0, 1.0, 1.0), (-2.6, -1.0, 0.72), (2.6, -1.0, 0.72)):
        fang(k, 'lance', (x * S, Y(LOFT0) + 1.5 * S, z * S), (x * S * 0.5, Y(LOFT0) + (1.5 + 24.0 * f) * S, z * S * 0.5), 1.8 * S * f, M['GOLD'], sides=4)
    k.armour_ring('lance_collar', 5.0 * S, 0.8 * S, 2.2 * S, (0, Y(LOFT0) + 0.9 * S, 0.0), M, rot=(math.pi / 2, 0, 0), blocks=16, gap=0.12)
    # Two stacked temple-step wings a side.
    for s in (-1, 1):
        stepped_wing(k, M, (s * 6.0 * S, Y(0.36), -1.0 * S), 15.0 * S, 14.0 * S, 1.4 * S, s, tiers=4, sweep=-0.18, seed=5350 + (s > 0), h_kit=3.0)
        stepped_wing(k, M, (s * 6.4 * S, Y(0.6), -1.6 * S), 12.0 * S, 12.0 * S, 1.3 * S, s, tiers=3, sweep=-0.25, seed=5360 + (s > 0), h_kit=3.0)
    for s, bank, t in ((-1, 'FL', 0.36), (1, 'FR', 0.36), (-1, 'ML', 0.58), (1, 'MR', 0.58)):
        w, top, bot, n, zo = sec(lt(t))
        barbette(k, M, bank, s * w * 0.55, Y(t), top * 0.95, 2.2 * S, 1.1 * S)
    w, top, bot, n, zo = sec(lt(0.66))
    barbette(k, M, 'AL', 0, Y(0.66), top * 0.98, 2.6 * S, 1.1 * S)
    for i, (x, z, r) in enumerate(((-4.0, -1.6, 2.0), (4.0, -1.6, 2.0), (-1.8, 2.0, 1.6), (1.8, 2.0, 1.6))):
        k.nozzle('nozzle', (x * S, Y(1.0) - 0.8 * S, z * S), r * S, 2.0 * r * S, M, glow='GLOW')
        k.cowl('cowl', (x * S, Y(1.0) - 0.4 * S, z * S), r * S, 2.3 * r * S, M)
        k.empty('ENGINE_%d' % i, (x * S, Y(1.0) - 2.0 * r * S, z * S), r * S)
    k.finish(skip=('core', 'body', 'crown_ring', 'lance_collar', 'NODE', 'ENGINE', 'windows', 'mach', 'plate_kit', 'cowl', 'wing_kit', 'zig_kit', 'reliquary_kit', 'throne_kit', 'oath'))
    print('windows', k.deck_windows(('body', 'zig', 'throne'), rows=(-0.16, -0.08, 0.0, 0.08, 0.16, 0.26, 0.36, 0.46), step=3.2, size=(0.25, 1.4, 0.8)))


LOOKS = dict(looks('ai_gods', L), SUNCORE=dict(emit=(1.0, 0.86, 0.56)))
