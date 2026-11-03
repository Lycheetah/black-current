"""Joined Spear · Sol Symbiots destroyer (140 m, 4 hardpoints) · Blender hero hull, shipyard batch 2.

Human-AI covenant: two parallel hulls, one crewed and one machine, joined by three lattice bridges.
Between them a shield emitter lens and a capacitor spine; a long spear prow on the crewed hull, a
sensor array on the machine hull. Pale steel, silver, cyan light.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'joined_spear_hero.glb', 'hull': 'sol_symbiots_destroyer', 'tile': 8.0, 'bake_size': 2048}
L = 140.0
Y0 = L / 2
S = L / 50.0
GAP = 3.4 * S      # half the distance between the two hull centrelines


def Y(t):
    return Y0 - t * L


def pod(t):
    p = prow(t, 0.08)
    w = (0.9 + 1.0 * ss(0.0, 0.3, t)) * (1 - 0.3 * ss(0.85, 1, t)) * p * S
    top = (1.0 + 0.9 * ss(0.0, 0.3, t)) * p * S
    bot = (0.9 + 0.7 * ss(0.0, 0.3, t)) * p * S
    return w, top, bot, 2.6, 0.0


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    import bpy
    # Two hulls: the crewed (port, longer, with the spear) and the machine (starboard, shorter).
    for s, t0, name in ((-1, 0.06, 'body'), (1, 0.16, 'bodym')):
        LEN = L * (1 - t0)
        h = k.loft(name, LEN, pod, rings=30, segs=24, mat=M['HULL'], y0=Y(t0))
        k.panelize(h, 30, 24, skip_row=3, skip_col=4, depth=0.14, thickness=0.18, keep=lambda i, j: 2 <= i <= 27)
        k.bevel(h, 0.12, 1, 30)
        k.weighted_normals(h)
        k.smooth(h)
        lt = (lambda t0_: (lambda t: (t - t0_) / (1 - t0_)))(t0)
        armour(k, M, pod, LEN, Y(t0), lt, dorsal=((t0 + 0.08, t0 + 0.2), (0.45, 0.56), (0.7, 0.84)), flanks=((t0 + 0.1, t0 + 0.24), (0.5, 0.66)), thick=0.3, seed=601 + (s > 0) * 20)
        machinery_bands(k, M, pod, LEN, Y(t0), lt, t0 + 0.08, 0.9, 0.9, seed=611 + (s > 0) * 20, dorsal_gap=(0.3, 0.44), density=0.55)
        conduits(k, M, pod, LEN, Y(t0), lt, (t0 + 0.1, 0.4, 0.6, 0.85), 0.22)
        # Move everything this hull just made out to its side.
        for ob in bpy.context.scene.objects:
            if ob.get('placed') is None:
                ob['placed'] = s
                ob.location.x += s * GAP

    # Lattice bridges between the hulls: two rails and diagonal struts each.
    for t in (0.32, 0.55, 0.78):
        y = Y(t)
        for z in (-0.5 * S, 0.9 * S):
            k.box('bridge_rail', (2 * GAP - 2.0 * S, 0.8 * S, 0.7 * S), (0, y, z), M['TRIM'])
            k.box('bridge_rail_cap', (2 * GAP - 2.4 * S, 0.9 * S, 0.15 * S), (0, y, z + 0.42 * S), M['GOLD'])
        for i in range(4):
            x0 = -GAP + 1.0 * S + i * (2 * GAP - 2.0 * S) / 4
            x1 = x0 + (2 * GAP - 2.0 * S) / 4
            k.tube('strut', [(x0, y, -0.5 * S), ((x0 + x1) / 2, y, 0.2 * S), (x1, y, 0.9 * S)], [0.22 * S] * 3, M['GOLD'], bevel_res=1, ends=('flat', 'flat'), res=1)
            k.box('bridge_post', (0.4 * S, 0.6 * S, 1.6 * S), (x0, y, 0.2 * S), M['HULL'])
        k.light_strip('bridge_lights', (-GAP + 1.2 * S, y + 0.3 * S, 1.2 * S), (GAP - 1.2 * S, y + 0.3 * S, 1.2 * S), 6, 0.3, M['GLOW'])
    # Shield emitter lens and capacitor spine between the hulls.
    k.armour_ring('emitter', 1.9 * S, 0.35 * S, 0.8 * S, (0, Y(0.44), 0.2 * S), M, rot=(math.pi / 2, 0, 0), blocks=12, gap=0.18)
    k.sphere('emitter_lens', 1.3 * S, (0, Y(0.44), 0.2 * S), M['GLOW'], 24)
    k.tube('cap_spine', [(0, Y(0.3), 0.2 * S), (0, Y(0.82), 0.2 * S)], [0.5 * S, 0.4 * S], M['TRIM'], bevel_res=1, ends=('round', 'round'), res=2)
    for i in range(8):
        k.cylinder('cap_cell', 0.75 * S, 0.5 * S, (0, Y(0.5) - i * 2.6 * S, 0.2 * S), M['GOLD'] if i % 3 == 0 else M['HULL'], segs=8)
    # The spear: a long lance off the crewed hull, and the machine hull's sensor array.
    k.tube('spear', [(-GAP, Y(0.1), 0.0), (-GAP, Y(0.0), 0.0), (-GAP, Y(-0.12), 0.0)], [1.0 * S, 0.7 * S, 0.15 * S], M['GOLD'], ends=('flat', 'point'), res=3)
    for i in range(3):
        k.torus('spear_ring', 0.75 * S, 0.12 * S, (-GAP, Y(0.06) + i * 2.4 * S, 0.0), M['GLOW'] if i == 1 else M['TRIM'], rot=(math.pi / 2, 0, 0), segs=24, rsegs=6)
    for i in range(4):
        k.sensor_mast('array', (GAP + (i - 1.5) * 0.6 * S, Y(0.22) - i * 1.5 * S, 1.6 * S), 5.0 + 2.0 * (i % 2), M['TRIM'], M['GLOW'], dish=1.2 if i == 1 else 0)

    for x, bank, t in ((-GAP, 'FL', 0.36), (GAP, 'FR', 0.4), (-GAP, 'ML', 0.62), (GAP, 'MR', 0.64)):
        w, top, bot, n, zo = pod(0.4)
        barbette(k, M, bank, x, Y(t), top * 0.92, 0.9 * S, 0.6 * S)
    for x, name in ((-GAP, 'PORT'), (GAP, 'STARBOARD')):
        k.nozzle('nozzle', (x, Y(1.0) - 0.4 * S, 0), 0.9 * S, 1.6 * S, M, glow='GLOW')
        k.cowl('cowl', (x, Y(1.0) - 0.1 * S, 0), 0.9 * S, 1.9 * S, M)
        k.empty('ENGINE_' + name, (x, Y(1.0) - 1.2 * S, 0), 0.9 * S)

    k.finish(skip=('core', 'body', 'bodym', 'emitter', 'NODE', 'ENGINE', 'windows', 'mach', 'plate_kit', 'cowl'))
    print('windows', k.deck_windows(('body',), rows=(-0.12, -0.04, 0.04, 0.12), step=2.4, size=(0.2, 1.2, 0.6)))


LOOKS = looks('sol_symbiots', L)
