"""Eye Knife · Savanah frigate (60 m, 2 hardpoints) · Blender hero hull, forged in pass 2.

A dagger built around one great eye: a gold-rimmed sensor lens in an armoured socket at the bow,
a slim blade hull, two swept side blades, a single cowled drive with two trim thrusters.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'eye_knife_hero.glb', 'hull': 'savanah_frigate', 'tile': 3.0, 'bake_size': 1024}
L = 60.0
Y0 = L / 2
S = L / 50.0
LOFT0 = 0.1


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.08)
    w = (2.2 + 2.0 * ss(0.0, 0.3, t) - 0.8 * ss(0.5, 1.0, t)) * p * S
    top = (1.6 + 1.0 * ss(0.0, 0.3, t) - 0.4 * ss(0.6, 1, t)) * p * S
    bot = (1.3 + 0.6 * ss(0.0, 0.3, t)) * p * S
    return w, top, bot, 2.6, 0.0


LEN = L * (1 - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (1 - LOFT0)


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    hull = k.loft('body', LEN, sec, rings=28, segs=24, mat=M['HULL'], y0=LY0)
    k.panelize(hull, 28, 24, skip_row=3, skip_col=4, depth=0.06, thickness=0.08, keep=lambda i, j: 2 <= i <= 25)
    k.bevel(hull, 0.05, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)

    # The eye: armoured socket, gold rim, a glowing lens with a dark pupil.
    ye = Y(LOFT0) + 0.4 * S
    k.armour_ring('eye_socket', 2.1 * S, 0.45 * S, 1.0 * S, (0, ye, 0.1 * S), M, rot=(math.pi / 2, 0, 0), blocks=12, gap=0.12, glow=False)
    k.sphere('eye_lens', 1.75 * S, (0, ye - 0.3 * S, 0.1 * S), M['GLOW'], 32)
    k.cylinder('eye_pupil', 0.6 * S, 0.1 * S, (0, ye + 1.45 * S, 0.1 * S), M['CORE'], segs=24)
    k.torus('eye_rim', 2.05 * S, 0.14 * S, (0, ye + 0.55 * S, 0.1 * S), M['GOLD'], rot=(math.pi / 2, 0, 0), segs=40, rsegs=6)
    for a in range(6):
        ang = a / 6 * math.tau
        fang(k, 'eye_lash', (math.cos(ang) * 2.4 * S, ye + 0.3 * S, 0.1 * S + math.sin(ang) * 2.4 * S),
             (math.cos(ang) * 3.0 * S, ye + 1.4 * S, 0.1 * S + math.sin(ang) * 3.0 * S), 0.2 * S, M['TRIM'], sides=3)

    for s in (-1, 1):
        blade = [(0, 0), (s * 7.5 * S, -7.0 * S), (s * 8.2 * S, -5.6 * S), (s * 3.0 * S, 4.0 * S)]
        k.plate('side_blade', blade, 0.3 * S, M['TRIM'], loc=(s * 3.0 * S, Y(0.6), 0), bevel_w=0.05)
        k.tube('blade_edge', [(s * 3.2 * S, Y(0.6) + 3.9 * S, 0.2 * S), (s * 11.0 * S, Y(0.6) - 5.8 * S, 0.2 * S)], [0.12 * S, 0.04 * S], M['GOLD'], ends=('round', 'point'), res=3)
        k.tube('blade_fire', [(s * 4.0 * S, Y(0.6) + 2.0 * S, 0.25 * S), (s * 9.0 * S, Y(0.6) - 4.0 * S, 0.25 * S)], [0.05 * S] * 2, M['GLOW'], ends=('round', 'round'))
        k.box('blade_rib', (4.0 * S, 0.25 * S, 0.4 * S), (s * 5.5 * S, Y(0.6) - 1.5 * S, -0.25 * S), M['HULL'])

    armour(k, M, sec, LEN, LY0, lt, dorsal=((0.22, 0.34), (0.33, 0.46), (0.62, 0.76), (0.75, 0.9)), flanks=((0.25, 0.38), (0.42, 0.56), (0.62, 0.78)), thick=0.14, seed=301)
    machinery_bands(k, M, sec, LEN, LY0, lt, 0.24, 0.9, 0.45, seed=311, dorsal_gap=(0.47, 0.61), density=0.55)
    conduits(k, M, sec, LEN, LY0, lt, (0.25, 0.45, 0.65, 0.85), 0.1)

    for s, bank, t in ((-1, 'FL', 0.42), (1, 'FR', 0.42)):
        w, top, bot, n, zo = sec(lt(t))
        barbette(k, M, bank, s * w * 0.52, Y(t), top * 0.9, 1.0 * S, 0.6 * S)

    k.nozzle('nozzle', (0, Y(1.0) - 0.4 * S, 0.2 * S), 1.3 * S, 2.2 * S, M, glow='GLOW')
    k.cowl('cowl', (0, Y(1.0) - 0.1 * S, 0.2 * S), 1.3 * S, 2.6 * S, M)
    k.empty('ENGINE_MAIN', (0, Y(1.0) - 1.6 * S, 0.2 * S), 1.3 * S)
    for x, name in ((-2.6, 'PORT'), (2.6, 'STARBOARD')):
        k.nozzle('nozzle', (x * S, Y(0.96), -0.4 * S), 0.5 * S, 1.2 * S, M, glow='GLOW')
        k.empty('ENGINE_' + name, (x * S, Y(0.96) - 0.8 * S, -0.4 * S), 0.5 * S)
    w, top, bot, n, zo = sec(lt(0.55))
    k.wedge('canopy', (2.0 * S, 4.0 * S, 1.0 * S), (0, Y(0.55), top * 0.95 + 0.3 * S), M['HULL'], slope=0.6, back=0.3)
    k.box('canopy_glass', (1.4 * S, 0.06 * S, 0.22 * S), (0, Y(0.55) + 0.9 * S, top * 0.95 + 0.6 * S), k.window_material())

    k.finish(skip=('core', 'body', 'NODE', 'ENGINE', 'windows', 'eye', 'mach', 'plate_kit', 'cowl'))
    print('windows', k.deck_windows(('body', 'canopy'), rows=(-0.1, 0.0, 0.1), step=2.2, size=(0.15, 0.9, 0.45)))


LOOKS = looks('savanah', L)
