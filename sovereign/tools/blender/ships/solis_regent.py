"""Solis Regent · Sol Symbiots battleship (1 km, 5 hardpoints) · Sol Symbiots flagship (v2).

The covenant made whole: two colossal hulls, the crewed (port) and the machine (starboard), joined by
three great truss bridges; between them a shield emitter of three stacked glowing rings on a
capacitor spine. The crewed hull carries the bridge tower and hangar bays, the machine hull the
radiators, arrays and sensor domes. Dominant feature: the twin hulls with the light between."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'solis_regent_hero.glb', 'hull': 'sol_symbiots_battleship', 'tile': 30.0, 'bake_size': 2048}
L = 1000.0
Y0 = L / 2
S = L / 75.0
GAP = 9.0 * S


def Y(t):
    return Y0 - t * L


def pod(t):
    p = prow(t, 0.08)
    w = (2.6 + 2.4 * ss(0.0, 0.3, t)) * (1 - 0.25 * ss(0.85, 1, t)) * p * S
    top = (2.6 + 2.2 * ss(0.0, 0.3, t)) * p * S
    bot = (2.4 + 1.8 * ss(0.0, 0.3, t)) * p * S
    return w, top, bot, 3.0, 0.0


def build(k):
    import bpy
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    for s, t0, name in ((-1, 0.04, 'body'), (1, 0.14, 'bodym')):
        LEN = L * (1 - t0)
        lt = (lambda a: (lambda t: (t - a) / (1 - a)))(t0)
        h = k.loft(name, LEN, pod, rings=40, segs=32, mat=M['HULL'], y0=Y(t0))
        k.panelize(h, 40, 32, skip_row=3, skip_col=4, depth=1.0, thickness=1.2, keep=lambda i, j: 3 <= i <= 37)
        k.bevel(h, 0.8, 1, 30)
        k.weighted_normals(h)
        k.smooth(h)
        armour(k, M, pod, LEN, Y(t0), lt, dorsal=((t0 + 0.08, t0 + 0.2), (0.6, 0.72), (0.71, 0.84)), flanks=((t0 + 0.1, t0 + 0.24), (0.46, 0.6), (0.66, 0.82)), thick=2.2, seed=6400 + (s > 0) * 30)
        machinery_bands(k, M, pod, LEN, Y(t0), lt, t0 + 0.08, 0.92, 5.0, seed=6410 + (s > 0) * 30, dorsal_gap=(0.3, 0.58), density=0.8)
        conduits(k, M, pod, LEN, Y(t0), lt, (t0 + 0.1, 0.36, 0.6, 0.86), 1.4)
        for ob in bpy.context.scene.objects:
            if ob.get('placed') is None:
                ob['placed'] = s
                ob.location.x += s * GAP
    # The crewed hull: a bridge tower and hangar bays. The machine hull: radiators, arrays, domes.
    w, top, bot, n, zo = pod(0.7)
    k.bridge_tower('bridge', (-GAP, Y(0.72), top - 0.4 * S), 10.0 * S, 12.0 * S, 14.0 * S, M, decks=3, seed=6450)
    for t in (0.3, 0.5):
        w, top, bot, n, zo = pod(t)
        k.hangar_bay('bay', (-GAP - w, Y(t), -0.6 * S), (0, 1, 0), (0, 0, 1), (-1, 0, 0), 12.0 * S, 4.0 * S, 3.0 * S, M)
    for t in (0.4, 0.56, 0.72):
        w, top, bot, n, zo = pod(t)
        k.radiator_bank('radiator', (GAP + w * 0.7, Y(t), top * 0.55), (0, 1, 0), (0, 0, 1), (0.7, 0, 0.7), 9.0 * S, 5.0 * S, 3.0 * S, M, fins=12)
    k.antenna_array('array', (GAP, Y(0.28), pod(0.28)[1] - 0.4 * S), (0, 0, 1), 16.0 * S, M, count=6, spread=3.0 * S, seed=6460)
    k.sensor_dome('dome', (GAP, Y(0.86), pod(0.86)[1] - 0.2 * S), (0, 0, 1), 3.4 * S, M)
    # Three great truss bridges and the shield emitter between the hulls.
    for t, z in ((0.3, 2.0), (0.52, 0.0), (0.74, -2.0)):
        for dz in (-2.6, 2.6):
            k.truss('bridge_truss', (-GAP + 3.0 * S, Y(t), (z + dz) * S), (GAP - 3.0 * S, Y(t), (z + dz) * S), 2.4 * S, M)
    for j, (y, R) in enumerate(((Y(0.44), 4.6 * S), (Y(0.52), 5.6 * S), (Y(0.6), 4.6 * S))):
        k.armour_ring('emitter', R, 0.7 * S, 1.8 * S, (0, y, 0.0), M, rot=(math.pi / 2, 0, 0), blocks=14, gap=0.12)
        k.sphere('emitter_light', R * 0.55, (0, y, 0.0), M['GLOW'], 24)
    k.tube('cap_spine', [(0, Y(0.32), 0.0), (0, Y(0.52), 0.0), (0, Y(0.72), 0.0)], [1.4 * S, 1.6 * S, 1.4 * S], M['TRIM'], bevel_res=1, ends=('round', 'round'), res=2)
    for i in range(10):
        k.cylinder('cap_cell', 2.0 * S, 1.2 * S, (0, Y(0.33) - i * 3.8 * S, 0.0), M['GOLD'] if i % 3 == 0 else M['HULL'], segs=8)
    # A spear on the crewed hull's bow.
    k.tube('spear', [(-GAP, Y(0.06), 0.0), (-GAP, Y(-0.02), 0.0), (-GAP, Y(-0.1), 0.0)], [2.0 * S, 1.4 * S, 0.2 * S], M['GOLD'], ends=('flat', 'point'), res=3)
    for i in range(3):
        k.armour_ring('spear_ring', 2.6 * S, 0.4 * S, 1.0 * S, (-GAP, Y(0.05) + i * 4.0 * S, 0.0), M, rot=(math.pi / 2, 0, 0), blocks=10, gap=0.18, glow=i == 1)
    for x, bank, t in ((-GAP, 'FL', 0.24), (GAP, 'FR', 0.3), (-GAP, 'ML', 0.56), (GAP, 'MR', 0.6)):
        w, top, bot, n, zo = pod(t)
        barbette(k, M, bank, x, Y(t), top * 0.95, 2.2 * S, 1.1 * S)
    barbette(k, M, 'AL', GAP, Y(0.86) - 6.0 * S, pod(0.86)[1] * 0.92, 2.0 * S, 1.0 * S)
    for x, name in ((-GAP, 'PORT'), (GAP, 'STARBOARD')):
        for dz, sfx in ((-1.6, 'L'), (1.6, 'U')):
            k.nozzle('nozzle', (x, Y(1.0) - 0.8 * S, dz * S), 1.8 * S, 3.0 * S, M, glow='GLOW')
            k.cowl('cowl', (x, Y(1.0) - 0.4 * S, dz * S), 1.8 * S, 3.4 * S, M)
            k.empty('ENGINE_%s_%s' % (name, sfx), (x, Y(1.0) - 2.6 * S, dz * S), 1.8 * S)
    k.finish(skip=('core', 'body', 'bodym', 'emitter', 'spear_ring', 'bridge', 'bay', 'radiator', 'array', 'dome', 'NODE', 'ENGINE', 'windows', 'mach', 'plate_kit', 'cowl'))
    print('windows', k.deck_windows(('body', 'bridge'), rows=(-0.12, -0.04, 0.04, 0.12, 0.2), step=3.2, size=(0.25, 1.4, 0.8)))


LOOKS = looks('sol_symbiots', L)
