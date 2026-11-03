"""Machine Lattice · AI cruiser (280 m, 4 hardpoints) · Blender hero hull, shipyard batch 4.

Pure machine geometry: a hexagonal spine, rings of identical cubic modules spaced exactly along it,
an open hexagonal lattice cage around everything, a cube core lit from inside. No ornament, only
order. White-grey, steel blue, cyan.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'machine_lattice_hero.glb', 'hull': 'ai_cruiser', 'tile': 12.0, 'bake_size': 2048}
L = 280.0
Y0 = L / 2
S = L / 50.0


def Y(t):
    return Y0 - t * L


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    # The spine: a hexagonal prism with a pointed hex nose.
    k.cylinder('spine', 2.0 * S, 0.84 * L, (0, Y(0.52), 0), M['TRIM'], segs=6, rot=(-math.pi / 2, 0, 0))
    k.cylinder('nose', 2.0 * S, 0.1 * L, (0, Y(0.05), 0), M['HULL'], segs=6, rot=(-math.pi / 2, 0, 0), r2=0.2 * S)
    # Module rings: six identical cubes around the spine, at exact intervals; every third ring larger.
    for q in range(9):
        y = Y(0.16 + q * 0.085)
        big = q % 3 == 1
        R = (4.4 if big else 3.6) * S
        for i in range(6):
            a = i / 6 * math.tau + math.pi / 6
            c, s_ = math.cos(a), math.sin(a)
            cube = k.box('module', ((2.4 if big else 1.8) * S, (3.4 if big else 2.4) * S, (2.4 if big else 1.8) * S), (c * R, y, s_ * R), M['HULL'])
            cube.rotation_euler = (0, -a, 0)
            k.box('module_light', (0.2 * S, (3.0 if big else 2.0) * S, 0.2 * S), (c * (R + (1.25 if big else 0.95) * S), y, s_ * (R + (1.25 if big else 0.95) * S)), M['GLOW'])
            k.tube('module_arm', [(c * 1.9 * S, y, s_ * 1.9 * S), (c * (R - 0.9 * S), y, s_ * (R - 0.9 * S))], [0.25 * S] * 2, M['TRIM'], bevel_res=1, ends=('flat', 'flat'), res=1)
        k.cylinder('collar', 2.3 * S, 1.0 * S, (0, y, 0), M['GOLD'], segs=6, rot=(-math.pi / 2, 0, 0))
    # The lattice cage: six long rails at the hexagon's corners and hex rings joining them.
    Rc = 6.6 * S
    corners = [(math.cos(i / 6 * math.tau) * Rc, math.sin(i / 6 * math.tau) * Rc) for i in range(6)]
    for x, z in corners:
        k.box('cage_rail', (0.35 * S, 0.74 * L, 0.35 * S), (x, Y(0.53), z), M['TRIM'])
    for q in range(5):
        y = Y(0.2 + q * 0.165)
        for i in range(6):
            (x0, z0), (x1, z1) = corners[i], corners[(i + 1) % 6]
            mid = ((x0 + x1) / 2, y, (z0 + z1) / 2)
            k.tube('cage_ring', [(x0, y, z0), mid, (x1, y, z1)], [0.3 * S] * 3, M['GOLD'] if q == 2 else M['TRIM'], bevel_res=1, ends=('flat', 'flat'), res=1)
            if q < 4:
                yd = y - 0.165 * L
                k.tube('cage_diag', [(x0, y, z0), ((x0 + x1) / 2, (y + yd) / 2, (z0 + z1) / 2), (x1, yd, z1)], [0.16 * S] * 3, M['TRIM'], bevel_res=1, ends=('flat', 'flat'), res=1)
    # The cube core, lit from inside.
    k.box('core_cube', (3.6 * S, 3.6 * S, 3.6 * S), (0, Y(0.5), 0), M['GLOW'])
    k.box('core_frame', (4.2 * S, 0.4 * S, 4.2 * S), (0, Y(0.5) + 1.9 * S, 0), M['TRIM'])
    k.box('core_frame', (4.2 * S, 0.4 * S, 4.2 * S), (0, Y(0.5) - 1.9 * S, 0), M['TRIM'])
    for s, bank, t in ((-1, 'FL', 0.33), (1, 'FR', 0.33), (-1, 'ML', 0.67), (1, 'MR', 0.67)):
        x = s * math.cos(math.pi / 6) * 4.4 * S
        barbette(k, M, bank, x, Y(t), math.sin(math.pi / 6) * 4.4 * S + 1.4 * S, 1.0 * S, 0.6 * S)
    for i in range(6):
        a = i / 6 * math.tau + math.pi / 6
        x, z = math.cos(a) * 2.6 * S, math.sin(a) * 2.6 * S
        k.box('drive_block', (1.8 * S, 2.4 * S, 1.8 * S), (x, Y(0.96), z), M['HULL'])
        k.box('drive_face', (1.4 * S, 0.1 * S, 1.4 * S), (x, Y(0.96) - 1.25 * S, z), M['GLOW'])
        k.empty('ENGINE_%d' % i, (x, Y(0.96) - 1.6 * S, z), 0.8 * S)
    k.finish(skip=('core', 'NODE', 'ENGINE', 'windows'))


LOOKS = looks('ai', L)
