"""Radiant Ark · Cosmic Light cruiser (280 m, 4 hardpoints) · Blender hero hull, shipyard batch 2.

A ring ship: an ivory spine threaded through a great solar halo, the halo built from gold sun-blades
and armour blocks, a radiant core at the ring's heart, a cathedral prow with a lance, guns on the
spine. Luminous formation warfare: white armour, gold, sunlight.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'radiant_ark_hero.glb', 'hull': 'cosmic_light_cruiser', 'tile': 12.0, 'bake_size': 2048}
L = 280.0
Y0 = L / 2
S = L / 50.0
LOFT0 = 0.08


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.1)
    w = (1.3 + 1.9 * ss(0.05, 0.35, t) + 0.6 * bump(0.5, 0.12, t)) * (1 - 0.3 * ss(0.8, 1, t)) * p * S
    top = (1.6 + 1.8 * ss(0.05, 0.35, t)) * p * S
    bot = (1.3 + 1.4 * ss(0.05, 0.35, t)) * p * S
    return w, top, bot, 2.2, 0.0


LEN = L * (1 - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (1 - LOFT0)


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    M['SUN'] = k.material('SUN', (1.0, 0.9, 0.7), 0.0, 0.5, emit=(1.0, 0.9, 0.6))
    hull = k.loft('body', LEN, sec, rings=36, segs=30, mat=M['HULL'], y0=LY0)
    k.panelize(hull, 36, 30, skip_row=3, skip_col=4, depth=0.3, thickness=0.35, keep=lambda i, j: 3 <= i <= 33)
    k.bevel(hull, 0.25, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)

    # The halo: a great vertical ring around the spine at mid-ship, sun-blades radiating outward.
    yh, R = Y(0.5), 13.0 * S
    k.armour_ring('halo', R, 1.0 * S, 2.4 * S, (0, yh, 0), M, rot=(math.pi / 2, 0, 0), blocks=24, gap=0.12)
    for i in range(12):
        a = i / 12 * math.tau + math.pi / 12
        c, s_ = math.cos(a), math.sin(a)
        long = 4.2 if i % 2 == 0 else 2.6
        fang(k, 'sun_blade', (c * (R + 0.9 * S), yh, s_ * (R + 0.9 * S)), (c * (R + long * S), yh - 0.6 * S, s_ * (R + long * S)), 0.55 * S, M['GOLD'], sides=4)
    # Spokes from the spine to the halo, and the radiant core.
    for i in range(4):
        a = i / 4 * math.tau + math.pi / 4
        c, s_ = math.cos(a), math.sin(a)
        k.tube('spoke', [(c * 3.0 * S, yh, s_ * 3.0 * S), (c * (R - 0.8 * S), yh, s_ * (R - 0.8 * S))], [0.5 * S, 0.35 * S], M['TRIM'], bevel_res=1, ends=('flat', 'flat'), res=2)
        k.tube('spoke_fire', [(c * 3.2 * S, yh + 0.45 * S, s_ * 3.2 * S), (c * (R - 1.0 * S), yh + 0.45 * S, s_ * (R - 1.0 * S))], [0.08 * S] * 2, M['GLOW'], ends=('round', 'round'))
    k.sphere('sun_core', 2.2 * S, (0, yh + 4.0 * S, 3.6 * S), M['SUN'], 32)
    k.armour_ring('core_cage', 2.8 * S, 0.3 * S, 0.8 * S, (0, yh + 4.0 * S, 3.6 * S), M, rot=(math.pi / 2, 0, 0), blocks=10, gap=0.25, glow=False)

    # Cathedral prow: stacked pointed arches and a lance.
    for i, (t, h) in enumerate(((0.12, 2.6), (0.18, 3.4), (0.25, 4.0))):
        w, top, bot, n, zo = sec(lt(t))
        k.wedge('arch', (w * 1.5, 3.0 * S, h * S), (0, Y(t), top * 0.8 + h * S * 0.3), M['GOLD'] if i == 1 else M['HULL'], slope=0.9, back=0.4)
    k.tube('lance', [(0, Y(0.1), 0.2 * S), (0, Y(-0.06), 0.0)], [0.55 * S, 0.12 * S], M['GOLD'], ends=('flat', 'point'), res=2)
    k.tube('lance_fire', [(0, Y(0.08), 0.75 * S), (0, Y(-0.03), 0.3 * S)], [0.08 * S] * 2, M['GLOW'], ends=('round', 'round'))

    # Rear wings: two swept, gilded fins.
    for s in (-1, 1):
        k.plate('wing', [(0, 0), (s * 9.0 * S, -6.0 * S), (s * 9.6 * S, -4.0 * S), (s * 2.0 * S, 4.0 * S)], 0.5 * S, M['HULL'], loc=(s * 2.6 * S, Y(0.8), 0.0), bevel_w=0.25)
        k.tube('wing_edge', [(s * 2.8 * S, Y(0.8) + 4.0 * S, 0.0), (s * 12.0 * S, Y(0.8) - 4.0 * S, 0.0)], [0.2 * S, 0.06 * S], M['GOLD'], ends=('round', 'point'), res=3)

    armour(k, M, sec, LEN, LY0, lt, dorsal=((0.14, 0.24), (0.23, 0.34), (0.62, 0.72), (0.71, 0.82)), flanks=((0.16, 0.27), (0.3, 0.42), (0.58, 0.7), (0.72, 0.84)), thick=0.6, seed=401)
    machinery_bands(k, M, sec, LEN, LY0, lt, 0.18, 0.88, 1.8, seed=411, dorsal_gap=(0.36, 0.44), density=0.8)
    conduits(k, M, sec, LEN, LY0, lt, (0.18, 0.32, 0.46, 0.6, 0.76, 0.88), 0.45)

    for s, bank, t in ((-1, 'FL', 0.3), (1, 'FR', 0.3), (-1, 'ML', 0.68), (1, 'MR', 0.68)):
        w, top, bot, n, zo = sec(lt(t))
        barbette(k, M, bank, s * w * 0.48, Y(t), top * 0.9, 1.2 * S, 0.85 * S)

    for x, z, name in ((-1.8, 0.0, 'PORT'), (0.0, 1.2, 'MAIN'), (1.8, 0.0, 'STARBOARD')):
        k.nozzle('nozzle', (x * S, Y(1.0) - 0.5 * S, z * S), 1.0 * S, 2.0 * S, M, glow='GLOW')
        k.cowl('cowl', (x * S, Y(1.0) - 0.2 * S, z * S), 1.0 * S, 2.3 * S, M)
        k.empty('ENGINE_' + name, (x * S, Y(1.0) - 1.6 * S, z * S), 1.0 * S)

    k.finish(skip=('core', 'sun', 'body', 'halo', 'core_cage', 'NODE', 'ENGINE', 'windows', 'mach', 'plate_kit', 'cowl'))
    print('windows', k.deck_windows(('body',), rows=(-0.2, -0.12, -0.04, 0.04, 0.12, 0.2), step=2.4, size=(0.2, 1.2, 0.6)))


LOOKS = dict(looks('cosmic_light', L), SUN=dict(emit=(1.0, 0.9, 0.62)))
