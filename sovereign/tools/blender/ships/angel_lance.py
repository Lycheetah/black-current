"""Angel Lance · Amethyst Angels destroyer (140 m, 4 hardpoints) · Blender hero hull, shipyard batch 4.

Gothic: a nave of a hull under rows of spires, flying buttresses arching from its flanks, pointed
arch windows, clusters of amethyst crystal at the shoulders and a long crystal lance. Violet stone,
silver, purple light.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks, rib, spire  # noqa: E402

META = {'name': 'angel_lance_hero.glb', 'hull': 'amethyst_angels_destroyer', 'tile': 8.0, 'bake_size': 2048}
L = 140.0
Y0 = L / 2
S = L / 50.0
LOFT0 = 0.1


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.1)
    w = (1.4 + 1.8 * ss(0.05, 0.35, t)) * (1 - 0.3 * ss(0.85, 1, t)) * p * S
    top = (1.6 + 1.6 * ss(0.05, 0.35, t)) * p * S
    bot = (1.2 + 1.0 * ss(0.05, 0.35, t)) * p * S
    return w, top, bot, 3.5, 0.0


LEN = L * (1 - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (1 - LOFT0)


def build(k):
    rnd = random.Random(12)
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    M['CRYSTAL'] = k.material('CRYSTAL', (0.7, 0.4, 1.0), 0.0, 0.1, emit=(0.75, 0.35, 1.0))
    hull = k.loft('body', LEN, sec, rings=30, segs=26, mat=M['HULL'], y0=LY0)
    k.panelize(hull, 30, 26, skip_row=3, skip_col=4, depth=0.18, thickness=0.22, keep=lambda i, j: 2 <= i <= 27)
    k.bevel(hull, 0.12, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)
    # Spires along the roof: a central row, tall at the middle, and shorter rows on the shoulders.
    for q in range(9):
        t = 0.2 + q * 0.075
        w, top, bot, n, zo = sec(lt(t))
        h = (2.5 + 6.5 * math.sin(math.pi * (q + 0.5) / 9) ** 2 * (0.6 + 0.4 * (q % 2))) * S
        spire(k, 'spire', (0, Y(t), top * 0.95), h, 0.55 * S, M['TRIM'])
        k.cylinder('spire_band', 0.62 * S, 0.3 * S, (0, Y(t), top * 0.95 + h * 0.3), M['GOLD'], segs=6, rot=(0, 0, 0))
        for s in (-1, 1):
            spire(k, 'pinnacle', (s * w * 0.7, Y(t) - 1.5 * S, top * 0.6), h * 0.4, 0.3 * S, M['HULL'])
            # Flying buttress: an arch from the flank up to the central spire.
            b = k.torus('buttress', w * 0.75, 0.16 * S, (s * w * 0.35, Y(t), top * 0.5), M['TRIM'], rot=(math.pi / 2, (0.9 if s > 0 else 2.2), 0), arc=1.6, segs=12, rsegs=5, taper=0.1)
    # Pointed arch windows along the nave.
    for q in range(10):
        t = 0.22 + q * 0.065
        w, top, bot, n, zo = sec(lt(t))
        for s in (-1, 1):
            fang(k, 'arch_window', (s * w * 1.0, Y(t), -0.2 * S), (s * w * 1.0, Y(t), 1.2 * S), 0.35 * S, k.window_material(), sides=4)
    # Amethyst crystal clusters at the shoulders and the stern.
    for (t, s) in ((0.3, -1), (0.3, 1), (0.62, -1), (0.62, 1), (0.9, -1), (0.9, 1)):
        w, top, bot, n, zo = sec(lt(t))
        base = (s * w * 0.9, Y(t), top * 0.3)
        for c in range(5):
            dx, dz = (rnd.random() - 0.3) * s * 1.6, rnd.random() * 1.8
            fang(k, 'crystal', base, (base[0] + dx * S + s * 1.2 * S, base[1] + (rnd.random() - 0.5) * 2.0 * S, base[2] + (1.0 + dz) * S), (0.3 + 0.2 * rnd.random()) * S, M['CRYSTAL'], sides=6)
    fang(k, 'lance', (0, Y(LOFT0) + 0.5 * S, 0), (0, Y(-0.08), 0), 0.7 * S, M['CRYSTAL'], sides=6)
    k.armour_ring('lance_crown', 1.4 * S, 0.3 * S, 0.7 * S, (0, Y(LOFT0) + 0.3 * S, 0), M, rot=(math.pi / 2, 0, 0), blocks=8, gap=0.25, glow=False)
    armour(k, M, sec, LEN, LY0, lt, dorsal=((0.18, 0.28), (0.27, 0.38), (0.37, 0.48), (0.47, 0.58), (0.57, 0.68), (0.67, 0.78), (0.77, 0.88)), flanks=((0.2, 0.34), (0.4, 0.56), (0.62, 0.8)), thick=0.3, seed=1101)
    machinery_bands(k, M, sec, LEN, LY0, lt, 0.2, 0.9, 0.8, seed=1111, dorsal_gap=None, density=0.5)
    for s, bank, t in ((-1, 'FL', 0.32), (1, 'FR', 0.32), (-1, 'ML', 0.7), (1, 'MR', 0.7)):
        w, top, bot, n, zo = sec(lt(t))
        barbette(k, M, bank, s * w * 0.62, Y(t), top * 0.78, 0.9 * S, 0.6 * S)
    for x, name in ((-1.4, 'PORT'), (1.4, 'STARBOARD')):
        k.nozzle('nozzle', (x * S, Y(1.0) - 0.4 * S, 0), 0.9 * S, 1.6 * S, M, glow='GLOW')
        k.cowl('cowl', (x * S, Y(1.0) - 0.1 * S, 0), 0.9 * S, 1.9 * S, M)
        k.empty('ENGINE_' + name, (x * S, Y(1.0) - 1.2 * S, 0), 0.9 * S)
    k.finish(skip=('core', 'body', 'crystal', 'lance', 'NODE', 'ENGINE', 'windows', 'arch_window', 'mach', 'plate_kit', 'cowl'))


LOOKS = dict(looks('amethyst_angels', L), CRYSTAL=dict(emit=(0.78, 0.38, 1.0)))
