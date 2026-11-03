"""Void Mantle · Cosmic Darkness cruiser (280 m, 4 hardpoints) · Blender hero hull, shipyard batch 6.

A manta of the night-veil: a wide, flat wing-body, two horn-fins curling forward at the bow, a long
whip tail, gills of glowing slits under the leading edge, and a scatter of faint star-lights across
the back (the veil). Deep night-blue armour, violet-silver, violet light.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'void_mantle_hero.glb', 'hull': 'cosmic_darkness_cruiser', 'tile': 12.0, 'bake_size': 2048}
L = 280.0
Y0 = L / 2
S = L / 50.0
LOFT0 = 0.06
TAIL = 0.72


def Y(t):
    return Y0 - t * L


def sec(t):
    """The wing-body: widest at the middle, flat, its edges thin."""
    p = prow(t, 0.1)
    w = (3.0 + 17.0 * math.sin(math.pi * min(1, max(0, (t - 0.02) / 0.78))) ** 0.8) * p * S
    top = (0.9 + 1.1 * bump(0.38, 0.22, t)) * p * S
    bot = (0.6 + 0.5 * bump(0.38, 0.22, t)) * p * S
    return w, top, bot, 1.15, 0.0      # n near 1: a thin lens with knife edges


LEN = L * (TAIL - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (TAIL - LOFT0)


def wsec(u):
    return sec(LOFT0 + u * (TAIL - LOFT0))


def build(k):
    rnd = random.Random(31)
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    body = k.loft('body', LEN, wsec, rings=36, segs=40, mat=M['HULL'], y0=LY0)
    k.panelize(body, 36, 40, skip_row=3, skip_col=4, depth=0.25, thickness=0.3, keep=lambda i, j: 2 <= i <= 33)
    k.bevel(body, 0.18, 1, 30)
    k.weighted_normals(body)
    k.smooth(body)
    # A raised spine ridge down the centre of the back, plated.
    armour(k, M, wsec, LEN, LY0, lambda t: (t - LOFT0) / (TAIL - LOFT0), dorsal=((0.12, 0.24), (0.23, 0.36), (0.35, 0.48), (0.47, 0.6)), flanks=(), thick=0.6, seed=2400)
    # Plated wing surfaces left and right of the spine.
    for s in (-1, 1):
        for i, (t0, t1) in enumerate(((0.14, 0.3), (0.28, 0.46), (0.44, 0.62))):
            a0, a1 = (0.12, 0.48) if s > 0 else (math.pi - 0.48, math.pi - 0.12)
            k.shell_patch('wing_plate', wsec, LEN, LY0, lt(t0), lt(t1), a0, a1, M['TRIM'] if i % 2 else M['HULL'], scale=1.02, flare=0.04, thickness=0.5, segs=10, rings=8, panels=0.55, seed=2410 + i * 2 + (s > 0))
    # Horn-fins: two cephalic limbs curling forward and inward at the bow.
    for s in (-1, 1):
        w, top, bot, n, zo = sec(0.1)
        pts = [(s * w * 0.75, Y(0.1), 0.0), (s * w * 0.95, Y(0.05), -0.4 * S), (s * w * 0.85, Y(0.0), -1.0 * S), (s * w * 0.55, Y(-0.03), -1.6 * S)]
        horn, H = k.limb('horn', pts, [1.4 * S, 1.1 * S, 0.8 * S, 0.4 * S], M['TRIM'], core_mat=M['HULL'], sides=6, squash=0.55, plates=6, up=(0, 0, 1), flare=1.1, tip=2.6)
    # Gills: glowing slits under each leading edge.
    for s in (-1, 1):
        for q in range(5):
            t = 0.2 + q * 0.04
            w, top, bot, n, zo = sec(t)
            k.box('gill', (w * 0.35, 0.25 * S, 0.12 * S), (s * w * 0.45, Y(t), -bot * 0.82), M['GLOW'], rot=(0, 0, s * 0.25))
    # The whip tail.
    tail = [(0, Y(TAIL) + 2.0 * S, 0.0), (0, Y(0.82), 0.4 * S), (0.6 * S, Y(0.95), 0.9 * S), (0.2 * S, Y(1.05), 1.2 * S)]
    whip, Wt = k.limb('tail', tail, [2.2 * S, 1.4 * S, 0.8 * S, 0.3 * S], M['TRIM'], core_mat=M['HULL'], sides=6, squash=0.8, plates=10, up=(0, 0, 1), flare=1.12, tip=4.0)
    for q in range(6):
        pp, rr, (t, sd, upv) = Wt.at(0.12 + q * 0.13)
        b_ = pp + upv * rr * 0.7
        fang(k, 'tail_spine', tuple(b_), tuple(b_ + upv * 1.0 * S - t * 0.8 * S), 0.3 * S, M['GOLD'] if q % 2 else M['HULL'], sides=3)
    # A raised spine ridge down the middle of the back.
    for q in range(10):
        t = 0.1 + q * 0.055
        w, top, bot, n, zo = sec(t)
        k.wedge('ridge', (2.6 * S, 5.6 * S, 1.6 * S), (0, Y(t), top + 0.5 * S), M['TRIM'] if q % 2 else M['HULL'], slope=0.4, back=0.3)
    # The veil: faint star-lights scattered over the back.
    for q in range(140):
        t = rnd.uniform(0.12, 0.66)
        a = rnd.uniform(0.15, math.pi - 0.15)
        p, nrm = k.surf(wsec, LEN, LY0, lt(t), a, 1.0)
        k.sphere('star', rnd.uniform(0.12, 0.3), tuple(p + nrm * 0.35), M['GLOW'], 6)
    machinery_bands(k, M, wsec, LEN, LY0, lambda t: (t - LOFT0) / (TAIL - LOFT0), 0.14, 0.66, 1.6, seed=2420, dorsal_gap=None, density=0.7)
    for s, bank, t in ((-1, 'FL', 0.26), (1, 'FR', 0.26), (-1, 'ML', 0.5), (1, 'MR', 0.5)):
        w, top, bot, n, zo = sec(t)
        barbette(k, M, bank, s * w * 0.32, Y(t), top * 0.85, 1.2 * S, 0.7 * S)
    for x, name in ((-4.0, 'PORT'), (4.0, 'STARBOARD')):
        w, top, bot, n, zo = sec(0.68)
        k.nozzle('nozzle', (x * S, Y(0.7), 0.0), 1.1 * S, 1.8 * S, M, glow='GLOW')
        k.cowl('cowl', (x * S, Y(0.69), 0.0), 1.1 * S, 2.2 * S, M)
        k.empty('ENGINE_' + name, (x * S, Y(0.7) - 1.4 * S, 0.0), 1.1 * S)
    k.finish(skip=('core', 'body', 'horn', 'tail', 'star', 'NODE', 'ENGINE', 'windows', 'mach', 'plate_kit', 'cowl', 'wing_plate'))
    print('windows', k.deck_windows(('body',), rows=(-0.04, 0.0, 0.04), step=3.0, size=(0.2, 1.2, 0.5)))


LOOKS = looks('cosmic_darkness', L)
