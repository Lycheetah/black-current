"""Chaos Beast · Chaos battleship (1 km, 5 hardpoints) · Blender hero hull, shipyard batch 3.

A kraken: a writhing armoured body, six tentacle-limbs of uneven length trailing forward and
down from its shoulders, jagged spines down the back, a glowing gullet at the bow ringed with
fangs, mismatched drives. Bruised black, crimson bronze, purple fire.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'chaos_beast_hero.glb', 'hull': 'chaos_battleship', 'tile': 30.0, 'bake_size': 2048}
L = 1000.0
Y0 = L / 2
S = L / 75.0
LOFT0 = 0.12


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.08)
    w = (3.0 + 5.0 * ss(0.0, 0.35, t) * (1 + 0.12 * math.sin(t * 23)) + 1.2 * bump(0.25, 0.1, t)) * (1 - 0.4 * ss(0.75, 1, t)) * p * S
    top = (2.6 + 4.6 * ss(0.0, 0.35, t) + 1.4 * bump(0.3, 0.12, t)) * p * S
    bot = (2.4 + 3.8 * ss(0.0, 0.35, t)) * p * S
    return w, top, bot, 2.3 + 0.6 * math.sin(t * 11), 1.4 * S * math.sin(t * 4.0)


LEN = L * (1 - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (1 - LOFT0)


def build(k):
    rnd = random.Random(9)
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    hull = k.loft('body', LEN, sec, rings=40, segs=32, mat=M['HULL'], y0=LY0)
    k.panelize(hull, 40, 32, skip_row=2, skip_col=3, depth=1.0, thickness=1.2, keep=lambda i, j: 3 <= i <= 37)
    k.bevel(hull, 0.8, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)

    # The gullet: a glowing throat ringed by inward fangs.
    yg = Y(LOFT0) + 1.0 * S
    k.sphere('gullet', 3.4 * S, (0, yg + 0.5 * S, 0.3 * S), M['GLOW'], 32)
    k.armour_ring('gullet_ring', 4.4 * S, 0.9 * S, 2.2 * S, (0, yg + 1.6 * S, 0.3 * S), M, rot=(math.pi / 2, 0, 0), blocks=14, gap=0.18, glow=False)
    for i in range(12):
        a = i / 12 * math.tau
        c, s_ = math.cos(a), math.sin(a)
        fang(k, 'gullet_fang', (c * 5.0 * S, yg + 2.2 * S, 0.3 * S + s_ * 5.0 * S), (c * 2.4 * S, yg + 6.0 * S, 0.3 * S + s_ * 2.4 * S), 0.7 * S, M['GOLD'] if i % 3 == 0 else M['TRIM'])

    # Six tentacles: three per side, uneven lengths, curling forward and down.
    for s in (-1, 1):
        for j, (t_root, length, droop, rad) in enumerate(((0.22, 30.0, 6.0, 2.2), (0.32, 24.0 + 8 * (s > 0), 9.0, 1.9), (0.42, 18.0 - 5 * (s > 0), 12.0, 1.6))):
            w, top, bot, n, zo = sec(lt(t_root))
            root = (s * w * 0.9, Y(t_root), zo - bot * 0.2)
            pts = [root]
            for q in range(1, 6):
                u = q / 5
                pts.append((s * (w * 0.9 / S + 6.0 * math.sin(u * 2.4) + 2.0 * u) * S, Y(t_root) + u * length * S, zo - (droop * math.sin(u * 1.7) + 2.0 * u) * S))
            radii = [rad * S * (1 - 0.8 * (q / 5)) + 0.25 * S for q in range(6)]
            ten, T = k.limb('tentacle', pts, radii, M['TRIM'], core_mat=M['HULL'], sides=7, squash=0.8, plates=12, up=(s, 0, 0.6), flare=1.13, tip=3.0, twist=0.2 * s)
            for q in range(7):
                pp, rr, (t, sd, upv) = T.at(0.1 + q * 0.12)
                b_ = pp + upv * rr * 0.7
                fang(k, 'tentacle_hook', tuple(b_), tuple(b_ + upv * (0.8 + rnd.random()) * S - t * 0.6 * S), 0.35 * S, M['GOLD'] if q % 3 == 0 else M['HULL'], sides=3)
            k.tube('tentacle_fire', [tuple(p) for p in pts[:5]], [0.18 * S] * 5, M['GLOW'], ends=('round', 'round'), res=4)

    # Jagged spines down the back, uneven and leaning.
    for q in range(16):
        t = 0.2 + q * 0.045
        w, top, bot, n, zo = sec(lt(t))
        h = (2.0 + 4.0 * rnd.random()) * S
        lean = (rnd.random() - 0.5) * 0.8
        b_ = (lean * w * 0.3, Y(t), zo + top * 0.92)
        fang(k, 'spine', b_, (b_[0] + lean * h, b_[1] - h * 0.5, b_[2] + h), (0.5 + 0.25 * rnd.random()) * S, M['GOLD'] if q % 5 == 2 else M['TRIM'], sides=3)
    k.tube('spine_vein', [(0, Y(0.2), sec(lt(0.2))[1] + sec(lt(0.2))[4] + 0.4 * S), (0, Y(0.5), sec(lt(0.5))[1] + sec(lt(0.5))[4] + 0.4 * S), (0, Y(0.85), sec(lt(0.85))[1] + sec(lt(0.85))[4] + 0.4 * S)], [0.25 * S] * 3, M['GLOW'], ends=('round', 'round'), res=8)

    armour(k, M, sec, LEN, LY0, lt, dorsal=((0.16, 0.26), (0.26, 0.37), (0.5, 0.6), (0.6, 0.72), (0.74, 0.86)), flanks=((0.18, 0.3), (0.45, 0.57), (0.6, 0.74), (0.76, 0.88)), thick=2.2, seed=701)
    machinery_bands(k, M, sec, LEN, LY0, lt, 0.18, 0.9, 5.0, seed=711, dorsal_gap=(0.38, 0.49), density=1.2)

    for s, bank, t in ((-1, 'FL', 0.28), (1, 'FR', 0.3), (-1, 'ML', 0.55), (1, 'MR', 0.58)):
        w, top, bot, n, zo = sec(lt(t))
        barbette(k, M, bank, s * w * 0.5, Y(t), zo + top * 0.86, 2.2 * S, 1.0 * S)
    w, top, bot, n, zo = sec(lt(0.8))
    barbette(k, M, 'AL', 0, Y(0.8), zo + top * 0.9, 2.6 * S, 1.0 * S)

    for x, z, r, name in ((-2.8, 0.0, 2.2, 'MAIN'), (2.6, -0.8, 1.5, 'STARBOARD'), (0.6, 2.4, 1.0, 'PORT')):
        w, top, bot, n, zo = sec(1.0)
        k.nozzle('nozzle', (x * S, Y(1.0) - 1.0 * S, zo + z * S), r * S, 1.8 * r * S, M, glow='GLOW')
        k.cowl('cowl', (x * S, Y(1.0) - 0.6 * S, zo + z * S), r * S, 2.1 * r * S, M)
        k.empty('ENGINE_' + name, (x * S, Y(1.0) - 2.0 * r * S, zo + z * S), r * S)

    k.finish(skip=('core', 'body', 'gullet', 'NODE', 'ENGINE', 'windows', 'tentacle', 'mach', 'plate_kit', 'cowl'))
    print('windows', k.deck_windows(('body',), rows=(-0.16, -0.08, 0.0, 0.08, 0.16), step=3.0, size=(0.25, 1.4, 0.8)))


LOOKS = looks('chaos', L)
