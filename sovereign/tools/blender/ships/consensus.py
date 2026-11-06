"""Consensus · AI battleship (1 km, 5 hardpoints) · AI flagship.

Pure machine geometry: a hexagonal spine through a gyroscope of three concentric module rings (one
across the ship, one tilted, one along it), each studded with identical modules; truss lattice
lacing rings to spine; hex patterning; a sensor-dome prow and a drive grid. Dominant: the gyroscope."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'consensus_hero.glb', 'hull': 'ai_battleship', 'tile': 30.0, 'bake_size': 2048}
L = 1000.0
Y0 = L / 2
S = L / 75.0


def Y(t):
    return Y0 - t * L


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    # The spine: a long hexagonal prism, dressed on all six faces, with a sensor-dome prow.
    R0 = 4.0 * S
    k.cylinder('spine', R0, 0.86 * L, (0, Y(0.51), 0), M['TRIM'], segs=6, rot=(-math.pi / 2, 0, 0))
    for i in range(6):
        a = i / 6 * math.tau + math.pi / 6
        ap = R0 * math.cos(math.pi / 6)
        c, s_ = math.cos(a), math.sin(a)
        k.plane_kit('spine_kit', (c * ap, Y(0.51), s_ * ap), (0, 1, 0), (-s_, 0, c), (c, 0, s_), (0.84 * L, R0 * 0.9), M, count=40, h=2.6, seed=6300 + i)
    k.cylinder('prow', R0, 0.08 * L, (0, Y(0.04), 0), M['HULL'], segs=6, rot=(-math.pi / 2, 0, 0), r2=R0 * 0.6)
    k.sensor_dome('dome', (0, Y(-0.0) , 0), (0, 1, 0), R0 * 0.6, M)
    # The gyroscope: three concentric module rings around the middle of the spine.
    yc = Y(0.48)
    for j, (R, rot) in enumerate(((22.0 * S, (math.pi / 2, 0, 0)), (17.0 * S, (math.pi / 2, 0.6, 0)), (13.0 * S, (0, math.pi / 2, 0)))):
        k.armour_ring('gyro', R, 1.0 * S, 3.0 * S, (0, yc, 0), M, rot=rot, blocks=24 - j * 4, gap=0.1)
    # Identical modules on the outer ring (across the ship), and spokes of truss to the spine.
    for i in range(12):
        a = i / 12 * math.tau
        c, s_ = math.cos(a), math.sin(a)
        Rm = 22.0 * S
        m = k.box('module', (5.0 * S, 7.0 * S, 5.0 * S), (c * (Rm + 2.6 * S), yc, s_ * (Rm + 2.6 * S)), M['HULL'])
        m.rotation_euler = (0, -a, 0)
        k.box('module_light', (0.4 * S, 6.0 * S, 0.4 * S), (c * (Rm + 5.2 * S), yc, s_ * (Rm + 5.2 * S)), M['GLOW'])
        if i % 3 == 0:
            k.truss('spoke', (c * R0, yc, s_ * R0), (c * (Rm - 1.2 * S), yc, s_ * (Rm - 1.2 * S)), 2.2 * S, M, up=(0, 1, 0))
    # Module rings along the spine fore and aft, and radiator banks on the spine.
    for t in (0.2, 0.3, 0.66, 0.76):
        for i in range(6):
            a = i / 6 * math.tau + math.pi / 6
            c, s_ = math.cos(a), math.sin(a)
            m = k.box('pod', (3.2 * S, 5.0 * S, 3.2 * S), (c * (R0 + 2.2 * S), Y(t), s_ * (R0 + 2.2 * S)), M['HULL'] if i % 2 else M['TRIM'])
            m.rotation_euler = (0, -a, 0)
        k.cylinder('pod_collar', R0 * 1.12, 1.6 * S, (0, Y(t), 0), M['GOLD'], segs=6, rot=(-math.pi / 2, 0, 0))
    for i in range(3):
        a = i / 3 * math.tau + math.pi / 2
        c, s_ = math.cos(a), math.sin(a)
        k.radiator_bank('radiator', (c * R0 * 0.88, Y(0.86), s_ * R0 * 0.88), (-s_, 0, c), (0, 1, 0), (c, 0, s_), 5.0 * S, 12.0 * S, 3.0 * S, M, fins=10)
    for s, bank, t in ((-1, 'FL', 0.2), (1, 'FR', 0.2), (-1, 'ML', 0.76), (1, 'MR', 0.76)):
        x = s * math.cos(math.pi / 6) * (R0 + 2.2 * S)
        barbette(k, M, bank, x, Y(t) + 4.0 * S, math.sin(math.pi / 6) * (R0 + 2.2 * S) + 1.8 * S, 1.8 * S, 0.9 * S)
    barbette(k, M, 'AL', 0, Y(0.62), R0 + 0.6 * S, 2.2 * S, 0.9 * S)
    # A drive grid: a hex of square drives at the stern.
    for i in range(7):
        if i == 6:
            x, z = 0.0, 0.0
        else:
            a = i / 6 * math.tau
            x, z = math.cos(a) * 3.0 * S, math.sin(a) * 3.0 * S
        k.box('drive_frame', (2.4 * S, 2.0 * S, 2.4 * S), (x, Y(0.95), z), M['HULL'])
        k.box('drive_glow', (1.8 * S, 0.2 * S, 1.8 * S), (x, Y(0.95) - 1.05 * S, z), M['GLOW'])
        k.empty('ENGINE_%d' % i, (x, Y(0.95) - 1.6 * S, z), 1.0 * S)
    k.finish(skip=('core', 'NODE', 'ENGINE', 'windows', 'spine_kit', 'gyro', 'spoke', 'radiator', 'dome'))


LOOKS = looks('ai', L)
