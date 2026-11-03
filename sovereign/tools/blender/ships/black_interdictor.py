"""Black Interdictor · AI Hunters cruiser (280 m, 4 hardpoints) · Blender hero hull, shipyard batch 4.

Stealth interdiction: a faceted diamond hull with no curves, flat chined wing planes, a long red
sensor slit across the bow, angled sensor fins, recessed drives. Matte black, gunmetal, red line.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'black_interdictor_hero.glb', 'hull': 'ai_hunters_cruiser', 'tile': 12.0, 'bake_size': 2048}
L = 280.0
Y0 = L / 2
S = L / 50.0


def Y(t):
    return Y0 - t * L


def sec(t):
    p = min(1.0, t / 0.18)
    w = (1.0 + 6.0 * ss(0.0, 0.45, t)) * (1 - 0.3 * ss(0.85, 1, t)) * max(0.05, p) * S
    top = (0.8 + 1.8 * ss(0.0, 0.45, t)) * max(0.05, p) * S
    bot = (0.6 + 1.2 * ss(0.0, 0.45, t)) * max(0.05, p) * S
    return w, top, bot, 1.0, 0.0     # n = 1: a faceted diamond section


LEN = L
LY0 = Y(0)
lt = lambda t: t


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    hull = k.loft('body', LEN, sec, rings=24, segs=8, mat=M['HULL'], y0=LY0)
    k.bevel(hull, 0.2, 1, 20)
    k.weighted_normals(hull)
    hull.data.set_sharp_from_angle(angle=math.radians(20))
    # Chined wing planes: flat faceted plates along both edges, stepped in two layers.
    for s in (-1, 1):
        k.plate('chine', [(0, 0), (s * 4.0 * S, -14.0 * S), (s * 9.0 * S, -30.0 * S), (s * 8.0 * S, -36.0 * S), (s * 2.0 * S, -32.0 * S)], 0.5 * S, M['TRIM'], loc=(s * 2.0 * S, Y(0.18), 0.0), bevel_w=0.1)
        k.plate('chine_upper', [(0, 0), (s * 3.0 * S, -12.0 * S), (s * 6.0 * S, -26.0 * S), (s * 1.5 * S, -24.0 * S)], 0.4 * S, M['HULL'], loc=(s * 2.0 * S, Y(0.26), 0.7 * S), bevel_w=0.1)
        # Angled sensor fins, canted outward.
        f = k.plate('fin', [(0, 0), (0, -9.0 * S), (2.4 * S, -11.0 * S), (2.0 * S, -3.0 * S)], 0.3 * S, M['TRIM'], loc=(s * 5.0 * S, Y(0.7), 2.0 * S), bevel_w=0.08)
        f.rotation_euler = (0, s * 0.5 - math.pi / 2 * s, 0)
        k.box('fin_line', (0.1 * S, 6.0 * S, 0.12 * S), (s * 5.2 * S, Y(0.72), 3.6 * S), M['GLOW'])
        # Red edge lines along the chines.
        k.tube('edge_line', [(s * 2.2 * S, Y(0.2), 0.3 * S), (s * 10.6 * S, Y(0.3) - 30.0 * S, 0.3 * S)], [0.06 * S] * 2, M['GLOW'], ends=('round', 'round'))
    # The red-line sensor slit across the bow, and its armoured brow.
    w, top, bot, n, zo = sec(0.2)
    k.box('slit', (w * 1.4, 0.3 * S, 0.18 * S), (0, Y(0.2), top * 0.62), M['GLOW'])
    k.wedge('brow', (w * 1.6, 4.0 * S, 0.8 * S), (0, Y(0.22), top * 0.78), M['TRIM'], slope=0.6)
    # Faceted dorsal plates (no curves): flat panels in a herringbone.
    for q in range(8):
        t = 0.3 + q * 0.07
        w, top, bot, n, zo = sec(t)
        for s in (-1, 1):
            pl = k.box('facet', (w * 0.5, 3.6 * S, 0.3 * S), (s * w * 0.28, Y(t), top * 0.62), M['TRIM'] if (q + (s > 0)) % 2 else M['HULL'])
            pl.rotation_euler = (0, s * math.atan2(top, w) * 0.95, s * 0.06)
    k.machinery('mach_belly', sec, LEN, LY0, 0.35, 0.9, math.pi + 1.2, math.tau - 1.2, M, count=40, h=1.6, seed=1001)
    # Low stealth hardware on the dorsal facets: flush hatches, sensor blisters, vent slots.
    k.machinery('mach_top', sec, LEN, LY0, 0.3, 0.92, 0.3, math.pi - 0.3, M, count=90, h=0.9, seed=1002, scale=1.0)
    # Cut-plate tiles and hardware on the faceted dorsal planes and on the chines.
    for q in range(6):
        t = 0.36 + q * 0.09
        w, top, bot, n, zo = sec(t)
        for s in (-1, 1):
            ln = math.hypot(w, top)
            k.plane_kit('facet_kit', (s * w * 0.5, Y(t), top * 0.5), (s * w / ln, 0, -top / ln), (0, 1, 0), (s * top / ln, 0, w / ln), (ln * 0.8, 0.085 * L), M, count=8, h=0.9, seed=1600 + q * 2 + (s > 0))
    for s in (-1, 1):
        k.plane_kit('chine_kit', (s * 6.0 * S, Y(0.18) - 18.0 * S, 0.5 * S), (1, 0, 0), (0, 1, 0), (0, 0, 1), (4.0 * S, 18.0 * S), M, count=10, h=0.8, seed=1620 + (s > 0))
    # Panel seams across the facets.
    for q in range(16):
        t = 0.28 + q * 0.04
        w, top, bot, n, zo = sec(t)
        for s in (-1, 1):
            sm = k.box('seam', (w * 0.9, 0.12 * S, 0.06 * S), (s * w * 0.45, Y(t), top * 0.52 + 0.05 * S), M['CORE'])
            sm.rotation_euler = (0, s * math.atan2(top, w), 0)
    for s, bank, t in ((-1, 'FL', 0.38), (1, 'FR', 0.38), (-1, 'ML', 0.62), (1, 'MR', 0.62)):
        w, top, bot, n, zo = sec(t)
        barbette(k, M, bank, s * w * 0.3, Y(t), top * 0.72, 1.2 * S, 0.7 * S)
    # Recessed drives in a flat stern slab.
    w, top, bot, n, zo = sec(1.0)
    k.box('stern', (w * 1.6, 1.2 * S, top * 1.2), (0, Y(1.0) + 0.2 * S, 0), M['TRIM'])
    for x, name in ((-3.0, 'PORT'), (0.0, 'MAIN'), (3.0, 'STARBOARD')):
        k.box('drive_slot', (2.2 * S, 0.6 * S, 0.9 * S), (x * S, Y(1.0) - 0.4 * S, 0), M['CORE'])
        k.box('drive_glow', (1.9 * S, 0.1 * S, 0.6 * S), (x * S, Y(1.0) - 0.1 * S, 0), M['GLOW'])
        k.empty('ENGINE_' + name, (x * S, Y(1.0) - 1.0 * S, 0), 0.9 * S)
    k.finish(skip=('core', 'body', 'NODE', 'ENGINE', 'windows', 'mach'))
    print('windows', k.deck_windows(('body',), rows=(-0.06, 0.0, 0.06), step=4.0, size=(0.2, 1.0, 0.4)))


LOOKS = looks('ai_hunters', L)
