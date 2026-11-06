"""Uncrowned · Cinderwake battleship (1 km, 5 hardpoints) · Cinderwake flagship.

Outlaw salvage made into a king's ship: two different hulls welded together at an angle (a long gun
hull and a stolen freighter hull), boarding claws at the bow, scaffolding over the weld, cargo pods,
patch plates, a salvage harpoon crane, mismatched drives. Dominant: the welded, crooked double hull."""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'uncrowned_hero.glb', 'hull': 'cinderwake_battleship', 'tile': 30.0, 'bake_size': 2048}
L = 1000.0
Y0 = L / 2
S = L / 75.0


def Y(t):
    return Y0 - t * L


def gun_hull(t):
    p = prow(t, 0.08)
    w = (2.6 + 2.0 * ss(0.0, 0.3, t)) * p * S
    top = (2.4 + 2.0 * ss(0.0, 0.3, t)) * p * S
    bot = (2.2 + 1.6 * ss(0.0, 0.3, t)) * p * S
    return w, top, bot, 3.2, 0.0


def freighter(t):
    p = prow(t, 0.04)
    w = (5.0 + 1.0 * ss(0.0, 0.2, t)) * p * S
    top = (4.0 + 0.8 * ss(0.0, 0.2, t)) * p * S
    bot = (3.6 + 0.6 * ss(0.0, 0.2, t)) * p * S
    return w, top, bot, 7.0, 0.0


def build(k):
    import bpy
    rnd = random.Random(23)
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    # The gun hull (long, forward) and the stolen freighter (boxy, aft and to port), welded crooked.
    for name, sec, t0, t1, off, rotz, rotx in (('body', gun_hull, 0.0, 0.7, (2.0, 0.0, 1.0), 0.04, 0.0), ('freight', freighter, 0.42, 1.0, (-6.0, 0.0, -2.0), -0.08, 0.06)):
        LEN = L * (t1 - t0)
        h = k.loft(name, LEN, sec, rings=30, segs=30, mat=M['HULL'], y0=Y(t0))
        k.panelize(h, 30, 30, skip_row=2, skip_col=3, depth=1.0, thickness=1.2, keep=lambda i, j: 2 <= i <= 27)
        k.bevel(h, 0.8, 1, 30)
        k.weighted_normals(h)
        k.smooth(h)
        lt = (lambda a, b: (lambda t: (t - a) / (b - a)))(t0, t1)
        armour(k, M, sec, LEN, Y(t0), lt, dorsal=((t0 + (t1 - t0) * 0.15, t0 + (t1 - t0) * 0.3), (t0 + (t1 - t0) * 0.6, t0 + (t1 - t0) * 0.78)), flanks=((t0 + (t1 - t0) * 0.2, t0 + (t1 - t0) * 0.4),), thick=2.2, seed=6600 + len(name))
        machinery_bands(k, M, sec, LEN, Y(t0), lt, t0 + (t1 - t0) * 0.1, t0 + (t1 - t0) * 0.92, 5.0, seed=6610 + len(name), dorsal_gap=(t0 + (t1 - t0) * 0.32, t0 + (t1 - t0) * 0.58), density=0.8)
        for ob in bpy.context.scene.objects:
            if ob.get('placed') is None:
                ob['placed'] = name
                ob.location.x += off[0] * S; ob.location.z += off[2] * S
                ob.rotation_euler.z += rotz; ob.rotation_euler.x += rotx
    # The weld: a scarred collar band, scaffolding and girders over the join.
    yw = Y(0.5)
    k.box('weld', (16.0 * S, 6.0 * S, 12.0 * S), (-2.0 * S, yw, -0.4 * S), M['TRIM'])
    k.box_kit('weld_kit', (-2.0 * S, yw, -0.4 * S), (16.0 * S, 6.0 * S, 12.0 * S), M, faces=('top', 'left', 'right'), count=12, h=2.8, seed=6620)
    for i in range(5):
        k.truss('scaffold', (-10.0 * S + i * 4.0 * S, Y(0.44), 5.0 * S), (-10.0 * S + i * 4.0 * S, Y(0.58), 6.0 * S), 1.8 * S, M)
    k.truss('scaffold_x', (-11.0 * S, Y(0.51), 7.0 * S), (7.0 * S, Y(0.5), 6.4 * S), 1.6 * S, M)
    # Boarding claws at the bow.
    for s in (-1, 1):
        pts = [(2.0 * S + s * 3.0 * S, Y(0.06), 1.0 * S), (2.0 * S + s * 7.0 * S, Y(0.0), 1.6 * S), (2.0 * S + s * 7.6 * S, Y(-0.06), 0.4 * S), (2.0 * S + s * 4.2 * S, Y(-0.1), -0.6 * S)]
        k.limb('boarding_claw', pts, [2.0 * S, 1.6 * S, 1.1 * S, 0.5 * S], M['TRIM'], core_mat=M['HULL'], sides=5, squash=0.7, plates=8, up=(0, 0, 1), flare=1.14, tip=3.0)
    k.box('boarding_ram', (5.0 * S, 6.0 * S, 4.0 * S), (2.0 * S, Y(0.02), 1.0 * S), M['GOLD'])
    # Cargo pods, patch plates, a salvage harpoon crane, an offset bridge.
    for q in range(12):
        t = 0.6 + (q % 6) * 0.06
        x = -6.0 * S + (-1 if q < 6 else 1) * 6.2 * S
        k.box('cargo', (2.6 * S, 4.6 * S, 3.0 * S), (x, Y(t), (rnd.random() - 0.4) * 4.0 * S), M['GOLD'] if q % 5 == 0 else M['HULL'], rot=(0, 0, rnd.uniform(-0.06, 0.06)))
    # Patch plates welded flush onto the gun hull's real surface.
    for q in range(18):
        t = rnd.uniform(0.08, 0.66)
        a = rnd.uniform(0.3, math.pi - 0.3)
        p, nrm = k.surf(gun_hull, L * 0.7, Y(0.0), t / 0.7, a, 1.06)
        c = (p.x + 2.0 * S, p.y, p.z + 1.0 * S)
        k.plane_kit('patch', c, (0, 1, 0), tuple(nrm.cross(type(nrm)((0, 1, 0))).normalized()), tuple(nrm), (rnd.uniform(4, 8) * S, rnd.uniform(3, 6) * S), M, count=2, h=2.4, seed=6640 + q)
    k.box('crane_mast', (1.6 * S, 1.6 * S, 14.0 * S), (-9.0 * S, Y(0.7), 12.0 * S), M['GOLD'])
    k.box('crane_jib', (1.2 * S, 22.0 * S, 1.2 * S), (-9.0 * S, Y(0.6), 19.0 * S), M['GOLD'])
    fang(k, 'harpoon', (-9.0 * S, Y(0.5), 18.0 * S), (-9.0 * S, Y(0.42), 12.0 * S), 1.2 * S, M['TRIM'], sides=4)
    k.bridge_tower('bridge', (4.0 * S, Y(0.34), 4.2 * S), 9.0 * S, 10.0 * S, 12.0 * S, M, decks=3, seed=6630)
    for bank, (x, t, z) in (('FL', (-1.0, 0.24, 4.6)), ('FR', (5.0, 0.24, 4.6)), ('ML', (-12.0, 0.62, 5.0)), ('MR', (0.0, 0.62, 5.0)), ('AL', (-6.0, 0.86, 5.2))):
        barbette(k, M, bank, x * S, Y(t), z * S, 2.2 * S, 1.1 * S)
    # Mismatched drives.
    for i, (x, z, r) in enumerate(((-9.0, -2.0, 2.6), (-3.0, -3.6, 1.6), (-4.0, 2.2, 2.0), (3.0, 0.6, 1.2))):
        k.nozzle('nozzle', (x * S, Y(1.0) - 0.8 * S, z * S), r * S, 2.0 * r * S, M, glow='GLOW')
        k.empty('ENGINE_%d' % i, (x * S, Y(1.0) - 2.0 * r * S, z * S), r * S)
    k.finish(skip=('core', 'body', 'freight', 'weld_kit', 'patch', 'scaffold', 'boarding_claw', 'bridge', 'NODE', 'ENGINE', 'windows', 'mach', 'plate_kit'))
    print('windows', k.deck_windows(('body', 'freight', 'bridge'), rows=(-0.16, -0.08, 0.0, 0.08, 0.16), step=3.4, size=(0.25, 1.4, 0.8)))


LOOKS = looks('cinderwake', L)
