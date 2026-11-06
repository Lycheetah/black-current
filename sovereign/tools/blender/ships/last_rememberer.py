"""Last Rememberer · Nacre battleship (1 km, 5 hardpoints) · Nacre flagship.

An alien memory-reef: a giant chambered nautilus shell at the stern (a logarithmic spiral of nacre
armour chambers), a long reef-body reaching forward, reef spines and coral growths along it, glowing
archive chambers in the shell's lip, pearl-lustre armour. Dominant feature: the spiral shell."""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'last_rememberer_hero.glb', 'hull': 'nacre_battleship', 'tile': 30.0, 'bake_size': 2048}
L = 1000.0
Y0 = L / 2
S = L / 75.0


def Y(t):
    return Y0 - t * L


def body(t):
    p = prow(t, 0.12)
    w = (2.0 + 2.8 * ss(0.05, 0.6, t)) * p * S
    top = (2.0 + 2.6 * ss(0.05, 0.6, t)) * p * S
    bot = (1.8 + 2.2 * ss(0.05, 0.6, t)) * p * S
    return w, top, bot, 2.2, 0.0


BODY_LEN = L * 0.62
lt = lambda t: t / 0.62


def build(k):
    rnd = random.Random(41)
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    hull = k.loft('body', BODY_LEN, body, rings=36, segs=30, mat=M['HULL'], y0=Y(0.0))
    k.panelize(hull, 36, 30, skip_row=3, skip_col=4, depth=1.0, thickness=1.2, keep=lambda i, j: 3 <= i <= 33)
    k.bevel(hull, 0.8, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)
    armour(k, M, body, BODY_LEN, Y(0.0), lt, dorsal=((0.14, 0.26), (0.25, 0.37), (0.36, 0.48)), flanks=((0.16, 0.3), (0.34, 0.48)), thick=2.2, seed=6700)
    machinery_bands(k, M, body, BODY_LEN, Y(0.0), lt, 0.12, 0.6, 5.0, seed=6710, dorsal_gap=(0.49, 0.6), density=0.7)
    # The shell: a logarithmic spiral of nacre chambers, standing upright across the stern.
    cy, cz = Y(0.8), 4.0 * S
    pts, radii = [], []
    for q in range(16):
        u = q / 15
        a = -math.pi * 0.35 + u * math.tau * 1.35
        r = 22.0 * S * math.exp(-1.25 * u)
        pts.append((0.0, cy + math.cos(a) * r, cz + math.sin(a) * r))
        radii.append(10.0 * S * math.exp(-1.35 * u) + 0.5 * S)
    k.limb('shell', pts, radii, M['HULL'], core_mat=M['TRIM'], sides=10, squash=0.6, plates=22, up=(1, 0, 0), flare=1.07, tip=0.8)
    for q in range(1, 15, 2):
        k.armour_ring('chamber_rib', radii[q] * 1.02, radii[q] * 0.08, radii[q] * 0.2, pts[q], M, rot=(0, math.pi / 2, 0), blocks=12, gap=0.15, glow=q < 6)
    # Archive chambers: glowing ports along the shell's outer lip.
    for q in range(2, 10):
        x, y, z = pts[q]
        for s in (-1, 1):
            k.sphere('archive', radii[q] * 0.12, (s * radii[q] * 0.58, y, z), M['GLOW'], 10)
    # Reef spines and coral growths along the body.
    for q in range(26):
        t = rnd.uniform(0.1, 0.6)
        a = rnd.uniform(0.2, math.pi - 0.2) if q % 3 else rnd.uniform(math.pi + 0.4, math.tau - 0.4)
        p, nrm = k.surf(body, BODY_LEN, Y(0.0), lt(t), a, 1.03)
        ln = rnd.uniform(3.0, 9.0) * S
        tip = p + nrm * ln + type(p)((0, rnd.uniform(-2, 2) * S, 0))
        fang(k, 'reef_spine', tuple(p), tuple(tip), rnd.uniform(0.6, 1.4) * S, M['TRIM'] if q % 2 else M['GOLD'], sides=5)
        if q % 4 == 0:
            for c in range(3):
                d = type(p)((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))).normalized()
                k.sphere('coral', rnd.uniform(0.8, 1.8) * S, tuple(p + nrm * 1.5 * S + d * 1.6 * S), M['HULL'], 8)
    # A reef prow: three long glowing spines reaching forward.
    for x, z, f in ((0.0, 0.8, 1.0), (-1.8, -0.8, 0.7), (1.8, -0.8, 0.7)):
        fang(k, 'prow_spine', (x * S, Y(0.03), z * S), (x * S * 0.5, Y(-0.1 * f), z * S * 0.5), 1.4 * S * f, M['GOLD'], sides=6)
        k.tube('prow_glow', [(x * S, Y(0.03), z * S + 1.0 * S), (x * S * 0.7, Y(-0.04 * f), z * S * 0.7 + 0.6 * S), (x * S * 0.5, Y(-0.09 * f), z * S * 0.5)], [0.3 * S, 0.2 * S, 0.05 * S], M['GLOW'], ends=('round', 'point'), res=3)
    for s, bank, t in ((-1, 'FL', 0.22), (1, 'FR', 0.22), (-1, 'ML', 0.44), (1, 'MR', 0.44)):
        w, top, bot, n, zo = body(lt(t))
        barbette(k, M, bank, s * w * 0.5, Y(t), top * 0.95, 2.2 * S, 1.1 * S)
    barbette(k, M, 'AL', 0, Y(0.56), body(lt(0.56))[1] * 0.97, 2.4 * S, 1.1 * S)
    for i, (x, z) in enumerate(((-3.0, -3.0), (3.0, -3.0))):
        k.nozzle('nozzle', (x * S, Y(0.66), z * S), 1.8 * S, 3.0 * S, M, glow='GLOW')
        k.empty('ENGINE_%d' % i, (x * S, Y(0.66) - 2.4 * S, z * S), 1.8 * S)
    k.finish(skip=('core', 'body', 'shell', 'chamber_rib', 'archive', 'coral', 'NODE', 'ENGINE', 'windows', 'mach', 'plate_kit', 'prow_glow'))
    print('windows', k.deck_windows(('body',), rows=(-0.12, -0.04, 0.04, 0.12), step=3.4, size=(0.25, 1.4, 0.8)))


LOOKS = looks('nacre', L)
