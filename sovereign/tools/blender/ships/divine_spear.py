"""Divine Spear · AI Gods destroyer (140 m, 4 hardpoints) · the AI Gods line.

A gold lance with a monolith behind it: the spearhead is a long gilded blade with oath bands, the
hull a faceted obsidian shaft, the command core caged aft under a crown, temple-step blades at the
flanks, a pair of cowled drives. Strict symmetry."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402
from _godmachine import command_core, crown, oath_bands, stepped_wing  # noqa: E402

META = {'name': 'divine_spear_hero.glb', 'hull': 'ai_gods_destroyer', 'tile': 8.0, 'bake_size': 2048}
L = 140.0
Y0 = L / 2
S = L / 50.0
LOFT0 = 0.22


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.08)
    w = (1.4 + 1.6 * ss(0.0, 0.3, t)) * (1 - 0.2 * ss(0.85, 1, t)) * p * S
    top = (1.3 + 1.5 * ss(0.0, 0.3, t) + 0.5 * bump(0.6, 0.15, t)) * p * S
    bot = (1.2 + 1.0 * ss(0.0, 0.3, t)) * p * S
    return w, top, bot, 4.0, 0.0


LEN = L * (1 - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (1 - LOFT0)


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    M['SUNCORE'] = k.material('SUNCORE', (1.0, 0.9, 0.6), 0.0, 0.3, emit=(1.0, 0.85, 0.55))
    hull = k.loft('body', LEN, sec, rings=32, segs=28, mat=M['HULL'], y0=LY0)
    k.panelize(hull, 32, 28, skip_row=3, skip_col=4, depth=0.18, thickness=0.22, keep=lambda i, j: 3 <= i <= 29)
    k.bevel(hull, 0.12, 1, 30)
    k.weighted_normals(hull)
    hull.data.set_sharp_from_angle(angle=math.radians(35))
    # The spearhead: a long gilded faceted blade with a collar where it meets the hull.
    fang(k, 'spearhead', (0, Y(LOFT0) + 1.0 * S, 0.0), (0, Y(-0.08), 0.0), 2.0 * S, M['GOLD'], sides=4)
    # Glowing edges down the spearhead's four faces.
    for i in range(4):
        a_ = i / 4 * math.tau + math.pi / 4
        c_, s_ = math.cos(a_), math.sin(a_)
        k.tube('spear_edge', [(c_ * 2.0 * S, Y(LOFT0) + 1.0 * S, s_ * 2.0 * S), (c_ * 1.2 * S, Y(0.08), s_ * 1.2 * S), (0, Y(-0.075), 0)], [0.12 * S, 0.1 * S, 0.02 * S], M['GLOW'], bevel_res=1, ends=('round', 'point'), res=3)
    k.armour_ring('spear_collar', 2.4 * S, 0.45 * S, 1.2 * S, (0, Y(LOFT0) + 0.4 * S, 0.0), M, rot=(math.pi / 2, 0, 0), blocks=12, gap=0.14)
    for i, t in enumerate((0.04, 0.1, 0.16)):
        k.armour_ring('spear_band', (1.4 - 0.35 * i) * S, 0.2 * S, 0.5 * S, (0, Y(t), 0.0), M, rot=(math.pi / 2, 0, 0), blocks=8, gap=0.2, glow=i == 1)
    armour(k, M, sec, LEN, LY0, lt, dorsal=((0.25, 0.37), (0.36, 0.48), (0.8, 0.92)), flanks=((0.28, 0.42), (0.46, 0.6), (0.72, 0.86)), thick=0.3, seed=5100)
    machinery_bands(k, M, sec, LEN, LY0, lt, 0.26, 0.92, 0.9, seed=5110, dorsal_gap=(0.49, 0.56), density=0.7)
    oath_bands(k, M, sec, LEN, LY0, lt, (0.26, 0.44, 0.62, 0.9), 0.22)
    # The caged core aft, under its crown.
    w, top, bot, n, zo = sec(lt(0.7))
    k.box('pedestal', (3.6 * S, 5.0 * S, 1.4 * S), (0, Y(0.7), top + 0.5 * S), M['TRIM'])
    command_core(k, M, (0, Y(0.7), top + 3.4 * S), 1.2 * S)
    crown(k, M, (0, Y(0.7), top + 1.3 * S), 2.9 * S, 10, 2.6 * S, 0.32 * S)
    # Temple-step blades at the flanks.
    for s in (-1, 1):
        stepped_wing(k, M, (s * 2.4 * S, Y(0.6), -0.4 * S), 7.0 * S, 7.5 * S, 0.6 * S, s, tiers=3, sweep=-0.3, seed=5120 + (s > 0), h_kit=0.55)
    for s, bank, t in ((-1, 'FL', 0.34), (1, 'FR', 0.34), (-1, 'ML', 0.52), (1, 'MR', 0.52)):
        w, top, bot, n, zo = sec(lt(t))
        barbette(k, M, bank, s * w * 0.55, Y(t), top * 0.92, 0.9 * S, 0.55 * S)
    for x, name in ((-1.6, 'PORT'), (1.6, 'STARBOARD')):
        k.nozzle('nozzle', (x * S, Y(1.0) - 0.4 * S, 0), 1.1 * S, 1.8 * S, M, glow='GLOW')
        k.cowl('cowl', (x * S, Y(1.0) - 0.1 * S, 0), 1.1 * S, 2.2 * S, M)
        k.empty('ENGINE_' + name, (x * S, Y(1.0) - 1.4 * S, 0), 1.1 * S)
    k.finish(skip=('core', 'body', 'crown_ring', 'spear_collar', 'spear_band', 'spear_edge', 'NODE', 'ENGINE', 'windows', 'mach', 'plate_kit', 'cowl', 'wing_kit', 'zig_kit', 'oath'))
    print('windows', k.deck_windows(('body',), rows=(-0.12, -0.04, 0.04, 0.12), step=2.4, size=(0.2, 1.2, 0.6)))


LOOKS = dict(looks('ai_gods', L), SUNCORE=dict(emit=(1.0, 0.86, 0.56)))
