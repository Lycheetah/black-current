"""Chimera Regent · Hybrid Fused battleship (1 km, 5 hardpoints) · Blender hero hull, shipyard batch 5.

Machine-organic fusion, the pirate look: the starboard half is machine (slab armour, a box gun pod,
cable runs, square drives), the port half is flesh-armour (overlapping carapace, a great talon, glowing
veins, organic drive bells), and the head is split: a fanged maw to port, a sensor cluster to starboard.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'chimera_regent_hero.glb', 'hull': 'hybrid_fused_battleship', 'tile': 30.0, 'bake_size': 2048}
L = 1000.0
Y0 = L / 2
S = L / 75.0
LOFT0 = 0.1


def Y(t):
    return Y0 - t * L


def sec(t):
    p = prow(t, 0.07)
    w = (3.0 + 4.0 * ss(0.0, 0.35, t)) * (1 - 0.3 * ss(0.8, 1, t)) * p * S
    top = (2.6 + 3.6 * ss(0.0, 0.35, t)) * p * S
    bot = (2.4 + 2.8 * ss(0.0, 0.35, t)) * p * S
    return w, top, bot, 2.8, 0.0


LEN = L * (1 - LOFT0)
LY0 = Y(LOFT0)
lt = lambda t: (t - LOFT0) / (1 - LOFT0)


def build(k):
    rnd = random.Random(17)
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    hull = k.loft('body', LEN, sec, rings=36, segs=32, mat=M['TRIM'], y0=LY0)
    k.panelize(hull, 36, 32, skip_row=3, skip_col=4, depth=1.0, thickness=1.2, keep=lambda i, j: 3 <= i <= 33)
    k.bevel(hull, 0.8, 1, 30)
    k.weighted_normals(hull)
    k.smooth(hull)

    # ---- port: organic carapace, a great talon, veins
    for i in range(7):
        t0 = 0.16 + i * 0.1
        k.shell_patch('carapace', sec, LEN, LY0, lt(t0), lt(t0 + 0.12), math.pi * 0.55, math.pi * 1.45, M['HULL'], scale=1.04 + 0.01 * (i % 2), flare=0.14, thickness=2.6, segs=12, rings=8, panels=0.2, seed=1500 + i)
    w, top, bot, n, zo = sec(lt(0.3))
    pts = [(-w * 0.9, Y(0.32), 0.0), (-(w / S + 6.0) * S, Y(0.24), -2.0 * S), (-(w / S + 7.5) * S, Y(0.1), -5.0 * S), (-(w / S + 4.0) * S, Y(0.0), -7.0 * S), (-(w / S + 1.0) * S, Y(-0.04), -5.5 * S)]
    talon, T = k.limb('talon', pts, [3.0 * S, 2.6 * S, 2.0 * S, 1.3 * S, 0.5 * S], M['HULL'], core_mat=M['TRIM'], sides=7, squash=0.8, plates=12, up=(-1, 0, 0.4), flare=1.12, tip=3.2)
    for q in range(6):
        pp, rr, (t, sd, upv) = T.at(0.15 + q * 0.13)
        b_ = pp + upv * rr * 0.7
        fang(k, 'talon_spur', tuple(b_), tuple(b_ + upv * 2.0 * S - t * 1.0 * S), 0.6 * S, M['GOLD'], sides=3)
    for q in range(5):
        y0 = Y(0.2 + q * 0.14)
        k.tube('vein', [(-w * 0.95, y0, rnd.uniform(-2, 3) * S), (-w * 1.08, y0 - 4.0 * S, rnd.uniform(-2, 3) * S), (-w * 0.98, y0 - 9.0 * S, rnd.uniform(-2, 3) * S)], [0.3 * S] * 3, M['GLOW'], ends=('round', 'round'), res=6)
    # ---- starboard: machine slabs, a gun pod, cable runs
    for q in range(8):
        t = 0.18 + q * 0.085
        w, top, bot, n, zo = sec(lt(t))
        k.box('slab', (1.2 * S, 6.0 * S, (4.0 + 2.0 * (q % 2)) * S), (w + 0.4 * S, Y(t), 0.4 * S), M['HULL'] if q % 2 else M['GOLD'])
    w, top, bot, n, zo = sec(lt(0.45))
    gx = w + 4.0 * S
    k.box('gun_pod', (5.0 * S, 26.0 * S, 4.4 * S), (gx, Y(0.42), 1.0 * S), M['HULL'])
    for dz in (-0.9, 1.1):
        k.tube('pod_barrel', [(gx, Y(0.42) + 12.0 * S, (1.0 + dz) * S), (gx, Y(0.42) + 22.0 * S, (1.0 + dz) * S), (gx, Y(0.42) + 30.0 * S, (1.0 + dz) * S)], [0.7 * S, 0.6 * S, 0.5 * S], M['TRIM'], bevel_res=2, ends=('flat', 'flat'), res=1)
        k.cylinder('pod_muzzle', 0.75 * S, 1.2 * S, (gx, Y(0.42) + 30.0 * S, (1.0 + dz) * S), M['TRIM'], segs=8, rot=(-math.pi / 2, 0, 0))
    k.box('pod_arm', (4.0 * S, 6.0 * S, 1.6 * S), (w + 1.5 * S, Y(0.44), 1.0 * S), M['TRIM'])
    for zz in (2.0, 3.0, 4.0):
        run = [k.surf(sec, LEN, LY0, lt(t), 0.35, 1.03)[0] for t in (0.18, 0.4, 0.62, 0.85)]
        k.conduit('cable', [(p[0], p[1], p[2] + (zz - 3.0) * S) for p in run], 0.5 * S, M['TRIM'], clamps=6, clamp_mat=M['GOLD'])
    k.machinery('mach_machine', sec, LEN, LY0, lt(0.18), lt(0.9), -0.9, 0.3, M, count=80, h=5.0, seed=1510)
    # ---- the split head: a fanged maw to port, a sensor cluster to starboard
    yh = Y(LOFT0) + 1.0 * S
    k.armour_ring('maw', 3.6 * S, 0.8 * S, 2.0 * S, (-1.6 * S, yh + 1.0 * S, 0.0), M, rot=(math.pi / 2, 0, 0), blocks=12, gap=0.18, glow=True)
    for i in range(9):
        a = i / 9 * math.tau
        c, s_ = math.cos(a), math.sin(a)
        fang(k, 'maw_fang', (-1.6 * S + c * 4.0 * S, yh + 1.6 * S, s_ * 4.0 * S), (-1.6 * S + c * 1.6 * S, yh + 5.0 * S, s_ * 1.6 * S), 0.6 * S, M['GOLD'] if i % 3 == 0 else M['HULL'])
    k.sphere('maw_throat', 2.6 * S, (-1.6 * S, yh, 0.0), M['GLOW'], 24)
    for i, (dx, dz, sz) in enumerate(((3.6, 1.6, 2.4), (5.0, -1.0, 1.8), (2.6, -2.4, 1.6), (4.4, 3.4, 1.2))):
        k.box('sensor_block', (sz * S, sz * 1.4 * S, sz * S), (dx * S, yh + 1.5 * S, dz * S), M['HULL'])
        k.cylinder('sensor_eye', sz * 0.32 * S, 0.3 * S, (dx * S, yh + 1.5 * S + sz * 0.72 * S, dz * S), M['GLOW'], segs=12, rot=(-math.pi / 2, 0, 0))

    for s, bank, t in ((-1, 'FL', 0.3), (1, 'FR', 0.28), (-1, 'ML', 0.6), (1, 'MR', 0.62)):
        w, top, bot, n, zo = sec(lt(t))
        barbette(k, M, bank, s * w * 0.42, Y(t), top * 0.95, 2.2 * S, 1.0 * S)
    w, top, bot, n, zo = sec(lt(0.8))
    barbette(k, M, 'AL', 0, Y(0.8), top * 0.95, 2.6 * S, 1.0 * S)
    # Drives: organic bells to port, square machine drives to starboard.
    for i, z in enumerate((-1.8, 1.8)):
        k.nozzle('nozzle', (-2.8 * S, Y(1.0) - 1.0 * S, z * S), 1.8 * S, 3.0 * S, M, glow='GLOW')
        k.empty('ENGINE_P%d' % i, (-2.8 * S, Y(1.0) - 2.6 * S, z * S), 1.8 * S)
        k.box('drive_frame', (3.0 * S, 1.6 * S, 3.0 * S), (2.8 * S, Y(1.0) - 0.4 * S, z * S), M['HULL'])
        k.box('drive_glow', (2.4 * S, 0.2 * S, 2.4 * S), (2.8 * S, Y(1.0) - 1.25 * S, z * S), M['GLOW'])
        k.empty('ENGINE_S%d' % i, (2.8 * S, Y(1.0) - 2.0 * S, z * S), 1.3 * S)

    k.finish(skip=('core', 'body', 'carapace', 'maw', 'talon', 'NODE', 'ENGINE', 'windows', 'mach', 'cable', 'vein'))
    print('windows', k.deck_windows(('body', 'slab'), rows=(-0.16, -0.08, 0.0, 0.08, 0.16), step=3.2, size=(0.25, 1.4, 0.8)))


LOOKS = looks('hybrid_fused', L)
