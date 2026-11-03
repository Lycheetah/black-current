"""Null Pursuer · AI Hunters destroyer (140 m, 4 hardpoints) · Blender hero hull, shipyard batch 6.

A ship built around one gun: the hull is a long box-section railgun barrel, its rails and coils
running the whole length, a red charge channel in its top; a faceted command block rides at the
back with red-line sensor fins, and capacitor banks hang under it. Matte black, gunmetal, red.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _forge import ss, bump, prow, fang, armour, machinery_bands, conduits, barbette, looks  # noqa: E402

META = {'name': 'null_pursuer_hero.glb', 'hull': 'ai_hunters_destroyer', 'tile': 8.0, 'bake_size': 2048}
L = 140.0
Y0 = L / 2
S = L / 50.0


def Y(t):
    return Y0 - t * L


def build(k):
    M = k.palette()
    M['CORE'] = k.material('CORE', (0.0, 0.0, 0.0), 1.0, 0.05)
    # The barrel: two heavy rails either side of a channel, from the muzzle to the breech.
    y0, y1 = Y(0.0), Y(0.66)
    ln, yc = y0 - y1, (y0 + y1) / 2
    for s in (-1, 1):
        k.box('rail', (1.4 * S, ln, 2.6 * S), (s * 1.6 * S, yc, 0.0), M['TRIM'])
        k.box('rail_face', (0.25 * S, ln * 0.96, 1.6 * S), (s * 0.82 * S, yc, 0.0), M['GOLD'])
        k.box_kit('rail_kit', (s * 1.6 * S, yc, 0.0), (1.4 * S, ln * 0.92, 2.6 * S), M, faces=('top', 'right' if s > 0 else 'left'), count=10, h=0.45, seed=2500 + (s > 0))
    k.box('channel_floor', (1.7 * S, ln, 0.4 * S), (0, yc, -1.0 * S), M['CORE'])
    k.box('charge', (0.5 * S, ln * 0.9, 0.3 * S), (0, yc, -0.7 * S), M['GLOW'])
    # Coils every few metres, heavier at the breech.
    for q in range(14):
        y = Y(0.04 + q * 0.045)
        big = q % 4 == 0
        k.box('coil', ((5.2 if big else 4.6) * S, (1.0 if big else 0.6) * S, (3.6 if big else 3.1) * S), (0, y, 0.0), M['HULL'] if big else M['TRIM'])
        if big:
            k.box('coil_light', (5.3 * S, 0.2 * S, 0.2 * S), (0, y, 1.85 * S), M['GLOW'])
    # The muzzle: a flared, slotted brake.
    k.box('muzzle', (5.6 * S, 2.4 * S, 4.0 * S), (0, Y(0.0) - 0.2 * S, 0.0), M['HULL'])
    for s in (-1, 1):
        for q in range(3):
            k.box('muzzle_port', (0.3 * S, 0.5 * S, 2.4 * S), (s * 2.85 * S, Y(0.0) - (0.6 - q * 0.7) * S, 0.0), M['CORE'])
    # The command block: faceted, riding the breech, red sensor fins canted out.
    yb = Y(0.8)
    k.wedge('command', (7.0 * S, 13.0 * S, 4.6 * S), (0, yb, 0.6 * S), M['HULL'], slope=0.6, back=0.3)
    k.wedge('command_cap', (4.6 * S, 8.0 * S, 1.4 * S), (0, yb - 1.0 * S, 3.2 * S), M['TRIM'], slope=0.7, back=0.3)
    k.box('slit', (4.0 * S, 0.12 * S, 0.25 * S), (0, yb + 3.6 * S, 2.0 * S), M['GLOW'])
    k.box_kit('command_kit', (0, yb - 1.5 * S, 0.6 * S), (7.0 * S, 8.0 * S, 4.6 * S), M, faces=('left', 'right'), count=10, h=0.5, seed=2510)
    for s in (-1, 1):
        f = k.plate('sensor_fin', [(0, 0), (0, -6.0 * S), (3.6 * S, -8.0 * S), (3.0 * S, -2.0 * S)], 0.25 * S, M['TRIM'], loc=(s * 3.2 * S, yb + 2.0 * S, 2.4 * S), bevel_w=0.04)
        f.rotation_euler = (0, -math.pi / 2 + s * 0.6, 0)
        k.box('fin_line', (0.1 * S, 5.0 * S, 0.1 * S), (s * 4.4 * S, yb - 2.0 * S, 4.4 * S), M['GLOW'])
        # Capacitor banks hanging under the breech.
        for q in range(3):
            k.cylinder('capacitor', 0.9 * S, 3.0 * S, (s * 2.0 * S, Y(0.6) - q * 3.6 * S, -2.6 * S), M['TRIM'], segs=8, rot=(-math.pi / 2, 0, 0))
            k.cylinder('capacitor_band', 0.95 * S, 0.3 * S, (s * 2.0 * S, Y(0.6) - q * 3.6 * S, -2.6 * S), M['GLOW'] if q == 1 else M['GOLD'], segs=8, rot=(-math.pi / 2, 0, 0))
    for s, bank, t in ((-1, 'FL', 0.3), (1, 'FR', 0.3), (-1, 'ML', 0.74), (1, 'MR', 0.74)):
        z = 1.3 * S if t < 0.7 else 2.6 * S
        x = s * 1.6 * S if t < 0.7 else s * 2.6 * S
        barbette(k, M, bank, x, Y(t), z + 0.4 * S, 0.8 * S, 0.5 * S)
    for x, z, name in ((-1.8, 0.0, 'PORT'), (1.8, 0.0, 'STARBOARD'), (0.0, 1.6, 'MAIN')):
        k.box('drive_frame', (2.0 * S, 1.0 * S, 1.6 * S), (x * S, Y(0.98), z * S), M['TRIM'])
        k.box('drive_glow', (1.6 * S, 0.15 * S, 1.2 * S), (x * S, Y(0.98) - 0.55 * S, z * S), M['GLOW'])
        k.empty('ENGINE_' + name, (x * S, Y(0.98) - 1.0 * S, z * S), 0.8 * S)
    k.finish(skip=('core', 'NODE', 'ENGINE', 'windows', 'rail_kit', 'command_kit'))
    print('windows', k.deck_windows(('command',), rows=(0.1, 0.2), step=2.4, size=(0.15, 0.9, 0.45)))


LOOKS = looks('ai_hunters', L)
