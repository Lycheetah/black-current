"""Event Knife · Blackhole destroyer (140 m, 4 hardpoints) · Blender hero hull, forged in pass 2.

A long flat knife between the Gravity Fang and the Maw: the bow splits into two straight armoured
blades (scissor prongs) with a small singularity burning between them, a raised dorsal crest,
swept stabiliser fins, four guns on the shoulders, twin cowled drives. Navy-black, copper, orange fire.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'event_knife_hero.glb', 'hull': 'blackhole_destroyer', 'tile': 8.0, 'bake_size': 2048}
L = 140.0
Y0 = L / 2
S = L / 50.0
LOFT0 = 0.2


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.05)
    w = (1.4 + 2.4 * ss(0.0, 0.35, t)) * (1 - 0.25 * ss(0.85, 1, t)) * p * S
    top = (0.9 + 1.1 * ss(0.0, 0.4, t) + 0.3 * bump(0.55, 0.15, t)) * p * S
    bot = (0.8 + 0.8 * ss(0.0, 0.4, t)) * p * S
    return w, top, bot, 3.2, 0.0


LEN = L * (1 - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (1 - LOFT0)


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    hull = k.loft('body', LEN, sec, rings=32, segs=28, mat=M['HULL'], y0=LY0)
    k.panelize(hull, 32, 28, skip_row=3, skip_col=4, depth=0.18, thickness=0.22, keep=lambda i, j: 2 <= i <= 29)
    k.bevel(hull, 0.15, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)

    # Bow: two armoured blades reaching forward, a singularity between them.
    yb = Y(LOFT0) + 1.0 * S
    for s in (-1, 1):
        pts = [(s * 1.5 * S, yb - 1.5 * S, 0.1 * S), (s * 1.7 * S, yb + 3.0 * S, 0.0), (s * 1.45 * S, yb + 7.0 * S, -0.1 * S), (s * 0.95 * S, yb + 10.5 * S, -0.15 * S)]
        blade, B = k.limb('prong', pts, [0.95 * S, 0.8 * S, 0.6 * S, 0.35 * S], M['TRIM'], core_mat=M['HULL'], sides=6, squash=0.55, plates=7, up=(0, 0, 1), flare=1.1, tip=3.2)
        for j in range(5):
            pp, rr, (t, sd, upv) = B.at(0.2 + j * 0.14)
            b_ = pp + sd * (-s) * rr * 0.0 + upv * rr * 0.5
            fang(k, 'prong_spine', tuple(b_), tuple(b_ + upv * 0.6 * S - t * 0.4 * S), 0.18 * S, M['HULL'], sides=3)
        k.tube('prong_fire', [(p[0] - s * 0.5 * S, p[1], p[2]) for p in pts[:3]], [0.07 * S] * 3, M['GLOW'], ends=('round', 'round'), res=3)
    k.sphere('singularity', 1.0 * S, (0, yb + 1.6 * S, 0), M['CORE'], 32)
    k.torus('sing_glow', 1.25 * S, 0.1 * S, (0, yb + 1.6 * S, 0), M['GLOW'], rot=(math.pi / 2, 0, 0), segs=48, rsegs=6)
    k.armour_ring('sing_ring', 1.75 * S, 0.3 * S, 0.7 * S, (0, yb + 1.2 * S, 0), M, rot=(math.pi / 2, 0, 0), blocks=10, gap=0.2, glow=False)

    # Dorsal crest and stabiliser fins.
    w_, top_, bot_, n_, z_ = sec(lt(0.5))
    k.wedge('crest', (1.2 * S, 18.0 * S, 1.6 * S), (0, Y(0.52), top_ * 0.92 + 0.6 * S), M['TRIM'], slope=0.5, back=0.25)
    k.tube('crest_fire', [(0, Y(0.36), top_ * 0.95 + 1.4 * S), (0, Y(0.66), top_ * 0.95 + 1.4 * S)], [0.08 * S] * 2, M['GLOW'], ends=('round', 'round'))
    for s in (-1, 1):
        fin = [(0, 0), (s * 6.0 * S, -4.5 * S), (s * 6.6 * S, -3.0 * S), (s * 2.6 * S, 3.5 * S)]
        k.plate('fin', fin, 0.35 * S, M['TRIM'], loc=(s * 2.6 * S, Y(0.78), 0.1 * S), bevel_w=0.15)
        k.light_strip('fin_lights', (s * 3.2 * S, Y(0.78) + 2.4 * S, 0.35 * S), (s * 8.6 * S, Y(0.78) - 4.0 * S, 0.35 * S), 8, 0.35, M['GLOW'])
        for ry in (0.5, -2.0):
            k.box('fin_rib', (4.0 * S, 0.25 * S, 0.45 * S), (s * 5.0 * S, Y(0.78) + ry * S, -0.15 * S), M['HULL'])

    armour(k, M, sec, LEN, LY0, lt, dorsal=((0.24, 0.33), (0.32, 0.42), (0.68, 0.78), (0.77, 0.88)), flanks=((0.25, 0.36), (0.38, 0.5), (0.55, 0.66), (0.68, 0.8)), thick=0.35, seed=101)
    machinery_bands(k, M, sec, LEN, LY0, lt, 0.25, 0.9, 1.1, seed=111, dorsal_gap=(0.43, 0.66), density=0.8)
    conduits(k, M, sec, LEN, LY0, lt, (0.25, 0.4, 0.55, 0.7, 0.86), 0.28)

    for s, bank, t in ((-1, 'FL', 0.36), (1, 'FR', 0.36), (-1, 'ML', 0.6), (1, 'MR', 0.6)):
        w, top, bot, n, zo = sec(lt(t))
        barbette(k, M, bank, s * w * 0.5, Y(t), top * 0.9, 1.1 * S, 0.7 * S)

    for x, name in ((-1.6, 'PORT'), (1.6, 'STARBOARD')):
        k.nozzle('nozzle', (x * S, Y(1.0) - 0.4 * S, 0), 1.0 * S, 1.8 * S, M, glow='GLOW')
        k.cowl('cowl', (x * S, Y(1.0) - 0.1 * S, 0), 1.0 * S, 2.1 * S, M)
        k.empty('ENGINE_' + name, (x * S, Y(1.0) - 1.4 * S, 0), 1.0 * S)
    k.vent_grille('reactor_vent', (0, Y(0.92), 1.4 * S), 1.8 * S, 2.6 * S, 7, M['TRIM'], M['HULL'], rot=(0.2, 0, 0))
    w, top, bot, n, zo = sec(lt(0.3))
    k.sensor_mast('mast', (0.8 * S, Y(0.3), top * 0.95), 8.0, M['TRIM'], M['GLOW'], dish=1.8)

    k.finish(skip=('core', 'singularity', 'body', 'sing', 'NODE', 'ENGINE', 'windows', 'prong', 'mach', 'plate_kit', 'cowl'))
    print('windows', k.deck_windows(('body',), rows=(-0.18, -0.08, 0.02, 0.12), step=2.4, size=(0.2, 1.2, 0.6)))


LOOKS = looks('blackhole', L)
